'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Sparkles, Mic, Edit3, Check, Trash2,
  AlertCircle, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { IngredientCategory } from '@/types';

interface AddCustomItemModalProps {
  onClose: () => void;
  onAdded: () => void;
}

interface ParsedItem {
  id: string;
  name: string;
  originalInput: string;
  category: {
    id: string;
    name: string;
    icon: string;
  };
  quantity: number;
  unit: string;
  brand?: string;
  confidence: number;
  needsClarification?: string;
  isEditing?: boolean;
  isSelected: boolean;
}

type InputMode = 'smart' | 'manual';

export default function AddCustomItemModal({ onClose, onAdded }: AddCustomItemModalProps) {
  const [mode, setMode] = useState<InputMode>('smart');
  const [categories, setCategories] = useState<IngredientCategory[]>([]);

  // Smart mode state
  const [smartInput, setSmartInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual mode state
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('unid');

  // General state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonUnits = ['kg', 'g', 'lb', 'unid', 'bolsa', 'paquete', 'botella', 'lata', 'tarro', 'litro', 'ml', 'manojo', 'racimo'];

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

  // ==================== SMART MODE FUNCTIONS ====================

  const handleSmartParse = async () => {
    if (!smartInput.trim()) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch('/api/parse-market-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: smartInput.trim() })
      });

      if (!response.ok) {
        throw new Error('Error al procesar');
      }

      const data = await response.json();

      // Agregar IDs únicos y estado de selección
      const itemsWithIds = data.items.map((item: Omit<ParsedItem, 'id' | 'isSelected'>, index: number) => ({
        ...item,
        id: `parsed_${Date.now()}_${index}`,
        isSelected: true
      }));

      setParsedItems(itemsWithIds);

    } catch (err) {
      console.error('Error parsing:', err);
      setParseError('Error al procesar. Intenta de nuevo o usa el modo manual.');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setParsedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const toggleItemEdit = (itemId: string) => {
    setParsedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isEditing: !item.isEditing } : item
      )
    );
  };

  const updateParsedItem = (itemId: string, updates: Partial<ParsedItem>) => {
    setParsedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const removeParsedItem = (itemId: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSaveSmartItems = async () => {
    const selectedItems = parsedItems.filter(item => item.isSelected);
    if (selectedItems.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      for (const item of selectedItems) {
        const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullQuantity = `${item.quantity} ${item.unit}`;

        // Insertar en market_items
        await supabase
          .from('market_items')
          .insert({
            id: customId,
            name: item.brand ? `${item.name} (${item.brand})` : item.name,
            category: item.category.name,
            category_id: item.category.id,
            quantity: fullQuantity,
            order_index: 999,
            is_custom: true,
            unit: item.unit,
            created_at: new Date().toISOString()
          });

        // Crear entrada de inventario
        await supabase
          .from('inventory')
          .insert({
            item_id: customId,
            current_quantity: fullQuantity,
            current_number: item.quantity,
            last_updated: new Date().toISOString()
          });
      }

      onAdded();
      onClose();
    } catch (err) {
      console.error('Error saving items:', err);
      setError('Error al guardar los items');
    } finally {
      setSaving(false);
    }
  };

  // ==================== MANUAL MODE FUNCTIONS ====================

  const handleSaveManual = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const customId = `custom_${Date.now()}`;
      const fullQuantity = quantity && unit ? `${quantity} ${unit}` : quantity || '1 unid';

      const { error: insertError } = await supabase
        .from('market_items')
        .insert({
          id: customId,
          name: name.trim(),
          category: categories.find(c => c.id === selectedCategory)?.name_es || 'Otros',
          category_id: selectedCategory,
          quantity: fullQuantity,
          order_index: 999,
          is_custom: true,
          unit: unit || null,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      if (quantity) {
        await supabase
          .from('inventory')
          .insert({
            item_id: customId,
            current_quantity: fullQuantity,
            current_number: parseFloat(quantity) || 1,
            last_updated: new Date().toISOString()
          });
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

  // ==================== RENDER ====================

  const selectedCount = parsedItems.filter(i => i.isSelected).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <span className="font-semibold">Agregar Productos</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-white/20 rounded-xl p-1">
            <button
              onClick={() => setMode('smart')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'smart' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <Sparkles size={16} />
              Inteligente
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'manual' ? 'bg-white text-purple-600' : 'text-white/80 hover:text-white'
              }`}
            >
              <Edit3 size={16} />
              Manual
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'smart' ? (
            // ==================== SMART MODE ====================
            <div className="space-y-4">
              {/* Input Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escribe o dicta lo que compraste
                </label>
                <div className="relative">
                  <textarea
                    value={smartInput}
                    onChange={(e) => setSmartInput(e.target.value)}
                    placeholder="Ej: 1 kg camarones, chocolate Luker, 2 paquetes galletas saltinas, leche deslactosada..."
                    className="w-full p-4 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none h-28 pr-12"
                    disabled={isParsing}
                  />
                  <button
                    className="absolute right-3 top-3 p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="Dictar (próximamente)"
                  >
                    <Mic size={20} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Puedes escribir varios productos separados por comas
                </p>
              </div>

              {/* Process Button */}
              <button
                onClick={handleSmartParse}
                disabled={isParsing || !smartInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                {isParsing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Procesar con IA
                  </>
                )}
              </button>

              {/* Parse Error */}
              {parseError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  {parseError}
                </div>
              )}

              {/* Parsed Items Preview */}
              {parsedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">
                      Productos detectados ({parsedItems.length})
                    </h3>
                    <span className="text-sm text-purple-600">
                      {selectedCount} seleccionados
                    </span>
                  </div>

                  {parsedItems.map(item => (
                    <div
                      key={item.id}
                      className={`rounded-xl border-2 transition-all ${
                        item.isSelected
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleItemSelection(item.id)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              item.isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {item.isSelected && <Check size={14} />}
                          </button>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{item.category.icon}</span>
                              <span className="font-medium">{item.name}</span>
                              {item.brand && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                  {item.brand}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <span>{item.category.name}</span>
                              <span>•</span>
                              <span>{item.quantity} {item.unit}</span>
                              {item.confidence < 0.8 && (
                                <span className="text-amber-600 text-xs">
                                  (verificar)
                                </span>
                              )}
                            </div>

                            {/* Clarification Question */}
                            {item.needsClarification && (
                              <div className="mt-2 bg-amber-50 text-amber-700 p-2 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                {item.needsClarification}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => toggleItemEdit(item.id)}
                              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg"
                            >
                              {item.isEditing ? <ChevronUp size={16} /> : <Edit3 size={16} />}
                            </button>
                            <button
                              onClick={() => removeParsedItem(item.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Edit Form (expandable) */}
                        {item.isEditing && (
                          <div className="mt-3 pt-3 border-t border-purple-200 space-y-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateParsedItem(item.id, { name: e.target.value })}
                              className="w-full p-2 border rounded-lg text-sm"
                              placeholder="Nombre"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateParsedItem(item.id, { quantity: parseFloat(e.target.value) || 1 })}
                                className="p-2 border rounded-lg text-sm"
                                placeholder="Cantidad"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) => updateParsedItem(item.id, { unit: e.target.value })}
                                className="p-2 border rounded-lg text-sm bg-white"
                              >
                                {commonUnits.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                            <select
                              value={item.category.id}
                              onChange={(e) => {
                                const cat = categories.find(c => c.id === e.target.value);
                                if (cat) {
                                  updateParsedItem(item.id, {
                                    category: { id: cat.id, name: cat.name_es, icon: cat.icon }
                                  });
                                }
                              }}
                              className="w-full p-2 border rounded-lg text-sm bg-white"
                            >
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.icon} {cat.name_es}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Help Text */}
              {parsedItems.length === 0 && !isParsing && (
                <div className="bg-purple-50 text-purple-700 p-4 rounded-xl text-sm">
                  <p className="font-medium mb-2">Ejemplos de lo que puedes escribir:</p>
                  <ul className="space-y-1 text-purple-600">
                    <li>• "1 kg de camarones"</li>
                    <li>• "chocolate Luker, galletas saltinas"</li>
                    <li>• "2 litros de leche deslactosada"</li>
                    <li>• "queso crema Philadelphia, yogurt griego"</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // ==================== MANUAL MODE ====================
            <div className="space-y-4">
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
                    {commonUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info */}
              <div className="bg-purple-50 text-purple-700 p-3 rounded-xl text-sm">
                <strong>Tip:</strong> Los items personalizados aparecerán en tu lista de mercado y la IA
                podrá sugerir recetas que los incluyan.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
          >
            Cancelar
          </button>

          {mode === 'smart' ? (
            <button
              onClick={handleSaveSmartItems}
              disabled={saving || selectedCount === 0}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  Agregar {selectedCount > 0 ? `(${selectedCount})` : ''}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSaveManual}
              disabled={saving || !name.trim()}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Plus size={18} />
                  Agregar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
