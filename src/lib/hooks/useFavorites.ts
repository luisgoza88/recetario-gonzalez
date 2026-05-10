"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";

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
    isLoading: toggleFavorite.isPending,
  };
}
