"use client";
import { useEffect, useState, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Timer,
} from "lucide-react";
import type { Recipe } from "@/types";

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookingMode({ recipe, onClose }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const stepText =
    typeof steps[currentStep] === "string"
      ? (steps[currentStep] as string)
      : ((steps[currentStep] as { step?: string })?.step ?? "");

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
        // WakeLock no disponible en este entorno — ignorar
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
  // Patrones: "10 minutos", "5 min", "1 hora", "30 segundos"
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

  // 3. Auto-deteccion + TTS cada vez que cambia el paso
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // Timer terminado — vibrar + beep
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

  const goNext = () => setCurrentStep((s) => Math.min(steps.length - 1, s + 1));
  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 z-[300] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Cocinando</p>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
            {recipe.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (voiceEnabled && "speechSynthesis" in window)
                window.speechSynthesis.cancel();
              setVoiceEnabled((v) => !v);
            }}
            className={`p-3 rounded-full transition-colors ${
              voiceEnabled
                ? "bg-purple-100 text-purple-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            aria-label={voiceEnabled ? "Desactivar voz" : "Activar voz"}
          >
            {voiceEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Cerrar modo cocinar"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-semibold text-purple-600">
            Paso {currentStep + 1} de {steps.length}
          </span>
          <span className="text-gray-500">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl">
            <p className="text-2xl md:text-3xl leading-relaxed text-gray-900 dark:text-white">
              {stepText}
            </p>

            {/* Timer detectado automaticamente */}
            {timerSeconds !== null && timerSeconds > 0 && (
              <div className="mt-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl border-2 border-orange-200 dark:border-orange-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer size={32} className="text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Temporizador detectado
                      </p>
                      <p className="text-4xl font-bold text-orange-600 font-mono">
                        {formatTime(timerSeconds)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTimerActive((a) => !a)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                      timerActive
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    {timerActive ? "Pausar" : "Iniciar"}
                  </button>
                </div>
              </div>
            )}

            {/* Timer terminado */}
            {timerSeconds === 0 && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-2xl border-2 border-green-300 dark:border-green-700 text-center">
                <p className="text-green-700 dark:text-green-300 font-bold text-xl">
                  Tiempo terminado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegacion */}
      <div className="bg-white dark:bg-gray-900 p-4 shadow-2xl border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            onClick={goPrev}
            disabled={isFirstStep}
            className="flex-1 py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={24} />
            Anterior
          </button>

          {isLastStep ? (
            <button
              onClick={onClose}
              className="flex-[2] py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              Termine
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex-[2] py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all"
            >
              Siguiente
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
