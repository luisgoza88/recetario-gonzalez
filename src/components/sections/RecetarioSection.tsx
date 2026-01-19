'use client';

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
  onUpdate
}: RecetarioSectionProps) {
  // Handler para navegación desde SuggestionsPanel
  const handleNavigateFromSuggestions = (tab: string, mode?: string) => {
    // Navegar al tab correspondiente
    if (tab === 'calendar' || tab === 'market' || tab === 'recipes' || tab === 'suggestions') {
      onTabChange(tab as RecetarioTab);
    }
    // El mode se puede usar para configurar el estado inicial del MarketView (shopping/pantry)
    // Por ahora, el MarketView maneja su propio estado interno
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content - Sin sub-navigation arriba, ahora está en el BottomNavigation */}
      <div className="flex-1 overflow-auto pb-12">
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
            <SuggestionsPanel
              onUpdate={onUpdate}
              onNavigate={handleNavigateFromSuggestions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
