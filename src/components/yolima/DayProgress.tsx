"use client";

interface DayProgressProps {
  /** 0 to 100 */
  percent: number;
  label?: string;
  /** Optional "X de Y" counter shown top-right */
  completed?: number;
  total?: number;
}

export default function DayProgress({
  percent,
  label,
  completed,
  total,
}: DayProgressProps) {
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));
  const showCounter =
    typeof completed === "number" && typeof total === "number";

  return (
    <div className="bg-white rounded-2xl p-4 border border-[var(--border)] shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[15px] font-semibold text-[var(--ink)]">
          {label || "Hoy"}
        </span>
        {showCounter ? (
          <span className="text-[12px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold tabular-nums">
            {completed} de {total}
          </span>
        ) : (
          <span className="text-[15px] font-semibold text-[var(--ink)] tabular-nums">
            {clampedPercent}%
          </span>
        )}
      </div>
      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-green-500 transition-all duration-700 ease-out"
          style={{ width: `${clampedPercent}%` }}
          role="progressbar"
          aria-valuenow={clampedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso: ${clampedPercent}%`}
        />
      </div>
      {clampedPercent >= 100 && (
        <p className="text-center text-[var(--accent)] font-semibold mt-3 text-[14px]">
          ¡Todo completado!
        </p>
      )}
    </div>
  );
}
