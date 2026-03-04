/**
 * AI Command Center Service
 *
 * Maneja la clasificación de riesgo, logging, propuestas y ejecución
 * de acciones de IA con soporte para rollback.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import {
  AIRiskLevel,
  AIFunctionConfig,
  AIAuditLog,
  AIProposal,
  AIProposedAction,
  AIProposalStatus,
  HouseholdAITrust,
  AI_RISK_LEVELS,
  ProposalExecutionResult,
  RollbackResult,
} from "@/types";
import {
  checkAutoApproval,
  checkRateLimit,
  checkBulkLimit,
  recordSuccessfulAction,
  recordFailedAction,
  recordRollback,
  getTrustStats,
  TrustDecision,
  RateLimitCheck,
} from "./trust-service";
import { logger } from "@/lib/logger";

async function getClient(): Promise<SupabaseClient> {
  return createAuthenticatedClient();
}

// ============================================
// CACHE DE CONFIGURACIÓN DE FUNCIONES
// ============================================

let functionConfigCache: Map<string, AIFunctionConfig> | null = null;
let configCacheExpiry = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la configuración de riesgo de una función
 */
export async function getFunctionConfig(
  functionName: string,
): Promise<AIFunctionConfig | null> {
  // Verificar cache
  if (functionConfigCache && Date.now() < configCacheExpiry) {
    return functionConfigCache.get(functionName) || null;
  }

  // Cargar todas las configuraciones
  const db = await getClient();
  const { data, error } = await db
    .from("ai_function_registry")
    .select("*")
    .eq("is_enabled", true);

  if (error) {
    logger.error("Error loading function configs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  // Actualizar cache
  functionConfigCache = new Map();
  for (const config of data || []) {
    functionConfigCache.set(config.function_name, config as AIFunctionConfig);
  }
  configCacheExpiry = Date.now() + CONFIG_CACHE_TTL;

  return functionConfigCache.get(functionName) || null;
}

/**
 * Obtiene el nivel de riesgo de una función
 * Las funciones de lectura (get_*, search_*, suggest_*, list_*, calculate_*) siempre son LOW
 * Retorna nivel 2 (medium) por defecto para funciones de escritura si no se encuentra config
 */
export async function getFunctionRiskLevel(
  functionName: string,
): Promise<AIRiskLevel> {
  // Funciones de solo lectura siempre son de bajo riesgo
  const readOnlyPrefixes = [
    "get_",
    "search_",
    "suggest_",
    "list_",
    "calculate_",
    "execute_multi_step_task",
  ];
  if (readOnlyPrefixes.some((prefix) => functionName.startsWith(prefix))) {
    return AI_RISK_LEVELS.LOW as AIRiskLevel;
  }

  const config = await getFunctionConfig(functionName);
  return (config?.risk_level || AI_RISK_LEVELS.MEDIUM) as AIRiskLevel;
}

/**
 * Verifica si una función requiere confirmación
 */
export async function requiresConfirmation(
  functionName: string,
): Promise<boolean> {
  const config = await getFunctionConfig(functionName);
  return config?.requires_confirmation ?? false;
}

/**
 * Verifica si una función es reversible
 */
export async function isReversible(functionName: string): Promise<boolean> {
  const config = await getFunctionConfig(functionName);
  return config?.is_reversible ?? true;
}

// ============================================
// TRUST SCORE
// ============================================

/**
 * Obtiene la configuración de trust de un household
 */
export async function getHouseholdTrust(
  householdId: string,
): Promise<HouseholdAITrust | null> {
  const db = await getClient();
  const { data, error } = await db
    .from("household_ai_trust")
    .select("*")
    .eq("household_id", householdId)
    .single();

  if (error) {
    logger.error("Error getting household trust", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  return data as HouseholdAITrust;
}

/**
 * Verifica si una acción debe auto-aprobarse basado en el trust level
 * Ahora incluye rate limiting y guardrails
 */
export async function shouldAutoApprove(
  householdId: string,
  riskLevel: AIRiskLevel,
  actionCount: number = 1,
): Promise<boolean> {
  // Use the enhanced trust service for decision making
  const decision = await checkAutoApproval(householdId, riskLevel, actionCount);
  return decision.canAutoApprove;
}

/**
 * Extended version that returns the full trust decision
 */
export async function checkAutoApprovalWithDetails(
  householdId: string,
  riskLevel: AIRiskLevel,
  actionCount: number = 1,
): Promise<TrustDecision> {
  return await checkAutoApproval(householdId, riskLevel, actionCount);
}

/**
 * Check rate limits before executing actions
 */
export async function checkActionRateLimit(
  householdId: string,
  riskLevel: AIRiskLevel,
  actionCount: number = 1,
): Promise<RateLimitCheck> {
  return await checkRateLimit(householdId, riskLevel, actionCount);
}

/**
 * Check bulk operation limits
 */
export async function checkBulkOperationLimit(
  householdId: string,
  itemCount: number,
): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  return await checkBulkLimit(householdId, itemCount);
}

/**
 * Record action outcome for trust scoring
 */
export async function recordActionOutcome(
  householdId: string,
  success: boolean,
): Promise<void> {
  if (success) {
    await recordSuccessfulAction(householdId);
  } else {
    await recordFailedAction(householdId);
  }
}

/**
 * Record rollback for trust scoring
 */
export async function recordActionRollback(householdId: string): Promise<void> {
  await recordRollback(householdId);
}

/**
 * Get trust statistics for dashboard
 */
export { getTrustStats };

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Crea una entrada de audit log
 */
export async function createAuditLog(params: {
  householdId: string;
  userId?: string;
  sessionId: string;
  conversationId?: string;
  functionName: string;
  parameters: Record<string, unknown>;
  riskLevel: AIRiskLevel;
}): Promise<string | null> {
  const db = await getClient();
  const { data, error } = await db.rpc("create_ai_audit_log", {
    p_household_id: params.householdId,
    p_user_id: params.userId,
    p_session_id: params.sessionId,
    p_function_name: params.functionName,
    p_parameters: params.parameters,
    p_risk_level: params.riskLevel,
  });

  if (error) {
    logger.error("Error creating audit log", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  return data as string;
}

/**
 * Completa una entrada de audit log con el resultado
 */
export async function completeAuditLog(params: {
  logId: string;
  status: "completed" | "failed";
  result?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  affectedTables?: string[];
  affectedRecordIds?: string[];
  errorMessage?: string;
}): Promise<boolean> {
  const db = await getClient();
  const { error } = await db.rpc("complete_ai_audit_log", {
    p_log_id: params.logId,
    p_status: params.status,
    p_result: params.result || null,
    p_previous_state: params.previousState || null,
    p_new_state: params.newState || null,
    p_affected_tables: params.affectedTables || null,
    p_affected_record_ids: params.affectedRecordIds || null,
    p_error_message: params.errorMessage || null,
  });

  if (error) {
    logger.error("Error completing audit log", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  return true;
}

/**
 * Obtiene los últimos logs de un household (para undo)
 */
export async function getRecentAuditLogs(
  householdId: string,
  limit: number = 10,
): Promise<AIAuditLog[]> {
  const db = await getClient();
  const { data, error } = await db
    .from("ai_audit_log")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "completed")
    .not("previous_state", "is", null)
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Error getting recent audit logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  return data as AIAuditLog[];
}

// ============================================
// PROPUESTAS
// ============================================

/**
 * Crea una propuesta de acciones para aprobación
 */
export async function createProposal(params: {
  householdId: string;
  userId?: string;
  sessionId: string;
  summary: string;
  actions: AIProposedAction[];
}): Promise<AIProposal | null> {
  // Calcular el nivel de riesgo máximo de las acciones
  const maxRiskLevel = Math.max(
    ...params.actions.map((a) => a.risk_level),
  ) as AIRiskLevel;

  // Calcular tablas afectadas
  const tablesAffected = [
    ...new Set(
      params.actions.flatMap((a) => {
        // Inferir tablas basado en el nombre de la función
        const fnName = a.function_name.toLowerCase();
        if (fnName.includes("recipe") || fnName.includes("menu"))
          return ["recipes", "day_menu"];
        if (fnName.includes("inventory") || fnName.includes("shopping"))
          return ["inventory", "market_checklist"];
        if (fnName.includes("task"))
          return ["scheduled_tasks", "task_templates"];
        if (fnName.includes("employee")) return ["home_employees"];
        if (fnName.includes("space")) return ["spaces"];
        return ["unknown"];
      }),
    ),
  ];

  const db = await getClient();
  const { data, error } = await db
    .from("ai_action_queue")
    .insert({
      household_id: params.householdId,
      user_id: params.userId,
      session_id: params.sessionId,
      summary: params.summary,
      risk_level: maxRiskLevel,
      actions: params.actions,
      tables_affected: tablesAffected,
      records_affected: params.actions.length,
      status: "pending" as AIProposalStatus,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating proposal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  return data as AIProposal;
}

/**
 * Obtiene una propuesta por su ID
 */
export async function getProposal(
  proposalId: string,
): Promise<AIProposal | null> {
  const db = await getClient();
  const { data, error } = await db
    .from("ai_action_queue")
    .select("*")
    .eq("proposal_id", proposalId)
    .single();

  if (error) {
    logger.error("Error getting proposal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  return data as AIProposal;
}

/**
 * Aprueba una propuesta
 */
export async function approveProposal(
  proposalId: string,
  userId: string,
  notes?: string,
): Promise<boolean> {
  const db = await getClient();
  const { error } = await db.rpc("decide_ai_proposal", {
    p_proposal_id: proposalId,
    p_decision: "approved",
    p_decision_by: userId,
    p_notes: notes,
  });

  if (error) {
    logger.error("Error approving proposal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  return true;
}

/**
 * Rechaza una propuesta
 */
export async function rejectProposal(
  proposalId: string,
  userId: string,
  notes?: string,
): Promise<boolean> {
  const db = await getClient();
  const { error } = await db.rpc("decide_ai_proposal", {
    p_proposal_id: proposalId,
    p_decision: "rejected",
    p_decision_by: userId,
    p_notes: notes,
  });

  if (error) {
    logger.error("Error rejecting proposal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  return true;
}

/**
 * Aprueba parcialmente una propuesta (solo algunas acciones)
 */
export async function partiallyApproveProposal(
  proposalId: string,
  userId: string,
  approvedActionIds: string[],
  notes?: string,
): Promise<boolean> {
  const db = await getClient();
  const { error } = await db.rpc("decide_ai_proposal", {
    p_proposal_id: proposalId,
    p_decision: "partially_approved",
    p_decision_by: userId,
    p_approved_action_ids: approvedActionIds,
    p_notes: notes,
  });

  if (error) {
    logger.error("Error partially approving proposal", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  return true;
}

/**
 * Obtiene propuestas pendientes de un household
 */
export async function getPendingProposals(
  householdId: string,
): Promise<AIProposal[]> {
  const db = await getClient();
  const { data, error } = await db
    .from("ai_action_queue")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error getting pending proposals", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  return data as AIProposal[];
}

// ============================================
// ROLLBACK
// ============================================

/**
 * Hace rollback de una acción usando el audit log
 */
export async function rollbackAction(
  auditLogId: string,
  userId: string,
  reason?: string,
): Promise<RollbackResult> {
  const db = await getClient();
  const { data, error } = await db.rpc("rollback_ai_action", {
    p_log_id: auditLogId,
    p_rolled_back_by: userId,
    p_reason: reason || "User requested rollback",
  });

  if (error) {
    logger.error("Error rolling back action", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      audit_log_id: auditLogId,
      function_name: "unknown",
      error: error.message,
    };
  }

  const result = data as {
    success: boolean;
    previous_state?: Record<string, unknown>;
    function_name: string;
    affected_tables?: string[];
    error?: string;
  };

  if (!result.success) {
    return {
      success: false,
      audit_log_id: auditLogId,
      function_name: result.function_name || "unknown",
      error: result.error,
    };
  }

  return {
    success: true,
    audit_log_id: auditLogId,
    function_name: result.function_name,
    previous_state: result.previous_state,
  };
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Genera un ID de sesión único
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Determina si una lista de funciones debe crear una propuesta
 */
export async function shouldCreateProposal(
  functionNames: string[],
  householdId: string,
): Promise<boolean> {
  const trust = await getHouseholdTrust(householdId);

  for (const fnName of functionNames) {
    const config = await getFunctionConfig(fnName);
    if (!config) continue;

    // Si la función requiere confirmación
    if (config.requires_confirmation) return true;

    // Si el nivel de riesgo es mayor al auto-approve level
    if (trust && config.risk_level > trust.auto_approve_level) return true;

    // Si es nivel 3+ siempre crear propuesta
    if (config.risk_level >= AI_RISK_LEVELS.HIGH) return true;
  }

  return false;
}

/**
 * Convierte una llamada a función en una acción propuesta
 */
export async function functionCallToProposedAction(
  functionName: string,
  parameters: Record<string, unknown>,
  description: string,
): Promise<AIProposedAction> {
  const config = await getFunctionConfig(functionName);

  return {
    id: crypto.randomUUID(),
    function_name: functionName,
    parameters,
    description,
    description_es: config?.description_es || description,
    risk_level: (config?.risk_level || AI_RISK_LEVELS.MEDIUM) as AIRiskLevel,
    is_reversible: config?.is_reversible ?? true,
  };
}

/**
 * Genera un resumen legible de las acciones propuestas
 */
export function generateProposalSummary(actions: AIProposedAction[]): string {
  if (actions.length === 0) return "Sin acciones";
  if (actions.length === 1)
    return actions[0].description_es || actions[0].description;

  const actionTypes = new Map<string, number>();
  for (const action of actions) {
    const category = action.function_name.split("_")[0];
    actionTypes.set(category, (actionTypes.get(category) || 0) + 1);
  }

  const parts: string[] = [];
  for (const [category, count] of actionTypes) {
    const categoryNames: Record<string, string> = {
      get: "consultas",
      add: "agregados",
      update: "actualizaciones",
      delete: "eliminaciones",
      create: "creaciones",
      swap: "cambios",
      mark: "marcados",
      complete: "completados",
      execute: "ejecuciones",
    };
    parts.push(`${count} ${categoryNames[category] || category}`);
  }

  return `Plan con ${parts.join(", ")}`;
}

// ============================================
// EXPORTAR CONSTANTES ÚTILES
// ============================================

export { AI_RISK_LEVELS };

export const RISK_LEVEL_COLORS: Record<AIRiskLevel, string> = {
  1: "green", // Low - auto
  2: "blue", // Medium - with undo
  3: "yellow", // High - needs confirmation
  4: "red", // Critical - needs detailed confirmation
};

export const RISK_LEVEL_ICONS: Record<AIRiskLevel, string> = {
  1: "✅", // Auto
  2: "↩️", // Undo available
  3: "⚠️", // Warning
  4: "🔴", // Critical
};
