'use client';

/**
 * UndoToast Component
 *
 * Toast notification que aparece después de ejecutar una acción reversible,
 * permitiendo al usuario deshacer la acción dentro de un tiempo límite.
 */

import { useState, useEffect, useCallback } from 'react';
import { Undo2, X, Check, Loader2 } from 'lucide-react';

interface UndoToastProps {
  message: string;
  auditLogId: string;
  functionName: string;
  onUndo: (auditLogId: string) => Promise<void>;
  onDismiss: () => void;
  timeoutMs?: number; // Default 10 seconds
}

export function UndoToast({
  message,
  auditLogId,
  functionName,
  onUndo,
  onDismiss,
  timeoutMs = 10000,
}: UndoToastProps) {
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoComplete, setUndoComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss timer
  useEffect(() => {
    if (undoComplete) return;

    const startTime = Date.now();
    const endTime = startTime + timeoutMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / timeoutMs) * 100;

      setProgress(newProgress);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timeoutMs, onDismiss, undoComplete]);

  const handleUndo = useCallback(async () => {
    setIsUndoing(true);
    setError(null);

    try {
      await onUndo(auditLogId);
      setUndoComplete(true);
      // Auto dismiss after showing success
      setTimeout(onDismiss, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al deshacer');
      setIsUndoing(false);
    }
  }, [auditLogId, onUndo, onDismiss]);

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl overflow-hidden max-w-sm mx-4">
        {/* Progress bar */}
        {!undoComplete && (
          <div className="h-1 bg-gray-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          {undoComplete ? (
            // Success state
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Acci\u00f3n deshecha</p>
                <p className="text-sm text-gray-400">{functionName}</p>
              </div>
            </div>
          ) : error ? (
            // Error state
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <X className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-400">Error</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Normal state
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{message}</p>
                <p className="text-sm text-gray-400">{functionName}</p>
              </div>
              <button
                onClick={handleUndo}
                disabled={isUndoing}
                className="px-3 py-1.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isUndoing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deshaciendo...</span>
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4" />
                    <span>Deshacer</span>
                  </>
                )}
              </button>
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Container for managing multiple undo toasts
interface UndoAction {
  id: string;
  message: string;
  auditLogId: string;
  functionName: string;
  timestamp: number;
}

interface UndoToastContainerProps {
  actions: UndoAction[];
  onUndo: (auditLogId: string) => Promise<void>;
  onDismiss: (id: string) => void;
}

export function UndoToastContainer({
  actions,
  onUndo,
  onDismiss,
}: UndoToastContainerProps) {
  // Only show the most recent action
  const latestAction = actions.length > 0 ? actions[actions.length - 1] : null;

  if (!latestAction) return null;

  return (
    <UndoToast
      key={latestAction.id}
      message={latestAction.message}
      auditLogId={latestAction.auditLogId}
      functionName={latestAction.functionName}
      onUndo={onUndo}
      onDismiss={() => onDismiss(latestAction.id)}
    />
  );
}

export default UndoToast;
