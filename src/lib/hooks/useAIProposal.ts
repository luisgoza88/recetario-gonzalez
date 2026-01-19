'use client';

/**
 * useAIProposal Hook
 *
 * Maneja el estado de propuestas de IA, ejecución y funcionalidad de undo.
 */

import { useState, useCallback } from 'react';
import { AIProposedAction, AIRiskLevel } from '@/types';

// Types
export interface Proposal {
  id: string;
  summary: string;
  actions: AIProposedAction[];
  riskLevel: AIRiskLevel;
  expiresAt: string;
}

export interface UndoAction {
  id: string;
  message: string;
  auditLogId: string;
  functionName: string;
  timestamp: number;
}

export interface ExecutionMetadata {
  actionsExecuted: number;
  undoAvailable: boolean;
  undoableActions: Array<{
    functionName: string;
    auditLogId?: string;
  }>;
}

interface UseAIProposalOptions {
  householdId: string;
  userId?: string;
}

interface UseAIProposalReturn {
  // Proposal state
  activeProposal: Proposal | null;
  setActiveProposal: (proposal: Proposal | null) => void;

  // Undo state
  undoActions: UndoAction[];
  addUndoAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  removeUndoAction: (id: string) => void;
  clearUndoActions: () => void;

  // Loading state
  isExecuting: boolean;

  // Actions
  approveProposal: (proposalId: string, selectedActions?: string[]) => Promise<void>;
  rejectProposal: (proposalId: string) => Promise<void>;
  undoAction: (auditLogId: string) => Promise<void>;

  // Process response from AI assistant
  processAIResponse: (response: {
    type?: string;
    proposal?: Proposal;
    executionMetadata?: ExecutionMetadata;
    content?: string;
  }) => void;
}

export function useAIProposal({
  householdId,
  userId,
}: UseAIProposalOptions): UseAIProposalReturn {
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [undoActions, setUndoActions] = useState<UndoAction[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Add an undo action to the stack
  const addUndoAction = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
    const newAction: UndoAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setUndoActions(prev => [...prev, newAction]);
  }, []);

  // Remove an undo action from the stack
  const removeUndoAction = useCallback((id: string) => {
    setUndoActions(prev => prev.filter(a => a.id !== id));
  }, []);

  // Clear all undo actions
  const clearUndoActions = useCallback(() => {
    setUndoActions([]);
  }, []);

  // Approve a proposal (full or partial)
  const approveProposal = useCallback(async (
    proposalId: string,
    selectedActions?: string[]
  ) => {
    setIsExecuting(true);

    try {
      const response = await fetch('/api/ai-assistant/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedActions ? 'partial_approve' : 'approve',
          proposalId,
          householdId,
          userId,
          actionIds: selectedActions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al ejecutar propuesta');
      }

      // If there are undoable actions, add them to the stack
      if (data.result?.executed_actions) {
        for (const action of data.result.executed_actions) {
          if (action.audit_log_id) {
            addUndoAction({
              message: `${action.function_name} ejecutado`,
              auditLogId: action.audit_log_id,
              functionName: action.function_name,
            });
          }
        }
      }

      // Clear the active proposal
      setActiveProposal(null);
    } finally {
      setIsExecuting(false);
    }
  }, [householdId, userId, addUndoAction]);

  // Reject a proposal
  const rejectProposal = useCallback(async (proposalId: string) => {
    setIsExecuting(true);

    try {
      const response = await fetch('/api/ai-assistant/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          proposalId,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al rechazar propuesta');
      }

      // Clear the active proposal
      setActiveProposal(null);
    } finally {
      setIsExecuting(false);
    }
  }, [userId]);

  // Undo an action
  const undoAction = useCallback(async (auditLogId: string) => {
    const response = await fetch('/api/ai-assistant/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'undo',
        auditLogId,
        userId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al deshacer acci\u00f3n');
    }

    // Remove from undo actions
    const actionToRemove = undoActions.find(a => a.auditLogId === auditLogId);
    if (actionToRemove) {
      removeUndoAction(actionToRemove.id);
    }
  }, [userId, undoActions, removeUndoAction]);

  // Process response from AI assistant
  const processAIResponse = useCallback((response: {
    type?: string;
    proposal?: Proposal;
    executionMetadata?: ExecutionMetadata;
    content?: string;
  }) => {
    // Check if this is a proposal response
    if (response.type === 'proposal' && response.proposal) {
      setActiveProposal({
        id: response.proposal.id,
        summary: response.proposal.summary,
        actions: response.proposal.actions,
        riskLevel: response.proposal.riskLevel,
        expiresAt: response.proposal.expiresAt,
      });
      return;
    }

    // Check for execution metadata (undo actions)
    if (response.executionMetadata?.undoAvailable) {
      for (const action of response.executionMetadata.undoableActions) {
        if (action.auditLogId) {
          addUndoAction({
            message: 'Acci\u00f3n ejecutada',
            auditLogId: action.auditLogId,
            functionName: action.functionName,
          });
        }
      }
    }
  }, [addUndoAction]);

  return {
    // Proposal state
    activeProposal,
    setActiveProposal,

    // Undo state
    undoActions,
    addUndoAction,
    removeUndoAction,
    clearUndoActions,

    // Loading state
    isExecuting,

    // Actions
    approveProposal,
    rejectProposal,
    undoAction,

    // Process response
    processAIResponse,
  };
}

export default useAIProposal;
