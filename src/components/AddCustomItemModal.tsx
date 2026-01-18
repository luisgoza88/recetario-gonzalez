'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { IngredientCategory } from '@/types';

interface AddCustomItemModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddCustomItemModal({ onClose, onAdded }: AddCustomItemModalProps) {
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonUnits = ['kg', 'g', 'lb', 'unid', 'bolsa', 'paquete', 'botella', 'lata', 'tarro', 'manojo', 'racimo'];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('ingredient_categories')
      .select('*')
      .order('sort_order');

    if (data) {
      setCategories(data);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Generar ID único para el item custom
      const customId = `custom_${Date.now()}`;
      const fullQuantity = quantity && unit ? `${quantity} ${unit}` : quantity || '1 unid';

      // Insertar en market_items
      const { error: insertError } = await supabase
        .from('market_items')
        .insert({
          id: customId,
          name: name.trim(),
          category: categories.find(c => c.id === selectedCategory)?.name_es || 'Otros',
          category_id: selectedCategory,
          quantity: fullQuantity,
          order_index: 999, // Al final
          is_custom: true,
          unit: unit || null,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // También crear entrada de inventario si hay cantidad
      if (quantity) {
        const { error: invError } = await supabase
          .from('inventory')
          .insert({
            item_id: customId,
            current_quantity: fullQuantity,
            current_number: parseFloat(quantity) || 1,
            last_updated: new Date().toISOString()
          });

        if (invError) console.error('Error creating inventory:', invError);
      }

      onAdded();
      onClose();
    } catch (err) {
      console.error('Error saving custom item:', err);
      setError('Error al guardar el item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <span className="font-semibold">Agregar Item Personalizado</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Camarones, Quinoa, Leche de almendras..."
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              autoFocus
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left
                    ${selectedCategory === cat.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name_es}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad y Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 1, 500, 2.5"
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {commonUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-purple-50 text-purple-700 p-3 rounded-xl text-sm">
            <strong>Tip:</strong> Los items personalizados aparecerán en tu lista de mercado y la IA
            podrá sugerir recetas que los incluyan.
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Plus size={18} />
                  Agregar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
