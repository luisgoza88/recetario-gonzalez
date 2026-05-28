"use client";

import {
  Check,
  Coffee,
  UtensilsCrossed,
  Moon,
  BookOpen,
  Bot,
} from "lucide-react";

export interface MealCardMeal {
  name: string;
  prepTime?: string;
  totalTime?: string;
  thermomix?: boolean;
  steps?: string[];
}

type MealKind = "breakfast" | "lunch" | "dinner";

interface MealCardProps {
  /** Meal kind, drives the icon + accent color */
  kind?: MealKind;
  label: string;
  /** Optional schedule hint, e.g. "7:30" */
  time?: string;
  meal: MealCardMeal | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onViewRecipe: () => void;
  onStartThermomix?: () => void;
}

const KIND_STYLE: Record<
  MealKind,
  { Icon: typeof Coffee; idle: string; label: string }
> = {
  breakfast: {
    Icon: Coffee,
    idle: "bg-amber-50 text-amber-600",
    label: "text-amber-700",
  },
  lunch: {
    Icon: UtensilsCrossed,
    idle: "bg-green-50 text-green-600",
    label: "text-green-700",
  },
  dinner: {
    Icon: Moon,
    idle: "bg-indigo-50 text-indigo-600",
    label: "text-indigo-700",
  },
};

export default function MealCard({
  kind = "lunch",
  label,
  time,
  meal,
  isCompleted,
  onToggleComplete,
  onViewRecipe,
  onStartThermomix,
}: MealCardProps) {
  const style = KIND_STYLE[kind];
  const Icon = style.Icon;

  if (!meal) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-[var(--border)] p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-stone-50 text-stone-300 flex items-center justify-center flex-shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
            {label}
          </span>
          <p className="text-[14px] text-stone-400 italic">
            No hay comida programada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
        isCompleted ? "border-green-300" : "border-[var(--border)]"
      }`}
    >
      {/* Main row */}
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={onToggleComplete}
          aria-pressed={isCompleted}
          aria-label={
            isCompleted ? `${label} listo` : `Marcar ${label} como listo`
          }
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isCompleted ? "bg-green-500 text-white" : style.idle
          }`}
        >
          {isCompleted ? (
            <Check size={18} strokeWidth={3} />
          ) : (
            <Icon size={18} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold ${style.label}`}
            >
              {label}
            </span>
            {(time || meal.totalTime || meal.prepTime) && (
              <span className="text-[10px] text-stone-400 tabular-nums">
                · {time || meal.totalTime || meal.prepTime}
              </span>
            )}
            {meal.thermomix && (
              <span className="text-[10px] text-stone-400">· Thermomix</span>
            )}
          </div>
          <p
            className={`text-[14px] font-semibold truncate ${
              isCompleted ? "text-stone-400 line-through" : "text-[var(--ink)]"
            }`}
          >
            {meal.name}
          </p>
        </div>
      </div>

      {/* Action row */}
      <div className="bg-stone-50 border-t border-[var(--border)] px-4 py-2.5 flex items-center gap-2">
        <button
          onClick={onViewRecipe}
          className="flex-1 bg-white border border-[var(--border)] rounded-lg py-1.5 text-[12px] font-medium text-[var(--ink)] flex items-center justify-center gap-1.5 active:bg-stone-100 transition-colors"
        >
          <BookOpen size={13} /> Ver receta
        </button>
        {meal.thermomix && onStartThermomix && (
          <button
            onClick={onStartThermomix}
            className="flex-1 bg-slate-900 text-white rounded-lg py-1.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 active:bg-slate-800 transition-colors"
          >
            <Bot size={13} /> Iniciar TM6
          </button>
        )}
      </div>
    </div>
  );
}
