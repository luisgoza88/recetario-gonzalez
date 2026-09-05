"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  X,
  ShoppingCart,
  Calendar,
  Package,
  TrendingUp,
  Clock,
  Smile,
} from "lucide-react";
import type { ProactiveAlert } from "@/lib/hooks/useProactiveAlerts";

interface ProactiveSuggestionToastProps {
  alert: ProactiveAlert;
  onDismiss: () => void;
  onAction?: () => void;
}

/** Icono segun la fuente de la alerta */
function AlertIcon({ source }: { source: ProactiveAlert["source"] }) {
  const cls = "w-5 h-5 flex-shrink-0";
  switch (source) {
    case "inventory":
    case "missing_ingredients":
      return <Package className={cls} />;
    case "shopping":
      return <ShoppingCart className={cls} />;
    case "menu":
    case "preprep":
      return <Clock className={cls} />;
    case "pattern":
      return <TrendingUp className={cls} />;
    case "mood":
      return <Smile className={cls} />;
    case "suggestions":
      return <Sparkles className={cls} />;
    case "tasks":
      return <Calendar className={cls} />;
    default:
      return <Sparkles className={cls} />;
  }
}

/** Clases de color segun severidad */
function severityClasses(severity: ProactiveAlert["severity"]): {
  container: string;
  icon: string;
  action: string;
} {
  switch (severity) {
    case "critical":
      return {
        container: "bg-red-50 border-red-200 shadow-red-100",
        icon: "text-red-600",
        action: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
      };
    case "warning":
      return {
        container: "bg-amber-50 border-amber-200 shadow-amber-100",
        icon: "text-amber-600",
        action:
          "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
      };
    case "info":
    default:
      return {
        container: "bg-blue-50 border-blue-200 shadow-blue-100",
        icon: "text-blue-600",
        action: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
      };
  }
}

const AUTO_DISMISS_MS = 15_000;

export function ProactiveSuggestionToast({
  alert,
  onDismiss,
  onAction,
}: ProactiveSuggestionToastProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Slide-in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Countdown progress bar + auto-dismiss (only when no action CTA)
  useEffect(() => {
    if (alert.action) return; // con CTA no se auto-descarta

    const intervalMs = 100;
    const step = (intervalMs / AUTO_DISMISS_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(interval);
          handleDismiss();
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id, alert.action]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Wait for slide-out animation before removing from DOM
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const handleAction = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onAction?.();
      onDismiss();
    }, 200);
  }, [onAction, onDismiss]);

  const colors = severityClasses(alert.severity);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        "fixed bottom-36 left-4 right-4 z-40 max-w-sm mx-auto",
        "border rounded-2xl shadow-lg overflow-hidden",
        "transition-all duration-300 ease-out",
        colors.container,
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {/* Progress bar (solo sin CTA) */}
      {!alert.action && (
        <div className="h-0.5 bg-black/10">
          <div
            className="h-full bg-current opacity-30 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className={colors.icon}>
            <AlertIcon source={alert.source} />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug">
              {alert.title}
            </p>
            <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
              {alert.body}
            </p>
          </div>

          {/* Cerrar */}
          <button
            onClick={handleDismiss}
            aria-label="Cerrar alerta"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors p-0.5 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CTA */}
        {alert.action && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleAction}
              className={[
                "text-xs font-semibold px-3 py-1.5 rounded-full",
                "transition-colors duration-150",
                colors.action,
              ].join(" ")}
            >
              {alert.action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
