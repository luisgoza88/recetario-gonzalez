/**
 * AI Trust Service
 *
 * Manages trust levels, auto-approval decisions, and rate limiting
 * for AI actions per household.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// TYPES
// ============================================

export interface HouseholdTrust {
  id: string;
  household_id: string;
  trust_level: number; // 1-5
  successful_actions: number;
  failed_actions: number;
  rolled_back_actions: number;
  auto_approve_level: number; // Max risk level for auto-approval
  max_actions_per_minute: number;
  max_critical_actions_per_day: number;
  max_items_per_bulk_operation: number;
  last_incident_at: string | null;
  incident_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrustDecision {
  canAutoApprove: boolean;
  requiresApproval: boolean;
  reason: string;
  trustLevel: number;
  riskLevel: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  resetAt?: string;
}

export interface TrustUpdateResult {
  success: boolean;
  newTrustLevel: number;
  previousTrustLevel: number;
  message: string;
}

// ============================================
// TRUST LEVEL THRESHOLDS
// ============================================

/**
 * Trust Level Benefits:
 * Level 1 (Default): Only risk 1 auto-approved, strict rate limits
 * Level 2: Risk 1-2 auto-approved, relaxed rate limits
 * Level 3: Risk 1-2 auto-approved, higher bulk limits
 * Level 4: Risk 1-3 auto-approved, very relaxed limits
 * Level 5 (Maximum): Risk 1-3 auto-approved, minimal restrictions
 */
const TRUST_THRESHOLDS = {
  // Actions needed to level up
  LEVEL_UP_SUCCESS_COUNT: [
    0,   // Level 0 -> 1 (not used)
    10,  // Level 1 -> 2: 10 successful actions
    25,  // Level 2 -> 3: 25 successful actions
    50,  // Level 3 -> 4: 50 successful actions
    100, // Level 4 -> 5: 100 successful actions
  ],
  // Incidents that trigger level down
  LEVEL_DOWN_INCIDENT_THRESHOLD: 3,
  // Days without incident to recover level
  INCIDENT_RECOVERY_DAYS: 7,
  // Success ratio required to maintain level
  MIN_SUCCESS_RATIO: 0.9,
};

// Default trust configurations by level
const DEFAULT_TRUST_CONFIG = {
  1: { auto_approve_level: 1, max_actions_per_minute: 5, max_critical_actions_per_day: 2, max_items_per_bulk_operation: 10 },
  2: { auto_approve_level: 1, max_actions_per_minute: 10, max_critical_actions_per_day: 3, max_items_per_bulk_operation: 25 },
  3: { auto_approve_level: 2, max_actions_per_minute: 15, max_critical_actions_per_day: 5, max_items_per_bulk_operation: 50 },
  4: { auto_approve_level: 2, max_actions_per_minute: 20, max_critical_actions_per_day: 10, max_items_per_bulk_operation: 75 },
  5: { auto_approve_level: 3, max_actions_per_minute: 30, max_critical_actions_per_day: 20, max_items_per_bulk_operation: 100 },
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get or create trust configuration for a household
 */
export async function getHouseholdTrust(householdId: string): Promise<HouseholdTrust | null> {
  const { data, error } = await supabase
    .from('household_ai_trust')
    .select('*')
    .eq('household_id', householdId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No trust record exists, create one
    const { data: newTrust, error: createError } = await supabase
      .from('household_ai_trust')
      .insert({ household_id: householdId })
      .select()
      .single();

    if (createError) {
      console.error('Error creating household trust:', createError);
      return null;
    }
    return newTrust;
  }

  if (error) {
    console.error('Error getting household trust:', error);
    return null;
  }

  return data;
}

/**
 * Check if an action can be auto-approved based on trust level and risk
 */
export async function checkAutoApproval(
  householdId: string,
  riskLevel: number,
  actionCount: number = 1
): Promise<TrustDecision> {
  const trust = await getHouseholdTrust(householdId);

  if (!trust) {
    return {
      canAutoApprove: false,
      requiresApproval: true,
      reason: 'No se pudo obtener configuración de confianza',
      trustLevel: 1,
      riskLevel,
    };
  }

  // Critical actions (level 4) NEVER auto-approve
  if (riskLevel >= 4) {
    return {
      canAutoApprove: false,
      requiresApproval: true,
      reason: 'Las acciones críticas siempre requieren aprobación manual',
      trustLevel: trust.trust_level,
      riskLevel,
    };
  }

  // Check if risk level is within auto-approve threshold
  if (riskLevel <= trust.auto_approve_level) {
    // Check rate limits before auto-approving
    const rateCheck = await checkRateLimit(householdId, riskLevel, actionCount);
    if (!rateCheck.allowed) {
      return {
        canAutoApprove: false,
        requiresApproval: true,
        reason: rateCheck.reason || 'Límite de velocidad excedido',
        trustLevel: trust.trust_level,
        riskLevel,
      };
    }

    return {
      canAutoApprove: true,
      requiresApproval: false,
      reason: `Auto-aprobado (nivel de confianza ${trust.trust_level}, riesgo ${riskLevel})`,
      trustLevel: trust.trust_level,
      riskLevel,
    };
  }

  return {
    canAutoApprove: false,
    requiresApproval: true,
    reason: `Nivel de riesgo ${riskLevel} excede umbral de auto-aprobación ${trust.auto_approve_level}`,
    trustLevel: trust.trust_level,
    riskLevel,
  };
}

/**
 * Check rate limits for a household
 */
export async function checkRateLimit(
  householdId: string,
  riskLevel: number,
  actionCount: number = 1
): Promise<RateLimitCheck> {
  const trust = await getHouseholdTrust(householdId);

  if (!trust) {
    return { allowed: false, reason: 'No se pudo obtener configuración de confianza' };
  }

  // Check actions per minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { count: recentActions } = await supabase
    .from('ai_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .gte('created_at', oneMinuteAgo);

  if ((recentActions || 0) + actionCount > trust.max_actions_per_minute) {
    return {
      allowed: false,
      reason: `Límite de ${trust.max_actions_per_minute} acciones por minuto excedido`,
      currentCount: recentActions || 0,
      limit: trust.max_actions_per_minute,
    };
  }

  // Check critical actions per day (risk level 3+)
  if (riskLevel >= 3) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: criticalToday } = await supabase
      .from('ai_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .gte('risk_level', 3)
      .gte('created_at', todayStart.toISOString());

    if ((criticalToday || 0) + actionCount > trust.max_critical_actions_per_day) {
      return {
        allowed: false,
        reason: `Límite de ${trust.max_critical_actions_per_day} acciones críticas por día excedido`,
        currentCount: criticalToday || 0,
        limit: trust.max_critical_actions_per_day,
        resetAt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  return { allowed: true };
}

/**
 * Check bulk operation limits
 */
export async function checkBulkLimit(
  householdId: string,
  itemCount: number
): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  const trust = await getHouseholdTrust(householdId);

  if (!trust) {
    return { allowed: false, reason: 'No se pudo obtener configuración de confianza' };
  }

  if (itemCount > trust.max_items_per_bulk_operation) {
    return {
      allowed: false,
      reason: `Operación de ${itemCount} items excede límite de ${trust.max_items_per_bulk_operation}`,
      limit: trust.max_items_per_bulk_operation,
    };
  }

  return { allowed: true };
}

// ============================================
// TRUST LEVEL MANAGEMENT
// ============================================

/**
 * Record a successful action and potentially increase trust level
 */
export async function recordSuccessfulAction(householdId: string): Promise<TrustUpdateResult> {
  const trust = await getHouseholdTrust(householdId);

  if (!trust) {
    return {
      success: false,
      newTrustLevel: 1,
      previousTrustLevel: 1,
      message: 'No se pudo obtener configuración de confianza',
    };
  }

  const previousLevel = trust.trust_level;
  const newSuccessCount = trust.successful_actions + 1;

  // Check if should level up
  let newLevel = previousLevel;
  if (previousLevel < 5) {
    const threshold = TRUST_THRESHOLDS.LEVEL_UP_SUCCESS_COUNT[previousLevel];
    if (newSuccessCount >= threshold) {
      // Check success ratio before leveling up
      const totalActions = newSuccessCount + trust.failed_actions;
      const successRatio = newSuccessCount / totalActions;

      if (successRatio >= TRUST_THRESHOLDS.MIN_SUCCESS_RATIO) {
        newLevel = previousLevel + 1;
      }
    }
  }

  // Update trust record
  const updateData: Partial<HouseholdTrust> = {
    successful_actions: newSuccessCount,
    updated_at: new Date().toISOString(),
  };

  if (newLevel > previousLevel) {
    const config = DEFAULT_TRUST_CONFIG[newLevel as keyof typeof DEFAULT_TRUST_CONFIG];
    updateData.trust_level = newLevel;
    updateData.auto_approve_level = config.auto_approve_level;
    updateData.max_actions_per_minute = config.max_actions_per_minute;
    updateData.max_critical_actions_per_day = config.max_critical_actions_per_day;
    updateData.max_items_per_bulk_operation = config.max_items_per_bulk_operation;
  }

  const { error } = await supabase
    .from('household_ai_trust')
    .update(updateData)
    .eq('household_id', householdId);

  if (error) {
    console.error('Error updating trust:', error);
    return {
      success: false,
      newTrustLevel: previousLevel,
      previousTrustLevel: previousLevel,
      message: 'Error al actualizar confianza',
    };
  }

  return {
    success: true,
    newTrustLevel: newLevel,
    previousTrustLevel: previousLevel,
    message: newLevel > previousLevel
      ? `¡Nivel de confianza aumentado a ${newLevel}!`
      : `Acción exitosa registrada (${newSuccessCount} total)`,
  };
}

/**
 * Record a failed action and potentially decrease trust level
 */
export async function recordFailedAction(householdId: string): Promise<TrustUpdateResult> {
  const trust = await getHouseholdTrust(householdId);

  if (!trust) {
    return {
      success: false,
      newTrustLevel: 1,
      previousTrustLevel: 1,
      message: 'No se pudo obtener configuración de confianza',
    };
  }

  const previousLevel = trust.trust_level;
  const newFailedCount = trust.failed_actions + 1;
  const newIncidentCount = trust.incident_count + 1;

  // Check if should level down
  let newLevel = previousLevel;
  if (previousLevel > 1 && newIncidentCount >= TRUST_THRESHOLDS.LEVEL_DOWN_INCIDENT_THRESHOLD) {
    newLevel = previousLevel - 1;
  }

  // Update trust record
  const updateData: Partial<HouseholdTrust> = {
    failed_actions: newFailedCount,
    incident_count: newLevel < previousLevel ? 0 : newIncidentCount, // Reset if leveled down
    last_incident_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (newLevel < previousLevel) {
    const config = DEFAULT_TRUST_CONFIG[newLevel as keyof typeof DEFAULT_TRUST_CONFIG];
    updateData.trust_level = newLevel;
    updateData.auto_approve_level = config.auto_approve_level;
    updateData.max_actions_per_minute = config.max_actions_per_minute;
    updateData.max_critical_actions_per_day = config.max_critical_actions_per_day;
    updateData.max_items_per_bulk_operation = config.max_items_per_bulk_operation;
  }

  const { error } = await supabase
    .from('household_ai_trust')
    .update(updateData)
    .eq('household_id', householdId);

  if (error) {
    console.error('Error updating trust:', error);
    return {
      success: false,
      newTrustLevel: previousLevel,
      previousTrustLevel: previousLevel,
      message: 'Error al actualizar confianza',
    };
  }

  return {
    success: true,
    newTrustLevel: newLevel,
    previousTrustLevel: previousLevel,
    message: newLevel < previousLevel
      ? `Nivel de confianza reducido a ${newLevel} debido a incidentes`
      : `Incidente registrado (${newIncidentCount} de ${TRUST_THRESHOLDS.LEVEL_DOWN_INCIDENT_THRESHOLD})`,
  };
}

/**
 * Record a rollback action
 */
export async function recordRollback(householdId: string): Promise<void> {
  await supabase
    .from('household_ai_trust')
    .update({
      rolled_back_actions: supabase.rpc('increment', { x: 1 }),
      incident_count: supabase.rpc('increment', { x: 1 }),
      last_incident_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('household_id', householdId);
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Manually set trust level (admin only)
 */
export async function setTrustLevel(
  householdId: string,
  newLevel: number
): Promise<TrustUpdateResult> {
  if (newLevel < 1 || newLevel > 5) {
    return {
      success: false,
      newTrustLevel: 1,
      previousTrustLevel: 1,
      message: 'Nivel debe estar entre 1 y 5',
    };
  }

  const trust = await getHouseholdTrust(householdId);
  const previousLevel = trust?.trust_level || 1;

  const config = DEFAULT_TRUST_CONFIG[newLevel as keyof typeof DEFAULT_TRUST_CONFIG];

  const { error } = await supabase
    .from('household_ai_trust')
    .update({
      trust_level: newLevel,
      auto_approve_level: config.auto_approve_level,
      max_actions_per_minute: config.max_actions_per_minute,
      max_critical_actions_per_day: config.max_critical_actions_per_day,
      max_items_per_bulk_operation: config.max_items_per_bulk_operation,
      updated_at: new Date().toISOString(),
    })
    .eq('household_id', householdId);

  if (error) {
    return {
      success: false,
      newTrustLevel: previousLevel,
      previousTrustLevel: previousLevel,
      message: 'Error al actualizar nivel de confianza',
    };
  }

  return {
    success: true,
    newTrustLevel: newLevel,
    previousTrustLevel: previousLevel,
    message: `Nivel de confianza cambiado de ${previousLevel} a ${newLevel}`,
  };
}

/**
 * Update custom limits for a household
 */
export async function updateTrustLimits(
  householdId: string,
  limits: {
    auto_approve_level?: number;
    max_actions_per_minute?: number;
    max_critical_actions_per_day?: number;
    max_items_per_bulk_operation?: number;
  }
): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase
    .from('household_ai_trust')
    .update({
      ...limits,
      updated_at: new Date().toISOString(),
    })
    .eq('household_id', householdId);

  if (error) {
    return { success: false, message: 'Error al actualizar límites' };
  }

  return { success: true, message: 'Límites actualizados correctamente' };
}

/**
 * Get trust statistics for a household
 */
export async function getTrustStats(householdId: string): Promise<{
  trust: HouseholdTrust | null;
  recentActivity: {
    actionsLastHour: number;
    actionsToday: number;
    successRate: number;
  };
}> {
  const trust = await getHouseholdTrust(householdId);

  // Get recent activity
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [hourResult, dayResult] = await Promise.all([
    supabase
      .from('ai_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .gte('created_at', oneHourAgo),
    supabase
      .from('ai_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .gte('created_at', todayStart.toISOString()),
  ]);

  const totalActions = (trust?.successful_actions || 0) + (trust?.failed_actions || 0);
  const successRate = totalActions > 0
    ? (trust?.successful_actions || 0) / totalActions
    : 1;

  return {
    trust,
    recentActivity: {
      actionsLastHour: hourResult.count || 0,
      actionsToday: dayResult.count || 0,
      successRate: Math.round(successRate * 100),
    },
  };
}
