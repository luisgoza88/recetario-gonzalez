"use client";

import { Check } from "lucide-react";

interface TaskChecklistProps {
  /** Optional small section title; if omitted the section header is hidden */
  title?: string;
  items: string[];
  completedItems: string[];
  onToggle: (item: string) => void;
  /** Shape of the checkbox marker */
  variant?: "round" | "square";
}

export default function TaskChecklist({
  title,
  items,
  completedItems,
  onToggle,
  variant = "round",
}: TaskChecklistProps) {
  if (items.length === 0) return null;

  const completedCount = completedItems.length;
  const totalCount = items.length;
  const boxRadius = variant === "round" ? "rounded-full" : "rounded-md";

  return (
    <section>
      {title && (
        <div className="flex items-center justify-between mt-1 mb-2 px-1">
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            {title}
          </p>
          <span className="text-[11px] font-semibold text-[var(--ink-soft)] tabular-nums">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
        {items.map((item) => {
          const isDone = completedItems.includes(item);

          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              aria-pressed={isDone}
              className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-stone-50 transition-colors"
            >
              <span
                className={`w-6 h-6 ${boxRadius} border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone ? "bg-green-500 border-green-500" : "border-stone-300"
                }`}
              >
                {isDone && (
                  <Check size={14} strokeWidth={3} className="text-white" />
                )}
              </span>
              <span
                className={`flex-1 text-[14px] ${
                  isDone ? "text-stone-400 line-through" : "text-[var(--ink)]"
                }`}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
