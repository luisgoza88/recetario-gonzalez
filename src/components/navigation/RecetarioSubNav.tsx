'use client';

import { Calendar, ShoppingCart, BookOpen, Lightbulb } from 'lucide-react';

type RecetarioTab = 'calendar' | 'market' | 'recipes' | 'suggestions';

interface RecetarioSubNavProps {
  activeTab: RecetarioTab;
  onTabChange: (tab: RecetarioTab) => void;
  pendingSuggestions?: number;
}

const TABS: { id: RecetarioTab; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar', label: 'Calendario', icon: <Calendar size={18} /> },
  { id: 'market', label: 'Mercado', icon: <ShoppingCart size={18} /> },
  { id: 'recipes', label: 'Recetas', icon: <BookOpen size={18} /> },
  { id: 'suggestions', label: 'Sugerencias', icon: <Lightbulb size={18} /> },
];

export default function RecetarioSubNav({
  activeTab,
  onTabChange,
  pendingSuggestions = 0
}: RecetarioSubNavProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'suggestions' && pendingSuggestions > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 whitespace-nowrap
                border-b-2 transition-all duration-200 flex-1 justify-center
                ${isActive
                  ? 'border-green-600 text-green-700 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {tab.icon}
              <span className="text-sm font-medium">{tab.label}</span>
              {showBadge && (
                <span className="ml-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {pendingSuggestions > 9 ? '9+' : pendingSuggestions}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
