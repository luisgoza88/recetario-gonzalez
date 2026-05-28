import { createAIClient } from "@/lib/ai-assistant/db";
import { RECIPE_VARIANTS } from "@/lib/ai-assistant/constants";
import { logger } from "@/lib/logger";

async function getSupabase() {
  return createAIClient();
}

// ──────────────────────────────────────────────
// Matching avanzado de ingredientes (server-side)
// Replica la lógica de 4 pasos de inventory-check.ts
// ──────────────────────────────────────────────

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ingredientMatchesInventory(
  ingredientName: string,
  inventoryItems: string[],
): boolean {
  const norm = normalizeForMatch(ingredientName);

  // Separar compuestos (ej: "Hogao + Aguacate")
  const subIngredients = norm.includes("+")
    ? norm
        .split("+")
        .map((s) => s.trim())
        .filter(Boolean)
    : [norm];

  for (const sub of subIngredients) {
    let found = false;

    for (const item of inventoryItems) {
      const normItem = normalizeForMatch(item);

      // Paso 1: Exacto
      if (normItem === sub) {
        found = true;
        break;
      }

      // Paso 2: Parcial (uno contiene al otro)
      if (normItem.includes(sub) || sub.includes(normItem)) {
        found = true;
        break;
      }

      // Paso 3: Fuzzy por palabra clave >= 4 caracteres
      const subWords = sub.split(/\s+/).filter((w) => w.length >= 4);
      const itemWords = normItem.split(/\s+/).filter((w) => w.length >= 4);
      if (
        subWords.some((sw) =>
          itemWords.some(
            (iw) => sw === iw || iw.includes(sw) || sw.includes(iw),
          ),
        )
      ) {
        found = true;
        break;
      }
    }

    if (found) return true;
  }

  return false;
}

export function countIngredientMatches(
  ingredients: Array<{ name?: string } | string>,
  inventoryItems: string[],
): { matchCount: number; totalCount: number; matchPercent: number } {
  const totalCount = ingredients.length;
  if (totalCount === 0)
    return { matchCount: 0, totalCount: 0, matchPercent: 0 };

  let matchCount = 0;
  for (const ing of ingredients) {
    const ingName = typeof ing === "string" ? ing : ing?.name || "";
    if (!ingName) continue;
    if (ingredientMatchesInventory(ingName, inventoryItems)) {
      matchCount++;
    }
  }

  return {
    matchCount,
    totalCount,
    matchPercent: Math.round((matchCount / totalCount) * 100),
  };
}

export async function getTodayMenu() {
  try {
    const supabase = await getSupabase();
    const today = new Date();
    const dayOfWeek = today.getDay();
    const cycleDay = (((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12) + 1;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

    const { data: menu, error } = await supabase
      .from("day_menu")
      .select(
        `
        *,
        breakfast:recipes!day_menu_breakfast_id_fkey(name, prep_time),
        lunch:recipes!day_menu_lunch_id_fkey(name, prep_time),
        dinner:recipes!day_menu_dinner_id_fkey(name, prep_time)
      `,
      )
      .eq("day_number", cycleDay)
      .single();

    if (error || !menu) {
      logger.error("Error fetching menu", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        message: "No hay menú programado para hoy",
        date: today.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        cycle_day: cycleDay,
        breakfast: "No programado",
        lunch: "No programado",
        dinner: isWeekend ? "Sin cena (salen a comer)" : "No programado",
      };
    }

    return {
      date: today.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      cycle_day: cycleDay,
      breakfast: menu.breakfast?.name || "No programado",
      lunch: menu.lunch?.name || "No programado",
      dinner: isWeekend
        ? "Sin cena (salen a comer)"
        : menu.dinner?.name || "No programado",
    };
  } catch (err) {
    logger.error("getTodayMenu error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      message: "No se pudo obtener el menú de hoy",
      breakfast: "Error al cargar",
      lunch: "Error al cargar",
      dinner: "Error al cargar",
    };
  }
}

export async function getWeekMenu() {
  try {
    const supabase = await getSupabase();
    const { data: menus, error } = await supabase
      .from("day_menu")
      .select(
        `
        day_number,
        breakfast:recipes!day_menu_breakfast_id_fkey(name),
        lunch:recipes!day_menu_lunch_id_fkey(name),
        dinner:recipes!day_menu_dinner_id_fkey(name)
      `,
      )
      .order("day_number")
      .limit(7);

    if (error) {
      logger.error("Error fetching week menu", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: "No se pudo obtener el menú de la semana" };
    }

    const DAYS_OF_WEEK = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    return (
      menus?.map((m: Record<string, unknown>, i: number) => {
        const breakfast = m.breakfast as { name?: string } | null;
        const lunch = m.lunch as { name?: string } | null;
        const dinner = m.dinner as { name?: string } | null;
        return {
          day: DAYS_OF_WEEK[i] || `Día ${m.day_number}`,
          breakfast: breakfast?.name || "-",
          lunch: lunch?.name || "-",
          dinner: dinner?.name || "Sin cena",
        };
      }) || []
    );
  } catch (err) {
    logger.error("getWeekMenu error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: "Error al obtener el menú semanal" };
  }
}

export async function searchRecipes(query: string) {
  try {
    const supabase = await getSupabase();
    // eslint-disable-next-line prefer-const
    let { data: recipes, error } = await supabase
      .from("recipes")
      .select("name, prep_time, category, portions, ingredients")
      .or(`name.ilike.%${query}%,ingredients.cs.{${query}}`);

    if (error) {
      logger.error("Error searching recipes", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: "Error al buscar recetas" };
    }

    if (!recipes || recipes.length === 0) {
      const { data: allRecipes, error: allError } = await supabase
        .from("recipes")
        .select("name, prep_time, category, portions, ingredients");

      if (allError) {
        logger.error("Error fetching all recipes", {
          error:
            allError instanceof Error ? allError.message : String(allError),
        });
        return { error: "Error al buscar recetas" };
      }

      const searchTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2);

      recipes =
        allRecipes?.filter((r) => {
          const nameLower = r.name.toLowerCase();
          const ingredientsStr = JSON.stringify(r.ingredients).toLowerCase();

          for (const term of searchTerms) {
            if (nameLower.includes(term) || ingredientsStr.includes(term))
              return true;

            for (const [key, alts] of Object.entries(RECIPE_VARIANTS)) {
              if (term.includes(key) || key.includes(term)) {
                if (
                  alts.some(
                    (alt) =>
                      nameLower.includes(alt) || ingredientsStr.includes(alt),
                  )
                ) {
                  return true;
                }
              }
              if (alts.some((alt) => term.includes(alt))) {
                if (nameLower.includes(key) || ingredientsStr.includes(key)) {
                  return true;
                }
              }
            }
          }
          return false;
        }) || [];
    }

    return (
      recipes?.slice(0, 8).map((r) => ({
        name: r.name,
        prep_time: r.prep_time,
        category: r.category,
        ingredient_count: Array.isArray(r.ingredients)
          ? r.ingredients.length
          : 0,
      })) || []
    );
  } catch (err) {
    logger.error("searchRecipes error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: "Error al buscar recetas" };
  }
}

export async function getRecipeDetails(recipeName: string) {
  const supabase = await getSupabase();
  let { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .ilike("name", `%${recipeName}%`)
    .single();

  if (!recipe) {
    const searchTerms = recipeName
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    const { data: recipes } = await supabase.from("recipes").select("*");

    if (recipes && recipes.length > 0) {
      const scored = recipes.map((r) => {
        const nameLower = r.name.toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (nameLower.includes(term)) score += 2;
          for (const [key, alts] of Object.entries(RECIPE_VARIANTS)) {
            if (term.includes(key) || key.includes(term)) {
              for (const alt of alts) {
                if (nameLower.includes(alt)) score += 1;
              }
            }
          }
        }
        return { recipe: r, score };
      });
      scored.sort((a, b) => b.score - a.score);
      if (scored[0]?.score > 0) {
        recipe = scored[0].recipe;
      }
    }
  }

  if (!recipe) {
    const { data: inventory } = await supabase
      .from("inventory")
      .select("*, market_item:market_items(name)")
      .gt("current_number", 0);

    const availableIngredients =
      inventory
        ?.map((i) => (i.market_item as { name?: string })?.name)
        .filter(Boolean) || [];

    return {
      recipe_not_found: true,
      requested_recipe: recipeName,
      instruction: `La receta "${recipeName}" no está en la base de datos. DEBES usar tu conocimiento culinario general para ayudar al usuario. Proporciona los ingredientes típicos de esta receta y los pasos de preparación. Verifica qué ingredientes tiene el usuario usando la lista de inventario disponible.`,
      user_inventory: availableIngredients,
      action_required:
        "Usa tu conocimiento general de cocina para dar la receta completa. Indica qué ingredientes tiene el usuario (disponible) y cuáles le faltan. Ofrece agregar los faltantes a la lista de compras.",
    };
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return {
    name: recipe.name,
    category: recipe.category,
    prep_time: recipe.prep_time,
    portions: recipe.portions || 5,
    description: recipe.description || "",
    ingredients: (
      ingredients as Array<{ name?: string; amount?: string } | string>
    ).map((ing) =>
      typeof ing === "string"
        ? ing
        : `${ing.amount || ""} ${ing.name || ing}`.trim(),
    ),
    steps: steps.length > 0 ? steps : ["No hay pasos detallados disponibles"],
    tips: recipe.tips || null,
  };
}

export async function getMissingIngredients(recipeName: string) {
  const supabase = await getSupabase();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("name, ingredients")
    .ilike("name", `%${recipeName}%`)
    .single();

  if (!recipe) {
    return { error: `No se encontró la receta "${recipeName}"` };
  }

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*, market_item:market_items(name)")
    .gt("current_number", 0);

  const availableItems =
    inventory?.map((i) => i.market_item?.name?.toLowerCase()) || [];
  const recipeIngredients = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as Array<{ name?: string } | string | null>)
    : [];

  const missing: string[] = [];
  const available: string[] = [];

  for (const ing of recipeIngredients) {
    if (ing === null || ing === undefined) continue;
    const ingName =
      typeof ing === "string" ? ing : (ing as { name?: string }).name || "";
    const normalized = ingName.toLowerCase();
    const found = availableItems.some(
      (item) => item?.includes(normalized) || normalized.includes(item || ""),
    );
    if (found) {
      available.push(ingName);
    } else {
      missing.push(ingName);
    }
  }

  return {
    recipe: recipe.name,
    total_ingredients: recipeIngredients.length,
    available_count: available.length,
    missing_count: missing.length,
    missing_ingredients: missing,
    available_ingredients: available,
    can_prepare: missing.length === 0,
    coverage_percent: Math.round(
      (available.length / recipeIngredients.length) * 100,
    ),
  };
}

export async function getInventory() {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("inventory")
      .select("*, market_item:market_items(name, category)")
      .gt("current_number", 0)
      .limit(50);

    if (error) {
      logger.error("Error fetching inventory", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        message: "No se pudo obtener el inventario",
        items: [],
        by_category: {},
      };
    }

    if (!data || data.length === 0) {
      return {
        message: "El inventario está vacío",
        items: [],
        by_category: {},
      };
    }

    const items: string[] = [];
    const grouped: Record<string, string[]> = {};

    data.forEach((item) => {
      const name = item.market_item?.name || "Item";
      const cat = item.market_item?.category || "Otros";
      const qty = item.current_number || 0;
      items.push(name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(`${name} (${qty})`);
    });

    return {
      message: `${data.length} ingredientes disponibles`,
      total: data.length,
      items,
      by_category: grouped,
    };
  } catch (err) {
    logger.error("getInventory error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      message: "No se pudo obtener el inventario",
      items: [],
      by_category: {},
    };
  }
}

export async function getShoppingList() {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("market_checklist")
      .select("*, market_item:market_items(name, category)")
      .eq("checked", false)
      .limit(30);

    if (error) {
      logger.error("Error fetching shopping list", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { message: "No hay items en la lista de compras", items: [] };
    }

    if (!data || data.length === 0) {
      return { message: "La lista de compras está vacía", items: [] };
    }

    const items = data.map((item) => ({
      name: item.market_item?.name || "Item",
      category: item.market_item?.category || "Otros",
    }));

    const byCategory: Record<string, string[]> = {};
    items.forEach((item) => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item.name);
    });

    return {
      message: `${items.length} items pendientes`,
      total: items.length,
      items,
      by_category: byCategory,
    };
  } catch (err) {
    logger.error("getShoppingList error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { message: "No hay items en la lista de compras", items: [] };
  }
}

export async function suggestRecipe(_preferences?: string) {
  const supabase = await getSupabase();
  const { data: inventory } = await supabase
    .from("inventory")
    .select("market_item:market_items(name)")
    .gt("current_number", 0);

  const availableItems =
    inventory
      ?.map(
        (i: Record<string, unknown>) =>
          (i.market_item as { name?: string } | null)?.name,
      )
      .filter((n): n is string => !!n) || [];

  const { data: recipes } = await supabase
    .from("recipes")
    .select("name, ingredients, prep_time, category");

  if (!recipes || recipes.length === 0) {
    return { suggestion: "No hay recetas disponibles" };
  }

  let bestMatch = { recipe: recipes[0], matchCount: 0, matchPercent: 0 };

  for (const recipe of recipes) {
    const ingredients = Array.isArray(recipe.ingredients)
      ? (recipe.ingredients as Array<{ name?: string } | string>)
      : [];
    const { matchCount, matchPercent } = countIngredientMatches(
      ingredients,
      availableItems,
    );

    if (matchCount > bestMatch.matchCount) {
      bestMatch = { recipe, matchCount, matchPercent };
    }
  }

  return {
    suggestion: bestMatch.recipe.name,
    prep_time: bestMatch.recipe.prep_time,
    category: bestMatch.recipe.category,
    ingredients_available: bestMatch.matchCount,
    total_ingredients: Array.isArray(bestMatch.recipe.ingredients)
      ? bestMatch.recipe.ingredients.length
      : 0,
    match_percent: bestMatch.matchPercent,
  };
}
