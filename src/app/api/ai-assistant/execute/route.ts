/**
 * AI Assistant Execute Endpoint
 *
 * Ejecuta propuestas aprobadas o acciones individuales con logging.
 * Este endpoint es llamado después de que el usuario aprueba una propuesta.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  approveProposal,
  rejectProposal,
  partiallyApproveProposal,
  getProposal,
  rollbackAction,
} from '@/lib/ai/ai-command-service';
import {
  executeProposal,
  executeProposalTransactional,
  rollbackProposal,
  FunctionExecutor,
  TransactionOptions,
} from '@/lib/ai/proposal-executor';

// Import the function executor from the main route
// We need to create a wrapper that matches the FunctionExecutor interface
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// FUNCTION IMPLEMENTATIONS (copied from main route)
// ============================================

// Note: In production, these would be imported from a shared module
// For now, we duplicate the essential ones needed for proposal execution

async function swapMenuRecipe(dayNumber: number, mealType: string, newRecipeName: string) {
  if (dayNumber < 1 || dayNumber > 12) {
    return { success: false, message: 'El día debe estar entre 1 y 12' };
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner'];
  if (!validMealTypes.includes(mealType)) {
    return { success: false, message: 'Tipo de comida debe ser: breakfast, lunch o dinner' };
  }

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name')
    .ilike('name', `%${newRecipeName}%`)
    .single();

  if (!recipe) {
    return { success: false, message: `No se encontró la receta "${newRecipeName}"` };
  }

  const updateField = `${mealType}_id`;
  const { error } = await supabase
    .from('day_menu')
    .update({ [updateField]: recipe.id })
    .eq('day_number', dayNumber);

  if (error) {
    return { success: false, message: 'Error al actualizar el menú' };
  }

  const mealTypeSpanish: Record<string, string> = {
    breakfast: 'desayuno',
    lunch: 'almuerzo',
    dinner: 'cena'
  };

  return {
    success: true,
    message: `${mealTypeSpanish[mealType]} del día ${dayNumber} cambiado a "${recipe.name}"`
  };
}

async function updateInventory(itemName: string, quantity: number, action: string = 'set') {
  const { data: item } = await supabase
    .from('market_items')
    .select('id, name')
    .ilike('name', `%${itemName}%`)
    .single();

  if (!item) {
    return { success: false, message: `No se encontró "${itemName}" en el inventario` };
  }

  const { data: currentInv } = await supabase
    .from('inventory')
    .select('current_number')
    .eq('item_id', item.id)
    .single();

  let newQuantity = quantity;
  const currentQty = currentInv?.current_number || 0;

  if (action === 'add') {
    newQuantity = currentQty + quantity;
  } else if (action === 'subtract') {
    newQuantity = Math.max(0, currentQty - quantity);
  }

  const { error } = await supabase
    .from('inventory')
    .upsert({
      item_id: item.id,
      current_number: newQuantity,
      current_quantity: `${newQuantity}`
    }, { onConflict: 'item_id' });

  if (error) {
    return { success: false, message: 'Error al actualizar el inventario' };
  }

  return {
    success: true,
    message: `${item.name}: ${currentQty} → ${newQuantity}`,
    item: item.name,
    previous: currentQty,
    current: newQuantity
  };
}

async function markShoppingItem(itemName: string, checked: boolean) {
  const { data: item } = await supabase
    .from('market_items')
    .select('id')
    .ilike('name', `%${itemName}%`)
    .single();

  if (!item) {
    return { success: false, message: `No se encontró "${itemName}" en la lista` };
  }

  await supabase
    .from('market_checklist')
    .update({ checked })
    .eq('item_id', item.id);

  return {
    success: true,
    message: checked ? `"${itemName}" marcado como comprado` : `"${itemName}" desmarcado`
  };
}

async function addToShoppingList(itemName: string, quantity?: string) {
  const { data: existingItem } = await supabase
    .from('market_items')
    .select('id')
    .ilike('name', `%${itemName}%`)
    .single();

  if (existingItem) {
    await supabase
      .from('market_checklist')
      .upsert({ item_id: existingItem.id, checked: false })
      .select();

    return { success: true, message: `"${itemName}" agregado a la lista de compras` };
  }

  const { data: newItem } = await supabase
    .from('market_items')
    .insert({
      name: itemName,
      category: 'Otros',
      unit: quantity || 'unidad',
      is_custom: true
    })
    .select()
    .single();

  if (newItem) {
    await supabase
      .from('market_checklist')
      .insert({ item_id: newItem.id, checked: false });

    return { success: true, message: `"${itemName}" creado y agregado a la lista` };
  }

  return { success: false, message: 'No se pudo agregar el item' };
}

async function completeTask(taskName: string, employeeName?: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('daily_task_instances')
    .select('id, task_name')
    .eq('date', today)
    .ilike('task_name', `%${taskName}%`);

  if (!tasks || tasks.length === 0) {
    return { success: false, message: `No se encontró la tarea "${taskName}"` };
  }

  await supabase
    .from('daily_task_instances')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', tasks[0].id);

  return { success: true, message: `Tarea "${tasks[0].task_name}" marcada como completada` };
}

async function addQuickTask(taskName: string, employeeName?: string, category?: string) {
  const today = new Date().toISOString().split('T')[0];

  let employeeId = null;
  if (employeeName) {
    const { data: emp } = await supabase
      .from('home_employees')
      .select('id')
      .ilike('name', `%${employeeName}%`)
      .single();

    employeeId = emp?.id;
  }

  const { error } = await supabase
    .from('daily_task_instances')
    .insert({
      date: today,
      task_name: taskName,
      employee_id: employeeId,
      time_start: '09:00',
      time_end: '10:00',
      category: category || 'general',
      status: 'pending',
      is_special: false
    });

  if (error) {
    return { success: false, message: 'No se pudo crear la tarea' };
  }

  return {
    success: true,
    message: `Tarea "${taskName}" creada para hoy${employeeName ? ` (asignada a ${employeeName})` : ''}`
  };
}

// ============================================
// FUNCTION EXECUTOR
// ============================================

const functionExecutor: FunctionExecutor = {
  execute: async (functionName: string, args: Record<string, unknown>) => {
    switch (functionName) {
      case 'swap_menu_recipe':
        return await swapMenuRecipe(
          args.day_number as number,
          args.meal_type as string,
          args.new_recipe_name as string
        );
      case 'update_inventory':
        return await updateInventory(
          args.item_name as string,
          args.quantity as number,
          args.action as string
        );
      case 'mark_shopping_item':
        return await markShoppingItem(
          args.item_name as string,
          args.checked as boolean
        );
      case 'add_to_shopping_list':
        return await addToShoppingList(
          args.item_name as string,
          args.quantity as string
        );
      case 'complete_task':
        return await completeTask(
          args.task_name as string,
          args.employee_name as string
        );
      case 'add_quick_task':
        return await addQuickTask(
          args.task_name as string,
          args.employee_name as string,
          args.category as string
        );
      default:
        return { error: `Función no soportada para ejecución de propuestas: ${functionName}` };
    }
  }
};

// ============================================
// API ROUTES
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      proposalId,
      householdId,
      userId,
      reason,
      actionIds,
      auditLogId,
      // Transactional options
      transactional,
      rollbackOnFailure,
      continueOnError,
      timeoutMs,
    } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    switch (action) {
      // ============================================
      // APROBAR Y EJECUTAR PROPUESTA
      // ============================================
      case 'approve': {
        if (!proposalId || !householdId || !userId) {
          return NextResponse.json(
            { error: 'proposalId, householdId, and userId required' },
            { status: 400 }
          );
        }

        // Aprobar la propuesta
        const approved = await approveProposal(proposalId, userId);
        if (!approved) {
          return NextResponse.json(
            { error: 'No se pudo aprobar la propuesta' },
            { status: 500 }
          );
        }

        // Ejecutar la propuesta (transaccional o normal)
        if (transactional) {
          // Use transactional executor with automatic rollback on failure
          const txOptions: TransactionOptions = {
            rollbackOnFailure: rollbackOnFailure ?? true,
            continueOnError: continueOnError ?? false,
            timeoutMs: timeoutMs ?? 30000,
          };

          const txResult = await executeProposalTransactional(
            proposalId,
            functionExecutor,
            householdId,
            userId,
            txOptions
          );

          return NextResponse.json({
            success: txResult.success,
            message: txResult.was_rolled_back
              ? `Error en ejecución. Se revirtieron ${txResult.rolled_back_actions?.length || 0} acción(es): ${txResult.rollback_reason}`
              : txResult.success
                ? `${txResult.executed_actions.length} acción(es) ejecutada(s) correctamente`
                : `Algunas acciones fallaron`,
            result: txResult,
            canRollback: !txResult.was_rolled_back && txResult.executed_actions.some(a => a.audit_log_id),
            wasRolledBack: txResult.was_rolled_back,
            executionTimeMs: txResult.execution_time_ms,
          });
        } else {
          // Standard execution (without auto-rollback)
          const result = await executeProposal(proposalId, functionExecutor, householdId, userId);

          return NextResponse.json({
            success: result.success,
            message: result.success
              ? `${result.executed_actions.length} acción(es) ejecutada(s) correctamente`
              : `Algunas acciones fallaron`,
            result,
            canRollback: result.can_rollback,
          });
        }
      }

      // ============================================
      // APROBAR PARCIALMENTE
      // ============================================
      case 'partial_approve': {
        if (!proposalId || !householdId || !userId || !actionIds || !Array.isArray(actionIds)) {
          return NextResponse.json(
            { error: 'proposalId, householdId, userId, and actionIds[] required' },
            { status: 400 }
          );
        }

        // Aprobar parcialmente
        const partialApproved = await partiallyApproveProposal(proposalId, userId, actionIds);
        if (!partialApproved) {
          return NextResponse.json(
            { error: 'No se pudo aprobar parcialmente la propuesta' },
            { status: 500 }
          );
        }

        // Ejecutar solo las acciones aprobadas (transaccional o normal)
        if (transactional) {
          const txOptions: TransactionOptions = {
            rollbackOnFailure: rollbackOnFailure ?? true,
            continueOnError: continueOnError ?? false,
            timeoutMs: timeoutMs ?? 30000,
          };

          const txResult = await executeProposalTransactional(
            proposalId,
            functionExecutor,
            householdId,
            userId,
            txOptions
          );

          return NextResponse.json({
            success: txResult.success,
            message: txResult.was_rolled_back
              ? `Error en ejecución. Se revirtieron ${txResult.rolled_back_actions?.length || 0} acción(es): ${txResult.rollback_reason}`
              : `${txResult.executed_actions.length} de ${actionIds.length} acción(es) ejecutada(s)`,
            result: txResult,
            canRollback: !txResult.was_rolled_back && txResult.executed_actions.some(a => a.audit_log_id),
            wasRolledBack: txResult.was_rolled_back,
            executionTimeMs: txResult.execution_time_ms,
          });
        } else {
          const result = await executeProposal(proposalId, functionExecutor, householdId, userId);

          return NextResponse.json({
            success: result.success,
            message: `${result.executed_actions.length} de ${actionIds.length} acción(es) ejecutada(s)`,
            result,
            canRollback: result.can_rollback,
          });
        }
      }

      // ============================================
      // RECHAZAR PROPUESTA
      // ============================================
      case 'reject': {
        if (!proposalId || !userId) {
          return NextResponse.json(
            { error: 'proposalId and userId required' },
            { status: 400 }
          );
        }

        const rejected = await rejectProposal(proposalId, userId, reason);
        if (!rejected) {
          return NextResponse.json(
            { error: 'No se pudo rechazar la propuesta' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Propuesta rechazada',
        });
      }

      // ============================================
      // ROLLBACK DE UNA ACCIÓN INDIVIDUAL
      // ============================================
      case 'undo': {
        if (!auditLogId || !userId) {
          return NextResponse.json(
            { error: 'auditLogId and userId required' },
            { status: 400 }
          );
        }

        const result = await rollbackAction(auditLogId, userId, reason);

        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `Acción "${result.function_name}" revertida correctamente`
            : `Error al revertir: ${result.error}`,
          result,
        });
      }

      // ============================================
      // ROLLBACK DE PROPUESTA COMPLETA
      // ============================================
      case 'rollback_proposal': {
        if (!proposalId || !userId) {
          return NextResponse.json(
            { error: 'proposalId and userId required' },
            { status: 400 }
          );
        }

        const result = await rollbackProposal(proposalId, userId, reason);

        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `${result.rolled_back} acción(es) revertida(s)`
            : `Error: ${result.errors.join(', ')}`,
          result,
        });
      }

      // ============================================
      // OBTENER ESTADO DE PROPUESTA
      // ============================================
      case 'get_status': {
        if (!proposalId) {
          return NextResponse.json(
            { error: 'proposalId required' },
            { status: 400 }
          );
        }

        const proposal = await getProposal(proposalId);
        if (!proposal) {
          return NextResponse.json(
            { error: 'Propuesta no encontrada' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          proposal,
        });
      }

      default:
        return NextResponse.json(
          { error: `Acción no reconocida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI Execute error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: 'Error processing request', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for checking proposal status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get('proposalId');

    if (!proposalId) {
      return NextResponse.json({ error: 'proposalId required' }, { status: 400 });
    }

    const proposal = await getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error) {
    console.error('AI Execute GET error:', error);
    return NextResponse.json(
      { error: 'Error getting proposal status' },
      { status: 500 }
    );
  }
}
