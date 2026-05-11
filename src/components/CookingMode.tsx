"use client";

/**
 * CookingMode — Pantalla full-screen de cocinar paso a paso
 *
 * Sprint 2 del rediseno 2026 (Lazyweb Design Research).
 * Inspirado en: Crouton (hands-free + step list + add timer),
 *               Jullienne (paso grande + tip callout + card ingredientes del step)
 *
 * Mejoras vs version anterior:
 * - Texto del paso MAS GRANDE (text-3xl md:text-5xl)
 * - Numero de paso visible y prominente con underline
 * - Tip callout (si la receta tiene recipe.tips)
 * - Card de ingredientes del paso (filtrado por matching simple)
 * - Swipe gestures (touch) para avanzar/retroceder
 * - Step list (sheet con todos los pasos para saltar)
 * - Header minimal con solo lo necesario
 * - Timer flotante (bottom-right) en vez de card grande dentro
 *
 * Mantiene 100% la logica funcional anterior:
 * - WakeLock (pantalla siempre encendida)
 * - TTS en es-CO
 * - Timer auto-detectado del texto
 * - Vibracion + beep al terminar timer
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Timer,
  ListOrdered,
  Lightbulb,
  Check,
} from "lucide-react";
import type { Recipe, Ingredient } from "@/types";

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookingMode({ recipe, onClose }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showStepList, setShowStepList] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);
  const touchStartX = useRef<number | null>(null);

  const steps = useMemo(
    () => (Array.isArray(recipe.steps) ? recipe.steps : []),
    [recipe.steps],
  );
  const stepText = useMemo(() => {
    const s = steps[currentStep];
    if (typeof s === "string") return s;
    return (s as { step?: string })?.step ?? "";
  }, [steps, currentStep]);

  // Ingredientes mencionados en el paso (matching simple)
  const stepIngredients = useMemo<Ingredient[]>(() => {
    if (!recipe.ingredients?.length || !stepText) return [];
    const lowerStep = stepText.toLowerCase();
    return recipe.ingredients.filter((ing) => {
      const name = ing.name?.toLowerCase() ?? "";
      if (!name) return false;
      // Match si la primera palabra del ingrediente aparece en el paso
      const firstWord = name.split(" ")[0];
      return firstWord.length > 2 && lowerStep.includes(firstWord);
    });
  }, [stepText, recipe.ingredients]);

  // 1. WakeLock para mantener pantalla encendida
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (
            navigator as Navigator & {
              wakeLock: {
                request: (type: string) => Promise<WakeLockSentinel>;
              };
            }
          ).wakeLock.request("screen");
        }
      } catch {
        // WakeLock no disponible — ignorar
      }
    };
    acquire();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      wakeLock?.release().catch(() => {});
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // 2. Detectar tiempos en el texto del paso
  const detectTimer = (text: string): number | null => {
    const patterns: { regex: RegExp; mult: number }[] = [
      { regex: /(\d+)\s*horas?/i, mult: 3600 },
      { regex: /(\d+)\s*minutos?/i, mult: 60 },
      { regex: /(\d+)\s*min(?!u)/i, mult: 60 },
      { regex: /(\d+)\s*segundos?/i, mult: 1 },
      { regex: /(\d+)\s*seg(?!u)/i, mult: 1 },
    ];
    for (const { regex, mult } of patterns) {
      const match = text.match(regex);
      if (match) return parseInt(match[1]) * mult;
    }
    return null;
  };

  // 3. Auto-deteccion + TTS al cambiar paso
  useEffect(() => {
    const detected = detectTimer(stepText);
    setTimerSeconds(detected);
    setTimerActive(false);

    if (voiceEnabled && stepText && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(
        `Paso ${currentStep + 1}: ${stepText}`,
      );
      utt.lang = "es-CO";
      utt.rate = 0.9;
      audioRef.current = utt;
      window.speechSynthesis.speak(utt);
    }
  }, [currentStep, stepText, voiceEnabled]);

  // Cancelar TTS al desmontar
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // 4. Countdown del timer
  useEffect(() => {
    if (!timerActive || timerSeconds === null || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if ("vibrate" in navigator)
            navigator.vibrate([200, 100, 200, 100, 200]);
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            osc.frequency.value = 800;
            osc.connect(ctx.destination);
            osc.start();
            setTimeout(() => {
              osc.stop();
              ctx.close();
            }, 500);
          } catch {
            // AudioContext no disponible
          }
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const goNext = useCallback(() => {
    if (isLastStep) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
  }, [isLastStep, currentStep, steps.length]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  // 5. Swipe gestures (touch)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  // 6. Keyboard shortcuts (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  return (
    <div
      className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#0F0E0C] z-[300] flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header minimal */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 backdrop-blur transition-colors"
          aria-label="Cerrar modo cocinar"
        >
          <X size={22} />
        </button>

        <div className="flex flex-col items-center px-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
            Cocinando
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
            {recipe.name}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowStepList(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white backdrop-blur transition-colors"
            aria-label="Ver lista de pasos"
          >
            <ListOrdered size={20} />
          </button>
          <button
            onClick={() => {
              if (voiceEnabled && "speechSynthesis" in window)
                window.speechSynthesis.cancel();
              setVoiceEnabled((v) => !v);
            }}
            className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur transition-colors ${
              voiceEnabled
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white"
            }`}
            aria-label={voiceEnabled ? "Desactivar voz" : "Activar voz"}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="px-4 pb-2 flex justify-center gap-1.5">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            aria-label={`Ir al paso ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "w-8 bg-orange-500"
                : completedSteps.has(i) || i < currentStep
                  ? "w-4 bg-orange-300"
                  : "w-4 bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full">
          {/* Step number prominente con underline */}
          <div className="mb-6 flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-widest text-orange-600 font-bold">
              Paso
            </span>
            <span className="text-7xl md:text-8xl font-bold text-gray-900 dark:text-white leading-none tracking-tight">
              {currentStep + 1}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              de {steps.length}
            </span>
            <div className="mt-3 w-16 h-1 bg-orange-500 rounded-full" />
          </div>

          {/* Step text GIGANTE */}
          <p className="text-2xl md:text-3xl leading-relaxed text-gray-900 dark:text-white text-center font-medium mb-8">
            {stepText}
          </p>

          {/* Tip callout (si existe en la receta y es el primer paso o cada N pasos) */}
          {recipe.tips && currentStep === 0 && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800">
              <Lightbulb
                size={20}
                className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
              />
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300 mb-1">
                  Tip
                </p>
                <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                  {recipe.tips}
                </p>
              </div>
            </div>
          )}

          {/* Ingredientes del paso */}
          {stepIngredients.length > 0 && (
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-2">
                Ingredientes para este paso
              </p>
              <ul className="space-y-1.5">
                {stepIngredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    <span className="font-medium">{ing.name}</span>
                    {ing.total && (
                      <span className="text-gray-500 dark:text-gray-400">
                        · {ing.total}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hint de swipe (solo en touch devices) */}
          <div className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4 md:hidden">
            ← desliza para avanzar →
          </div>
        </div>
      </div>

      {/* Timer flotante (si detectado) */}
      {timerSeconds !== null && timerSeconds > 0 && (
        <button
          onClick={() => setTimerActive((a) => !a)}
          className={`fixed bottom-24 right-4 z-10 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl transition-all ${
            timerActive
              ? "bg-orange-500 text-white shadow-orange-500/30"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
          }`}
        >
          <Timer size={18} />
          <span className="font-mono font-bold text-lg tabular-nums">
            {formatTime(timerSeconds)}
          </span>
          <span className="text-xs">{timerActive ? "pausa" : "iniciar"}</span>
        </button>
      )}

      {/* Timer terminado (toast persistente) */}
      {timerSeconds === 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 px-5 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/30 font-bold flex items-center gap-2">
          <Check size={20} /> Tiempo terminado
        </div>
      )}

      {/* Bottom nav */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            onClick={goPrev}
            disabled={isFirstStep}
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Paso anterior"
          >
            <ChevronLeft size={24} />
          </button>

          {isLastStep ? (
            <button
              onClick={() => {
                setCompletedSteps((prev) => new Set(prev).add(currentStep));
                onClose();
              }}
              className="flex-1 h-14 px-6 rounded-2xl font-bold text-base bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30"
            >
              ✓ Termine de cocinar
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex-1 h-14 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30"
            >
              Siguiente paso
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Step list bottom sheet */}
      {showStepList && (
        <div
          className="fixed inset-0 z-[310] bg-black/50 flex items-end"
          onClick={() => setShowStepList(false)}
        >
          <div
            className="w-full bg-white dark:bg-gray-900 rounded-t-3xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Todos los pasos
              </h3>
              <button
                onClick={() => setShowStepList(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>
            <ul className="p-3 space-y-1">
              {steps.map((s, i) => {
                const text =
                  typeof s === "string"
                    ? s
                    : ((s as { step?: string })?.step ?? "");
                const isCompleted = completedSteps.has(i) || i < currentStep;
                const isCurrent = i === currentStep;
                return (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setCurrentStep(i);
                        setShowStepList(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors ${
                        isCurrent
                          ? "bg-orange-50 dark:bg-orange-950/30 ring-2 ring-orange-500"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                              ? "bg-orange-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {isCompleted ? <Check size={16} /> : i + 1}
                      </div>
                      <p className="flex-1 text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                        {text}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
