"use client";

/**
 * EmptyState — Componente reutilizable para estados vacios
 *
 * Sprint 8 (Lazyweb design research mayo 2026):
 * Patron: ilustracion + titulo + descripcion + CTA opcional.
 * Reemplaza los emoji-only placeholders ("🍽️ Sin recetas")
 * que se ven amateur.
 *
 * Uso:
 *   <EmptyState
 *     icon={<ChefHat size={32} />}
 *     title="Sin recetas aun"
 *     description="Empezá agregando tu primera receta"
 *     action={{ label: "Agregar receta", onClick: handleAdd }}
 *   />
 */

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Variant: "card" (rounded card) o "plain" (no card) */
  variant?: "card" | "plain";
  /** Color del icon background. Default: orange */
  tone?: "orange" | "violet" | "emerald" | "blue" | "gray";
}

const TONES = {
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-500 dark:text-orange-400",
    border: "border-orange-100 dark:border-orange-900/50",
    cta: "bg-orange-500 text-white hover:bg-orange-600",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-500 dark:text-violet-400",
    border: "border-violet-100 dark:border-violet-900/50",
    cta: "bg-violet-500 text-white hover:bg-violet-600",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/50",
    cta: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-500 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
    cta: "bg-blue-500 text-white hover:bg-blue-600",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-400 dark:text-gray-500",
    border: "border-gray-200 dark:border-gray-700",
    cta: "bg-gray-700 text-white hover:bg-gray-800",
  },
} as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "plain",
  tone = "orange",
}: EmptyStateProps) {
  const t = TONES[tone];
  const wrapperClass =
    variant === "card"
      ? `bg-white dark:bg-gray-800 rounded-3xl border ${t.border} p-8 text-center`
      : "py-16 px-4 text-center";

  return (
    <div className={wrapperClass}>
      <div
        className={`w-20 h-20 mx-auto mb-4 rounded-full ${t.bg} flex items-center justify-center ${t.text}`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${t.cta}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
