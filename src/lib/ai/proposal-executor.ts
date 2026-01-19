/**
 * Proposal Executor
 *
 * Ejecuta propuestas aprobadas de forma transaccional,
 * capturando estado previo para rollback y logging.
 */

import { createClient } from '@supabase/supabase-js';
import {
  AIProposal,
  AIProposedAction,
  ProposalExecutionResult,
  AIRiskLevel,
} from '@/types';
import {
  createAuditLog,
  completeAuditLog,
  getProposal,
  generateSessionId,
} from './ai-command-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// CAPTURA DE ESTADO PREVIO
// ============================================

interface StateCapture {
  table: string;
  recordId?: string;
  data: Record<string, unknown> | null;
  query?: string;
}

/**
 * Captura el estado actual antes de ejecutar una acción
 */
async function captureState(action: AIProposedAction): Promise<StateCapture[]> {
  const states: StateCapture[] = [];
  const { function_name, parameters } = action;

  try {
    // Determinar qué estado capturar basado en la función
    switch (function_name) {
      case 'swap_menu_recipe': {
        const dayNumber = parameters.day_number as number;
        const { data } = await supabase
          .from('day_menu')
          .select('*')
          .eq('day_number', dayNumber)
          .single();
        if (data) {
          states.push({ table: 'day_menu', recordId: data.id, data });
        }
        break;
      }

      case 'update_inventory': {
        const itemName = parameters.item_name as string;
        const { data: item } = await supabase
          .from('market_items')
          .select('id')
          .ilike('name', `%${itemName}%`)
          .single();

        if (item) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('*')
            .eq('item_id', item.id)
            .single();
          if (inv) {
            states.push({ table: 'inventory', recordId: inv.id, data: inv });
          }
        }
        break;
      }

      case 'mark_shopping_item': {
        const itemName = parameters.item_name as string;
        const { data: item } = await supabase
          .from('market_items')
          .select('id')
          .ilike('name', `%${itemName}%`)
          .single();

        if (item) {
          const { data: checklist } = await supabase
            .from('market_checklist')
            .select('*')
            .eq('item_id', item.id)
            .single();
          if (checklist) {
            states.push({ table: 'market_checklist', recordId: checklist.id, data: checklist });
          }
        }
        break;
      }

      case 'complete_task': {
        const taskName = parameters.task_name as string;
        const today = new Date().toISOString().split('T')[0];
        const { data: task } = await supabase
          .from('daily_task_instances')
          .select('*')
          .eq('date', today)
          .ilike('task_name', `%${taskName}%`)
          .single();

        if (task) {
          states.push({ table: 'daily_task_instances', recordId: task.id, data: task });
        }
        break;
      }

      case 'create_space':
      case 'create_employee':
      case 'create_recipe':
      case 'add_to_shopping_list':
      case 'add_quick_task':
        // Para creaciones, no hay estado previo
        states.push({ table: getTableForFunction(function_name), data: null });
        break;

      case 'update_space': {
        const spaceId = parameters.space_id as string;
        const { data } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', spaceId)
          .single();
        if (data) {
          states.push({ table: 'spaces', recordId: spaceId, data });
        }
        break;
      }

      case 'update_employee': {
        const employeeId = parameters.employee_id as string;
        const { data } = await supabase
          .from('home_employees')
          .select('*')
          .eq('id', employeeId)
          .single();
        if (data) {
          states.push({ table: 'home_employees', recordId: employeeId, data });
        }
        break;
      }

      case 'update_recipe': {
        const recipeId = parameters.recipe_id as string;
        const { data } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', recipeId)
          .single();
        if (data) {
          states.push({ table: 'recipes', recordId: recipeId, data });
        }
        break;
      }

      case 'delete_space':
      case 'delete_employee':
      case 'delete_recipe': {
        const id = parameters.id as string || parameters.recipe_id as string ||
                   parameters.space_id as string || parameters.employee_id as string;
        const table = getTableForFunction(function_name);
        const { data } = await supabase.from(table).select('*').eq('id', id).single();
        if (data) {
          states.push({ table, recordId: id, data });
        }
        break;
      }

      default:
        // Para funciones no reconocidas, no capturar estado
        break;
    }
  } catch (error) {
    console.error(`Error capturing state for ${function_name}:`, error);
  }

  return states;
}

/**
 * Obtiene el nombre de la tabla para una función
 */
function getTableForFunction(functionName: string): string {
  const tableMap: Record<string, string> = {
    swap_menu_recipe: 'day_menu',
    update_inventory: 'inventory',
    mark_shopping_item: 'market_checklist',
    add_to_shopping_list: 'market_checklist',
    complete_task: 'daily_task_instances',
    add_quick_task: 'daily_task_instances',
    create_space: 'spaces',
    update_space: 'spaces',
    delete_space: 'spaces',
    create_employee: 'home_employees',
    update_employee: 'home_employees',
    delete_employee: 'home_employees',
    create_recipe: 'recipes',
    update_recipe: 'recipes',
    delete_recipe: 'recipes',
  };
  return tableMap[functionName] || 'unknown';
}

// ============================================
// EJECUTOR DE FUNCIONES (importado del API actual)
// ============================================

// Importamos las funciones del archivo existente
// En producción, estas se importarían directamente
// Por ahora, creamos una interfaz para el ejecutor

export interface FunctionExecutor {
  execute: (functionName: string, args: Record<string, unknown>) => Promise<unknown>;
}

// ============================================
// EJECUTOR DE PROPUESTAS
// ============================================

/**
 * Ejecuta una propuesta aprobada
 */
export async function executeProposal(
  proposalId: string,
  executor: FunctionExecutor,
  householdId: string,
  userId?: string
): Promise<ProposalExecutionResult> {
  // Obtener la propuesta
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    return {
      success: false,
      proposal_id: proposalId,
      executed_actions: [],
      failed_actions: [{ action_id: 'unknown', function_name: 'unknown', error: 'Proposal not found' }],
      can_rollback: false,
    };
  }

  // Verificar que esté aprobada
  if (proposal.status !== 'approved' && proposal.status !== 'partially_approved') {
    return {
      success: false,
      proposal_id: proposalId,
      executed_actions: [],
      failed_actions: [{ action_id: 'unknown', function_name: 'unknown', error: `Invalid status: ${proposal.status}` }],
      can_rollback: false,
    };
  }

  // Marcar como ejecutando
  await supabase
    .from('ai_action_queue')
    .update({
      status: 'executing',
      execution_started_at: new Date().toISOString(),
    })
    .eq('proposal_id', proposalId);

  const sessionId = generateSessionId();
  const executedActions: ProposalExecutionResult['executed_actions'] = [];
  const failedActions: ProposalExecutionResult['failed_actions'] = [];
  const auditLogIds: string[] = [];

  // Determinar qué acciones ejecutar
  const actionsToExecute = proposal.status === 'partially_approved'
    ? proposal.actions.filter(a => proposal.approved_actions?.includes(a.id))
    : proposal.actions;

  // Ejecutar cada acción
  for (const action of actionsToExecute) {
    try {
      // 1. Capturar estado previo
      const previousStates = await captureState(action);
      const previousStateObj: Record<string, unknown> = {};
      for (const state of previousStates) {
        previousStateObj[state.table] = state.data;
      }

      // 2. Crear audit log
      const auditLogId = await createAuditLog({
        householdId,
        userId,
        sessionId,
        functionName: action.function_name,
        parameters: action.parameters,
        riskLevel: action.risk_level as AIRiskLevel,
      });

      if (!auditLogId) {
        failedActions.push({
          action_id: action.id,
          function_name: action.function_name,
          error: 'Failed to create audit log',
        });
        continue;
      }

      // 3. Ejecutar la función
      const result = await executor.execute(action.function_name, action.parameters);

      // 4. Capturar nuevo estado
      const newStates = await captureState(action);
      const newStateObj: Record<string, unknown> = {};
      for (const state of newStates) {
        newStateObj[state.table] = state.data;
      }

      // 5. Completar audit log
      await completeAuditLog({
        logId: auditLogId,
        status: 'completed',
        result: result as Record<string, unknown>,
        previousState: previousStateObj,
        newState: newStateObj,
        affectedTables: previousStates.map(s => s.table),
        affectedRecordIds: previousStates
          .filter(s => s.recordId)
          .map(s => s.recordId as string),
      });

      executedActions.push({
        action_id: action.id,
        function_name: action.function_name,
        success: true,
        result,
        audit_log_id: auditLogId,
      });
      auditLogIds.push(auditLogId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Intentar registrar el fallo en el audit log si existe
      failedActions.push({
        action_id: action.id,
        function_name: action.function_name,
        error: errorMessage,
      });

      console.error(`Error executing action ${action.function_name}:`, error);
    }
  }

  // Determinar resultado final
  const success = failedActions.length === 0;
  const finalStatus = success ? 'completed' : (executedActions.length > 0 ? 'completed' : 'failed');

  // Actualizar propuesta
  await supabase
    .from('ai_action_queue')
    .update({
      status: finalStatus,
      execution_completed_at: new Date().toISOString(),
      execution_result: {
        executed: executedActions.length,
        failed: failedActions.length,
      },
      audit_log_ids: auditLogIds,
    })
    .eq('proposal_id', proposalId);

  return {
    success,
    proposal_id: proposalId,
    executed_actions: executedActions,
    failed_actions: failedActions.length > 0 ? failedActions : undefined,
    can_rollback: executedActions.some(a => a.audit_log_id !== undefined),
  };
}

/**
 * Ejecuta una acción individual con logging
 */
export async function executeActionWithLogging(
  functionName: string,
  parameters: Record<string, unknown>,
  executor: FunctionExecutor,
  householdId: string,
  userId?: string,
  sessionId?: string
): Promise<{
  success: boolean;
  result?: unknown;
  error?: string;
  audit_log_id?: string;
  can_rollback: boolean;
}> {
  const effectiveSessionId = sessionId || generateSessionId();

  // Crear una acción temporal para capturar estado
  const tempAction: AIProposedAction = {
    id: crypto.randomUUID(),
    function_name: functionName,
    parameters,
    description: functionName,
    description_es: functionName,
    risk_level: 2, // Default
    is_reversible: true,
  };

  try {
    // 1. Capturar estado previo
    const previousStates = await captureState(tempAction);
    const previousStateObj: Record<string, unknown> = {};
    for (const state of previousStates) {
      previousStateObj[state.table] = state.data;
    }

    // 2. Crear audit log
    const config = await import('./ai-command-service').then(m => m.getFunctionConfig(functionName));
    const riskLevel = (config?.risk_level || 2) as AIRiskLevel;

    const auditLogId = await createAuditLog({
      householdId,
      userId,
      sessionId: effectiveSessionId,
      functionName,
      parameters,
      riskLevel,
    });

    // 3. Ejecutar función
    const result = await executor.execute(functionName, parameters);

    // 4. Capturar nuevo estado
    const newStates = await captureState(tempAction);
    const newStateObj: Record<string, unknown> = {};
    for (const state of newStates) {
      newStateObj[state.table] = state.data;
    }

    // 5. Completar audit log
    if (auditLogId) {
      await completeAuditLog({
        logId: auditLogId,
        status: 'completed',
        result: result as Record<string, unknown>,
        previousState: previousStateObj,
        newState: newStateObj,
        affectedTables: previousStates.map(s => s.table),
      });
    }

    return {
      success: true,
      result,
      audit_log_id: auditLogId || undefined,
      can_rollback: auditLogId !== null && Object.keys(previousStateObj).length > 0,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      can_rollback: false,
    };
  }
}

// ============================================
// ROLLBACK DE PROPUESTA COMPLETA
// ============================================

/**
 * Hace rollback de todas las acciones de una propuesta
 */
export async function rollbackProposal(
  proposalId: string,
  userId: string,
  reason?: string
): Promise<{
  success: boolean;
  rolled_back: number;
  failed: number;
  errors: string[];
}> {
  const proposal = await getProposal(proposalId);

  if (!proposal || !proposal.audit_log_ids || proposal.audit_log_ids.length === 0) {
    return {
      success: false,
      rolled_back: 0,
      failed: 0,
      errors: ['No audit logs found for proposal'],
    };
  }

  const { rollbackAction } = await import('./ai-command-service');
  let rolledBack = 0;
  let failed = 0;
  const errors: string[] = [];

  // Rollback en orden inverso
  for (const auditLogId of [...proposal.audit_log_ids].reverse()) {
    const result = await rollbackAction(auditLogId, userId, reason);
    if (result.success) {
      rolledBack++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${result.function_name}: ${result.error}`);
      }
    }
  }

  return {
    success: failed === 0,
    rolled_back: rolledBack,
    failed,
    errors,
  };
}

// ============================================
// EJECUTOR TRANSACCIONAL DE PLANES
// ============================================

export interface TransactionOptions {
  /** Rollback todas las acciones si una falla */
  rollbackOnFailure?: boolean;
  /** Continuar ejecutando aunque una acción falle */
  continueOnError?: boolean;
  /** Tiempo máximo para toda la transacción (ms) */
  timeoutMs?: number;
  /** Callback para reportar progreso */
  onProgress?: (progress: TransactionProgress) => void;
}

export interface TransactionProgress {
  current: number;
  total: number;
  action: string;
  status: 'executing' | 'completed' | 'failed' | 'rolling_back';
}

export interface TransactionResult {
  success: boolean;
  proposal_id: string;
  executed_actions: ProposalExecutionResult['executed_actions'];
  failed_actions?: ProposalExecutionResult['failed_actions'];
  rolled_back_actions?: Array<{
    action_id: string;
    function_name: string;
    rollback_success: boolean;
    error?: string;
  }>;
  was_rolled_back: boolean;
  rollback_reason?: string;
  execution_time_ms: number;
}

/**
 * Ejecuta una propuesta de forma transaccional
 * Si rollbackOnFailure es true, deshace todas las acciones exitosas cuando una falla
 */
export async function executeProposalTransactional(
  proposalId: string,
  executor: FunctionExecutor,
  householdId: string,
  userId?: string,
  options: TransactionOptions = {}
): Promise<TransactionResult> {
  const {
    rollbackOnFailure = true,
    continueOnError = false,
    timeoutMs = 300000, // 5 minutos por defecto
    onProgress,
  } = options;

  const startTime = Date.now();

  // Obtener la propuesta
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    return {
      success: false,
      proposal_id: proposalId,
      executed_actions: [],
      failed_actions: [{ action_id: 'unknown', function_name: 'unknown', error: 'Proposal not found' }],
      was_rolled_back: false,
      execution_time_ms: Date.now() - startTime,
    };
  }

  // Verificar estado
  if (proposal.status !== 'approved' && proposal.status !== 'partially_approved') {
    return {
      success: false,
      proposal_id: proposalId,
      executed_actions: [],
      failed_actions: [{ action_id: 'unknown', function_name: 'unknown', error: `Invalid status: ${proposal.status}` }],
      was_rolled_back: false,
      execution_time_ms: Date.now() - startTime,
    };
  }

  // Marcar como ejecutando
  await supabase
    .from('ai_action_queue')
    .update({
      status: 'executing',
      execution_started_at: new Date().toISOString(),
    })
    .eq('proposal_id', proposalId);

  const sessionId = generateSessionId();
  const executedActions: ProposalExecutionResult['executed_actions'] = [];
  const failedActions: ProposalExecutionResult['failed_actions'] = [];
  const auditLogIds: string[] = [];

  // Determinar qué acciones ejecutar
  const actionsToExecute = proposal.status === 'partially_approved'
    ? proposal.actions.filter(a => proposal.approved_actions?.includes(a.id))
    : proposal.actions;

  const totalActions = actionsToExecute.length;
  let shouldRollback = false;
  let rollbackReason: string | undefined;

  // Ejecutar cada acción
  for (let i = 0; i < actionsToExecute.length; i++) {
    const action = actionsToExecute[i];

    // Verificar timeout
    if (Date.now() - startTime > timeoutMs) {
      shouldRollback = rollbackOnFailure;
      rollbackReason = 'Timeout exceeded';
      failedActions.push({
        action_id: action.id,
        function_name: action.function_name,
        error: 'Execution timeout',
      });
      break;
    }

    // Reportar progreso
    onProgress?.({
      current: i + 1,
      total: totalActions,
      action: action.description_es || action.function_name,
      status: 'executing',
    });

    try {
      // 1. Capturar estado previo
      const previousStates = await captureState(action);
      const previousStateObj: Record<string, unknown> = {};
      for (const state of previousStates) {
        previousStateObj[state.table] = state.data;
      }

      // 2. Crear audit log
      const auditLogId = await createAuditLog({
        householdId,
        userId,
        sessionId,
        functionName: action.function_name,
        parameters: action.parameters,
        riskLevel: action.risk_level as AIRiskLevel,
      });

      if (!auditLogId) {
        throw new Error('Failed to create audit log');
      }

      // 3. Ejecutar la función
      const result = await executor.execute(action.function_name, action.parameters);

      // Verificar si el resultado indica error
      if (typeof result === 'object' && result !== null && (result as Record<string, unknown>).success === false) {
        throw new Error((result as Record<string, unknown>).message as string || 'Function execution failed');
      }

      // 4. Capturar nuevo estado
      const newStates = await captureState(action);
      const newStateObj: Record<string, unknown> = {};
      for (const state of newStates) {
        newStateObj[state.table] = state.data;
      }

      // 5. Completar audit log
      await completeAuditLog({
        logId: auditLogId,
        status: 'completed',
        result: result as Record<string, unknown>,
        previousState: previousStateObj,
        newState: newStateObj,
        affectedTables: previousStates.map(s => s.table),
        affectedRecordIds: previousStates
          .filter(s => s.recordId)
          .map(s => s.recordId as string),
      });

      executedActions.push({
        action_id: action.id,
        function_name: action.function_name,
        success: true,
        result,
        audit_log_id: auditLogId,
      });
      auditLogIds.push(auditLogId);

      // Reportar progreso completado
      onProgress?.({
        current: i + 1,
        total: totalActions,
        action: action.description_es || action.function_name,
        status: 'completed',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      failedActions.push({
        action_id: action.id,
        function_name: action.function_name,
        error: errorMessage,
      });

      // Reportar progreso fallido
      onProgress?.({
        current: i + 1,
        total: totalActions,
        action: action.description_es || action.function_name,
        status: 'failed',
      });

      console.error(`Error executing action ${action.function_name}:`, error);

      // Decidir si hacer rollback
      if (rollbackOnFailure) {
        shouldRollback = true;
        rollbackReason = `Action ${action.function_name} failed: ${errorMessage}`;
        break;
      } else if (!continueOnError) {
        break;
      }
    }
  }

  // Hacer rollback si es necesario
  const rolledBackActions: TransactionResult['rolled_back_actions'] = [];

  if (shouldRollback && executedActions.length > 0) {
    const { rollbackAction } = await import('./ai-command-service');

    // Rollback en orden inverso
    for (let i = executedActions.length - 1; i >= 0; i--) {
      const action = executedActions[i];

      onProgress?.({
        current: executedActions.length - i,
        total: executedActions.length,
        action: `Deshaciendo: ${action.function_name}`,
        status: 'rolling_back',
      });

      if (action.audit_log_id) {
        const rollbackResult = await rollbackAction(action.audit_log_id, userId || 'system', rollbackReason);
        rolledBackActions.push({
          action_id: action.action_id,
          function_name: action.function_name,
          rollback_success: rollbackResult.success,
          error: rollbackResult.error,
        });
      }
    }

    // Marcar propuesta como rolled back
    await supabase
      .from('ai_action_queue')
      .update({
        status: 'rolled_back',
        execution_completed_at: new Date().toISOString(),
        execution_result: {
          executed: executedActions.length,
          failed: failedActions.length,
          rolled_back: rolledBackActions.length,
          rollback_reason: rollbackReason,
        },
      })
      .eq('proposal_id', proposalId);

    return {
      success: false,
      proposal_id: proposalId,
      executed_actions: executedActions,
      failed_actions: failedActions.length > 0 ? failedActions : undefined,
      rolled_back_actions: rolledBackActions,
      was_rolled_back: true,
      rollback_reason: rollbackReason,
      execution_time_ms: Date.now() - startTime,
    };
  }

  // Determinar resultado final (sin rollback)
  const success = failedActions.length === 0;
  const finalStatus = success ? 'completed' : (executedActions.length > 0 ? 'completed' : 'failed');

  // Actualizar propuesta
  await supabase
    .from('ai_action_queue')
    .update({
      status: finalStatus,
      execution_completed_at: new Date().toISOString(),
      execution_result: {
        executed: executedActions.length,
        failed: failedActions.length,
      },
      audit_log_ids: auditLogIds,
    })
    .eq('proposal_id', proposalId);

  return {
    success,
    proposal_id: proposalId,
    executed_actions: executedActions,
    failed_actions: failedActions.length > 0 ? failedActions : undefined,
    was_rolled_back: false,
    execution_time_ms: Date.now() - startTime,
  };
}
