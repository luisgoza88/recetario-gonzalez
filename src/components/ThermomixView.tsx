"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Clock,
  Zap,
  Thermometer,
  Timer,
  Soup,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import type { ThermomixRecipe } from "@/types";

// =====================================================
// Accessory emoji map
// =====================================================
const ACCESSORY_INFO: Record<
  string,
  { emoji: string; name: string; color: string }
> = {
  cuchilla: { emoji: "🔪", name: "Cuchilla", color: "bg-red-100 text-red-700" },
  mariposa: {
    emoji: "🦋",
    name: "Mariposa",
    color: "bg-purple-100 text-purple-700",
  },
  cestillo: {
    emoji: "🧺",
    name: "Cestillo",
    color: "bg-amber-100 text-amber-700",
  },
  varoma: {
    emoji: "🫕",
    name: "Varoma",
    color: "bg-orange-100 text-orange-700",
  },
  cubrecuchillas: {
    emoji: "🛡️",
    name: "Cubrecuchillas",
    color: "bg-sky-100 text-sky-700",
  },
  "protector-antisalpicaduras": {
    emoji: "⭕",
    name: "Protector antisalpicaduras",
    color: "bg-cyan-100 text-cyan-700",
  },
  "vaso-medidor": {
    emoji: "🥛",
    name: "Vaso medidor",
    color: "bg-blue-100 text-blue-700",
  },
  espatula: {
    emoji: "🥄",
    name: "Espátula",
    color: "bg-lime-100 text-lime-700",
  },
  ninguno: {
    emoji: "✋",
    name: "Sin accesorio",
    color: "bg-gray-100 text-gray-600",
  },
};

// =====================================================
// Timer hook
// =====================================================
function useCountdownTimer() {
  const [timers, setTimers] = useState<
    Map<number, { total: number; remaining: number; running: boolean }>
  >(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const [key, timer] of next) {
          if (timer.running && timer.remaining > 0) {
            next.set(key, { ...timer, remaining: timer.remaining - 1 });
            changed = true;

            // Alarm at 0
            if (timer.remaining - 1 === 0) {
              if (navigator.vibrate)
                navigator.vibrate([200, 100, 200, 100, 200]);
              try {
                const audio = new Audio(
                  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Onp2SfGlqgYyZoZiGcWRtfouZoJaEb2FsfoqXnpWEb2BsfYqXnpWDb19rfImWnZSCbl5qfIiVnJOBbV1pe4eUm5KAbFxoeYaTmpF/a1tnd4SSl5B+altmdoORlY99aVpldIGQlI58aFlkc4CPk4x7Z1hjcoGOkot6ZsijkoqAaF1meoaPkIl4ZlsA",
                );
                audio.play().catch(() => {});
              } catch {
                /* ignore audio errors */
              }
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = useCallback((stepNum: number, seconds: number) => {
    setTimers((prev) => {
      const next = new Map(prev);
      const existing = next.get(stepNum);
      if (existing) {
        next.set(stepNum, { ...existing, running: !existing.running });
      } else {
        next.set(stepNum, {
          total: seconds,
          remaining: seconds,
          running: true,
        });
      }
      return next;
    });
  }, []);

  const resetTimer = useCallback((stepNum: number) => {
    setTimers((prev) => {
      const next = new Map(prev);
      const existing = next.get(stepNum);
      if (existing) {
        next.set(stepNum, {
          ...existing,
          remaining: existing.total,
          running: false,
        });
      }
      return next;
    });
  }, []);

  return { timers, startTimer, resetTimer };
}

// =====================================================
// Parse time string to seconds
// =====================================================
function parseTimeToSeconds(timeStr: string): number {
  const lower = timeStr.toLowerCase().trim();
  // Match patterns like "5 min", "30 seg", "1 hora", "1:30 min"
  const minMatch = lower.match(/(\d+)\s*min/);
  const segMatch = lower.match(/(\d+)\s*seg/);
  const horaMatch = lower.match(/(\d+)\s*hora/);

  let seconds = 0;
  if (horaMatch) seconds += parseInt(horaMatch[1]) * 3600;
  if (minMatch) seconds += parseInt(minMatch[1]) * 60;
  if (segMatch) seconds += parseInt(segMatch[1]);

  return seconds || 0;
}

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins > 0) return `${mins}:${secs.toString().padStart(2, "0")}`;
  return `0:${secs.toString().padStart(2, "0")}`;
}

// =====================================================
// Spec chip (vel / temp / min) — Thermomix style
// =====================================================
function SpecChip({
  icon,
  children,
  accent = false,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider tabular-nums ${
        accent ? "bg-slate-900 text-white" : "bg-stone-100 text-stone-700"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}

// =====================================================
// ThermomixView Props
// =====================================================
interface ThermomixViewProps {
  recipe: ThermomixRecipe;
  onClose: () => void;
}

export default function ThermomixView({ recipe, onClose }: ThermomixViewProps) {
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { timers, startTimer, resetTimer } = useCountdownTimer();
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  const steps = recipe.thermomixSteps || [];
  const totalSteps = steps.length;

  // Keep screen awake in cooking mode (Wake Lock API)
  useEffect(() => {
    if (!cookingMode) return;
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake lock not supported or denied
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [cookingMode]);

  // Scroll to current step in list mode
  useEffect(() => {
    if (!cookingMode && stepsContainerRef.current) {
      const stepEl = stepsContainerRef.current.querySelector(
        `[data-step="${currentStep}"]`,
      );
      if (stepEl)
        stepEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep, cookingMode]);

  const goNext = () =>
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  const goPrev = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  // =====================================================
  // Cooking Mode (fullscreen, one step at a time)
  // =====================================================
  if (cookingMode) {
    const step = steps[currentStep];
    if (!step) return null;
    const timerSeconds = parseTimeToSeconds(step.time);
    const timer = timers.get(step.stepNumber);
    const accessory = ACCESSORY_INFO[step.accessory] || ACCESSORY_INFO.ninguno;

    return (
      <div className="fixed inset-0 z-[300] flex flex-col select-none bg-slate-950 text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-800 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            onClick={() => setCookingMode(false)}
            className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
          >
            <Minimize2 size={18} />
            <span className="text-[13px] font-medium">Salir</span>
          </button>
          <div className="text-center">
            <span className="text-[11px] uppercase tracking-wider text-white/50">
              Paso
            </span>
            <span className="ml-1 text-lg font-bold tabular-nums">
              {currentStep + 1}
            </span>
            <span className="text-[13px] text-white/50 tabular-nums">
              {" "}
              / {totalSteps}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col items-center justify-center space-y-6 p-6">
          {/* Accessory badge */}
          <div
            className={`rounded-full px-4 py-2 text-base font-medium ${accessory.color}`}
          >
            {accessory.emoji} {accessory.name}
          </div>

          {/* Description */}
          <h2 className="max-w-md text-center text-2xl font-bold leading-relaxed tracking-tight">
            {step.description}
          </h2>

          {/* Settings row */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-base">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2">
              <Zap size={18} className="text-yellow-400" />
              <span className="tabular-nums">
                Vel <strong>{step.speed}</strong>
              </span>
            </div>
            {step.mode && step.mode !== "manual" && (
              <div className="rounded-xl bg-emerald-400/15 px-4 py-2 font-semibold text-emerald-300">
                Modo {step.mode.replaceAll("-", " ")}
              </div>
            )}
            {step.reverse && (
              <div className="rounded-xl bg-violet-400/15 px-4 py-2 font-semibold text-violet-300">
                ↺ Giro inverso
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2">
              <Thermometer size={18} className="text-red-400" />
              <span className="tabular-nums">{step.temperature}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2">
              <Clock size={18} className="text-sky-400" />
              <span className="tabular-nums">{step.time}</span>
            </div>
          </div>

          {/* Timer */}
          {timerSeconds > 0 && (
            <div className="flex flex-col items-center gap-3">
              <div
                className={`font-mono text-6xl font-bold tabular-nums ${
                  timer?.remaining === 0
                    ? "animate-pulse text-red-400"
                    : "text-white"
                }`}
              >
                {timer
                  ? formatSeconds(timer.remaining)
                  : formatSeconds(timerSeconds)}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => startTimer(step.stepNumber, timerSeconds)}
                  className={`rounded-xl px-6 py-3 text-base font-semibold transition-colors ${
                    timer?.running
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-white text-slate-900 hover:bg-white/90"
                  }`}
                >
                  {timer?.running ? (
                    <span className="flex items-center gap-2">
                      <Pause size={18} /> Pausar
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play size={18} /> {timer ? "Continuar" : "Iniciar"}
                    </span>
                  )}
                </button>
                {timer && (
                  <button
                    onClick={() => resetTimer(step.stepNumber)}
                    className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/20"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
              </div>
              {timer?.remaining === 0 && (
                <div className="flex animate-bounce items-center gap-2 text-red-400">
                  <Volume2 size={22} />
                  <span className="text-xl font-bold">¡Tiempo!</span>
                </div>
              )}
            </div>
          )}

          {/* Tip */}
          {step.tip && (
            <div className="max-w-md rounded-xl border border-amber-500/30 bg-amber-500/15 px-5 py-3 text-center">
              <span className="text-amber-300">💡 {step.tip}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 bg-slate-900/60 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-4 text-base font-semibold transition-colors hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"
          >
            <ChevronLeft size={22} /> Anterior
          </button>
          <button
            onClick={
              currentStep === totalSteps - 1
                ? () => setCookingMode(false)
                : goNext
            }
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-4 text-base font-semibold transition-colors ${
              currentStep === totalSteps - 1
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-white text-slate-900 hover:bg-white/90"
            }`}
          >
            {currentStep === totalSteps - 1 ? (
              <>✅ Finalizar</>
            ) : (
              <>
                Siguiente <ChevronRight size={22} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // List view (default) — full-screen sheet, Thermomix style
  // =====================================================
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-stone-50 sm:h-auto sm:max-h-[92vh] sm:max-w-md sm:rounded-3xl sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — dark slate Thermomix */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <X size={16} />
            </button>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              Modo Thermomix · TM6
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Soup size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-white/70">Receta adaptada</p>
              <h1 className="truncate text-[18px] font-semibold tracking-tight">
                {recipe.name}
              </h1>
            </div>
          </div>

          {/* Time comparison */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
            <div className="flex-1 text-center">
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                Manual
              </div>
              <div className="text-lg font-bold tabular-nums">
                {recipe.manualTimeMinutes} min
              </div>
            </div>
            <ChevronRight size={20} className="text-white/40" />
            <div className="flex-1 text-center">
              <div className="text-[11px] uppercase tracking-wider text-white/50">
                Thermomix
              </div>
              <div className="text-lg font-bold tabular-nums text-emerald-300">
                {recipe.totalTimeMinutes} min
              </div>
            </div>
            <span className="rounded-lg bg-emerald-400 px-3 py-1 text-sm font-bold text-emerald-950 tabular-nums">
              {recipe.timeSaved}
            </span>
          </div>
        </div>

        {/* Accessories & Difficulty */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-5 py-3">
          {recipe.accessories.map((acc, i) => {
            const key = acc.toLowerCase() as keyof typeof ACCESSORY_INFO;
            const info = ACCESSORY_INFO[key] || ACCESSORY_INFO.ninguno;
            return (
              <span
                key={i}
                className={`rounded-full px-2 py-1 text-xs font-medium ${info.color}`}
              >
                {info.emoji} {acc}
              </span>
            );
          })}
          <span
            className={`ml-auto rounded-full px-2 py-1 text-xs font-medium ${
              recipe.difficulty === "fácil"
                ? "bg-green-100 text-green-700"
                : recipe.difficulty === "media"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {recipe.difficulty === "fácil"
              ? "⭐"
              : recipe.difficulty === "media"
                ? "⭐⭐"
                : "⭐⭐⭐"}{" "}
            {recipe.difficulty}
          </span>
        </div>

        {/* Cooking Mode Button */}
        <div className="border-b border-stone-200 bg-white px-5 py-3">
          <button
            onClick={() => {
              setCookingMode(true);
              setCurrentStep(0);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Maximize2 size={18} />
            Modo Cocina · paso a paso
          </button>
        </div>

        {/* Steps list */}
        <div
          className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
          ref={stepsContainerRef}
        >
          {/* Section label */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Paso a paso · TM6
          </p>

          {steps.map((step, i) => {
            const timerSeconds = parseTimeToSeconds(step.time);
            const timer = timers.get(step.stepNumber);
            const accessory =
              ACCESSORY_INFO[step.accessory] || ACCESSORY_INFO.ninguno;
            const isActive = i === currentStep;

            return (
              <div
                key={i}
                data-step={i}
                onClick={() => setCurrentStep(i)}
                className={`cursor-pointer rounded-2xl border bg-white p-4 transition-all ${
                  isActive
                    ? "border-slate-900 shadow-md ring-1 ring-slate-900"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                {/* Step header: number + spec chips */}
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {step.stepNumber}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SpecChip icon={<Clock size={10} />}>{step.time}</SpecChip>
                    <SpecChip icon={<Thermometer size={10} />}>
                      {step.temperature}
                    </SpecChip>
                    <SpecChip icon={<Zap size={10} />}>
                      Vel {step.speed}
                    </SpecChip>
                    {step.mode && step.mode !== "manual" && (
                      <SpecChip accent>
                        {step.mode.replaceAll("-", " ")}
                      </SpecChip>
                    )}
                    {step.reverse && <SpecChip accent>↺ inverso</SpecChip>}
                  </div>
                </div>

                {/* Description */}
                <p className="pl-8 text-[13px] leading-relaxed text-stone-800">
                  {step.description}
                </p>

                {/* Accessory chip */}
                <div className="mt-2 pl-8">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${accessory.color}`}
                  >
                    {accessory.emoji} {accessory.name}
                  </span>
                </div>

                {/* Timer button */}
                {timerSeconds > 0 && (
                  <div className="mt-2 flex items-center gap-2 pl-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startTimer(step.stepNumber, timerSeconds);
                      }}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                        timer?.running
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {timer?.running ? (
                        <Pause size={12} />
                      ) : (
                        <Play size={12} />
                      )}
                      <Timer size={12} />
                      {timer
                        ? formatSeconds(timer.remaining)
                        : formatSeconds(timerSeconds)}
                    </button>
                    {timer && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetTimer(step.stepNumber);
                        }}
                        className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                    {timer?.remaining === 0 && (
                      <span className="flex animate-pulse items-center gap-1 text-xs font-bold text-red-500">
                        <Volume2 size={12} /> ¡Listo!
                      </span>
                    )}
                  </div>
                )}

                {/* Tip */}
                {step.tip && (
                  <div className="ml-8 mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    💡 {step.tip}
                  </div>
                )}
              </div>
            );
          })}

          {/* AI adaptation note */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Sparkles
              size={14}
              className="mt-0.5 flex-shrink-0 text-amber-700"
            />
            <p className="text-[12.5px] leading-snug text-amber-900">
              Receta adaptada al Thermomix desde la versión tradicional. Tiempo
              total estimado:{" "}
              <strong className="tabular-nums">
                {recipe.totalTimeMinutes} min
              </strong>
              .
            </p>
          </div>

          {recipe.qualityWarnings && recipe.qualityWarnings.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-900">
                <AlertTriangle size={14} /> Revisión antes de cocinar
              </div>
              <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-orange-800">
                {recipe.qualityWarnings.slice(0, 3).map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tips footer */}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <h4 className="mb-1 text-sm font-semibold text-amber-800">
              💡 Tips Thermomix
            </h4>
            <ul className="space-y-1 text-xs text-amber-700">
              {recipe.tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
