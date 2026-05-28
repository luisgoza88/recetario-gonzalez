"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Wand2,
  ChefHat,
  Timer,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Recipe, MealType } from "@/types";
import type {
  ExpandedRecipe,
  RecipeCategory as ExpandedCategory,
} from "@/data/expanded-recipes";
import { INITIAL_RECIPES } from "@/data/recipes";
import { useToast } from "@/components/ui/Toast";

// =====================================================
// Types
// =====================================================

interface MealSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: "breakfast" | "lunch" | "dinner";
  currentRecipe?: Recipe;
  dayNumber?: number;
  onSwap: (newRecipe: Recipe) => void;
}

// =====================================================
// Constants
// =====================================================

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
};

const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍲",
};

const ALL_CATEGORIES: { value: ExpandedCategory | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "colombiana", label: "Colombiana" },
  { value: "rapida", label: "Rapidas" },
  { value: "fitness", label: "Fitness" },
  { value: "internacional", label: "Internacional" },
  { value: "thermomix", label: "Thermomix" },
  { value: "meal-prep", label: "Meal Prep" },
  { value: "cena-ligera", label: "Cena Ligera" },
];

// =====================================================
// Component
// =====================================================

type CategoryConfigMap = Record<
  string,
  { icon: string; color: string; label: string }
>;

export default function MealSwapModal({
  isOpen,
  onClose,
  mealType,
  currentRecipe,
  onSwap,
}: MealSwapModalProps) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ExpandedCategory | "all"
  >("all");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [lazyExpandedRecipes, setLazyExpandedRecipes] = useState<
    ExpandedRecipe[]
  >([]);
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfigMap>({});

  // Lazy load expanded-recipes (90KB) only when modal is open
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    import("@/data/expanded-recipes").then((mod) => {
      if (!mounted) return;
      setLazyExpandedRecipes(mod.expandedRecipes);
      setCategoryConfig(mod.CATEGORY_CONFIG as CategoryConfigMap);
    });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Combine initial recipes + expanded recipes, filtered by meal type
  const allRecipes = useMemo(() => {
    const initial: Recipe[] = INITIAL_RECIPES.filter(
      (r) => r.type === mealType,
    ).map((r) => ({ ...r }) as Recipe);

    const expanded: Recipe[] = lazyExpandedRecipes
      .filter((r) => r.type === mealType)
      .map(
        (r) =>
          ({
            ...r,
            ingredients: r.ingredients,
            steps: r.steps,
          }) as Recipe,
      );

    // Merge, deduplicate by id
    const seen = new Set<string>();
    const merged: Recipe[] = [];
    for (const r of [...initial, ...expanded]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }

    return merged;
  }, [mealType, lazyExpandedRecipes]);

  // Filter recipes based on search and category
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe) => {
      // Exclude current recipe
      if (currentRecipe && recipe.id === currentRecipe.id) return false;

      // Category filter
      if (selectedCategory !== "all") {
        const cat = (recipe as Recipe & { category?: string }).category;
        if (cat && cat !== selectedCategory) return false;
        if (!cat) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = recipe.name.toLowerCase().includes(q);
        const ingredientMatch = recipe.ingredients.some((ing) =>
          ing.name.toLowerCase().includes(q),
        );
        const tagMatch = (recipe.tags || []).some((t: string) =>
          t.toLowerCase().includes(q),
        );
        return nameMatch || ingredientMatch || tagMatch;
      }

      return true;
    });
  }, [allRecipes, searchQuery, selectedCategory, currentRecipe]);

  // AI suggestion handler
  const handleAISuggestion = async () => {
    setIsLoadingAI(true);
    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType,
          style: "saludable",
          useInventory: true,
        }),
      });
      const data = await res.json();
      if (data.recipe) {
        const aiRecipe: Recipe = {
          id: `ai-swap-${Date.now()}`,
          name: data.recipe.name || "Receta IA",
          type: mealType,
          ingredients: (data.recipe.ingredients || []).map(
            (ing: {
              name: string;
              total?: string;
              luis: string;
              mariana: string;
            }) => ({
              name: ing.name,
              total: ing.total || "",
              luis: ing.luis,
              mariana: ing.mariana,
            }),
          ),
          steps: data.recipe.steps || [],
          description: data.recipe.description,
          tips: data.recipe.tips,
          source: "ai_generated",
        };
        onSwap(aiRecipe);
        toast.success(`Receta IA aplicada: ${aiRecipe.name}`);
        onClose();
      } else {
        toast.error("No se pudo generar una sugerencia IA");
      }
    } catch {
      toast.error("Error al generar sugerencia IA");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    onSwap(recipe);
    onClose();
  };

  return (
    <BottomSheet
      open={isOpen}
      onClose={onClose}
      title={`Cambiar ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`}
      description={currentRecipe ? `Actual: ${currentRecipe.name}` : undefined}
      maxHeight="88vh"
      footer={
        <button
          onClick={handleAISuggestion}
          disabled={isLoadingAI}
          className="w-full flex items-center justify-center gap-2 py-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-[13px] font-semibold hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
          {isLoadingAI ? (
            <>
              <Spinner size="sm" />
              Generando receta...
            </>
          ) : (
            <>
              <Wand2 size={14} />
              Generar receta nueva con IA
            </>
          )}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Current recipe summary */}
        {currentRecipe && (
          <div className="bg-stone-100 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1.5">
              Actualmente
            </p>
            <div className="flex items-center gap-2.5">
              <UtensilsCrossed size={16} className="text-[var(--accent)]" />
              <p className="text-[13.5px] font-semibold text-[var(--ink)] leading-tight">
                {currentRecipe.name}
              </p>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
          />
          <input
            type="text"
            placeholder="Buscar receta por nombre o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none text-[14px]"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1.5 rounded-full text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? "bg-[var(--ink)] text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {cat.value !== "all" &&
                categoryConfig[cat.value as ExpandedCategory]?.icon + " "}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Recipe list */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-8 text-[var(--ink-soft)]">
            <ChefHat size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              No se encontraron recetas
              {searchQuery ? ` para "${searchQuery}"` : ""}
            </p>
            <p className="text-xs mt-1">
              Intenta con otra busqueda o categoria
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
              {filteredRecipes.length} alternativa
              {filteredRecipes.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {filteredRecipes.map((recipe) => (
                <RecipeSwapCard
                  key={recipe.id}
                  recipe={recipe}
                  mealType={mealType}
                  categoryConfig={categoryConfig}
                  onSelect={() => handleSelectRecipe(recipe)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// =====================================================
// Recipe Card for swap list
// =====================================================

function RecipeSwapCard({
  recipe,
  mealType,
  categoryConfig,
  onSelect,
}: {
  recipe: Recipe;
  mealType: MealType;
  categoryConfig: CategoryConfigMap;
  onSelect: () => void;
}) {
  const category = (recipe as Recipe & { category?: ExpandedCategory })
    .category;
  const prepTime = recipe.prep_time;
  const cookTime = recipe.cook_time;
  const totalTime =
    prepTime && cookTime ? prepTime + cookTime : prepTime || cookTime;

  // Show first 3 ingredients
  const ingredientPreview = recipe.ingredients
    .slice(0, 3)
    .map((ing) => ing.name)
    .join(", ");

  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-xl border border-[var(--border)] p-3 text-left hover:border-[var(--accent)] active:bg-stone-50 transition-colors flex items-center gap-3"
    >
      {/* Emoji thumbnail */}
      <div className="w-14 h-14 shrink-0 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-2xl">
        {MEAL_TYPE_EMOJI[mealType]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-[var(--ink)] leading-tight truncate">
          {recipe.name}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {totalTime && (
            <span className="text-[10.5px] text-[var(--ink-soft)] flex items-center gap-0.5 tabular-nums">
              <Timer size={9} />
              {totalTime}m
            </span>
          )}
          {category && categoryConfig[category] && (
            <span className="text-[10.5px] text-[var(--ink-soft)]">
              {categoryConfig[category].icon} {categoryConfig[category].label}
            </span>
          )}
        </div>

        {/* Ingredient preview */}
        <p className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
          {ingredientPreview}
          {recipe.ingredients.length > 3
            ? ` +${recipe.ingredients.length - 3} mas`
            : ""}
        </p>
      </div>

      <ChevronRight size={16} className="text-stone-300 shrink-0" />
    </button>
  );
}
