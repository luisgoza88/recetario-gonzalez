"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";

// Recetas del paquete estático (expanded/regional/thermomix) NO existen como
// filas en la tabla `recipes`, así que insertarlas en recipe_favorites viola la
// FK. Solo se pueden marcar como favoritas las recetas que viven en la DB.
const STATIC_RECIPE_ID = /^(col|rap|thm|tm6|fit|int|mp|cl|reg)-/;

export function useFavorites() {
  const { user } = useAuth();
  const householdId = useHouseholdId();
  const qc = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("recipe_favorites")
        .select("recipe_id")
        .eq("user_id", user.id);
      return (data || []).map((d) => d.recipe_id as string);
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!user) throw new Error("Not authenticated");
      // No intentar favoritos sobre recetas del paquete estático (FK fallaría).
      if (STATIC_RECIPE_ID.test(recipeId)) return;
      const isFav = favoriteIds.includes(recipeId);

      if (isFav) {
        await supabase
          .from("recipe_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("recipe_id", recipeId);
      } else {
        await supabase.from("recipe_favorites").insert({
          user_id: user.id,
          household_id: householdId ?? null,
          recipe_id: recipeId,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  return {
    favoriteIds,
    isFavorite: (id: string) => favoriteIds.includes(id),
    toggleFavorite: (id: string) => toggleFavorite.mutate(id),
    canFavorite: (id: string) => !!user && !STATIC_RECIPE_ID.test(id),
    isLoading: toggleFavorite.isPending,
  };
}
