import { assertExecutionSucceeded } from "@/lib/ai/proposal-executor";
/**
 * AI Assistant Orchestrator
 *
 * Handles function dispatch, audit logging, state capture,
 * proposal creation, and risk assessment.
 */

import {
  getFunctionRiskLevel,
  shouldAutoApprove,
  createAuditLog,
  completeAuditLog,
  createProposal,
  functionCallToProposedAction,
  generateProposalSummary,
  AI_RISK_LEVELS,
  recordActionOutcome,
} from "@/lib/ai/ai-command-service";
import { AIProposedAction, AIRiskLevel } from "@/types";
import {
  ExecutionContext,
  ExecutionResult,
  ProposalResponse,
  RecipeIngredient,
  InventoryUpdate,
  ReceiptItem,
} from "@/lib/ai-assistant/types";
import { createAIClient } from "@/lib/ai-assistant/db";
import { logger } from "@/lib/logger";

// Import all function implementations
import {
  // Recetario Queries
  getTodayMenu,
  getWeekMenu,
  searchRecipes,
  getRecipeDetails,
  getMissingIngredients,
  getInventory,
  getShoppingList,
  suggestRecipe,
  // Recetario Mutations
  addToShoppingList,
  markShoppingItem,
  addMissingToShopping,
  swapMenuRecipe,
  updateInventory,
  bulkUpdateInventory,
  scanReceiptItems,
  resetInventoryToDefault,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  // Home Queries
  getTodayTasks,
  getEmployeeSchedule,
  getTasksSummary,
  listSpaces,
  getSpaceDetails,
  listEmployees,
  getEmployeeDetails,
  listTaskTemplates,
  // Home Mutations
  completeTask,
  addQuickTask,
  createSpace,
  updateSpace,
  deleteSpace,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  rescheduleTask,
  generateTasksForDate,
  // Reports
  getCurrentDateInfo,
  getWeeklyReport,
  getLowInventoryAlerts,
  getUpcomingMeals,
  calculatePortions,
  getPreparationTips,
  smartShoppingList,
  // Multi-step
  executeMultiStepTask,
} from "./functions";

// Lazy-evaluated authenticated Supabase client (for state capture)
async function getSupabase() {
  return createAIClient();
}

// ============================================
// STATE CAPTURE (for audit logging)
// ============================================

/**
 * Captures the state before executing a mutation function
 */
async function capturePreState(
  functionName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const supabase = await getSupabase();
    switch (functionName) {
      case "swap_menu_recipe": {
        const dayNumber = args.day_number as number;
        const mealType = args.meal_type as string;
        const { data } = await supabase
          .from("day_menu")
          .select(
            `
            *,
            breakfast:recipes!day_menu_breakfast_id_fkey(id, name),
            lunch:recipes!day_menu_lunch_id_fkey(id, name),
            dinner:recipes!day_menu_dinner_id_fkey(id, name)
          `,
          )
          .eq("day_number", dayNumber)
          .single();
        return data ? { day_menu: data, mealType, dayNumber } : null;
      }
      case "update_inventory": {
        const itemName = args.item_name as string;
        const { data: item } = await supabase
          .from("market_items")
          .select("id, name")
          .ilike("name", `%${itemName}%`)
          .single();
        if (!item) return null;
        const { data: inv } = await supabase
          .from("inventory")
          .select("*")
          .eq("item_id", item.id)
          .single();
        return inv ? { inventory: inv, item } : { item, inventory: null };
      }
      case "mark_shopping_item": {
        const itemName = args.item_name as string;
        const { data: item } = await supabase
          .from("market_items")
          .select("id, name")
          .ilike("name", `%${itemName}%`)
          .single();
        if (!item) return null;
        const { data: checklist } = await supabase
          .from("market_checklist")
          .select("*")
          .eq("item_id", item.id)
          .single();
        return checklist ? { market_checklist: checklist, item } : null;
      }
      case "complete_task": {
        const taskName = args.task_name as string;
        const today = new Date().toISOString().split("T")[0];
        const { data: tasks } = await supabase
          .from("scheduled_tasks")
          .select("*, task_template:task_templates(name)")
          .eq("scheduled_date", today)
          .neq("status", "completada");

        const matched = tasks?.find((task) => {
          const template = task.task_template as unknown as {
            name?: string;
          } | null;
          return (template?.name || "")
            .toLowerCase()
            .includes(taskName.toLowerCase());
        });

        return matched ? { scheduled_tasks: matched } : null;
      }
      default:
        return null;
    }
  } catch (error) {
    logger.error(`Error capturing pre-state for ${functionName}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Captures the state after executing a function (reuses capturePreState logic)
 */
async function capturePostState(
  functionName: string,
  args: Record<string, unknown>,
  _preState: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  return capturePreState(functionName, args);
}

/**
 * Maps function names to affected database tables
 */
function getAffectedTables(functionName: string): string[] {
  const tableMap: Record<string, string[]> = {
    swap_menu_recipe: ["day_menu"],
    update_inventory: ["inventory"],
    mark_shopping_item: ["market_checklist"],
    add_to_shopping_list: ["market_checklist", "market_items"],
    add_missing_to_shopping: ["market_checklist", "market_items"],
    complete_task: ["scheduled_tasks"],
    add_quick_task: ["task_templates", "scheduled_tasks"],
  };
  return tableMap[functionName] || [];
}

// ============================================
// FUNCTION DISPATCHER
// ============================================

/**
 * Main function dispatcher - routes function names to implementations
 */
export async function executeFunction(
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    // Consultas - Recetario
    case "get_today_menu":
      return await getTodayMenu();
    case "get_week_menu":
      return await getWeekMenu();
    case "get_recipe_details":
      return await getRecipeDetails(args.recipe_name as string);
    case "search_recipes":
      return await searchRecipes(args.query as string);
    case "get_inventory":
      return await getInventory();
    case "get_shopping_list":
      return await getShoppingList();
    case "get_missing_ingredients":
      return await getMissingIngredients(args.recipe_name as string);
    case "suggest_recipe":
      return await suggestRecipe(args.preferences as string);

    // Consultas - Hogar
    case "get_today_tasks":
      return await getTodayTasks();
    case "get_employee_schedule":
      return await getEmployeeSchedule(
        args.employee_name as string,
        args.period as string,
      );
    case "get_tasks_summary":
      return await getTasksSummary();

    // Acciones - Recetario
    case "add_to_shopping_list":
      return await addToShoppingList(
        args.item_name as string,
        args.quantity as string,
      );
    case "add_missing_to_shopping":
      return await addMissingToShopping(args.recipe_name as string);
    case "mark_shopping_item":
      return await markShoppingItem(
        args.item_name as string,
        args.checked as boolean,
      );
    case "swap_menu_recipe":
      return await swapMenuRecipe(
        args.day_number as number,
        args.meal_type as string,
        args.new_recipe_name as string,
      );
    case "update_inventory":
      return await updateInventory(
        args.item_name as string,
        args.quantity as number,
        args.action as string,
      );

    // Acciones - Hogar
    case "complete_task":
      return await completeTask(
        args.task_name as string,
        args.employee_name as string,
      );
    case "add_quick_task":
      return await addQuickTask(
        args.task_name as string,
        args.employee_name as string,
        args.category as string,
        args.household_id as string,
      );

    // Reportes y análisis
    case "get_weekly_report":
      return await getWeeklyReport();
    case "get_low_inventory_alerts":
      return await getLowInventoryAlerts(args.threshold as number);
    case "get_upcoming_meals":
      return await getUpcomingMeals(args.days as number);

    // Utilidades
    case "get_current_date_info":
      return getCurrentDateInfo();
    case "calculate_portions":
      return await calculatePortions(
        args.recipe_name as string,
        args.portions as number,
      );
    case "get_preparation_tips":
      return await getPreparationTips();

    // Agente Multi-paso
    case "execute_multi_step_task":
      return await executeMultiStepTask(
        args.task_type as string,
        (args.params as Record<string, unknown>) || {},
      );
    case "smart_shopping_list":
      return await smartShoppingList(args.days_ahead as number);

    // CRUD - Espacios
    case "list_spaces":
      return await listSpaces(args.household_id as string);
    case "get_space_details":
      return await getSpaceDetails(
        args.space_id as string,
        args.space_name as string,
      );
    case "create_space":
      return await createSpace(
        (args.household_id as string) || "default-household",
        args.name as string,
        args.space_type as string,
        args.category as string,
        args.usage_level as string,
        args.has_bathroom as boolean,
        args.area_sqm as number,
        args.notes as string,
      );
    case "update_space":
      return await updateSpace(args.space_id as string, {
        name: args.name as string,
        category: args.category as string,
        usageLevel: args.usage_level as string,
        hasBathroom: args.has_bathroom as boolean,
        areaSqm: args.area_sqm as number,
        notes: args.notes as string,
      });
    case "delete_space":
      return await deleteSpace(
        args.space_id as string,
        args.confirm as boolean,
      );

    // CRUD - Empleados
    case "list_employees":
      return await listEmployees(
        args.household_id as string,
        (args.active_only as boolean) ?? true,
      );
    case "get_employee_details":
      return await getEmployeeDetails(
        args.employee_id as string,
        args.employee_name as string,
      );
    case "create_employee":
      return await createEmployee(
        (args.household_id as string) || "default-household",
        args.name as string,
        args.role as string,
        args.zone as string,
        args.work_days as string[],
        args.hours_per_day as number,
        args.schedule as string,
        args.phone as string,
        args.notes as string,
      );
    case "update_employee":
      return await updateEmployee(args.employee_id as string, {
        name: args.name as string,
        role: args.role as string,
        zone: args.zone as string,
        workDays: args.work_days as string[],
        hoursPerDay: args.hours_per_day as number,
        schedule: args.schedule as string,
        phone: args.phone as string,
        notes: args.notes as string,
        active: args.active as boolean,
      });
    case "delete_employee":
      return await deleteEmployee(
        args.employee_id as string,
        args.hard_delete as boolean,
        args.confirm as boolean,
      );

    // CRUD - Tareas
    case "list_task_templates":
      return await listTaskTemplates(
        args.employee_id as string,
        args.week_number as number,
        args.category as string,
      );
    case "create_task_template":
      return await createTaskTemplate(
        args.employee_name as string,
        args.task_name as string,
        args.week_number as number,
        args.day_of_week as number,
        args.time_start as string,
        args.time_end as string,
        args.category as string,
        args.is_special as boolean,
        args.description as string,
        args.household_id as string,
        (args.frequency as string) || "semanal",
        (args.estimated_minutes as number) || 30,
        (args.priority as string) || "normal",
        args.space_id as string,
      );
    case "update_task_template":
      return await updateTaskTemplate(args.template_id as string, {
        taskName: args.task_name as string,
        employeeName: args.employee_name as string,
        category: args.category as string,
        description: args.description as string,
        frequency: args.frequency as string,
        estimatedMinutes: args.estimated_minutes as number,
        priority: args.priority as string,
        spaceId: args.space_id as string,
        isActive: args.is_active as boolean,
      });
    case "delete_task_template":
      return await deleteTaskTemplate(
        args.template_id as string,
        args.confirm as boolean,
      );
    case "reschedule_task":
      return await rescheduleTask(
        args.task_id as string,
        args.new_date as string,
        args.new_time_start as string,
        args.new_time_end as string,
        args.new_employee_name as string,
      );
    case "generate_tasks_for_date":
      return await generateTasksForDate(
        args.date as string,
        args.household_id as string,
      );

    // CRUD - Recetas
    case "create_recipe":
      return await createRecipe(
        args.name as string,
        args.type as "breakfast" | "lunch" | "dinner",
        args.ingredients as RecipeIngredient[],
        args.steps as string[],
        args.prep_time as number,
        args.cook_time as number,
        args.difficulty as string,
        args.description as string,
        args.tips as string,
      );
    case "update_recipe":
      return await updateRecipe(
        args.recipe_id as string,
        args.updates as Partial<{
          name: string;
          type: "breakfast" | "lunch" | "dinner";
          ingredients: RecipeIngredient[];
          steps: string[];
          prep_time: number;
          cook_time: number;
          difficulty: string;
          description: string;
          tips: string;
        }>,
      );
    case "delete_recipe":
      return await deleteRecipe(
        args.recipe_id as string,
        args.confirm as boolean,
      );

    // Inventario avanzado
    case "bulk_update_inventory":
      return await bulkUpdateInventory(
        args.updates as InventoryUpdate[],
        args.confirm as boolean,
      );
    case "scan_receipt_items":
      return await scanReceiptItems(args.items as ReceiptItem[]);
    case "reset_inventory_to_default":
      return await resetInventoryToDefault(args.confirm as boolean);

    default:
      return { error: `Función desconocida: ${name}` };
  }
}

// ============================================
// EXECUTION WITH LOGGING
// ============================================

/**
 * Executes a function with full audit logging (for low/medium risk mutations)
 */
export async function executeFunctionWithLogging(
  name: string,
  args: Record<string, unknown>,
  context: ExecutionContext,
): Promise<ExecutionResult> {
  const riskLevel = await getFunctionRiskLevel(name);

  // Read-only functions don't need full logging
  if (
    name.startsWith("get_") ||
    name.startsWith("search_") ||
    name.startsWith("suggest_") ||
    name === "calculate_portions"
  ) {
    const result = await executeFunction(name, args);
    return {
      result,
      canUndo: false,
      riskLevel,
    };
  }

  // Capture pre-state for mutation functions
  const previousState = await capturePreState(name, args);

  // Create audit log
  const auditLogId = await createAuditLog({
    householdId: context.householdId,
    userId: context.userId,
    sessionId: context.sessionId,
    functionName: name,
    parameters: args,
    riskLevel,
  });

  try {
    const result = await executeFunction(name, args);
    assertExecutionSucceeded(result);
    const newState = await capturePostState(name, args, previousState);

    if (auditLogId) {
      await completeAuditLog({
        logId: auditLogId,
        status: "completed",
        result: result as Record<string, unknown>,
        previousState: previousState || undefined,
        newState: newState || undefined,
        affectedTables: getAffectedTables(name),
      });
    }

    // Record successful action for trust scoring
    await recordActionOutcome(context.householdId, true).catch((error) =>
      logger.error("Failed to record successful action outcome", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    return {
      result,
      auditLogId: auditLogId || undefined,
      canUndo: !!previousState && !!newState && !!auditLogId,
      riskLevel,
    };
  } catch (error) {
    // Record failed action for trust scoring
    await recordActionOutcome(context.householdId, false).catch((error) =>
      logger.error("Failed to record failed action outcome", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    if (auditLogId) {
      await completeAuditLog({
        logId: auditLogId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

// ============================================
// PROPOSAL CREATION
// ============================================

/**
 * Creates a proposal for high-risk operations
 */
export async function createFunctionProposal(
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>,
  context: ExecutionContext,
): Promise<ProposalResponse> {
  const actions: AIProposedAction[] = [];

  for (const fc of functionCalls) {
    const action = await functionCallToProposedAction(
      fc.name,
      fc.args,
      generateActionDescription(fc.name, fc.args),
    );
    actions.push(action);
  }

  const proposal = await createProposal({
    householdId: context.householdId,
    userId: context.userId,
    sessionId: context.sessionId,
    summary: generateProposalSummary(actions),
    actions,
  });

  if (!proposal) {
    throw new Error("No se pudo crear la propuesta");
  }

  return {
    type: "proposal",
    proposalId: proposal.proposal_id,
    summary: proposal.summary,
    actions: proposal.actions,
    riskLevel: proposal.risk_level as AIRiskLevel,
    expiresAt: proposal.expires_at,
  };
}

/**
 * Generates a human-readable description for a function call
 */
export function generateActionDescription(
  functionName: string,
  args: Record<string, unknown>,
): string {
  const descriptions: Record<
    string,
    (args: Record<string, unknown>) => string
  > = {
    // Recetas y menú
    swap_menu_recipe: (a) =>
      `Cambiar ${a.meal_type} del día ${a.day_number} a "${a.new_recipe_name}"`,
    // Inventario y compras
    update_inventory: (a) =>
      `Actualizar inventario de "${a.item_name}" a ${a.quantity}`,
    mark_shopping_item: (a) =>
      `${a.checked ? "Marcar" : "Desmarcar"} "${a.item_name}" en la lista de compras`,
    add_to_shopping_list: (a) =>
      `Agregar "${a.item_name}" a la lista de compras`,
    add_missing_to_shopping: (a) =>
      `Agregar ingredientes faltantes de "${a.recipe_name}" a la lista`,
    // Tareas
    complete_task: (a) => `Marcar como completada la tarea "${a.task_name}"`,
    add_quick_task: (a) => `Crear tarea rápida "${a.task_name}"`,
    create_task_template: (a) =>
      `Crear plantilla de tarea "${a.task_name}" para ${a.employee_name}`,
    update_task_template: (a) =>
      `Actualizar plantilla de tarea ${a.template_id}`,
    delete_task_template: (a) => `Eliminar plantilla de tarea ${a.template_id}`,
    reschedule_task: (a) =>
      `Reprogramar tarea ${a.task_id}${a.new_date ? ` para ${a.new_date}` : ""}`,
    generate_tasks_for_date: (a) => `Generar tareas para ${a.date}`,
    // Espacios
    create_space: (a) => `Crear espacio "${a.name}" (${a.space_type})`,
    update_space: (a) => `Actualizar espacio ${a.space_id}`,
    delete_space: (a) => `Eliminar espacio ${a.space_id}`,
    // Empleados
    create_employee: (a) => `Registrar empleado "${a.name}" (${a.role})`,
    update_employee: (a) => `Actualizar empleado ${a.employee_id}`,
    delete_employee: (a) =>
      `${a.hard_delete ? "Eliminar" : "Desactivar"} empleado ${a.employee_id}`,
    // Multi-paso
    execute_multi_step_task: (a) => `Ejecutar plan: ${a.task_type}`,
    smart_shopping_list: (a) =>
      `Generar lista de compras para ${a.days_ahead || 7} días`,
  };

  const generator = descriptions[functionName];
  if (generator) {
    return generator(args);
  }

  return `Ejecutar ${functionName}`;
}

/**
 * Determines if a proposal should be created based on risk level
 */
export async function shouldCreateProposal(
  functionNames: string[],
  householdId: string,
): Promise<boolean> {
  for (const name of functionNames) {
    const riskLevel = await getFunctionRiskLevel(name);

    // Level 3+ always creates proposal
    if (riskLevel >= AI_RISK_LEVELS.HIGH) {
      return true;
    }

    // For level 2, check household configuration
    if (riskLevel === AI_RISK_LEVELS.MEDIUM) {
      const autoApprove = await shouldAutoApprove(householdId, riskLevel);
      if (!autoApprove) {
        return true;
      }
    }
  }

  return false;
}
