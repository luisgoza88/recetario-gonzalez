/**
 * AI Assistant Execute Endpoint
 *
 * Ejecuta propuestas aprobadas o acciones individuales con logging.
 * Este endpoint es llamado después de que el usuario aprueba una propuesta.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  approveProposal,
  rejectProposal,
  partiallyApproveProposal,
  getProposal,
  rollbackAction,
} from "@/lib/ai/ai-command-service";
import {
  executeProposal,
  executeProposalTransactional,
  rollbackProposal,
  FunctionExecutor,
  TransactionOptions,
} from "@/lib/ai/proposal-executor";

import {
  requireAuth,
  requireHouseholdMembership,
  forbiddenResponse,
} from "@/lib/api/auth";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

import { executeFunction } from "../orchestrator";

async function createFunctionExecutor(
  householdId: string,
): Promise<FunctionExecutor> {
  return {
    execute: (name, args) =>
      executeFunction(name, { ...args, household_id: householdId }),
  };
}

// ============================================
// API ROUTES
// ============================================

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      action,
      proposalId,
      householdId,
      reason,
      actionIds,
      auditLogId,
      // Transactional options
      transactional,
      rollbackOnFailure,
      continueOnError,
      timeoutMs,
    } = body;

    // Use server-validated userId from middleware, NOT from request body
    const userId = auth.userId;

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
    }

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId required" },
        { status: 400 },
      );
    }

    // Authorize: the user must belong to the household this proposal targets.
    // decide_ai_proposal is SECURITY DEFINER (bypasses RLS), so without this
    // gate any authenticated user could approve/execute/rollback another
    // household's proposals by passing its proposalId.
    const isMember = await requireHouseholdMembership(householdId);
    if (!isMember) {
      return forbiddenResponse("No perteneces a este hogar");
    }

    if (proposalId) {
      const proposal = await getProposal(proposalId);
      if (!proposal || proposal.household_id !== householdId) {
        return forbiddenResponse("La propuesta no pertenece a este hogar");
      }
    }
    if (auditLogId) {
      const db = await createAuthenticatedClient();
      const { data, error } = await db
        .from("ai_audit_log")
        .select("household_id")
        .eq("id", auditLogId)
        .single();
      if (error || !data || data.household_id !== householdId) {
        return forbiddenResponse("La acción no pertenece a este hogar");
      }
    }

    const functionExecutor = await createFunctionExecutor(householdId);

    switch (action) {
      // ============================================
      // APROBAR Y EJECUTAR PROPUESTA
      // ============================================
      case "approve": {
        if (!proposalId || !householdId || !userId) {
          return NextResponse.json(
            { error: "proposalId, householdId, and userId required" },
            { status: 400 },
          );
        }

        // Aprobar la propuesta
        const approved = await approveProposal(proposalId, userId);
        if (!approved) {
          return NextResponse.json(
            { error: "No se pudo aprobar la propuesta" },
            { status: 500 },
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
            txOptions,
          );

          return NextResponse.json({
            success: txResult.success,
            message: txResult.was_rolled_back
              ? `Error en ejecución. Se revirtieron ${txResult.rolled_back_actions?.length || 0} acción(es): ${txResult.rollback_reason}`
              : txResult.success
                ? `${txResult.executed_actions.length} acción(es) ejecutada(s) correctamente`
                : `Algunas acciones fallaron`,
            result: txResult,
            canRollback:
              !txResult.was_rolled_back &&
              txResult.executed_actions.some((a) => a.audit_log_id),
            wasRolledBack: txResult.was_rolled_back,
            executionTimeMs: txResult.execution_time_ms,
          });
        } else {
          // Standard execution (without auto-rollback)
          const result = await executeProposal(
            proposalId,
            functionExecutor,
            householdId,
            userId,
          );

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
      case "partial_approve": {
        if (
          !proposalId ||
          !householdId ||
          !userId ||
          !actionIds ||
          !Array.isArray(actionIds)
        ) {
          return NextResponse.json(
            {
              error:
                "proposalId, householdId, userId, and actionIds[] required",
            },
            { status: 400 },
          );
        }

        // Aprobar parcialmente
        const partialApproved = await partiallyApproveProposal(
          proposalId,
          userId,
          actionIds,
        );
        if (!partialApproved) {
          return NextResponse.json(
            { error: "No se pudo aprobar parcialmente la propuesta" },
            { status: 500 },
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
            txOptions,
          );

          return NextResponse.json({
            success: txResult.success,
            message: txResult.was_rolled_back
              ? `Error en ejecución. Se revirtieron ${txResult.rolled_back_actions?.length || 0} acción(es): ${txResult.rollback_reason}`
              : `${txResult.executed_actions.length} de ${actionIds.length} acción(es) ejecutada(s)`,
            result: txResult,
            canRollback:
              !txResult.was_rolled_back &&
              txResult.executed_actions.some((a) => a.audit_log_id),
            wasRolledBack: txResult.was_rolled_back,
            executionTimeMs: txResult.execution_time_ms,
          });
        } else {
          const result = await executeProposal(
            proposalId,
            functionExecutor,
            householdId,
            userId,
          );

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
      case "reject": {
        if (!proposalId || !userId) {
          return NextResponse.json(
            { error: "proposalId and userId required" },
            { status: 400 },
          );
        }

        const rejected = await rejectProposal(proposalId, userId, reason);
        if (!rejected) {
          return NextResponse.json(
            { error: "No se pudo rechazar la propuesta" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          message: "Propuesta rechazada",
        });
      }

      // ============================================
      // ROLLBACK DE UNA ACCIÓN INDIVIDUAL
      // ============================================
      case "undo": {
        if (!auditLogId || !userId) {
          return NextResponse.json(
            { error: "auditLogId and userId required" },
            { status: 400 },
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
      case "rollback_proposal": {
        if (!proposalId || !userId) {
          return NextResponse.json(
            { error: "proposalId and userId required" },
            { status: 400 },
          );
        }

        const result = await rollbackProposal(proposalId, userId, reason);

        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `${result.rolled_back} acción(es) revertida(s)`
            : `Error: ${result.errors.join(", ")}`,
          result,
        });
      }

      // ============================================
      // OBTENER ESTADO DE PROPUESTA
      // ============================================
      case "get_status": {
        if (!proposalId) {
          return NextResponse.json(
            { error: "proposalId required" },
            { status: 400 },
          );
        }

        const proposal = await getProposal(proposalId);
        if (!proposal) {
          return NextResponse.json(
            { error: "Propuesta no encontrada" },
            { status: 404 },
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
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("AI Execute error", {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: "Error processing request", details: errorMessage },
      { status: 500 },
    );
  }
}

// GET endpoint for checking proposal status
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const proposalId = searchParams.get("proposalId");

    if (!proposalId) {
      return NextResponse.json(
        { error: "proposalId required" },
        { status: 400 },
      );
    }

    const proposal = await getProposal(proposalId);
    if (!proposal) {
      return NextResponse.json(
        { error: "Propuesta no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error) {
    logger.error("AI Execute GET error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error getting proposal status" },
      { status: 500 },
    );
  }
}
