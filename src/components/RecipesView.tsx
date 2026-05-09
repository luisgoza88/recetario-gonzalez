"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import { Search, Plus, Edit2, Trash2, ImageIcon } from "lucide-react";
import { Recipe, Ingredient, RecipeCategory, ColombianRegion } from "@/types";
import type { ExpandedRecipe } from "@/data/expanded-recipes";
import type { RegionalRecipe } from "@/data/regional-colombian-recipes";
import { CanEdit } from "@/components/auth/RoleGate";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import dynamic from "next/dynamic";
import { MOODS, Mood } from "@/lib/moods";
import { MoodChip } from "@/components/ui/MoodChip";

const RecipeModal = dynamic(() => import("./RecipeModal"), {
  loading: () => null,
  ssr: false,
});
const RecipeForm = dynamic(() => import("./forms/RecipeForm"), {
  loading: () => null,
  ssr: false,
});

interface RecipesViewProps {
  recipes: Recipe[];
  onUpdate: () => void;
}

// Category filter options
const CATEGORY_FILTERS: Array<{
  key: "all" | RecipeCategory;
  label: string;
  icon: string;
}> = [
  { key: "all", label: "Todas", icon: "📋" },
  { key: "colombiana", label: "Colombiana", icon: "🇨🇴" },
  { key: "rapida", label: "Rápida", icon: "⚡" },
  { key: "thermomix", label: "Thermomix", icon: "🤖" },
  { key: "fitness", label: "Fitness", icon: "💪" },
  { key: "internacional", label: "Internacional", icon: "🍝" },
  { key: "meal-prep", label: "Meal Prep", icon: "🥘" },
  { key: "cena-ligera", label: "Cena Ligera", icon: "🌙" },
];

// Region filter options (shown when "Colombiana" is selected)
const REGION_FILTERS: Array<{
  key: "all" | ColombianRegion;
  label: string;
  icon: string;
}> = [
  { key: "all", label: "Todas las regiones", icon: "🗺️" },
  { key: "Andina", label: "Andina", icon: "🏔️" },
  { key: "Costa Caribe", label: "Costa Caribe", icon: "🏖️" },
  { key: "Pacífico", label: "Pacífico", icon: "🌊" },
  { key: "Llanos", label: "Llanos", icon: "🐄" },
  { key: "Santander", label: "Santander", icon: "🐐" },
  { key: "Valle del Cauca", label: "Valle del Cauca", icon: "🌿" },
  { key: "Tolima-Huila", label: "Tolima-Huila", icon: "🌾" },
];

export default function RecipesView({ recipes, onUpdate }: RecipesViewProps) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Lazy-loaded data to avoid including large static files in the initial bundle
  const [expandedRecipes, setExpandedRecipes] = useState<ExpandedRecipe[]>([]);
  const [categoryConfig, setCategoryConfig] = useState<
    Record<string, { icon: string; color: string; label: string }>
  >({});
  const [regionalRecipes, setRegionalRecipes] = useState<RegionalRecipe[]>([]);
  const [regionConfig, setRegionConfig] = useState<
    Record<string, { icon: string; color: string; label: string }>
  >({});

  useEffect(() => {
    let mounted = true;
    Promise.all([
      import("@/data/expanded-recipes"),
      import("@/data/regional-colombian-recipes"),
    ]).then(([expandedMod, regionalMod]) => {
      if (!mounted) return;
      setExpandedRecipes(expandedMod.expandedRecipes);
      setCategoryConfig(
        expandedMod.CATEGORY_CONFIG as Record<
          string,
          { icon: string; color: string; label: string }
        >,
      );
      setRegionalRecipes(regionalMod.regionalRecipes);
      setRegionConfig(
        regionalMod.REGION_CONFIG as Record<
          string,
          { icon: string; color: string; label: string }
        >,
      );
    });
    return () => {
      mounted = false;
    };
  }, []);
  const [filter, setFilter] = useState<
    "all" | "breakfast" | "lunch" | "dinner"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | RecipeCategory>(
    "all",
  );
  const [confirmDeleteRecipe, setConfirmDeleteRecipe] = useState<Recipe | null>(
    null,
  );
  const [regionFilter, setRegionFilter] = useState<"all" | ColombianRegion>(
    "all",
  );
  const [moodFilters, setMoodFilters] = useState<Mood[]>([]);

  const toggleMoodFilter = useCallback((mood: Mood) => {
    setMoodFilters((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood],
    );
  }, []);

  // Combine DB recipes with expanded recipes and regional recipes (avoiding id duplicates)
  const allRecipes = useMemo(() => {
    const dbIds = new Set(recipes.map((r) => r.id));

    const mapExpandedToRecipe = (
      er: ExpandedRecipe | RegionalRecipe,
    ): Recipe => ({
      id: er.id,
      name: er.name,
      type: er.type,
      portions: er.portions,
      ingredients: er.ingredients,
      steps: er.steps,
      prep_time: er.prep_time,
      cook_time: er.cook_time,
      total_time: (er as RegionalRecipe).total_time,
      category: er.category,
      region: (er as RegionalRecipe).region,
      thermomixCompatible: er.thermomixCompatible,
      tags: er.tags,
      nutrition: (er as RegionalRecipe).nutrition,
      difficulty: (er as RegionalRecipe).difficulty,
      dietary_tags: (er as RegionalRecipe).dietary_tags,
      description: (er as RegionalRecipe).description,
      source: "manual" as const,
    });

    const expandedAsRecipes: Recipe[] = expandedRecipes
      .filter((er) => !dbIds.has(er.id))
      .map(mapExpandedToRecipe);

    const regionalAsRecipes: Recipe[] = regionalRecipes
      .filter((rr) => !dbIds.has(rr.id))
      .map(mapExpandedToRecipe);

    return [...recipes, ...expandedAsRecipes, ...regionalAsRecipes];
  }, [recipes]);

  // Memoizar filtrado de recetas para evitar recálculos innecesarios
  const filteredRecipes = useMemo(() => {
    return allRecipes.filter((recipe) => {
      const searchLower = search.toLowerCase();
      const matchesName = recipe.name.toLowerCase().includes(searchLower);
      const matchesIngredient = (recipe.ingredients as Ingredient[]).some(
        (ing) => ing.name.toLowerCase().includes(searchLower),
      );
      const matchesTag =
        recipe.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ??
        false;
      const matchesSearch =
        !search || matchesName || matchesIngredient || matchesTag;
      const matchesFilter = filter === "all" || recipe.type === filter;

      // Category filter
      const matchesCategory =
        categoryFilter === "all" || recipe.category === categoryFilter;

      // Region filter (only applies when colombiana is selected)
      // Recipes without a region that are "colombiana" are treated as "Andina"
      const effectiveRegion =
        recipe.region ||
        (recipe.category === "colombiana" ? "Andina" : undefined);
      const matchesRegion =
        regionFilter === "all" || effectiveRegion === regionFilter;

      // Mood filter: recipe must have at least one of the selected moods
      const matchesMood =
        moodFilters.length === 0 ||
        (recipe.moods ?? []).some((m) => moodFilters.includes(m));

      return (
        matchesSearch &&
        matchesFilter &&
        matchesCategory &&
        matchesRegion &&
        matchesMood
      );
    });
  }, [allRecipes, search, filter, categoryFilter, regionFilter, moodFilters]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "breakfast":
        return "Desayuno";
      case "lunch":
        return "Almuerzo";
      case "dinner":
        return "Cena";
      default:
        return type;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case "breakfast":
        return "bg-orange-100 text-orange-700";
      case "lunch":
        return "bg-green-100 text-green-700";
      case "dinner":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Get badge info for a recipe
  const getRecipeBadges = (recipe: Recipe) => {
    const badges: Array<{ label: string; className: string }> = [];
    if (recipe.thermomixCompatible) {
      badges.push({
        label: "🤖 TM6",
        className: "bg-purple-100 text-purple-700",
      });
    }
    if (recipe.category === "fitness") {
      badges.push({ label: "💪", className: "bg-green-100 text-green-700" });
    }
    if (recipe.category === "rapida") {
      badges.push({ label: "⚡", className: "bg-blue-100 text-blue-700" });
    }
    if (recipe.category && categoryConfig[recipe.category as RecipeCategory]) {
      const cfg = categoryConfig[recipe.category as RecipeCategory];
      badges.push({ label: cfg.icon, className: cfg.color });
    }
    // Region badge for Colombian regional recipes
    if (recipe.region && regionConfig[recipe.region]) {
      const regionCfg = regionConfig[recipe.region];
      badges.push({
        label: `${regionCfg.icon} ${regionCfg.label}`,
        className: regionCfg.color,
      });
    }
    return badges;
  };

  // Memoizar handlers para evitar re-renders de componentes hijos
  const handleDelete = useCallback(
    async (recipe: Recipe) => {
      try {
        // Only delete from DB if it's a DB recipe (not expanded)
        if (recipe.id.match(/^(col|rap|thm|fit|int|mp|cl|reg)-/)) {
          toast.error("Las recetas de la biblioteca no se pueden eliminar");
          return;
        }
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", recipe.id);

        if (error) throw error;
        onUpdate();
      } catch (error) {
        console.error("Error deleting recipe:", error);
        toast.error("Error al eliminar la receta");
      }
    },
    [onUpdate, toast],
  );

  const handleEdit = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingRecipe(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingRecipe(null);
    onUpdate();
  }, [onUpdate]);

  // Check if recipe is from expanded library (not editable/deletable from DB)
  const isExpandedRecipe = (recipe: Recipe) => {
    return recipe.id.match(/^(col|rap|thm|fit|int|mp|cl|reg)-/);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Search */}
      <div className="relative mb-3">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Buscar por nombre, ingrediente o tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-700"
        />
      </div>

      {/* Category Filter - Scrollable horizontal chips */}
      <div
        className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setCategoryFilter(cat.key);
              if (cat.key !== "colombiana") setRegionFilter("all");
            }}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
              ${
                categoryFilter === cat.key
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
              }
            `}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Region Filter - Shown when "Colombiana" category is selected */}
      {categoryFilter === "colombiana" && (
        <div
          className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {REGION_FILTERS.map((reg) => (
            <button
              key={reg.key}
              onClick={() => setRegionFilter(reg.key)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
                ${
                  regionFilter === reg.key
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                }
              `}
            >
              <span>{reg.icon}</span>
              <span>{reg.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mood Filter */}
      <div
        className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="group"
        aria-label="Filtrar por mood"
      >
        <button
          onClick={() => setMoodFilters([])}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
            moodFilters.length === 0
              ? "bg-green-700 text-white border-green-700"
              : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
          }`}
        >
          <span>📋</span>
          <span>Todos</span>
        </button>
        {MOODS.map((m) => (
          <MoodChip
            key={m.id}
            mood={m.id}
            selected={moodFilters.includes(m.id)}
            onClick={() => toggleMoodFilter(m.id)}
          />
        ))}
      </div>

      {/* Meal Type Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(["all", "breakfast", "lunch", "dinner"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${
                filter === type
                  ? "bg-green-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            {type === "all" ? "Todas" : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-3">
        {filteredRecipes.length} receta{filteredRecipes.length !== 1 ? "s" : ""}
        {categoryFilter !== "all" &&
          ` en ${CATEGORY_FILTERS.find((c) => c.key === categoryFilter)?.label}`}
        {regionFilter !== "all" &&
          ` - ${REGION_FILTERS.find((r) => r.key === regionFilter)?.label}`}
      </p>

      {/* Add Button */}
      <CanEdit what="recipes">
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 p-4 bg-green-50 text-green-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors border-2 border-dashed border-green-300"
        >
          <Plus size={20} />
          Agregar nueva receta
        </button>
      </CanEdit>

      {/* Recipe List */}
      <div className="space-y-3">
        {filteredRecipes.map((recipe) => {
          const badges = getRecipeBadges(recipe);
          const isLibrary = isExpandedRecipe(recipe);

          return (
            <div
              key={recipe.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex">
                {/* Thumbnail */}
                <div
                  className="w-24 h-24 flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  {recipe.image_url ? (
                    <Image
                      src={recipe.image_url}
                      alt={recipe.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-3 flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <h3 className="font-semibold mb-1 line-clamp-2 text-sm">
                      {recipe.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${getTypeClass(recipe.type)}`}
                      >
                        {getTypeLabel(recipe.type)}
                      </span>
                      {badges.slice(0, 3).map((badge, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                    {recipe.prep_time !== undefined &&
                      recipe.cook_time !== undefined && (
                        <p className="text-[10px] text-gray-400">
                          ⏱️ {(recipe.prep_time || 0) + (recipe.cook_time || 0)}{" "}
                          min
                        </p>
                      )}
                  </div>
                  {!isLibrary && (
                    <CanEdit what="recipes">
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(recipe)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteRecipe(recipe)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </CanEdit>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl block mb-4">🍽️</span>
            {search ? "No se encontraron recetas" : "No hay recetas aún"}
          </div>
        )}
      </div>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {/* Recipe Form */}
      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteRecipe}
        onConfirm={() => {
          if (confirmDeleteRecipe) handleDelete(confirmDeleteRecipe);
          setConfirmDeleteRecipe(null);
        }}
        onCancel={() => setConfirmDeleteRecipe(null)}
        title="Eliminar receta"
        message={`¿Eliminar la receta "${confirmDeleteRecipe?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
