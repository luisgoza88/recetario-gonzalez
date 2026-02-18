'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Loader2, X, Check, TrendingDown, TrendingUp, DollarSign, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { ShoppingList, ShoppingListItem } from '@/types';
import PriceLogModal from './PriceLogModal';

interface SmartShoppingSectionProps {
  onRefreshMarket: () => void;
}

interface SavingsTip {
  item: string;
  message: string;
  amount: number;
}

export default function SmartShoppingSection({ onRefreshMarket }: SmartShoppingSectionProps) {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ShoppingList | null>(null);
  const [savings, setSavings] = useState<SavingsTip[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showSavings, setShowSavings] = useState(false);
  const [priceLogItem, setPriceLogItem] = useState<string | null>(null);
  const [checkingItem, setCheckingItem] = useState<string | null>(null);

  // Get current week start date (Monday)
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const fetchActiveList = useCallback(async () => {
    try {
      const weekStart = getWeekStart();
      const res = await fetch(`/api/generate-shopping-list?weekStartDate=${weekStart}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.list) {
        setList(data.list);
      }
      if (data.savings) {
        setSavings(data.savings);
      }
    } catch (err) {
      console.error('Error fetching active list:', err);
    }
  }, []);

  useEffect(() => {
    fetchActiveList();
  }, [fetchActiveList]);

  const generateList = async () => {
    setLoading(true);
    try {
      const weekStart = getWeekStart();

      // Try to find an active generated menu
      const { data: menus } = await supabase
        .from('generated_menus')
        .select('id')
        .in('status', ['active', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1);

      const menuId = menus?.[0]?.id;

      const res = await fetch('/api/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId: menuId || undefined,
          weekStartDate: weekStart,
        }),
      });

      if (!res.ok) throw new Error('Error generating list');
      const data = await res.json();
      if (data.list) {
        setList(data.list);
      }
      // Refresh savings too
      await fetchActiveList();
    } catch (err) {
      console.error('Error generating list:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = async (index: number) => {
    if (!list) return;
    const item = list.items[index];

    // If checking (not unchecking), show price log
    if (!item.checked) {
      setCheckingItem(item.name);
      setPriceLogItem(item.name);
    }

    // Update the item
    const updatedItems = [...list.items];
    updatedItems[index] = { ...item, checked: !item.checked };

    // Calculate actual total
    const totalActual = updatedItems
      .filter(i => i.checked && i.actualPrice)
      .reduce((sum, i) => sum + (i.actualPrice || 0), 0);

    const updatedList = { ...list, items: updatedItems, total_actual: totalActual || undefined };
    setList(updatedList);

    // Save to DB
    if (list.id) {
      await supabase
        .from('shopping_lists')
        .update({ items: updatedItems, total_actual: totalActual || null })
        .eq('id', list.id);
    }
  };

  const handlePriceLog = async (price: number, store: string) => {
    if (!list || !checkingItem) {
      setPriceLogItem(null);
      setCheckingItem(null);
      return;
    }

    // Log the price
    try {
      await fetch('/api/log-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: checkingItem,
          price,
          store,
        }),
      });
    } catch (err) {
      console.error('Error logging price:', err);
    }

    // Update the item in the list with actual price and store
    const updatedItems = list.items.map(item =>
      item.name === checkingItem ? { ...item, actualPrice: price, store } : item
    );

    const totalActual = updatedItems
      .filter(i => i.checked && i.actualPrice)
      .reduce((sum, i) => sum + (i.actualPrice || 0), 0);

    const updatedList = { ...list, items: updatedItems, total_actual: totalActual || undefined };
    setList(updatedList);

    if (list.id) {
      await supabase
        .from('shopping_lists')
        .update({ items: updatedItems, total_actual: totalActual || null })
        .eq('id', list.id);
    }

    setPriceLogItem(null);
    setCheckingItem(null);
    onRefreshMarket();
  };

  const handlePriceSkip = () => {
    setPriceLogItem(null);
    setCheckingItem(null);
  };

  // Group items by category
  const groupedItems = list?.items.reduce((acc, item, index) => {
    const cat = item.category || 'otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...item, _index: index });
    return acc;
  }, {} as Record<string, (ShoppingListItem & { _index: number })[]>) || {};

  const CATEGORY_LABELS: Record<string, string> = {
    proteinas: '🥩 Proteínas',
    frutas: '🥬 Frutas y Verduras',
    lacteos: '🧀 Lácteos',
    granos: '🌾 Granos y Despensa',
    otros: '🧂 Otros',
  };

  const checkedCount = list?.items.filter(i => i.checked).length || 0;
  const totalCount = list?.items.length || 0;

  if (!list && !loading) {
    return (
      <div className="mb-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Sparkles size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Lista Semanal IA</h3>
              <p className="text-xs text-gray-500">Genera tu lista basada en el menú</p>
            </div>
          </div>
          <button
            onClick={generateList}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            Generar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 rounded-t-xl cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={20} />
            <div>
              <h3 className="font-bold">Lista Semanal IA</h3>
              <p className="text-xs text-white/80">
                {checkedCount}/{totalCount} items • {list?.week_start_date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {list?.total_estimated && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                ~${list.total_estimated.toLocaleString()}
              </span>
            )}
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {/* Budget comparison */}
        {list?.total_estimated && list?.total_actual ? (
          <div className="mt-3 bg-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Estimado: ${list.total_estimated.toLocaleString()}</span>
              <span className="font-bold">Real: ${list.total_actual.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {list.total_actual <= list.total_estimated ? (
                <>
                  <TrendingDown size={14} className="text-green-200" />
                  <span className="text-xs text-green-200">
                    Ahorras ${(list.total_estimated - list.total_actual).toLocaleString()}
                  </span>
                </>
              ) : (
                <>
                  <TrendingUp size={14} className="text-red-200" />
                  <span className="text-xs text-red-200">
                    Sobrepasas ${(list.total_actual - list.total_estimated).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Items */}
      {expanded && list && (
        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-200">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-2 bg-gray-50 text-sm font-semibold text-gray-600 border-b">
                {CATEGORY_LABELS[category] || category}
              </div>
              {items.map((item) => (
                <div
                  key={item._index}
                  className={`flex items-center p-3 px-4 border-b last:border-b-0 transition-colors ${
                    item.checked ? 'bg-green-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItemCheck(item._index)}
                    className="w-5 h-5 mr-3 accent-green-600 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.name}
                      </span>
                      {item.actualPrice ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          ${item.actualPrice.toLocaleString()}
                        </span>
                      ) : item.estimatedPrice ? (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                          ~${item.estimatedPrice.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {item.fromRecipe && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        Para: {item.fromRecipe}
                      </p>
                    )}
                  </div>
                  {item.store && item.checked && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-2">
                      {item.store}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Actions bar */}
          <div className="p-3 bg-gray-50 flex items-center justify-between border-t">
            <button
              onClick={generateList}
              disabled={loading}
              className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
              Regenerar
            </button>

            {savings.length > 0 && (
              <button
                onClick={() => setShowSavings(!showSavings)}
                className="text-green-600 text-sm font-medium flex items-center gap-1 hover:text-green-700"
              >
                <DollarSign size={14} />
                {savings.length} tip{savings.length !== 1 ? 's' : ''} de ahorro
              </button>
            )}
          </div>

          {/* Savings tips */}
          {showSavings && savings.length > 0 && (
            <div className="border-t p-3 bg-green-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <TrendingDown size={14} />
                  Sugerencias de ahorro
                </h4>
                <button onClick={() => setShowSavings(false)} className="p-1">
                  <X size={14} className="text-green-600" />
                </button>
              </div>
              <div className="space-y-2">
                {savings.map((tip, i) => (
                  <div key={i} className="bg-white rounded-lg p-2 px-3 text-sm text-green-700 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>{tip.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price Log Modal */}
      {priceLogItem && (
        <PriceLogModal
          itemName={priceLogItem}
          onSave={handlePriceLog}
          onSkip={handlePriceSkip}
        />
      )}
    </div>
  );
}
