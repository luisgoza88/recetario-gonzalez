"use client";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase/client";
import type { Recipe } from "@/types";
const RecipeModal = dynamic(() => import("@/components/RecipeModal"));
import { useState } from "react";
import Image from "next/image";
import { Sparkles, X, Loader2, Clock, ChefHat } from "lucide-react";

interface DBRecipe {
  id: string;
  name: string;
  image_url: string | null;
  total_time: number | null;
  matchScore: number;
  matchedIngredients: string[];
}

interface AIRecipe {
  name: string;
  description: string;
  estimated_time_min: number;
  missing_ingredients: string[];
}

interface CookWithThisResponse {
  source: "database" | "ai";
  recipes?: DBRecipe[];
}

interface CookWithThisButtonProps {
  /** Lista de nombres de ingredientes disponibles */
  ingredients: string[];
  className?: string;
}

export function CookWithThisButton({
  ingredients,
  className = "",
}: CookWithThisButtonProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CookWithThisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/cook-with-this", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al buscar recetas");
      }

      const data: CookWithThisResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const openRecipe = async (recipe: DBRecipe | AIRecipe) => {
    setLoading(true);
    setError(null);
    try {
      if ("id" in recipe) {
        const { data, error } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", recipe.id)
          .single();
        if (error || !data) throw new Error("No se pudo abrir la receta");
        setSelectedRecipe(data as Recipe);
      } else {
        const response = await fetch("/api/generate-recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            availableIngredients: ingredients,
            mealType: "lunch",
            preferences: [`Prepara ${recipe.name}`],
            generateImage: false,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.recipe)
          throw new Error(
            data.error || "No se pudo generar la receta completa",
          );
        setSelectedRecipe({
          ...data.recipe,
          id: crypto.randomUUID(),
          type: "lunch",
        });
      }
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo abrir la receta",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    setError(null);
  };

  const hasIngredients = ingredients.length > 0;

  return (
    <>
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
      <button
        onClick={handleOpen}
        disabled={!hasIngredients}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${className}`}
        title={
          hasIngredients
            ? "Ver que puedo cocinar con lo que tengo"
            : "Agrega ingredientes primero"
        }
      >
        <Sparkles size={16} />
        Que cocino con esto?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ChefHat size={18} className="text-emerald-600" />
                  Que cocino con esto?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ingredients.length} ingrediente
                  {ingredients.length !== 1 ? "s" : ""} disponibles
                </p>
              </div>
              <button
                aria-label="Cerrar sugerencias"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2
                    size={28}
                    className="animate-spin text-emerald-600"
                  />
                  <p className="text-sm text-gray-500">
                    Buscando recetas con tus ingredientes...
                  </p>
                </div>
              )}

              {error && (
                <div className="py-3 px-4 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {!loading && result && (
                <>
                  {result.source === "database" && result.recipes && (
                    <div className="space-y-3">
                      <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide mb-3">
                        Recetas de tu biblioteca
                      </p>
                      {result.recipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          {recipe.image_url ? (
                            <Image
                              src={recipe.image_url}
                              alt={recipe.name}
                              width={56}
                              height={56}
                              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <ChefHat size={20} className="text-emerald-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {recipe.name}
                            </p>
                            <button
                              className="mt-2 text-sm text-emerald-700 underline"
                              onClick={() => openRecipe(recipe)}
                            >
                              Ver receta y cocinar
                            </button>
                            <div className="flex items-center gap-2 mt-1">
                              {recipe.total_time && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock size={10} />
                                  {recipe.total_time} min
                                </span>
                              )}
                              <span className="text-xs text-emerald-600 font-medium">
                                {recipe.matchScore} ingrediente
                                {recipe.matchScore !== 1 ? "s" : ""} en comun
                              </span>
                            </div>
                            {recipe.matchedIngredients.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                {recipe.matchedIngredients.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.source === "ai" && (
                    <div className="space-y-3">
                      <p className="text-xs text-purple-700 font-medium uppercase tracking-wide mb-3 flex items-center gap-1">
                        <Sparkles size={12} />
                        Sugerencias de IA
                      </p>
                      {(
                        (result as unknown as { recipes: AIRecipe[] })
                          .recipes || []
                      ).map((recipe, i) => (
                        <div
                          key={i}
                          className="p-3 border border-purple-100 rounded-xl bg-purple-50"
                        >
                          <p className="font-medium text-gray-900 text-sm">
                            {recipe.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {recipe.description}
                          </p>
                          <button
                            className="mt-2 text-sm text-purple-700 underline"
                            onClick={() => openRecipe(recipe)}
                          >
                            Preparar receta completa
                          </button>
                          <div className="flex items-center gap-3 mt-2">
                            {recipe.estimated_time_min && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={10} />
                                {recipe.estimated_time_min} min
                              </span>
                            )}
                            {recipe.missing_ingredients?.length > 0 && (
                              <span className="text-xs text-amber-600">
                                Falta: {recipe.missing_ingredients.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!result.recipes ||
                    (result.recipes.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No se encontraron recetas con esos ingredientes.
                        <br />
                        Intenta agregar mas ingredientes.
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
