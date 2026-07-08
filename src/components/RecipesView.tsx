"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ImageIcon,
  BookOpen,
  Coffee,
  UtensilsCrossed,
  Moon,
  Soup,
  Sparkles,
} from "lucide-react";
import { Recipe, Ingredient, RecipeCategory, ColombianRegion } from "@/types";
import RecipeCard from "@/components/ui/RecipeCard";
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
  { key: "Amazonía", label: "Amazonía", icon: "🌳" },
  { key: "Insular", label: "Insular", icon: "🏝️" },
];

// Cuisine filter options (shown when "Internacional" is selected).
// Matches against recipe.tags (first tag = cuisine slug).
const CUISINE_FILTERS: Array<{ key: string; label: string; icon: string }> = [
  { key: "all", label: "Todas las cocinas", icon: "🌍" },
  { key: "mexicana", label: "Mexicana", icon: "🇲🇽" },
  { key: "peruana", label: "Peruana", icon: "🇵🇪" },
  { key: "italiana", label: "Italiana", icon: "🇮🇹" },
  { key: "espanola", label: "Española", icon: "🇪🇸" },
  { key: "argentina", label: "Argentina", icon: "🇦🇷" },
  { key: "venezolana", label: "Venezolana", icon: "🇻🇪" },
  { key: "francesa", label: "Francesa", icon: "🇫🇷" },
  { key: "india", label: "India", icon: "🇮🇳" },
  { key: "china", label: "China", icon: "🇨🇳" },
  { key: "japonesa", label: "Japonesa", icon: "🇯🇵" },
  { key: "tailandesa", label: "Tailandesa", icon: "🇹🇭" },
  { key: "coreana", label: "Coreana", icon: "🇰🇷" },
  { key: "vietnamita", label: "Vietnamita", icon: "🇻🇳" },
  { key: "griega", label: "Griega", icon: "🇬🇷" },
  { key: "arabe", label: "Árabe", icon: "🥙" },
  { key: "libanesa", label: "Libanesa", icon: "🇱🇧" },
  { key: "americana", label: "Americana", icon: "🇺🇸" },
  { key: "cubana", label: "Cubana", icon: "🇨🇺" },
  { key: "moderna", label: "Moderna", icon: "🥗" },
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
    "all" | "breakfast" | "lunch" | "dinner" | "dessert" | "snack" | "thermomix"
  >("all");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
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
      // Meal type filter. El chip "thermomix" (TM6) filtra por el campo
      // existente recipe.thermomixCompatible (no por un set de IDs).
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "thermomix"
            ? recipe.thermomixCompatible === true
            : recipe.type === filter;

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

      // Cuisine filter (only applies when internacional is selected)
      const matchesCuisine =
        cuisineFilter === "all" || (recipe.tags ?? []).includes(cuisineFilter);

      return (
        matchesSearch &&
        matchesFilter &&
        matchesCategory &&
        matchesRegion &&
        matchesMood &&
        matchesCuisine
      );
    });
  }, [
    allRecipes,
    search,
    filter,
    categoryFilter,
    regionFilter,
    moodFilters,
    cuisineFilter,
  ]);

  // Total de recetas TM6 disponibles (para el banner del filtro Thermomix)
  const thermomixCount = useMemo(
    () => allRecipes.filter((r) => r.thermomixCompatible === true).length,
    [allRecipes],
  );

  const isThermomix = filter === "thermomix";

  // "Descubre": cocina del día, rota con la fecha. Se calcula en cliente
  // (useEffect) para no desincronizar el HTML del servidor con el hidratado.
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  useEffect(() => {
    setDayIndex(Math.floor(Date.now() / 86_400_000));
  }, []);

  const discovery = useMemo(() => {
    if (dayIndex === null) return null;
    const cuisines = CUISINE_FILTERS.filter((c) => c.key !== "all");
    for (let i = 0; i < cuisines.length; i++) {
      const cuisine = cuisines[(dayIndex + i) % cuisines.length];
      const matches = allRecipes.filter((r) =>
        (r.tags ?? []).includes(cuisine.key),
      );
      if (matches.length >= 3) return { cuisine, recipes: matches.slice(0, 8) };
    }
    return null;
  }, [allRecipes, dayIndex]);

  const showDiscovery =
    discovery !== null &&
    !search &&
    filter === "all" &&
    categoryFilter === "all" &&
    regionFilter === "all" &&
    cuisineFilter === "all" &&
    moodFilters.length === 0;

  // Meal-type chips (incluye TM6 dark)
  const TYPE_CHIPS: Array<{
    id:
      | "all"
      | "breakfast"
      | "lunch"
      | "dinner"
      | "dessert"
      | "snack"
      | "thermomix";
    label: string;
    Icon: typeof BookOpen;
    dark?: boolean;
  }> = [
    { id: "all", label: "Todas", Icon: BookOpen },
    { id: "breakfast", label: "Desayunos", Icon: Coffee },
    { id: "lunch", label: "Almuerzos", Icon: UtensilsCrossed },
    { id: "dinner", label: "Cenas", Icon: Moon },
    { id: "dessert", label: "Postres", Icon: Sparkles },
    { id: "snack", label: "Snacks", Icon: Soup },
    { id: "thermomix", label: "TM6", Icon: Soup, dark: true },
  ];

  // Memoizar handlers para evitar re-renders de componentes hijos
  const handleDelete = useCallback(
    async (recipe: Recipe) => {
      try {
        // Only delete from DB if it's a DB recipe (not expanded)
        if (recipe.id.match(/^(col|rap|thm|tm6|fit|int|mp|cl|reg)-/)) {
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
    return recipe.id.match(/^(col|rap|thm|tm6|fit|int|mp|cl|reg)-/);
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
              if (cat.key !== "internacional") setCuisineFilter("all");
            }}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
              ${
                categoryFilter === cat.key
                  ? "bg-orange-500 text-white border-green-700"
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

      {/* Cuisine Filter - Shown when "Internacional" category is selected */}
      {categoryFilter === "internacional" && (
        <div
          className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
          role="group"
          aria-label="Filtrar por cocina del mundo"
        >
          {CUISINE_FILTERS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCuisineFilter(c.key)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
                ${
                  cuisineFilter === c.key
                    ? "bg-sky-700 text-white border-sky-700"
                    : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
                }
              `}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
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
              ? "bg-orange-500 text-white border-green-700"
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

      {/* Meal Type Filter Chips (incluye TM6 dark) */}
      <div
        className="flex gap-1.5 mb-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="group"
        aria-label="Filtrar por tipo de comida"
      >
        {TYPE_CHIPS.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                active
                  ? chip.dark
                    ? "bg-slate-900 text-white"
                    : "bg-[var(--ink)] text-white"
                  : "bg-stone-100 text-[var(--ink-soft)] hover:bg-stone-200"
              }`}
            >
              <chip.Icon size={11} />
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* TM6 banner full-width cuando el filtro Thermomix está activo */}
      {isThermomix && (
        <div className="mb-4 bg-slate-900 text-white rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <Soup size={16} />
          </div>
          <div className="flex-1">
            <p className="text-[12.5px] font-semibold">
              Recetas adaptadas a Thermomix
            </p>
            <p className="text-[10.5px] text-white/70 tabular-nums">
              {thermomixCount} receta{thermomixCount !== 1 ? "s" : ""} TM6
            </p>
          </div>
          <Sparkles size={14} className="text-white/80" />
        </div>
      )}

      {/* Descubre: cocina del día */}
      {showDiscovery && discovery && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
              Descubre · Cocina {discovery.cuisine.label.toLowerCase()}{" "}
              {discovery.cuisine.icon}
            </p>
            <button
              onClick={() => {
                setCategoryFilter("internacional");
                setCuisineFilter(discovery.cuisine.key);
              }}
              className="text-[11px] font-semibold text-green-700"
            >
              Ver todas
            </button>
          </div>
          <div
            className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {discovery.recipes.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRecipe(r)}
                className="w-32 shrink-0 text-left"
              >
                <div className="w-32 h-20 rounded-xl overflow-hidden relative bg-stone-100">
                  {r.image_url && (
                    <Image
                      src={r.image_url}
                      alt={r.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="text-[11.5px] font-medium leading-tight mt-1 line-clamp-2">
                  {r.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-3 tabular-nums">
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

      {/* Recipe Grid - 2 columnas de RecipeCard */}
      <div className="grid grid-cols-2 gap-3">
        {filteredRecipes.map((recipe) => {
          const isLibrary = isExpandedRecipe(recipe);
          return (
            <div key={recipe.id} className="relative">
              <RecipeCard
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
              />
              {/* Acciones de edición (solo recetas propias / editables) */}
              {!isLibrary && (
                <CanEdit what="recipes">
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(recipe);
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 backdrop-blur text-stone-600 hover:text-orange-600 flex items-center justify-center shadow-sm transition-colors"
                      title="Editar"
                      aria-label="Editar receta"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteRecipe(recipe);
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 backdrop-blur text-stone-600 hover:text-red-600 flex items-center justify-center shadow-sm transition-colors"
                      title="Eliminar"
                      aria-label="Eliminar receta"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </CanEdit>
              )}
            </div>
          );
        })}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
            <ImageIcon size={32} className="text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {search ? "Sin resultados" : "Sin recetas aún"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search
              ? `No encontramos nada para "${search}"`
              : "Empezá agregando tu primera receta"}
          </p>
        </div>
      )}

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
