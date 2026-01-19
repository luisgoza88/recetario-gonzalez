import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Recipe, MarketItem } from '@/types';

// ============================================
// QUERY KEYS
// ============================================
export const queryKeys = {
  recipes: ['recipes'] as const,
  marketItems: ['marketItems'] as const,
  inventory: ['inventory'] as const,
  checklist: ['checklist'] as const,
  suggestions: ['suggestions'] as const,
  dayMenu: ['dayMenu'] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================
async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Recipe[];
}

async function fetchMarketItems() {
  const { data, error } = await supabase
    .from('market_items')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return data;
}

async function fetchChecklist() {
  const { data, error } = await supabase
    .from('market_checklist')
    .select('item_id, checked');

  if (error) throw error;
  return data;
}

async function fetchInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('item_id, current_quantity, current_number');

  if (error) throw error;
  return data;
}

async function fetchSuggestionsCount() {
  const { count, error } = await supabase
    .from('adjustment_suggestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
}

// ============================================
// HOOKS - QUERIES
// ============================================

/**
 * Hook para obtener todas las recetas
 */
export function useRecipes() {
  return useQuery({
    queryKey: queryKeys.recipes,
    queryFn: fetchRecipes,
  });
}

/**
 * Hook para obtener items del mercado con checklist e inventario combinados
 */
export function useMarketItems() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.marketItems,
    queryFn: async () => {
      // Ejecutar todas las queries en paralelo
      const [itemsResult, checklistResult, inventoryResult] = await Promise.all([
        fetchMarketItems(),
        fetchChecklist(),
        fetchInventory(),
      ]);

      // Crear mapas para búsqueda rápida
      const checklistMap = new Map(
        (checklistResult || []).map(c => [c.item_id, c.checked])
      );
      const inventoryMap = new Map(
        (inventoryResult || []).map(i => [i.item_id, { qty: i.current_quantity, num: i.current_number }])
      );

      // Combinar datos
      const items: MarketItem[] = (itemsResult || []).map(item => ({
        ...item,
        checked: checklistMap.get(item.id) || false,
        currentQuantity: inventoryMap.get(item.id)?.qty || '0',
        currentNumber: inventoryMap.get(item.id)?.num || 0
      }));

      // También actualizar queries individuales en cache
      queryClient.setQueryData(queryKeys.checklist, checklistResult);
      queryClient.setQueryData(queryKeys.inventory, inventoryResult);

      return items;
    },
  });
}

/**
 * Hook para obtener el conteo de sugerencias pendientes
 */
export function useSuggestionsCount() {
  return useQuery({
    queryKey: queryKeys.suggestions,
    queryFn: fetchSuggestionsCount,
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('market_checklist')
        .upsert({ item_id: itemId, checked }, { onConflict: 'item_id' });

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
      number
    }: {
      itemId: string;
      quantity: string;
      number: number;
    }) => {
      const { error } = await supabase
        .from('inventory')
        .upsert(
          { item_id: itemId, current_quantity: quantity, current_number: number },
          { onConflict: 'item_id' }
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
