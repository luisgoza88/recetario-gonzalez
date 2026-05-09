import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { ShoppingListItem } from "@/types";

function getSupabase() {
  return createServiceRoleClient();
}

const RequestSchema = z.object({
  menuId: z.string().uuid().optional(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Category mapping for organization
const CATEGORY_MAP: Record<string, string> = {
  "Proteínas Premium": "proteinas",
  "Proteínas Económicas": "proteinas",
  Vegetales: "frutas",
  Tubérculos: "frutas",
  Carbohidratos: "granos",
  Lácteos: "lacteos",
  Despensa: "granos",
  Especias: "otros",
};

const CATEGORY_LABELS: Record<string, string> = {
  proteinas: "🥩 Proteínas",
  frutas: "🥬 Frutas y Verduras",
  lacteos: "🧀 Lácteos",
  granos: "🌾 Granos y Despensa",
  otros: "🧂 Otros",
};

interface IngredientAccum {
  name: string;
  recipes: string[];
  category: string;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { menuId, weekStartDate } = RequestSchema.parse(body);
    const supabase = getSupabase();

    // 1. Get ingredients from generated menu or fallback to cycle menu
    const ingredientMap = new Map<string, IngredientAccum>();

    if (menuId) {
      // Get from generated menu
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: menu, error } = await (supabase as any)
        .from("generated_menus")
        .select("menu_data")
        .eq("id", menuId)
        .single();

      if (error || !menu) {
        return NextResponse.json(
          { error: "Menú no encontrado" },
          { status: 404 },
        );
      }

      const menuData = menu.menu_data as Array<{
        dayName: string;
        breakfast?: {
          name: string;
          ingredients?: Array<{ name: string; total?: string }>;
        } | null;
        lunch?: {
          name: string;
          ingredients?: Array<{ name: string; total?: string }>;
        } | null;
        dinner?: {
          name: string;
          ingredients?: Array<{ name: string; total?: string }>;
        } | null;
      }>;

      for (const day of menuData) {
        for (const meal of [day.breakfast, day.lunch, day.dinner]) {
          if (!meal || !meal.ingredients) continue;
          for (const ing of meal.ingredients) {
            const key = ing.name.toLowerCase().trim();
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                name: ing.name,
                recipes: [],
                category: "otros",
              });
            }
            const entry = ingredientMap.get(key)!;
            if (!entry.recipes.includes(meal.name)) {
              entry.recipes.push(meal.name);
            }
          }
        }
      }
    } else {
      // Fallback: get from 7-day cycle menu
      const today = new Date(weekStartDate);
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dow = date.getDay();
        const cycleDay = (((dow === 0 ? 7 : dow) - 1) % 12) + 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: menu } = await (supabase as any)
          .from("day_menu")
          .select(
            `
            breakfast:recipes!day_menu_breakfast_id_fkey(name, ingredients),
            lunch:recipes!day_menu_lunch_id_fkey(name, ingredients),
            dinner:recipes!day_menu_dinner_id_fkey(name, ingredients)
          `,
          )
          .eq("day_number", cycleDay)
          .single();

        if (!menu) continue;

        interface RecipeWithIngredients {
          name?: string;
          ingredients?: Array<string | { name?: string }>;
        }

        for (const recipe of [
          menu.breakfast,
          menu.lunch,
          menu.dinner,
        ] as Array<RecipeWithIngredients | null>) {
          if (!recipe || !recipe.name || !recipe.ingredients) continue;
          for (const ing of recipe.ingredients) {
            const ingName = typeof ing === "string" ? ing : ing.name || "";
            const key = ingName.toLowerCase().trim();
            if (!key) continue;
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                name: ingName,
                recipes: [],
                category: "otros",
              });
            }
            const entry = ingredientMap.get(key)!;
            if (!entry.recipes.includes(recipe.name!)) {
              entry.recipes.push(recipe.name!);
            }
          }
        }
      }
    }

    // 2. Check current inventory - only add what's missing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inventory } = await (supabase as any)
      .from("inventory")
      .select("*, market_item:market_items(name, category)")
      .gt("current_number", 0);

    const availableItems = new Set<string>();
    inventory?.forEach(
      (item: { market_item?: { name?: string }; current_number: number }) => {
        const name = item.market_item?.name?.toLowerCase() || "";
        if (name) availableItems.add(name);
      },
    );

    // 3. Get price history for estimates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: priceData } = await (supabase as any)
      .from("price_history")
      .select("item_name, price, store")
      .order("recorded_at", { ascending: false });

    // Build avg price + best store per item
    const priceMap = new Map<
      string,
      { avgPrice: number; bestStore: string; bestPrice: number }
    >();
    if (priceData) {
      const grouped = new Map<
        string,
        Array<{ price: number; store: string }>
      >();
      for (const p of priceData) {
        const key = p.item_name.toLowerCase();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped
          .get(key)!
          .push({ price: Number(p.price), store: p.store || "Otro" });
      }
      for (const [key, records] of grouped) {
        const avg = records.reduce((s, r) => s + r.price, 0) / records.length;
        // Find cheapest store
        const storeAvgs = new Map<string, { sum: number; count: number }>();
        for (const r of records) {
          if (!storeAvgs.has(r.store))
            storeAvgs.set(r.store, { sum: 0, count: 0 });
          const sa = storeAvgs.get(r.store)!;
          sa.sum += r.price;
          sa.count++;
        }
        let bestStore = "Otro";
        let bestPrice = avg;
        for (const [store, data] of storeAvgs) {
          const storeAvg = data.sum / data.count;
          if (storeAvg < bestPrice) {
            bestPrice = storeAvg;
            bestStore = store;
          }
        }
        priceMap.set(key, {
          avgPrice: Math.round(avg),
          bestStore,
          bestPrice: Math.round(bestPrice),
        });
      }
    }

    // 4. Get market item categories
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: marketItems } = await (supabase as any)
      .from("market_items")
      .select("name, category");

    const marketCatMap = new Map<string, string>();
    marketItems?.forEach((mi: { name: string; category: string }) => {
      marketCatMap.set(mi.name.toLowerCase(), mi.category);
    });

    // 5. Build shopping list items
    const shoppingItems: ShoppingListItem[] = [];
    let totalEstimated = 0;

    for (const [key, data] of ingredientMap) {
      // Check if available in inventory (fuzzy match)
      let inStock = false;
      for (const available of availableItems) {
        if (available.includes(key) || key.includes(available)) {
          inStock = true;
          break;
        }
      }

      // Determine category
      const marketCategory = marketCatMap.get(key);
      const category = marketCategory
        ? CATEGORY_MAP[marketCategory] || "otros"
        : "otros";

      // Get price info
      const priceInfo = priceMap.get(key);

      const item: ShoppingListItem = {
        name: data.name,
        quantity: "1",
        category,
        estimatedPrice: priceInfo?.avgPrice,
        store: priceInfo?.bestStore,
        checked: false,
        fromRecipe: data.recipes.join(", "),
        inStock,
        alreadyHave: inStock,
      };

      // Only add estimated price to total for items that still need to be bought
      if (!inStock && priceInfo?.avgPrice) {
        totalEstimated += priceInfo.avgPrice;
      }

      shoppingItems.push(item);
    }

    // Sort by category
    shoppingItems.sort((a, b) => a.category.localeCompare(b.category));

    // 6. Save to shopping_lists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedList, error: saveError } = await (supabase as any)
      .from("shopping_lists")
      .upsert(
        {
          week_start_date: weekStartDate,
          menu_id: menuId || null,
          items: shoppingItems,
          total_estimated: totalEstimated > 0 ? totalEstimated : null,
          status: "active",
          created_at: new Date().toISOString(),
        },
        { onConflict: "week_start_date" },
      )
      .select()
      .single();

    if (saveError) {
      // If upsert fails (no unique constraint), try insert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error: insertError } = await (supabase as any)
        .from("shopping_lists")
        .insert({
          week_start_date: weekStartDate,
          menu_id: menuId || null,
          items: shoppingItems,
          total_estimated: totalEstimated > 0 ? totalEstimated : null,
          status: "active",
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Error saving shopping list", {
          error: insertError.message,
        });
        // Still return items even if save fails
      }

      return NextResponse.json({
        success: true,
        list: inserted || {
          items: shoppingItems,
          total_estimated: totalEstimated,
          week_start_date: weekStartDate,
        },
        category_labels: CATEGORY_LABELS,
      });
    }

    return NextResponse.json({
      success: true,
      list: savedList,
      category_labels: CATEGORY_LABELS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 },
      );
    }
    logger.error("Error generating shopping list", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error generando lista de compras" },
      { status: 500 },
    );
  }
}

// GET: Fetch active shopping list for a week
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const weekStartDate = searchParams.get("weekStartDate");
  const supabase = getSupabase();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("shopping_lists")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (weekStartDate) {
      query = query.eq("week_start_date", weekStartDate);
    }

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching shopping list", { error: error.message });
      return NextResponse.json(
        { error: "Error fetching shopping list" },
        { status: 500 },
      );
    }

    // Also get price savings suggestions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: priceData } = await (supabase as any)
      .from("price_history")
      .select("item_name, price, store")
      .order("recorded_at", { ascending: false })
      .limit(500);

    const savings: Array<{ item: string; message: string; amount: number }> =
      [];
    if (priceData && priceData.length > 0) {
      // Group by item+store to find price differences
      const itemStoreMap = new Map<string, Map<string, number[]>>();
      for (const p of priceData) {
        const itemKey = p.item_name.toLowerCase();
        if (!itemStoreMap.has(itemKey)) itemStoreMap.set(itemKey, new Map());
        const storeMap = itemStoreMap.get(itemKey)!;
        if (!storeMap.has(p.store)) storeMap.set(p.store, []);
        storeMap.get(p.store)!.push(Number(p.price));
      }

      for (const [item, storeMap] of itemStoreMap) {
        if (storeMap.size < 2) continue;
        const storeAvgs: Array<{ store: string; avg: number }> = [];
        for (const [store, prices] of storeMap) {
          storeAvgs.push({
            store,
            avg: prices.reduce((s, p) => s + p, 0) / prices.length,
          });
        }
        storeAvgs.sort((a, b) => a.avg - b.avg);
        const cheapest = storeAvgs[0];
        const mostExpensive = storeAvgs[storeAvgs.length - 1];
        const diff = Math.round(mostExpensive.avg - cheapest.avg);
        if (diff >= 500) {
          savings.push({
            item,
            message: `${item} está $${diff.toLocaleString()} más barato en ${cheapest.store} que en ${mostExpensive.store}`,
            amount: diff,
          });
        }
      }
      savings.sort((a, b) => b.amount - a.amount);
    }

    return NextResponse.json({
      success: true,
      list: data || null,
      savings: savings.slice(0, 10),
      category_labels: CATEGORY_LABELS,
    });
  } catch (error) {
    logger.error("Error in GET shopping list", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
