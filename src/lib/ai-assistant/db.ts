/**
 * AI Assistant Database Client
 *
 * Re-exports the authenticated Supabase client for AI assistant modules.
 * All database operations respect RLS policies.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Creates an authenticated Supabase client for AI Assistant operations.
 * Respects RLS policies based on the current user's session.
 * Tipado con Database para que los joins se infieran y no haga falta castear.
 */
export async function createAIClient(): Promise<SupabaseClient<Database>> {
  return createAuthenticatedClient();
}

/**
 * Helper type for market item with name property.
 * Used when joining inventory with market_items.
 */
export interface MarketItemRef {
  name?: string;
  category?: string;
}

/**
 * Helper type for recipe reference in menu.
 */
export interface RecipeRef {
  name?: string;
  prep_time?: number;
}

/**
 * Helper to safely extract name from a market item reference.
 */
export function getMarketItemName(
  item: MarketItemRef | null | undefined,
): string | null {
  return item?.name ?? null;
}

/**
 * Helper to safely extract recipe name from a recipe reference.
 */
export function getRecipeName(
  recipe: RecipeRef | null | undefined,
): string | null {
  return recipe?.name ?? null;
}
