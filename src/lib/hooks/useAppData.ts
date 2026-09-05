import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Recipe, MarketItem } from "@/types";

// ============================================
// QUERY KEYS
// ============================================
export const queryKeys = {
  recipes: ["recipes"] as const,
  marketItems: ["marketItems"] as const,
  inventory: ["inventory"] as const,
  checklist: ["checklist"] as const,
  suggestions: ["suggestions"] as const,
  dayMenu: ["dayMenu"] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================
async function fetchRecipes(householdId: string) {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("household_id", householdId)
    .order("name");

  if (error) throw error;
  // La columna es thermomix_compatible (snake_case); el tipo Recipe usa camelCase
  return (data ?? []).map((row) => ({
    ...row,
    thermomixCompatible: row.thermomix_compatible ?? false,
  })) as Recipe[];
}

async function fetchMarketItems(householdId: string) {
  const { data, error } = await supabase
    .from("market_items")
    .select("*")
    .eq("household_id", householdId)
    .order("order_index");

  if (error) throw error;
  return data;
}

async function fetchChecklist(householdId: string) {
  const { data, error } = await supabase
    .from("market_checklist")
    .select("item_id, checked")
    .eq("household_id", householdId);

  if (error) throw error;
  return data;
}

async function fetchInventory(householdId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("item_id, current_quantity, current_number")
    .eq("household_id", householdId);

  if (error) throw error;
  return data;
}

async function fetchSuggestionsCount(householdId: string) {
  const { count, error } = await supabase
    .from("adjustment_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("household_id", householdId)
    .eq("status", "pending");

  if (error) throw error;
  return count || 0;
}

// ============================================
// HOOKS - QUERIES
// ============================================

/**
 * Hook para obtener todas las recetas
 */
export function useRecipes(enabled = true) {
  const { currentHousehold, supabaseUser } = useAuth();
  const householdId = currentHousehold?.id;
  return useQuery({
    queryKey: [...queryKeys.recipes, supabaseUser?.id, householdId],
    enabled: enabled && !!householdId && !!supabaseUser,
    networkMode: "always",
    queryFn: async () => {
      const cache = await import("@/lib/indexedDB");
      if (!navigator.onLine)
        return (await cache.getCachedRecipes()) as Recipe[];
      const recipes = await fetchRecipes(householdId!);
      await cache
        .cacheRecipes(
          recipes.map((recipe) => ({ ...recipe, cachedAt: Date.now() })),
        )
        .catch(() => undefined);
      return recipes;
    },
  });
}

/**
 * Hook para obtener items del mercado con checklist e inventario combinados
 */
export function useMarketItems(enabled = true) {
  const { currentHousehold, supabaseUser } = useAuth();
  const householdId = currentHousehold?.id;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...queryKeys.marketItems, supabaseUser?.id, householdId],
    enabled: enabled && !!householdId && !!supabaseUser,
    networkMode: "always",
    queryFn: async () => {
      if (!navigator.onLine) {
        const cache = await import("@/lib/indexedDB");
        const [items, inventory] = await Promise.all([
          cache.getCachedMarketItems(),
          cache.getCachedInventory(),
        ]);
        return items.map((item) => ({
          ...item,
          currentQuantity:
            inventory.find((i) => i.item_id === item.id)?.current_quantity ||
            "0",
          currentNumber:
            inventory.find((i) => i.item_id === item.id)?.current_number || 0,
        })) as MarketItem[];
      }
      // Ejecutar todas las queries en paralelo
      const [itemsResult, checklistResult, inventoryResult] = await Promise.all(
        [
          fetchMarketItems(householdId!),
          fetchChecklist(householdId!),
          fetchInventory(householdId!),
        ],
      );

      // Crear mapas para búsqueda rápida
      const checklistMap = new Map(
        (checklistResult || []).map((c) => [c.item_id, c.checked]),
      );
      const inventoryMap = new Map(
        (inventoryResult || []).map((i) => [
          i.item_id,
          { qty: i.current_quantity, num: i.current_number },
        ]),
      );

      // Combinar datos
      const items: MarketItem[] = (itemsResult || []).map((item) => ({
        ...item,
        checked: checklistMap.get(item.id) || false,
        currentQuantity: inventoryMap.get(item.id)?.qty || "0",
        currentNumber: inventoryMap.get(item.id)?.num || 0,
      }));

      // También actualizar queries individuales en cache
      queryClient.setQueryData(
        [...queryKeys.checklist, supabaseUser?.id, householdId],
        checklistResult,
      );
      queryClient.setQueryData(
        [...queryKeys.inventory, supabaseUser?.id, householdId],
        inventoryResult,
      );

      return items;
    },
  });
}

/**
 * Hook para obtener el conteo de sugerencias pendientes
 */
export function useSuggestionsCount() {
  const { currentHousehold, supabaseUser } = useAuth();
  const householdId = currentHousehold?.id;
  return useQuery({
    queryKey: [...queryKeys.suggestions, supabaseUser?.id, householdId],
    enabled: !!householdId && !!supabaseUser,
    queryFn: () => fetchSuggestionsCount(householdId!),
    // Refrescar cada 5 minutos
    refetchInterval: 5 * 60 * 1000,
  });
}

// ============================================
// HOOKS - MUTATIONS
// ============================================

/**
 * Hook para actualizar el estado de un item en el checklist
 */
export function useToggleChecklist() {
  const { currentHousehold, supabaseUser } = useAuth();
  const householdId = currentHousehold?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      checked,
    }: {
      itemId: string;
      checked: boolean;
    }) => {
      if (!householdId || !supabaseUser) throw new Error("Selecciona un hogar");
      const { error } = await supabase
        .from("market_checklist")
        .upsert(
          { household_id: householdId, item_id: itemId, checked },
          { onConflict: "item_id" },
        );

      if (error) throw error;
      return { itemId, checked };
    },
    onSuccess: () => {
      // Invalidar la query de market items para refrescar
      queryClient.invalidateQueries({ queryKey: queryKeys.marketItems });
    },
  });
}

/**
 * Hook para actualizar el inventario de un item
 */
export function useUpdateInventory() {
  const { currentHousehold, supabaseUser } = useAuth();
  const householdId = currentHousehold?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
      number,
    }: {
      itemId: string;
      quantity: string;
      number: number;
    }) => {
      if (!householdId || !supabaseUser) throw new Error("Selecciona un hogar");
      const { error } = await supabase.from("inventory").upsert(
        {
          household_id: householdId,
          item_id: itemId,
          current_quantity: quantity,
          current_number: number,
        },
        { onConflict: "item_id" },
      );

      if (error) throw error;
      return { itemId, quantity, number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
    },
  });
}

/**
 * Hook combinado para refrescar todos los datos de la app
 */
export function useRefreshAppData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    queryClient.invalidateQueries({ queryKey: queryKeys.marketItems });
    queryClient.invalidateQueries({ queryKey: queryKeys.suggestions });
  };
}
