"use client";

/**
 * useRecipeStats — stats de cocina para una receta del hogar
 *
 * Sprint 12 (Lazyweb research): pattern NYT Cooking
 *   "Cocinada 23 veces · ⭐ 4.8" en hero
 *
 * Devuelve cuantas veces el hogar cocino la receta (count meal_feedback)
 * + rating promedio + porcentaje de "would_repeat".
 *
 * Si no hay data o el hogar no esta seteado, devuelve null (no rompe UI).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface RecipeStats {
  timesCooked: number;
  avgRating: number | null;
  wouldRepeatPct: number | null;
}

export function useRecipeStats(
  recipeId: string | undefined,
  householdId: string | undefined,
): RecipeStats | null {
  const [stats, setStats] = useState<RecipeStats | null>(null);

  useEffect(() => {
    if (!recipeId || !householdId) {
      setStats(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("meal_feedback")
        .select("star_rating, would_repeat")
        .eq("recipe_id", recipeId)
        .eq("household_id", householdId);

      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setStats(null);
        return;
      }

      const ratings = data
        .map((d: { star_rating: number | null }) => d.star_rating)
        .filter((r): r is number => typeof r === "number" && r > 0);
      const repeats = data
        .map((d: { would_repeat: boolean | null }) => d.would_repeat)
        .filter((r): r is boolean => typeof r === "boolean");

      setStats({
        timesCooked: data.length,
        avgRating:
          ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : null,
        wouldRepeatPct:
          repeats.length > 0
            ? Math.round(
                (repeats.filter((r) => r).length / repeats.length) * 100,
              )
            : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeId, householdId]);

  return stats;
}
