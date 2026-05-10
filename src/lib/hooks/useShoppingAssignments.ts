"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useShoppingAssignments(shoppingListId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ["shopping-assignments", shoppingListId],
    queryFn: async () => {
      if (!shoppingListId) return [];
      const { data } = await supabase
        .from("shopping_list_assignments")
        .select("user_id, item_id")
        .eq("shopping_list_id", shoppingListId);
      return data || [];
    },
    enabled: !!shoppingListId,
  });

  const assign = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      if (!user || !shoppingListId) return;
      await supabase.from("shopping_list_assignments").upsert({
        shopping_list_id: shoppingListId,
        user_id: user.id,
        item_id: itemId,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["shopping-assignments"] }),
  });

  const unassign = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      if (!user || !shoppingListId) return;
      await supabase
        .from("shopping_list_assignments")
        .delete()
        .eq("shopping_list_id", shoppingListId)
        .eq("user_id", user.id)
        .eq("item_id", itemId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["shopping-assignments"] }),
  });

  const myItems = assignments
    .filter((a) => a.user_id === user?.id)
    .map((a) => a.item_id);

  return {
    assignments,
    myItems,
    assign: assign.mutate,
    unassign: unassign.mutate,
    isMine: (itemId: string) => myItems.includes(itemId),
  };
}
