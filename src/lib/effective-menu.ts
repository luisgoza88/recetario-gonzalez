import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipe, GeneratedDayMenu, GeneratedMeal } from "@/types";
import { householdDate, menuCycleDay } from "./menu-date";

function mealRecipe(
  meal: GeneratedMeal | null | undefined,
  type: Recipe["type"],
  date: string,
): Recipe | null {
  if (!meal) return null;
  return {
    ...meal,
    id: `generated-${date}-${type}`,
    type,
    ingredients: meal.ingredients ?? [],
    steps: meal.steps ?? [],
  } as unknown as Recipe;
}

/** The same approved menu for dashboard, employee view and assistant. */
export async function getEffectiveMenu(db: SupabaseClient, date = new Date()) {
  const dateKey = householdDate(date);
  const { data: generated, error } = await db
    .from("generated_menus")
    .select("menu_data")
    .in("status", ["approved", "active"])
    .lte("week_start_date", dateKey)
    .order("week_start_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  for (const menu of generated ?? []) {
    const day = Array.isArray(menu.menu_data)
      ? (menu.menu_data as GeneratedDayMenu[]).find(
          (entry) => entry.date === dateKey,
        )
      : undefined;
    if (day)
      return {
        breakfast: mealRecipe(day.breakfast, "breakfast", dateKey),
        lunch: mealRecipe(day.lunch, "lunch", dateKey),
        dinner: mealRecipe(day.dinner, "dinner", dateKey),
        day_number: menuCycleDay(date),
        reminder: null as string | null,
      };
  }
  const dayNumber = menuCycleDay(date);
  if (dayNumber < 0) return null;
  const { data, error: menuError } = await db
    .from("day_menu")
    .select(
      `*,
    breakfast:recipes!day_menu_breakfast_id_fkey(*), lunch:recipes!day_menu_lunch_id_fkey(*),
    dinner:recipes!day_menu_dinner_id_fkey(*)`,
    )
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (menuError) throw menuError;
  return data as {
    breakfast: Recipe | null;
    lunch: Recipe | null;
    dinner: Recipe | null;
    day_number: number;
    reminder: string | null;
  } | null;
}
