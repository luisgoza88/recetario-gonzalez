"use client";

import CalendarView from "../CalendarView";
import MarketView from "../MarketView";
import RecipesView from "../RecipesView";
import SuggestionsPanel from "../SuggestionsPanel";
import DietsView from "../DietsView";
import type { Recipe, MarketItem, RecetarioTab } from "@/types";

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
  onUpdate,
}: RecetarioSectionProps) {
  // Handler para navegación desde SuggestionsPanel
  const handleNavigateFromSuggestions = (tab: string) => {
    // Navegar al tab correspondiente
    if (
      tab === "calendar" ||
      tab === "market" ||
      tab === "recipes" ||
      tab === "diets" ||
      tab === "suggestions"
    ) {
      onTabChange(tab as RecetarioTab);
    }
    // El mode se puede usar para configurar el estado inicial del MarketView (shopping/pantry)
    // Por ahora, el MarketView maneja su propio estado interno
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content - Sin sub-navigation arriba, ahora está en el BottomNavigation */}
      <div className="flex-1 overflow-auto pb-12">
        {activeTab === "calendar" && <CalendarView recipes={recipes} />}

        {activeTab === "market" && (
          <MarketView items={marketItems} onUpdate={onUpdate} />
        )}

        {activeTab === "recipes" && (
          <RecipesView
            recipes={recipes}
            onUpdate={onUpdate}
            onOpenCalendar={() => onTabChange("calendar")}
            onOpenDiets={() => onTabChange("diets")}
          />
        )}

        {activeTab === "diets" && (
          <DietsView
            recipes={recipes}
            onOpenRecipes={() => onTabChange("recipes")}
            onOpenCalendar={() => onTabChange("calendar")}
          />
        )}

        {activeTab === "suggestions" && (
          <SuggestionsPanel
            onUpdate={onUpdate}
            onNavigate={handleNavigateFromSuggestions}
          />
        )}
      </div>
    </div>
  );
}
