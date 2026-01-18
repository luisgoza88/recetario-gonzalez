'use client';

import RecetarioSubNav from '../navigation/RecetarioSubNav';
import CalendarView from '../CalendarView';
import MarketView from '../MarketView';
import RecipesView from '../RecipesView';
import SuggestionsPanel from '../SuggestionsPanel';
import { Recipe, MarketItem } from '@/types';

type RecetarioTab = 'calendar' | 'market' | 'recipes' | 'suggestions';

interface RecetarioSectionProps {
  activeTab: RecetarioTab;
  onTabChange: (tab: RecetarioTab) => void;
  recipes: Recipe[];
  marketItems: MarketItem[];
  pendingSuggestions: number;
  onUpdate: () => void;
}

export default function RecetarioSection({
  activeTab,
  onTabChange,
  recipes,
  marketItems,
  pendingSuggestions,
  onUpdate
}: RecetarioSectionProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <RecetarioSubNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        pendingSuggestions={pendingSuggestions}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'calendar' && (
          <CalendarView recipes={recipes} />
        )}

        {activeTab === 'market' && (
          <MarketView items={marketItems} onUpdate={onUpdate} />
        )}

        {activeTab === 'recipes' && (
          <RecipesView recipes={recipes} onUpdate={onUpdate} />
        )}

        {activeTab === 'suggestions' && (
          <div className="p-4 max-w-lg mx-auto">
            <SuggestionsPanel onUpdate={onUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}
