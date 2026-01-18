'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { RotateCcw, ShoppingCart, Home, Minus, Plus, Edit2, Check, X, AlertTriangle, Search, Sparkles, Trash2, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { MarketItem, IngredientCategory } from '@/types';
import { CATEGORY_EMOJIS } from '@/data/market';
import AddCustomItemModal from './AddCustomItemModal';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cacheMarketItems, getCachedMarketItems, cacheInventory, getCachedInventory } from '@/lib/indexedDB';

interface MarketViewProps {
  items: MarketItem[];
  onUpdate: () => void;
}

type ViewMode = 'shopping' | 'pantry';

export default function MarketView({ items, onUpdate }: MarketViewProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('shopping');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryData, setCategoryData] = useState<Record<string, IngredientCategory>>({});
  const [isFromCache, setIsFromCache] = useState(false);

  // Offline sync
  const { isOnline, queueOperation, pendingCount } = useOfflineSync();

  // Cargar datos de categorías
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('ingredient_categories')
      .select('*');

    if (data) {
      const catMap: Record<string, IngredientCategory> = {};
      data.forEach(cat => {
        catMap[cat.id] = cat;
      });
      setCategoryData(catMap);
    }
  };

  // Cache items cuando están online para uso offline posterior
  useEffect(() => {
    if (isOnline && items.length > 0) {
      // Cachear items del mercado
      const marketItemsToCache = items.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        category_id: item.category_id,
        quantity: item.quantity,
        checked: item.checked,
        order_index: item.order_index || 0,
        is_custom: item.is_custom,
        cachedAt: Date.now()
      }));
      cacheMarketItems(marketItemsToCache);

      // Cachear inventario
      const inventoryToCache = items
        .filter(item => item.currentNumber !== undefined)
        .map(item => ({
          item_id: item.id,
          current_quantity: item.currentQuantity || '0',
          current_number: item.currentNumber || 0,
          cachedAt: Date.now()
        }));
      cacheInventory(inventoryToCache);

      setIsFromCache(false);
    }
  }, [items, isOnline]);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  // Contar items con stock bajo (menos del 20% o vacíos)
  const lowStockCount = items.filter(i => {
    const current = i.currentNumber || 0;
    const required = parseQuantity(i.quantity);
    return current < required * 0.2;
  }).length;

  // Filtrar items por búsqueda
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return items.filter(item => {
      const name = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const category = item.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(query) || category.includes(query);
    });
  }, [items, searchQuery]);

  const toggleItem = async (item: MarketItem) => {
    setLoading(item.id);

    try {
      if (!isOnline) {
        // Offline: encolar operaciones
        if (item.checked) {
          await queueOperation({
            operation: 'delete',
            table: 'market_checklist',
            data: { id: item.id }
          });
        } else {
          await queueOperation({
            operation: 'insert',
            table: 'market_checklist',
            data: {
              item_id: item.id,
              checked: true,
              checked_at: new Date().toISOString()
            }
          });
          // También encolar actualización de inventario
          const required = parseQuantity(item.quantity);
          await queueOperation({
            operation: 'update',
            table: 'inventory',
            data: {
              id: item.id,
              item_id: item.id,
              current_quantity: item.quantity,
              current_number: required,
              last_updated: new Date().toISOString()
            }
          });
        }
        onUpdate();
        return;
      }

      // Online: operaciones normales
      if (item.checked) {
        const { error } = await supabase
          .from('market_checklist')
          .delete()
          .eq('item_id', item.id);

        if (error) throw error;
      } else {
        const { error: checklistError } = await supabase
          .from('market_checklist')
          .upsert(
            {
              item_id: item.id,
              checked: true,
              checked_at: new Date().toISOString()
            },
            { onConflict: 'item_id' }
          );

        if (checklistError) throw checklistError;

        // Al marcar como comprado, actualizar inventario con la cantidad completa
        const required = parseQuantity(item.quantity);
        const { error: inventoryError } = await supabase
          .from('inventory')
          .upsert(
            {
              item_id: item.id,
              current_quantity: item.quantity,
              current_number: required,
              last_updated: new Date().toISOString()
            },
            { onConflict: 'item_id' }
          );

        if (inventoryError) throw inventoryError;
      }

      onUpdate();
    } catch (error) {
      console.error('Error toggling item:', error);
    } finally {
      setLoading(null);
    }
  };

  const updateInventory = async (item: MarketItem, newQuantity: string, newNumber: number) => {
    setLoading(item.id);

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await queueOperation({
          operation: 'update',
          table: 'inventory',
          data: {
            id: item.id,
            item_id: item.id,
            current_quantity: newQuantity,
            current_number: Math.max(0, newNumber),
            last_updated: new Date().toISOString()
          }
        });
        onUpdate();
        return;
      }

      const { error } = await supabase
        .from('inventory')
        .upsert(
          {
            item_id: item.id,
            current_quantity: newQuantity,
            current_number: Math.max(0, newNumber),
            last_updated: new Date().toISOString()
          },
          { onConflict: 'item_id' }
        );

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error('Error updating inventory:', error);
    } finally {
      setLoading(null);
      setEditingItem(null);
    }
  };

  const adjustQuantity = async (item: MarketItem, delta: number) => {
    const currentNum = item.currentNumber || 0;
    const newNum = Math.max(0, currentNum + delta);
    const unit = extractUnit(item.quantity);
    const newQty = `${newNum} ${unit}`.trim();

    await updateInventory(item, newQty, newNum);
  };

  const startEdit = (item: MarketItem) => {
    setEditingItem(item.id);
    setEditValue(item.currentQuantity || '0');
  };

  const saveEdit = async (item: MarketItem) => {
    const newNum = parseQuantity(editValue);
    await updateInventory(item, editValue, newNum);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const resetMarket = async () => {
    if (!confirm('¿Reiniciar toda la lista de mercado?')) return;

    try {
      if (!isOnline) {
        // Offline: no permitir reset para evitar inconsistencias
        alert('Esta acción requiere conexión a internet');
        return;
      }

      const { error } = await supabase.from('market_checklist').delete().neq('item_id', '');
      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error resetting market:', error);
    }
  };

  const deleteCustomItem = async (item: MarketItem) => {
    if (!confirm(`¿Eliminar "${item.name}" de tu lista?`)) return;

    if (!isOnline) {
      // Offline: no permitir eliminación para evitar inconsistencias
      alert('Esta acción requiere conexión a internet');
      return;
    }

    setLoading(item.id);
    try {
      // Eliminar de inventory primero
      await supabase
        .from('inventory')
        .delete()
        .eq('item_id', item.id);

      // Eliminar de market_checklist
      await supabase
        .from('market_checklist')
        .delete()
        .eq('item_id', item.id);

      // Eliminar de market_items
      const { error } = await supabase
        .from('market_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting custom item:', error);
    } finally {
      setLoading(null);
    }
  };

  // Obtener emoji de categoría (usando category_id o category legacy)
  const getCategoryEmoji = (item: MarketItem) => {
    if (item.category_id && categoryData[item.category_id]) {
      return categoryData[item.category_id].icon;
    }
    return CATEGORY_EMOJIS[item.category] || '📦';
  };

  // Contar items personalizados
  const customItemsCount = items.filter(i => i.is_custom).length;

  // Agrupar items filtrados por categoría
  const categories = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MarketItem[]>);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('shopping')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
            viewMode === 'shopping'
              ? 'bg-green-700 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart size={18} />
          Compras
          {customItemsCount > 0 && (
            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
              +{customItemsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('pantry')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
            viewMode === 'pantry'
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Home size={18} />
          Despensa
          {lowStockCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {lowStockCount}
            </span>
          )}
        </button>
      </div>

      {/* Offline Indicator */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 ${
          !isOnline
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <WifiOff className={`w-5 h-5 ${!isOnline ? 'text-orange-600' : 'text-blue-600'}`} />
          <div className="flex-1">
            {!isOnline ? (
              <>
                <p className="text-sm font-medium text-orange-700">Sin conexión</p>
                <p className="text-xs text-orange-600">
                  Los cambios se sincronizarán al reconectar
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-blue-700">
                {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar producto... (ej: champiñones)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="mb-4 text-sm text-gray-500">
          {filteredItems.length === 0 ? (
            <span className="text-red-500">No se encontró "{searchQuery}"</span>
          ) : (
            <span>{filteredItems.length} producto{filteredItems.length !== 1 ? 's' : ''} encontrado{filteredItems.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {viewMode === 'shopping' ? (
        <>
          {/* Shopping Progress Header */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm mb-4">
            <span className="font-semibold text-green-700 whitespace-nowrap">
              {checkedCount}/{totalCount}
            </span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-700 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <button
              onClick={resetMarket}
              className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-red-100"
            >
              <RotateCcw size={16} />
              Reiniciar
            </button>
          </div>

          {/* Shopping List */}
          {Object.entries(categories).map(([category, categoryItems]) => (
            <div key={category} className="mb-4">
              <div className="bg-green-700 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
                <span>{getCategoryEmoji(categoryItems[0])}</span>
                {category}
              </div>
              <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                {categoryItems.map(item => {
                  const currentNum = item.currentNumber || 0;
                  const unit = extractUnit(item.quantity);

                  return (
                    <div
                      key={item.id}
                      className={`
                        flex items-center p-4 border-b last:border-b-0 transition-colors
                        ${item.checked ? 'bg-green-50' : 'hover:bg-gray-50'}
                        ${item.is_custom ? 'border-l-4 border-l-purple-400' : ''}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleItem(item)}
                        disabled={loading === item.id}
                        className="w-6 h-6 mr-3 accent-green-700 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.is_custom && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Sparkles size={10} />
                              nuevo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); adjustQuantity(item, -1); }}
                          disabled={loading === item.id || currentNum <= 0}
                          className="w-7 h-7 flex items-center justify-center bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-30 text-sm"
                        >
                          <Minus size={14} />
                        </button>
                        <span className={`
                          text-sm px-2 py-1 rounded-md font-semibold min-w-[60px] text-center
                          ${item.checked
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'}
                        `}>
                          {currentNum > 0 ? `${currentNum} ${unit}` : item.quantity}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); adjustQuantity(item, 1); }}
                          disabled={loading === item.id}
                          className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-30 text-sm"
                        >
                          <Plus size={14} />
                        </button>
                        {item.is_custom && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCustomItem(item); }}
                            disabled={loading === item.id}
                            className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 rounded-md hover:bg-red-100 hover:text-red-600 disabled:opacity-30 text-sm ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Pantry View */}
          <div className="bg-orange-50 text-orange-700 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <Home size={16} />
            <span>Ajusta las cantidades conforme uses los productos</span>
          </div>

          {Object.entries(categories).map(([category, categoryItems]) => (
            <div key={category} className="mb-4">
              <div className="bg-orange-600 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
                <span>{getCategoryEmoji(categoryItems[0])}</span>
                {category}
              </div>
              <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                {categoryItems.map(item => {
                  const currentNum = item.currentNumber || 0;
                  const requiredNum = parseQuantity(item.quantity);
                  const percentage = requiredNum > 0 ? (currentNum / requiredNum) * 100 : 0;
                  const isLow = percentage < 20;
                  const isEmpty = currentNum === 0;

                  return (
                    <div
                      key={item.id}
                      className={`
                        p-4 border-b last:border-b-0 transition-colors
                        ${isEmpty ? 'bg-red-50' : isLow ? 'bg-orange-50' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {(isEmpty || isLow) && (
                            <AlertTriangle size={16} className={isEmpty ? 'text-red-500' : 'text-orange-500'} />
                          )}
                          <span className="font-medium">{item.name}</span>
                          {item.is_custom && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Sparkles size={10} />
                              nuevo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            Necesitas: {item.quantity}
                          </span>
                          {item.is_custom && (
                            <button
                              onClick={() => deleteCustomItem(item)}
                              disabled={loading === item.id}
                              className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isEmpty ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center justify-between">
                        {editingItem === item.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                              placeholder="Ej: 2.5 kg"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(item)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => adjustQuantity(item, -1)}
                                disabled={loading === item.id || currentNum <= 0}
                                className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                              >
                                <Minus size={18} />
                              </button>
                              <button
                                onClick={() => startEdit(item)}
                                className="px-4 py-2 bg-gray-100 rounded-lg font-semibold min-w-[100px] text-center hover:bg-gray-200"
                              >
                                {item.currentQuantity || '0'}
                              </button>
                              <button
                                onClick={() => adjustQuantity(item, 1)}
                                disabled={loading === item.id}
                                className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                            <button
                              onClick={() => startEdit(item)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 left-5 bg-purple-600 text-white p-4 rounded-full font-semibold shadow-lg flex items-center gap-2 hover:bg-purple-700 transition-colors z-40"
        aria-label="Agregar item personalizado"
      >
        <Sparkles size={22} />
      </button>

      {/* Add Custom Item Modal */}
      {showAddModal && (
        <AddCustomItemModal
          onClose={() => setShowAddModal(false)}
          onAdded={onUpdate}
        />
      )}
    </div>
  );
}

// Utilidades para parsear cantidades
function parseQuantity(qty: string): number {
  if (!qty) return 0;
  // Extraer el número del string (ej: "2.5 kg" -> 2.5, "8 unid" -> 8)
  const match = qty.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function extractUnit(qty: string): string {
  if (!qty) return '';
  // Extraer la unidad (ej: "2.5 kg" -> "kg", "8 unid grandes" -> "unid grandes")
  const match = qty.match(/[\d.]+\s*(.*)/);
  return match ? match[1].trim() : '';
}
