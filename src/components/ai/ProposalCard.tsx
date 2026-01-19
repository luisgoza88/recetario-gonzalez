'use client';

/**
 * ProposalCard Component
 *
 * Muestra una propuesta de acciones de IA para que el usuario
 * pueda aprobar, rechazar o aprobar parcialmente.
 */

import { useState } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronUp,
  Undo2,
  Clock,
  Loader2,
} from 'lucide-react';
import { AIProposedAction, AIRiskLevel, AI_RISK_LEVELS } from '@/types';

interface ProposalCardProps {
  proposalId: string;
  summary: string;
  actions: AIProposedAction[];
  riskLevel: AIRiskLevel;
  expiresAt: string;
  onApprove: (proposalId: string, selectedActions?: string[]) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  onClose?: () => void;
}

// Risk level styling and icons
const RISK_STYLES: Record<AIRiskLevel, {
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
  labelColor: string;
}> = {
  [AI_RISK_LEVELS.LOW]: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: <Check className="w-4 h-4 text-green-600" />,
    label: 'Bajo riesgo',
    labelColor: 'text-green-700 bg-green-100',
  },
  [AI_RISK_LEVELS.MEDIUM]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <Undo2 className="w-4 h-4 text-blue-600" />,
    label: 'Riesgo medio',
    labelColor: 'text-blue-700 bg-blue-100',
  },
  [AI_RISK_LEVELS.HIGH]: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    label: 'Alto riesgo',
    labelColor: 'text-amber-700 bg-amber-100',
  },
  [AI_RISK_LEVELS.CRITICAL]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <Shield className="w-4 h-4 text-red-600" />,
    label: 'Riesgo cr\u00edtico',
    labelColor: 'text-red-700 bg-red-100',
  },
};

export function ProposalCard({
  proposalId,
  summary,
  actions,
  riskLevel,
  expiresAt,
  onApprove,
  onReject,
  onClose,
}: ProposalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set(actions.map(a => a.id))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = RISK_STYLES[riskLevel];
  const expiresDate = new Date(expiresAt);
  const isExpired = expiresDate < new Date();

  // Calculate time remaining
  const timeRemaining = Math.max(0, expiresDate.getTime() - Date.now());
  const minutesRemaining = Math.ceil(timeRemaining / 60000);

  const handleToggleAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const handleApprove = async () => {
    if (isExpired) {
      setError('Esta propuesta ha expirado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If all actions are selected, approve without specifying actions
      if (selectedActions.size === actions.length) {
        await onApprove(proposalId);
      } else {
        // Partial approval
        await onApprove(proposalId, Array.from(selectedActions));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onReject(proposalId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border-2 ${style.border} ${style.bg} overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.labelColor}`}>
                {style.icon}
                {style.label}
              </span>
              {!isExpired && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {minutesRemaining} min
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-1 text-xs text-red-500">
                  <Clock className="w-3 h-3" />
                  Expirado
                </span>
              )}
            </div>
            <p className="font-medium text-gray-900">{summary}</p>
            <p className="text-sm text-gray-600 mt-1">
              {actions.length} acci\u00f3n{actions.length !== 1 ? 'es' : ''} propuesta{actions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Actions List (Expandable) */}
      <div className="border-t border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-white/50 transition-colors"
        >
          <span>Ver detalle de acciones</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-3 space-y-2">
            {actions.map((action) => {
              const actionRiskStyle = RISK_STYLES[action.risk_level];
              const isSelected = selectedActions.has(action.id);

              return (
                <label
                  key={action.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-gray-300 shadow-sm'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleAction(action.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {action.description_es || action.description}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${actionRiskStyle.labelColor}`}>
                        {actionRiskStyle.icon}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {action.function_name}
                      {action.is_reversible && (
                        <span className="ml-2 text-green-600">
                          <Undo2 className="w-3 h-3 inline" /> Reversible
                        </span>
                      )}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-100 border-t border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 bg-white border-t border-gray-200 flex gap-3">
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Rechazar
        </button>
        <button
          onClick={handleApprove}
          disabled={isLoading || isExpired || selectedActions.size === 0}
          className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando...
            </>
          ) : selectedActions.size === actions.length ? (
            <>
              <Check className="w-4 h-4" />
              Aprobar todo
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Aprobar ({selectedActions.size})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Compact version for inline display in chat
export function ProposalCardCompact({
  summary,
  actionsCount,
  riskLevel,
  onViewDetails,
}: {
  summary: string;
  actionsCount: number;
  riskLevel: AIRiskLevel;
  onViewDetails: () => void;
}) {
  const style = RISK_STYLES[riskLevel];

  return (
    <button
      onClick={onViewDetails}
      className={`w-full text-left rounded-lg border ${style.border} ${style.bg} p-3 hover:shadow-md transition-all`}
    >
      <div className="flex items-center gap-2 mb-1">
        {style.icon}
        <span className={`text-xs font-medium ${style.labelColor} px-1.5 py-0.5 rounded`}>
          {style.label}
        </span>
      </div>
      <p className="font-medium text-gray-900 text-sm">{summary}</p>
      <p className="text-xs text-gray-500 mt-1">
        {actionsCount} acci\u00f3n{actionsCount !== 1 ? 'es' : ''} - Toca para revisar
      </p>
    </button>
  );
}

export default ProposalCard;
