'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight,
  Volume2, Clock, Zap, Thermometer, Timer, ChefHat, Maximize2, Minimize2
} from 'lucide-react';
import type { ThermomixRecipe, ThermomixStep } from '@/types';

// =====================================================
// Accessory emoji map
// =====================================================
const ACCESSORY_INFO: Record<string, { emoji: string; name: string; color: string }> = {
  cuchilla: { emoji: '🔪', name: 'Cuchilla', color: 'bg-red-100 text-red-700' },
  mariposa: { emoji: '🦋', name: 'Mariposa', color: 'bg-purple-100 text-purple-700' },
  cestillo: { emoji: '🧺', name: 'Cestillo', color: 'bg-amber-100 text-amber-700' },
  varoma:   { emoji: '🫕', name: 'Varoma', color: 'bg-orange-100 text-orange-700' },
  ninguno:  { emoji: '✋', name: 'Sin accesorio', color: 'bg-gray-100 text-gray-600' },
};

// =====================================================
// Timer hook
// =====================================================
function useCountdownTimer() {
  const [timers, setTimers] = useState<Map<number, { total: number; remaining: number; running: boolean }>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [key, timer] of next) {
          if (timer.running && timer.remaining > 0) {
            next.set(key, { ...timer, remaining: timer.remaining - 1 });
            changed = true;

            // Alarm at 0
            if (timer.remaining - 1 === 0) {
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Onp2SfGlqgYyZoZiGcWRtfouZoJaEb2FsfoqXnpWEb2BsfYqXnpWDb19rfImWnZSCbl5qfIiVnJOBbV1pe4eUm5KAbFxoeYaTmpF/a1tnd4SSl5B+altmdoORlY99aVpldIGQlI58aFlkc4CPk4x7Z1hjcoGOkot6ZsijkoqAaF1meoaPkIl4ZlsA');
                audio.play().catch(() => {});
              } catch { /* ignore audio errors */ }
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
    setTimers(prev => {
      const next = new Map(prev);
      const existing = next.get(stepNum);
      if (existing) {
        next.set(stepNum, { ...existing, running: !existing.running });
      } else {
        next.set(stepNum, { total: seconds, remaining: seconds, running: true });
      }
      return next;
    });
  }, []);

  const resetTimer = useCallback((stepNum: number) => {
    setTimers(prev => {
      const next = new Map(prev);
      const existing = next.get(stepNum);
      if (existing) {
        next.set(stepNum, { ...existing, remaining: existing.total, running: false });
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
  if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
  return `0:${secs.toString().padStart(2, '0')}`;
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
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
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
      const stepEl = stepsContainerRef.current.querySelector(`[data-step="${currentStep}"]`);
      if (stepEl) stepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, cookingMode]);

  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  const goPrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));

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
      <div className="fixed inset-0 bg-gray-900 z-[300] flex flex-col text-white select-none">
        {/* Top bar */}
        <div className="flex justify-between items-center p-4 bg-black/30">
          <button onClick={() => setCookingMode(false)} className="flex items-center gap-2 text-white/80 hover:text-white">
            <Minimize2 size={20} />
            <span className="text-sm">Salir</span>
          </button>
          <div className="text-center">
            <span className="text-white/60 text-sm">Paso</span>
            <span className="ml-1 font-bold text-lg">{currentStep + 1}</span>
            <span className="text-white/60 text-sm"> / {totalSteps}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          {/* Accessory badge */}
          <div className={`px-4 py-2 rounded-full text-lg font-medium ${accessory.color}`}>
            {accessory.emoji} {accessory.name}
          </div>

          {/* Description */}
          <h2 className="text-2xl font-bold text-center leading-relaxed max-w-md">
            {step.description}
          </h2>

          {/* Settings row */}
          <div className="flex gap-6 text-lg">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
              <Zap size={20} className="text-yellow-400" />
              <span>Vel: <strong>{step.speed}</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
              <Thermometer size={20} className="text-red-400" />
              <span>{step.temperature}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
              <Clock size={20} className="text-blue-400" />
              <span>{step.time}</span>
            </div>
          </div>

          {/* Timer */}
          {timerSeconds > 0 && (
            <div className="flex flex-col items-center gap-3">
              <div className={`text-6xl font-mono font-bold tabular-nums ${
                timer?.remaining === 0 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>
                {timer ? formatSeconds(timer.remaining) : formatSeconds(timerSeconds)}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => startTimer(step.stepNumber, timerSeconds)}
                  className={`px-6 py-3 rounded-xl font-semibold text-lg transition-colors ${
                    timer?.running
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {timer?.running ? (
                    <span className="flex items-center gap-2"><Pause size={20} /> Pausar</span>
                  ) : (
                    <span className="flex items-center gap-2"><Play size={20} /> {timer ? 'Continuar' : 'Iniciar'}</span>
                  )}
                </button>
                {timer && (
                  <button
                    onClick={() => resetTimer(step.stepNumber)}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl"
                  >
                    <RotateCcw size={20} />
                  </button>
                )}
              </div>
              {timer?.remaining === 0 && (
                <div className="flex items-center gap-2 text-red-400 animate-bounce">
                  <Volume2 size={24} />
                  <span className="text-xl font-bold">¡Tiempo!</span>
                </div>
              )}
            </div>
          )}

          {/* Tip */}
          {step.tip && (
            <div className="bg-amber-500/20 border border-amber-500/30 px-5 py-3 rounded-xl max-w-md text-center">
              <span className="text-amber-300">💡 {step.tip}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 p-6 bg-black/30">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="flex-1 py-4 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-xl font-semibold flex items-center justify-center gap-2 text-lg transition-colors"
          >
            <ChevronLeft size={24} /> Anterior
          </button>
          <button
            onClick={currentStep === totalSteps - 1 ? () => setCookingMode(false) : goNext}
            className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-lg transition-colors ${
              currentStep === totalSteps - 1
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-teal-500 hover:bg-teal-600'
            }`}
          >
            {currentStep === totalSteps - 1 ? (
              <>✅ Finalizar</>
            ) : (
              <>Siguiente <ChevronRight size={24} /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // List view (default)
  // =====================================================
  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ChefHat size={20} />
                <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">TM6 Adaptado</span>
              </div>
              <h3 className="font-bold text-lg">{recipe.name}</h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X size={24} />
            </button>
          </div>

          {/* Time comparison */}
          <div className="mt-3 flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <div className="text-center flex-1">
              <div className="text-white/60 text-xs">Manual</div>
              <div className="font-bold text-lg">{recipe.manualTimeMinutes} min</div>
            </div>
            <div className="text-2xl">→</div>
            <div className="text-center flex-1">
              <div className="text-white/60 text-xs">Thermomix</div>
              <div className="font-bold text-lg text-emerald-200">{recipe.totalTimeMinutes} min</div>
            </div>
            <div className="bg-emerald-400 text-emerald-900 px-3 py-1 rounded-lg text-sm font-bold">
              {recipe.timeSaved}
            </div>
          </div>
        </div>

        {/* Accessories & Difficulty */}
        <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap gap-2">
          {recipe.accessories.map((acc, i) => {
            const key = acc.toLowerCase() as keyof typeof ACCESSORY_INFO;
            const info = ACCESSORY_INFO[key] || ACCESSORY_INFO.ninguno;
            return (
              <span key={i} className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>
                {info.emoji} {acc}
              </span>
            );
          })}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ml-auto ${
            recipe.difficulty === 'fácil' ? 'bg-green-100 text-green-700' :
            recipe.difficulty === 'media' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {recipe.difficulty === 'fácil' ? '⭐' : recipe.difficulty === 'media' ? '⭐⭐' : '⭐⭐⭐'} {recipe.difficulty}
          </span>
        </div>

        {/* Cooking Mode Button */}
        <div className="px-4 py-3 border-b">
          <button
            onClick={() => { setCookingMode(true); setCurrentStep(0); }}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md"
          >
            <Maximize2 size={18} />
            ▶️ Modo Cocina (paso a paso)
          </button>
        </div>

        {/* Steps list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3" ref={stepsContainerRef}>
          {steps.map((step, i) => {
            const timerSeconds = parseTimeToSeconds(step.time);
            const timer = timers.get(step.stepNumber);
            const accessory = ACCESSORY_INFO[step.accessory] || ACCESSORY_INFO.ninguno;
            const isActive = i === currentStep;

            return (
              <div
                key={i}
                data-step={i}
                onClick={() => setCurrentStep(i)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-teal-400 bg-teal-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Step header */}
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-relaxed">{step.description}</p>

                    {/* Settings chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${accessory.color}`}>
                        {accessory.emoji} {accessory.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        ⚡ Vel: {step.speed}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        🌡️ {step.temperature}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        ⏱️ {step.time}
                      </span>
                    </div>

                    {/* Timer button */}
                    {timerSeconds > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); startTimer(step.stepNumber, timerSeconds); }}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            timer?.running
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                          }`}
                        >
                          {timer?.running ? <Pause size={12} /> : <Play size={12} />}
                          <Timer size={12} />
                          {timer ? formatSeconds(timer.remaining) : formatSeconds(timerSeconds)}
                        </button>
                        {timer && (
                          <button
                            onClick={(e) => { e.stopPropagation(); resetTimer(step.stepNumber); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        {timer?.remaining === 0 && (
                          <span className="text-red-500 text-xs font-bold animate-pulse flex items-center gap-1">
                            <Volume2 size={12} /> ¡Listo!
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tip */}
                    {step.tip && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                        💡 {step.tip}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips footer */}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="p-4 border-t bg-amber-50">
            <h4 className="text-sm font-semibold text-amber-800 mb-1">💡 Tips Thermomix</h4>
            <ul className="text-xs text-amber-700 space-y-1">
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
