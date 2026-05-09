"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  Sparkles,
  ChefHat,
  Clock,
  ArrowLeftRight,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Recipe, MealType } from "@/types";
import type {
  ExpandedRecipe,
  RecipeCategory as ExpandedCategory,
} from "@/data/expanded-recipes";
import { INITIAL_RECIPES } from "@/data/recipes";
import { useEscapeKey } from "@/hooks/useEscapeKey";
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

const DIFFICULTY_COLORS: Record<string, string> = {
  facil: "bg-green-100 text-green-700",
  media: "bg-yellow-100 text-yellow-700",
  dificil: "bg-red-100 text-red-700",
};

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

  useEscapeKey(onClose, isOpen);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={20} />
            <div>
              <h3 className="font-semibold text-lg">
                Cambiar {MEAL_TYPE_LABELS[mealType]}
              </h3>
              {currentRecipe && (
                <p className="text-white/80 text-sm truncate max-w-[250px]">
                  Actual: {currentRecipe.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="p-4 space-y-3 border-b shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar receta por nombre o ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              autoFocus
            />
          </div>

          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.value !== "all" &&
                  categoryConfig[cat.value as ExpandedCategory]?.icon + " "}
                {cat.label}
              </button>
            ))}
          </div>

          {/* AI suggestion button */}
          <button
            onClick={handleAISuggestion}
            disabled={isLoadingAI}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all"
          >
            {isLoadingAI ? (
              <>
                <Spinner size="sm" />
                Generando sugerencia...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Sugerencia IA (basada en inventario)
              </>
            )}
          </button>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
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
            <>
              <p className="text-xs text-gray-400 mb-2">
                {filteredRecipes.length} receta
                {filteredRecipes.length !== 1 ? "s" : ""} disponible
                {filteredRecipes.length !== 1 ? "s" : ""}
              </p>
              {filteredRecipes.map((recipe) => (
                <RecipeSwapCard
                  key={recipe.id}
                  recipe={recipe}
                  categoryConfig={categoryConfig}
                  onSelect={() => handleSelectRecipe(recipe)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Recipe Card for swap list
// =====================================================

function RecipeSwapCard({
  recipe,
  categoryConfig,
  onSelect,
}: {
  recipe: Recipe;
  categoryConfig: CategoryConfigMap;
  onSelect: () => void;
}) {
  const category = (recipe as Recipe & { category?: ExpandedCategory })
    .category;
  const difficulty = recipe.difficulty;
  const prepTime = recipe.prep_time;
  const cookTime = recipe.cook_time;
  const totalTime =
    prepTime && cookTime ? prepTime + cookTime : prepTime || cookTime;

  // Show first 3 ingredients
  const ingredientPreview = recipe.ingredients
    .slice(0, 3)
    .map((ing) => ing.name)
    .join(", ");

  // Normalize difficulty for color lookup (remove accents)
  const difficultyKey = difficulty
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    <div className="border border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-800 truncate">
            {recipe.name}
          </h4>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1 mt-1">
            {category && categoryConfig[category] && (
              <span
                className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${categoryConfig[category].color}`}
              >
                {categoryConfig[category].icon} {categoryConfig[category].label}
              </span>
            )}
            {difficulty && difficultyKey && (
              <span
                className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${DIFFICULTY_COLORS[difficultyKey] || "bg-gray-100 text-gray-600"}`}
              >
                {difficulty}
              </span>
            )}
            {totalTime && (
              <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-0.5">
                <Clock size={10} />
                {totalTime} min
              </span>
            )}
          </div>

          {/* Ingredient preview */}
          <p className="text-xs text-gray-400 mt-1 truncate">
            {ingredientPreview}
            {recipe.ingredients.length > 3
              ? ` +${recipe.ingredients.length - 3} mas`
              : ""}
          </p>
        </div>

        <button
          onClick={onSelect}
          className="shrink-0 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors group-hover:bg-indigo-600 group-hover:text-white"
        >
          Seleccionar
        </button>
      </div>
    </div>
  );
}
