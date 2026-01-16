'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { MarketItem } from '@/types';
import { CATEGORY_EMOJIS } from '@/data/market';

interface MarketViewProps {
  items: MarketItem[];
  onUpdate: () => void;
}

export default function MarketView({ items, onUpdate }: MarketViewProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const toggleItem = async (item: MarketItem) => {
    setLoading(item.id);

    try {
      if (item.checked) {
        // Desmarcar
        await supabase
          .from('market_checklist')
          .delete()
          .eq('item_id', item.id);
      } else {
        // Marcar
        await supabase
          .from('market_checklist')
          .upsert({
            item_id: item.id,
            checked: true,
            checked_at: new Date().toISOString()
          });
      }

      onUpdate();
    } catch (error) {
      console.error('Error toggling item:', error);
    } finally {
      setLoading(null);
    }
  };

  const resetMarket = async () => {
    if (!confirm('¿Reiniciar toda la lista de mercado?')) return;

    try {
      await supabase.from('market_checklist').delete().neq('item_id', '');
      onUpdate();
    } catch (error) {
      console.error('Error resetting market:', error);
    }
  };

  // Agrupar items por categoría
  const categories = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MarketItem[]>);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Progress Header */}
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

      {/* Categories */}
      {Object.entries(categories).map(([category, categoryItems]) => (
        <div key={category} className="mb-4">
          <div className="bg-green-700 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
            <span>{CATEGORY_EMOJIS[category] || '📦'}</span>
            {category}
          </div>
          <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
            {categoryItems.map(item => (
              <label
                key={item.id}
                className={`
                  flex items-center p-4 border-b last:border-b-0 cursor-pointer transition-colors
                  ${item.checked ? 'bg-green-50' : 'hover:bg-gray-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item)}
                  disabled={loading === item.id}
                  className="w-6 h-6 mr-4 accent-green-700 cursor-pointer"
                />
                <span className={`flex-1 ${item.checked ? 'line-through text-gray-400' : ''}`}>
                  {item.name}
                </span>
                <span className={`
                  text-sm px-3 py-1 rounded-full font-semibold
                  ${item.checked
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'}
                `}>
                  {item.quantity}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
