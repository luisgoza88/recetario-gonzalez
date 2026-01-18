'use client';

import { useState, useEffect } from 'react';
import {
  X, Package, Plus, Minus, AlertTriangle, ShoppingCart,
  Search, Edit2, Trash2, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface SuppliesInventoryProps {
  householdId: string;
  onClose: () => void;
  onAddToShoppingList?: (items: SupplyItem[]) => void;
}

interface SupplyItem {
  id: string;
  household_id: string;
  name: string;
  category: string;
  current_quantity: number;
  min_quantity: number;
  unit: string;
  notes?: string;
  last_restocked?: string;
}

const SUPPLY_CATEGORIES = [
  { id: 'cleaning', name: 'Limpieza', icon: '🧹', color: 'blue' },
  { id: 'laundry', name: 'Lavandería', icon: '👕', color: 'purple' },
  { id: 'kitchen', name: 'Cocina', icon: '🍳', color: 'orange' },
  { id: 'bathroom', name: 'Baño', icon: '🚿', color: 'cyan' },
  { id: 'garden', name: 'Jardín', icon: '🌱', color: 'green' },
  { id: 'other', name: 'Otros', icon: '📦', color: 'gray' }
];

const DEFAULT_SUPPLIES: Partial<SupplyItem>[] = [
  { name: 'Detergente multiusos', category: 'cleaning', unit: 'litros', min_quantity: 1 },
  { name: 'Cloro', category: 'cleaning', unit: 'litros', min_quantity: 1 },
  { name: 'Desinfectante', category: 'cleaning', unit: 'litros', min_quantity: 1 },
  { name: 'Limpiavidrios', category: 'cleaning', unit: 'unidades', min_quantity: 1 },
  { name: 'Bolsas de basura grandes', category: 'cleaning', unit: 'unidades', min_quantity: 10 },
  { name: 'Bolsas de basura pequeñas', category: 'cleaning', unit: 'unidades', min_quantity: 10 },
  { name: 'Esponjas', category: 'cleaning', unit: 'unidades', min_quantity: 3 },
  { name: 'Guantes de limpieza', category: 'cleaning', unit: 'pares', min_quantity: 2 },
  { name: 'Trapos/paños', category: 'cleaning', unit: 'unidades', min_quantity: 5 },
  { name: 'Detergente ropa', category: 'laundry', unit: 'kg', min_quantity: 1 },
  { name: 'Suavizante', category: 'laundry', unit: 'litros', min_quantity: 1 },
  { name: 'Jabón en barra', category: 'laundry', unit: 'unidades', min_quantity: 2 },
  { name: 'Jabón lavavajillas', category: 'kitchen', unit: 'litros', min_quantity: 1 },
  { name: 'Esponja cocina', category: 'kitchen', unit: 'unidades', min_quantity: 2 },
  { name: 'Papel toalla', category: 'kitchen', unit: 'rollos', min_quantity: 2 },
  { name: 'Papel higiénico', category: 'bathroom', unit: 'rollos', min_quantity: 6 },
  { name: 'Jabón de manos', category: 'bathroom', unit: 'unidades', min_quantity: 2 },
  { name: 'Limpiador sanitarios', category: 'bathroom', unit: 'litros', min_quantity: 1 },
];

export default function SuppliesInventory({
  householdId,
  onClose,
  onAddToShoppingList
}: SuppliesInventoryProps) {
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'cleaning',
    current_quantity: 0,
    min_quantity: 1,
    unit: 'unidades'
  });

  useEffect(() => {
    loadSupplies();
  }, [householdId]);

  const loadSupplies = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('cleaning_supplies')
      .select('*')
      .eq('household_id', householdId)
      .order('category', { ascending: true });

    if (data) {
      setSupplies(data);
    } else if (error && error.code === 'PGRST116') {
      // Table doesn't exist or is empty, initialize with defaults
      await initializeDefaults();
    }

    setLoading(false);
  };

  const initializeDefaults = async () => {
    const defaultItems = DEFAULT_SUPPLIES.map(item => ({
      ...item,
      household_id: householdId,
      current_quantity: 0
    }));

    await supabase.from('cleaning_supplies').insert(defaultItems);
    loadSupplies();
  };

  const updateQuantity = async (itemId: string, change: number) => {
    const item = supplies.find(s => s.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(0, item.current_quantity + change);

    await supabase
      .from('cleaning_supplies')
      .update({
        current_quantity: newQuantity,
        last_restocked: change > 0 ? new Date().toISOString() : item.last_restocked
      })
      .eq('id', itemId);

    setSupplies(prev =>
      prev.map(s => s.id === itemId ? { ...s, current_quantity: newQuantity } : s)
    );
  };

  const addNewItem = async () => {
    if (!newItem.name.trim()) return;

    const { data } = await supabase
      .from('cleaning_supplies')
      .insert({
        household_id: householdId,
        ...newItem,
        current_quantity: newItem.current_quantity
      })
      .select()
      .single();

    if (data) {
      setSupplies(prev => [...prev, data]);
      setNewItem({
        name: '',
        category: 'cleaning',
        current_quantity: 0,
        min_quantity: 1,
        unit: 'unidades'
      });
      setShowAddForm(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from('cleaning_supplies').delete().eq('id', itemId);
    setSupplies(prev => prev.filter(s => s.id !== itemId));
  };

  const filteredSupplies = supplies.filter(s => {
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const lowStockItems = supplies.filter(s => s.current_quantity <= s.min_quantity);
  const getCategoryInfo = (catId: string) => SUPPLY_CATEGORIES.find(c => c.id === catId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package size={20} />
            <span className="font-semibold">Inventario de Productos</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={18} />
              <span className="text-sm font-medium">
                {lowStockItems.length} producto{lowStockItems.length > 1 ? 's' : ''} con stock bajo
              </span>
              {onAddToShoppingList && (
                <button
                  onClick={() => onAddToShoppingList(lowStockItems)}
                  className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-amber-300"
                >
                  <ShoppingCart size={14} />
                  Agregar al mercado
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Todos
            </button>
            {SUPPLY_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package size={40} className="mx-auto mb-2 opacity-50" />
              <p>No hay productos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSupplies.map(item => {
                const cat = getCategoryInfo(item.category);
                const isLowStock = item.current_quantity <= item.min_quantity;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-4 border ${
                      isLowStock ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          Mínimo: {item.min_quantity} {item.unit}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                        >
                          <Minus size={16} />
                        </button>
                        <span className={`w-12 text-center font-bold ${
                          isLowStock ? 'text-amber-600' : ''
                        }`}>
                          {item.current_quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {isLowStock && (
                      <div className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Stock bajo - necesita reabastecimiento
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Form */}
          {showAddForm && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-3">
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Nombre del producto"
                className="w-full p-3 border rounded-xl"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="p-3 border rounded-xl"
                >
                  {SUPPLY_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="Unidad (ej: litros)"
                  className="p-3 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Cantidad actual</label>
                  <input
                    type="number"
                    value={newItem.current_quantity}
                    onChange={(e) => setNewItem({ ...newItem, current_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cantidad mínima</label>
                  <input
                    type="number"
                    value={newItem.min_quantity}
                    onChange={(e) => setNewItem({ ...newItem, min_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={addNewItem}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Agregar Producto
            </button>
          )}
          <button
            onClick={onClose}
            className={`py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold ${showAddForm ? 'flex-1' : 'px-6'}`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
