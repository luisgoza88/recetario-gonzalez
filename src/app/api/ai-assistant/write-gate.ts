/**
 * Compuerta de escritura del asistente IA.
 *
 * Decide si una tanda de llamadas a funciones que MODIFICAN datos puede
 * ejecutarse directamente (con audit log + undo) o si debe pasar por una
 * propuesta con aprobación humana.
 *
 * Se extrajo a su propio módulo para que la decisión sea una función pura,
 * testeable sin levantar el route ni el modelo.
 */

import {
  getFunctionRiskLevel,
  shouldCreateProposal,
  AI_RISK_LEVELS,
} from "@/lib/ai/ai-command-service";
import type { AIRiskLevel } from "@/types";

/**
 * Funciones destructivas que SIEMPRE requieren aprobación humana,
 * independientemente de lo que diga el registry de riesgo en la DB.
 *
 * Defensa en profundidad: `getFunctionRiskLevel` devuelve MEDIUM para funciones
 * no registradas, así que una función destructiva que nunca se registró pasaría
 * como "media" y podría auto-aprobarse en trust alto. Esta lista lo impide.
 */
export const ALWAYS_REQUIRE_APPROVAL = new Set<string>([
  "delete_recipe",
  "delete_employee",
  "delete_space",
  "delete_task_template",
  "reset_inventory_to_default",
  "bulk_update_inventory",
]);

/**
 * Funciones que MODIFICAN datos y que el orchestrator sabe despachar.
 *
 * Lista explícita a propósito: no se deriva por "todo lo que no sea get_*".
 * Una función nueva no entra por accidente al camino de escritura — hay que
 * agregarla aquí conscientemente y darle un risk level.
 */
export const WRITE_FUNCTIONS = new Set<string>([
  // Recetario
  "add_to_shopping_list",
  "add_missing_to_shopping",
  "mark_shopping_item",
  "swap_menu_recipe",
  "update_inventory",
  "bulk_update_inventory",
  "scan_receipt_items",
  "reset_inventory_to_default",
  "create_recipe",
  "update_recipe",
  "delete_recipe",
  // Hogar — tareas
  "complete_task",
  "add_quick_task",
  "create_task_template",
  "update_task_template",
  "delete_task_template",
  "reschedule_task",
  "generate_tasks_for_date",
  // Hogar — espacios
  "create_space",
  "update_space",
  "delete_space",
  // Hogar — empleados
  "create_employee",
  "update_employee",
  "delete_employee",
  // Compuestas
  "execute_multi_step_task",
]);

/** True si la función modifica datos (y por tanto pasa por la compuerta). */
export function isWriteFunction(name: string): boolean {
  return WRITE_FUNCTIONS.has(name);
}

/** Separa las llamadas del modelo en lecturas y escrituras. */
export function partitionCalls<T extends { name: string }>(
  calls: T[],
): { reads: T[]; writes: T[] } {
  const reads: T[] = [];
  const writes: T[] = [];
  for (const call of calls) {
    if (isWriteFunction(call.name)) writes.push(call);
    else reads.push(call);
  }
  return { reads, writes };
}

/**
 * Decide si esta tanda de escrituras necesita aprobación humana.
 *
 * Requiere propuesta cuando:
 *   1. alguna función está en `ALWAYS_REQUIRE_APPROVAL`, o
 *   2. el riesgo máximo de la tanda es HIGH o superior, o
 *   3. el nivel de confianza del hogar no auto-aprueba ese riesgo.
 *
 * A diferencia de la ruta anterior, aquí NO existe un flag `executeDirectly`
 * controlado por el cliente: el cliente no puede pedir saltarse la aprobación.
 */
export async function needsHumanApproval(
  writeCalls: Array<{ name: string }>,
  householdId: string,
): Promise<boolean> {
  if (writeCalls.length === 0) return false;

  if (writeCalls.some((c) => ALWAYS_REQUIRE_APPROVAL.has(c.name))) {
    return true;
  }

  let maxRisk: AIRiskLevel = AI_RISK_LEVELS.LOW as AIRiskLevel;
  for (const call of writeCalls) {
    const risk = await getFunctionRiskLevel(call.name);
    if (risk > maxRisk) maxRisk = risk;
  }
  if (maxRisk >= (AI_RISK_LEVELS.HIGH as AIRiskLevel)) return true;

  return shouldCreateProposal(
    writeCalls.map((c) => c.name),
    householdId,
  );
}
