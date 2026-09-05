import { householdDate } from "@/lib/menu-date";
import { createAIClient } from "@/lib/ai-assistant/db";
import { logger } from "@/lib/logger";

async function getSupabase() {
  return createAIClient();
}

export function getCurrentDateInfo() {
  const now = new Date();
  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const dayOfWeek = now.getDay();
  const cycleDay = (((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12) + 1;

  return {
    date: now.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    day_name: dayNames[dayOfWeek],
    time: now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    week_number: Math.ceil((now.getDate() - now.getDay() + 1) / 7),
    cycle_day: cycleDay,
    is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
    has_dinner: dayOfWeek !== 5 && dayOfWeek !== 6,
  };
}

export async function getWeeklyReport() {
  const supabase = await getSupabase();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const { data: tasks } = await supabase
    .from("scheduled_tasks")
    .select("status")
    .throwOnError()
    .gte("scheduled_date", householdDate(weekStart))
    .lte("scheduled_date", householdDate(weekEnd));

  const total = tasks?.length || 0;
  const completed = tasks?.filter((t) => t.status === "completada").length || 0;
  const pending = tasks?.filter((t) => t.status === "pendiente").length || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const { data: lowInventory } = await supabase
    .from("inventory")
    .select("*, market_item:market_items(name)")
    .throwOnError()
    .lte("current_number", 2)
    .gt("current_number", 0);

  const { data: outOfStock } = await supabase
    .from("inventory")
    .select("*, market_item:market_items(name)")
    .throwOnError()
    .eq("current_number", 0);

  return {
    period: `${weekStart.toLocaleDateString("es-ES")} - ${weekEnd.toLocaleDateString("es-ES")}`,
    tasks: { total, completed, pending, completion_rate: completionRate },
    inventory: {
      low_stock_count: lowInventory?.length || 0,
      low_stock_items:
        lowInventory?.slice(0, 5).map((i) => i.market_item?.name) || [],
      out_of_stock_count: outOfStock?.length || 0,
      out_of_stock_items:
        outOfStock?.slice(0, 5).map((i) => i.market_item?.name) || [],
    },
    summary: `Semana con ${completionRate}% de tareas completadas. ${
      (lowInventory?.length || 0) > 0
        ? `Hay ${lowInventory?.length} items con bajo inventario.`
        : "Inventario en buen estado."
    }`,
  };
}

export async function getLowInventoryAlerts(threshold: number = 2) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("inventory")
    .select("*, market_item:market_items(name, category)")
    .throwOnError()
    .lte("current_number", threshold)
    .order("current_number");

  const grouped: Record<string, Array<{ name: string; quantity: number }>> = {};

  data?.forEach((item) => {
    const cat = item.market_item?.category || "Otros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      name: item.market_item?.name || "Item",
      quantity: item.current_number ?? 0,
    });
  });

  const totalAlerts = data?.length || 0;
  const criticalCount = data?.filter((i) => i.current_number === 0).length || 0;

  return {
    total_alerts: totalAlerts,
    critical_count: criticalCount,
    low_count: totalAlerts - criticalCount,
    by_category: grouped,
    message:
      totalAlerts === 0
        ? "No hay alertas de inventario"
        : `${criticalCount} items agotados, ${totalAlerts - criticalCount} items bajos`,
  };
}

export async function getUpcomingMeals(days: number = 3) {
  const supabase = await getSupabase();
  const today = new Date();
  const meals: Array<{
    date: string;
    day_name: string;
    breakfast: string;
    lunch: string;
    dinner: string;
  }> = [];

  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    const cycleDay = (((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12) + 1;

    const { data: menu } = await supabase
      .from("day_menu")
      .select(
        `
        breakfast:recipes!day_menu_breakfast_id_fkey(name),
        lunch:recipes!day_menu_lunch_id_fkey(name),
        dinner:recipes!day_menu_dinner_id_fkey(name)
      `,
      )
      .throwOnError()
      .eq("day_number", cycleDay)
      .single();

    type JoinedRecipe = { name?: string } | null;
    meals.push({
      date: date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }),
      day_name: dayNames[dayOfWeek],
      breakfast: (menu?.breakfast as JoinedRecipe)?.name || "No programado",
      lunch: (menu?.lunch as JoinedRecipe)?.name || "No programado",
      dinner:
        dayOfWeek === 5 || dayOfWeek === 6
          ? "Sin cena (sale a comer)"
          : (menu?.dinner as JoinedRecipe)?.name || "No programado",
    });
  }

  return {
    days: meals,
    tip:
      meals.length > 0
        ? `Próximas ${meals.length} días de menú`
        : "No hay menú disponible",
  };
}

export async function calculatePortions(recipeName: string, portions: number) {
  const supabase = await getSupabase();
  const { data: recipe } = await supabase
    .from("recipes")
    .select("name, portions, ingredients")
    .throwOnError()
    .ilike("name", `%${recipeName}%`)
    .single();

  if (!recipe) {
    return { error: `No se encontró la receta "${recipeName}"` };
  }

  const originalPortions =
    (typeof recipe.portions === "number" ? recipe.portions : null) || 5;
  const multiplier = portions / originalPortions;
  const ingredients = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as Array<{ name?: string; amount?: string } | string>)
    : [];

  const adjustedIngredients = ingredients.map(
    (ing: { name?: string; amount?: string } | string) => {
      if (typeof ing === "string") {
        const match = ing.match(/^([\d.]+)\s*(.+)$/);
        if (match) {
          const newAmount = (parseFloat(match[1]) * multiplier).toFixed(1);
          return `${newAmount} ${match[2]}`;
        }
        return ing;
      }
      const amount = ing.amount || "";
      const numMatch = amount.match(/([\d.]+)/);
      if (numMatch) {
        const newAmount = (parseFloat(numMatch[1]) * multiplier).toFixed(1);
        return `${newAmount}${amount.replace(numMatch[1], "")} ${ing.name}`;
      }
      return `${amount} ${ing.name}`;
    },
  );

  return {
    recipe: recipe.name,
    original_portions: originalPortions,
    requested_portions: portions,
    multiplier: multiplier.toFixed(2),
    adjusted_ingredients: adjustedIngredients,
  };
}

export async function getPreparationTips() {
  const supabase = await getSupabase();
  const today = new Date();
  const dayOfWeek = today.getDay();
  const cycleDay = (((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12) + 1;

  const { data: menu } = await supabase
    .from("day_menu")
    .select(
      `
      breakfast:recipes!day_menu_breakfast_id_fkey(name, prep_time, ingredients),
      lunch:recipes!day_menu_lunch_id_fkey(name, prep_time, ingredients),
      dinner:recipes!day_menu_dinner_id_fkey(name, prep_time, ingredients)
    `,
    )
    .throwOnError()
    .eq("day_number", cycleDay)
    .single();

  const tips: string[] = [];
  const meals = [
    { name: "Desayuno", data: menu?.breakfast, time: "7:00 AM" },
    { name: "Almuerzo", data: menu?.lunch, time: "12:00 PM" },
    { name: "Cena", data: menu?.dinner, time: "7:00 PM" },
  ];

  meals.forEach((meal) => {
    if (meal.data && typeof meal.data === "object" && "name" in meal.data) {
      const prepTime = (meal.data as { prep_time?: number }).prep_time || 30;
      const ingredients =
        (meal.data as { ingredients?: unknown[] }).ingredients || [];

      const needsDefrost =
        Array.isArray(ingredients) &&
        ingredients.some((ing: unknown) => {
          const ingStr =
            typeof ing === "string"
              ? ing
              : (ing as { name?: string })?.name || "";
          return /pollo|carne|pescado|cerdo|res/i.test(ingStr);
        });

      if (needsDefrost) {
        tips.push(
          `🧊 Descongelar proteína para ${meal.name} (${(meal.data as { name?: string }).name})`,
        );
      }

      if (prepTime > 45) {
        tips.push(
          `⏰ ${meal.name} requiere ${prepTime} min de preparación - planifica con tiempo`,
        );
      }
    }
  });

  if (tips.length === 0) {
    tips.push("No hay preparaciones especiales necesarias para hoy");
  }

  return {
    date: today.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    tips,
    menu_summary: meals.map((m) => ({
      meal: m.name,
      recipe:
        m.data && typeof m.data === "object" && "name" in m.data
          ? (m.data as { name: string }).name
          : "No programado",
    })),
  };
}

export async function smartShoppingList(daysAhead: number = 7): Promise<{
  total_items: number;
  by_category: Record<
    string,
    Array<{ item: string; for_recipes: string[]; urgency: string }>
  >;
  priority_items: string[];
  estimated_meals: number;
  summary: string;
}> {
  const supabase = await getSupabase();
  const today = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipesNeeded: Map<string, any> = new Map();

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dow = date.getDay();
    const cycleDay = (((dow === 0 ? 7 : dow) - 1) % 12) + 1;

    const { data: menu } = await supabase
      .from("day_menu")
      .select(
        `
        breakfast:recipes!day_menu_breakfast_id_fkey(name, ingredients),
        lunch:recipes!day_menu_lunch_id_fkey(name, ingredients),
        dinner:recipes!day_menu_dinner_id_fkey(name, ingredients)
      `,
      )
      .throwOnError()
      .eq("day_number", cycleDay)
      .single();

    if (menu) {
      interface JoinedRecipeWithIngredients {
        name?: string;
        ingredients?: Array<string | { name?: string }>;
      }
      [menu.breakfast, menu.lunch, menu.dinner].forEach((recipe: unknown) => {
        const r = recipe as JoinedRecipeWithIngredients | null;
        if (r && r.name) {
          if (!recipesNeeded.has(r.name)) {
            recipesNeeded.set(r.name, { ...r, count: 1 });
          } else {
            const existing = recipesNeeded.get(r.name);
            existing.count++;
          }
        }
      });
    }
  }

  const ingredientsNeeded: Map<
    string,
    { forRecipes: string[]; totalNeeded: number }
  > = new Map();

  for (const [recipeName, recipe] of recipesNeeded) {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [];
    for (const ing of ingredients) {
      const ingName =
        typeof ing === "string" ? ing : (ing as { name?: string }).name || "";
      const normalized = ingName.toLowerCase().trim();

      if (!ingredientsNeeded.has(normalized)) {
        ingredientsNeeded.set(normalized, { forRecipes: [], totalNeeded: 0 });
      }
      const data = ingredientsNeeded.get(normalized)!;
      if (!data.forRecipes.includes(recipeName)) {
        data.forRecipes.push(recipeName);
      }
      data.totalNeeded += recipe.count;
    }
  }

  const { data: inventory } = await supabase
    .from("inventory")
    .select("*, market_item:market_items(name, category)")
    .throwOnError()
    .gt("current_number", 0);

  const availableMap: Map<string, { quantity: number; category: string }> =
    new Map();
  inventory?.forEach((item) => {
    const name =
      (item.market_item as { name?: string })?.name?.toLowerCase() || "";
    const category =
      (item.market_item as { category?: string })?.category || "Otros";
    availableMap.set(name, { quantity: item.current_number ?? 0, category });
  });

  const byCategory: Record<
    string,
    Array<{ item: string; for_recipes: string[]; urgency: string }>
  > = {};
  const priorityItems: string[] = [];

  for (const [ingredient, data] of ingredientsNeeded) {
    let found = false;
    for (const [invName] of availableMap) {
      if (invName.includes(ingredient) || ingredient.includes(invName)) {
        found = true;
        break;
      }
    }

    if (!found) {
      const { data: marketItem } = await supabase
        .from("market_items")
        .select("category")
        .throwOnError()
        .ilike("name", `%${ingredient}%`)
        .single();

      const category = marketItem?.category || "Otros";

      if (!byCategory[category]) {
        byCategory[category] = [];
      }

      const urgency =
        data.totalNeeded >= 3
          ? "alta"
          : data.totalNeeded >= 2
            ? "media"
            : "baja";

      byCategory[category].push({
        item: ingredient,
        for_recipes: data.forRecipes,
        urgency,
      });

      if (urgency === "alta") {
        priorityItems.push(ingredient);
      }
    }
  }

  let totalItems = 0;
  for (const items of Object.values(byCategory)) {
    totalItems += items.length;
  }

  return {
    total_items: totalItems,
    by_category: byCategory,
    priority_items: priorityItems,
    estimated_meals: recipesNeeded.size,
    summary:
      totalItems === 0
        ? `¡Excelente! Tienes todos los ingredientes para las próximas ${daysAhead} días.`
        : `Necesitas ${totalItems} items para ${recipesNeeded.size} comidas en los próximos ${daysAhead} días. ${priorityItems.length > 0 ? `Prioridad alta: ${priorityItems.slice(0, 3).join(", ")}.` : ""}`,
  };
}
