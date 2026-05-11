"use client";

/**
 * BottomSheet — Sheet modal que sube desde abajo
 *
 * Sprint 11 (Lazyweb research mayo 2026): patron Crouton/Amie/iOS native.
 * Mas natural en mobile que un modal centrado. Para acciones contextuales,
 * formularios cortos, pickers, y confirmaciones.
 *
 * Features:
 * - Backdrop dismissible (click fuera cierra)
 * - Animation slide-up
 * - Drag handle visual arriba
 * - Soporte keyboard (Escape cierra)
 * - Body scroll lock cuando esta abierto
 * - Maxima altura 85vh con scroll interno
 * - Mobile-first pero funciona en desktop (max-w-md center)
 *
 * Uso:
 *   <BottomSheet open={isOpen} onClose={() => setOpen(false)} title="Acciones">
 *     <button>Editar</button>
 *     <button>Compartir</button>
 *     <button>Eliminar</button>
 *   </BottomSheet>
 */

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Default true. Si false, no muestra X close button */
  showCloseButton?: boolean;
  /** Default true. Si false, click en backdrop NO cierra */
  closeOnBackdrop?: boolean;
  /** Children del sheet (contenido scrollable) */
  children: ReactNode;
  /** Footer fijo abajo (acciones primarias) */
  footer?: ReactNode;
  /** Max height del sheet. Default "85vh" */
  maxHeight?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  showCloseButton = true,
  closeOnBackdrop = true,
  children,
  footer,
  maxHeight = "85vh",
}: BottomSheetProps) {
  // Lock body scroll cuando esta abierto
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Escape para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default sheet-backdrop"
        tabIndex={-1}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "bottom-sheet-title" : undefined}
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col sheet-content"
        style={{ maxHeight }}
      >
        {/* Drag handle (visual cue mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              {title && (
                <h3
                  id="bottom-sheet-title"
                  className="font-display text-xl font-semibold text-gray-900 dark:text-white leading-tight"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="ml-3 p-2 -mt-1 -mr-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>

        {/* Sticky footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
