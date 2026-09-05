import { createAIClient } from "@/lib/ai-assistant/db";
import { MultiStepResult } from "@/lib/ai-assistant/types";
import { logger } from "@/lib/logger";
import {
  getTodayMenu,
  getWeekMenu,
  getRecipeDetails,
  getMissingIngredients,
  getInventory,
  getShoppingList,
  suggestRecipe,
  countIngredientMatches,
} from "./recetario-queries";
import { addMissingToShopping } from "./recetario-mutations";
import { getTodayTasks, getTasksSummary } from "./home-queries";
import {
  getCurrentDateInfo,
  getLowInventoryAlerts,
  getPreparationTips,
  smartShoppingList,
  getUpcomingMeals,
} from "./reports";

async function getSupabase() {
  return createAIClient();
}

export async function executeMultiStepTask(
  taskType: string,
  params: Record<string, unknown> = {},
): Promise<MultiStepResult> {
  const supabase = await getSupabase();
  const stepsCompleted: string[] = [];
  const results: Record<string, unknown> = {};

  switch (taskType) {
    case "prepare_recipe": {
      const recipeName = params.recipe_name as string;
      if (!recipeName) {
        return {
          task_type: taskType,
          steps_completed: [],
          results: { error: "Se requiere el nombre de la receta" },
          summary: "Error: falta el nombre de la receta",
        };
      }

      const recipeDetails = await getRecipeDetails(recipeName);
      stepsCompleted.push("Buscar receta en base de datos");
      results.recipe = recipeDetails;

      if (
        "recipe_not_found" in recipeDetails &&
        recipeDetails.recipe_not_found
      ) {
        stepsCompleted.push(
          "📚 Receta no encontrada - usar conocimiento culinario general",
        );
        const inventory = await getInventory();
        stepsCompleted.push("Obtener inventario disponible");
        results.inventory = inventory;

        return {
          task_type: taskType,
          steps_completed: stepsCompleted,
          results,
          summary: `La receta "${recipeName}" no está en la base de datos, pero puedo ayudarte usando mi conocimiento culinario.`,
          use_general_knowledge: true,
          instruction: `IMPORTANTE: Debes usar tu conocimiento general de cocina para dar los ingredientes y pasos de "${recipeName}". Compara con el inventario del usuario e indica cuáles tiene disponibles y cuáles le faltan. Ofrece agregar faltantes a la lista de compras.`,
          next_suggestions: [
            "Dame los ingredientes y pasos",
            "Agrega lo que me falta a la lista",
            "Buscar una receta similar en el sistema",
          ],
        };
      }

      const missingCheck = await getMissingIngredients(recipeName);
      stepsCompleted.push("Verificar ingredientes en inventario");
      results.ingredients_check = missingCheck;

      const missingCount =
        ("missing_count" in missingCheck ? missingCheck.missing_count : 0) || 0;
      if (missingCount && missingCount > 0) {
        const addResult = await addMissingToShopping(recipeName);
        stepsCompleted.push("Agregar faltantes a lista de compras");
        results.shopping_added = addResult;
      }

      const tips = await getPreparationTips();
      stepsCompleted.push("Generar consejos de preparación");
      results.tips = tips;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Receta "${recipeName}" preparada. ${
          missingCount > 0
            ? `Se agregaron ${missingCount} ingredientes a la lista de compras.`
            : "Tienes todos los ingredientes."
        }`,
        next_suggestions: [
          "Ver pasos de preparación detallados",
          "Ajustar porciones",
          "Ver sustituciones disponibles",
        ],
      };
    }

    case "weekly_planning": {
      const weekMenu = await getWeekMenu();
      stepsCompleted.push("Obtener menú de la semana");
      results.menu = weekMenu;

      const inventory = await getInventory();
      stepsCompleted.push("Revisar inventario actual");
      results.inventory = inventory;

      const shoppingList = await smartShoppingList(7);
      stepsCompleted.push("Generar lista de compras para la semana");
      results.shopping_list = shoppingList;

      const alerts = await getLowInventoryAlerts(2);
      stepsCompleted.push("Verificar alertas de inventario");
      results.alerts = alerts;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Planificación semanal completada. ${
          "total_items" in shoppingList
            ? `${shoppingList.total_items} items necesarios para comprar.`
            : ""
        } ${
          "critical_count" in alerts && alerts.critical_count > 0
            ? `Alerta: ${alerts.critical_count} items agotados.`
            : ""
        }`,
        next_suggestions: [
          "Ver menú detallado por día",
          "Ajustar recetas del menú",
          "Exportar lista de compras",
        ],
      };
    }

    case "shopping_optimization": {
      const currentList = await getShoppingList();
      stepsCompleted.push("Obtener lista de compras actual");
      results.current_list = currentList;

      const alerts = await getLowInventoryAlerts(3);
      stepsCompleted.push("Identificar items con bajo stock");
      results.low_stock = alerts;

      const upcomingMeals = await getUpcomingMeals(5);
      stepsCompleted.push("Analizar comidas de los próximos 5 días");
      results.upcoming = upcomingMeals;

      const smartList = await smartShoppingList(5);
      stepsCompleted.push("Generar lista optimizada");
      results.optimized_list = smartList;

      const currentCount =
        "total" in currentList
          ? currentList.total
          : currentList.items?.length || 0;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Lista de compras optimizada. ${currentCount} items actuales, ${
          "total_items" in smartList ? smartList.total_items : 0
        } items recomendados para los próximos 5 días.`,
        next_suggestions: [
          "Ver items por categoría",
          "Agregar items adicionales",
          "Ver tiendas recomendadas por categoría",
        ],
      };
    }

    case "full_report": {
      const dateInfo = getCurrentDateInfo();
      stepsCompleted.push("Obtener información del día");
      results.date = dateInfo;

      const todayMenu = await getTodayMenu();
      stepsCompleted.push("Obtener menú de hoy");
      results.today_menu = todayMenu;

      const tasks = await getTodayTasks();
      stepsCompleted.push("Obtener tareas del día");
      results.tasks = tasks;

      const tasksSummary = await getTasksSummary();
      stepsCompleted.push("Calcular progreso de tareas");
      results.tasks_summary = tasksSummary;

      const inventoryAlerts = await getLowInventoryAlerts(2);
      stepsCompleted.push("Revisar alertas de inventario");
      results.inventory_alerts = inventoryAlerts;

      const prepTips = await getPreparationTips();
      stepsCompleted.push("Generar consejos del día");
      results.tips = prepTips;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Reporte completo del hogar para ${dateInfo.day_name} ${dateInfo.date}. ${
          "progress_percent" in tasksSummary
            ? `Tareas: ${tasksSummary.progress_percent}% completadas.`
            : ""
        } ${
          "critical_count" in inventoryAlerts &&
          inventoryAlerts.critical_count > 0
            ? `Alerta: ${inventoryAlerts.critical_count} items de inventario agotados.`
            : "Inventario en buen estado."
        }`,
        next_suggestions: [
          "Ver detalle de tareas pendientes",
          "Ver recetas de hoy",
          "Actualizar inventario",
        ],
      };
    }

    case "menu_from_inventory": {
      const inventory = await getInventory();
      stepsCompleted.push("Analizar inventario disponible");
      results.inventory = inventory;

      const suggestions: Array<{
        name: string;
        prep_time?: string;
        category?: string;
        match_percent: number;
      }> = [];

      const { data: recipes } = await supabase
        .from("recipes")
        .select("name, ingredients, prep_time, category")
        .throwOnError()
        .limit(30);

      const { data: invItems } = await supabase
        .from("inventory")
        .select("market_item:market_items(name)")
        .throwOnError()
        .gt("current_number", 0);

      const availableItems =
        invItems
          ?.map((i) => (i.market_item as { name?: string })?.name)
          .filter((n): n is string => !!n) || [];

      for (const recipe of recipes || []) {
        const ingredients = Array.isArray(recipe.ingredients)
          ? (recipe.ingredients as Array<{ name?: string } | string>)
          : [];
        const { matchPercent } = countIngredientMatches(
          ingredients,
          availableItems,
        );

        if (matchPercent >= 60) {
          suggestions.push({
            name: recipe.name,
            prep_time:
              recipe.prep_time !== null ? String(recipe.prep_time) : undefined,
            category: recipe.category ?? undefined,
            match_percent: matchPercent,
          });
        }
      }

      suggestions.sort((a, b) => b.match_percent - a.match_percent);
      stepsCompleted.push("Calcular compatibilidad de recetas");
      results.suggestions = suggestions.slice(0, 10);

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Encontradas ${suggestions.length} recetas compatibles con tu inventario actual. Las mejores opciones tienen ${suggestions[0]?.match_percent || 0}% de ingredientes disponibles.`,
        next_suggestions: [
          "Ver detalles de la receta recomendada",
          "Agregar ingredientes faltantes a la lista",
          "Ver otras opciones",
        ],
      };
    }

    default:
      return {
        task_type: taskType,
        steps_completed: [],
        results: { error: `Tipo de tarea no reconocido: ${taskType}` },
        summary: `Error: tipo de tarea "${taskType}" no válido. Usa: prepare_recipe, weekly_planning, shopping_optimization, full_report, menu_from_inventory`,
      };
  }
}
