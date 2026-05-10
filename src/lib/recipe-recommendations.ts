import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Returns recipe IDs (and names) that the AI should NOT suggest because they
 * received a low rating (<=2 stars) within the last 30 days.
 *
 * Works at household level when householdId is provided; falls back to a
 * global query (no household filter) when it is absent.
 */
export async function getRecipesToAvoid(
  householdId?: string,
): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from("meal_feedback")
      .select("recipe_id, recipe_name")
      .lte("star_rating", 2)
      .not("star_rating", "is", null)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (householdId) {
      query = query.eq("household_id", householdId);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    // Return unique recipe IDs; fall back to recipe_name when id is null
    const ids = data
      .map((d) => d.recipe_id || d.recipe_name)
      .filter(Boolean) as string[];

    return [...new Set(ids)];
  } catch {
    return [];
  }
}

/**
 * Returns recipe names (from low-rated feedback) formatted as a prompt snippet
 * ready to inject into a Gemini prompt.
 */
export async function getAvoidPromptSection(
  householdId?: string,
): Promise<string> {
  const toAvoid = await getRecipesToAvoid(householdId);
  if (toAvoid.length === 0) return "";
  return `\nRECETAS A EVITAR (rating <= 2 estrellas en los últimos 30 días):\n${toAvoid.map((r) => `- ${r}`).join("\n")}\nNO sugieras estas recetas ni variaciones muy similares.\n`;
}
