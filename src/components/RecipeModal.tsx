'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Users, Timer, Play, Pause, RotateCcw, Volume2, Lightbulb, ImageIcon } from 'lucide-react';
import { Recipe, Ingredient } from '@/types';
import NutritionDisplay, { DietaryTags, PrepTimeDisplay, DifficultyDisplay } from './NutritionDisplay';
import SmartSubstitutionPanel from './SmartSubstitutionPanel';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
  missingIngredients?: string[];
}

interface ActiveTimer {
  stepIndex: number;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export default function RecipeModal({ recipe, onClose, missingIngredients = [] }: RecipeModalProps) {
  const [scale, setScale] = useState(1);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<Map<string, string>>(new Map());

  const ingredients = recipe.ingredients as Ingredient[];
  const hasTotal = ingredients[0]?.total;

  const handleSubstitutionSelect = (original: string, substitute: string) => {
    setSelectedSubstitutions(prev => {
      const next = new Map(prev);
      next.set(original, substitute);
      return next;
    });
  };

  // Detectar tiempos en los pasos (ej: "25 minutos", "10 min", "1 hora")
  const extractTime = (text: string): number | null => {
    const patterns = [
      /(\d+)\s*hora/i,
      /(\d+)\s*min/i,
      /(\d+)\s*segundo/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (text.toLowerCase().includes('hora')) return value * 3600;
        if (text.toLowerCase().includes('min')) return value * 60;
        return value;
      }
    }
    return null;
  };

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => prev.map(timer => {
        if (timer.isRunning && timer.remainingSeconds > 0) {
          const newRemaining = timer.remainingSeconds - 1;

          // Alarma cuando termina
          if (newRemaining === 0) {
            playAlarm();
          }

          return { ...timer, remainingSeconds: newRemaining };
        }
        return timer;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const playAlarm = () => {
    // Vibrar si está disponible
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Reproducir sonido de alarma
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Onp2SfGlqgYyZoZiGcWRtfouZoJaEb2FsfoqXnpWEb2BsfYqXnpWDb19rfImWnZSCbl5qfIiVnJOBbV1pe4eUm5KAbFxoeYaTmpF/a1tnd4SSl5B+altmdoORlY99aVpldIGQlI58aFlkc4CPk4x7Z1hjcoGOkot6ZsijkoqAaF1meoaPkIl4ZlsA');
    audio.play().catch(() => {});

    // Notificación si está permitida
    if (Notification.permission === 'granted') {
      new Notification('Timer terminado', {
        body: `El tiempo ha terminado para ${recipe.name}`,
        icon: '/icon.svg'
      });
    }
  };

  const startTimer = (stepIndex: number, seconds: number) => {
    const existingIndex = activeTimers.findIndex(t => t.stepIndex === stepIndex);

    if (existingIndex >= 0) {
      // Toggle play/pause
      setActiveTimers(prev => prev.map((t, i) =>
        i === existingIndex ? { ...t, isRunning: !t.isRunning } : t
      ));
    } else {
      // Start new timer
      setActiveTimers(prev => [...prev, {
        stepIndex,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isRunning: true
      }]);
    }
  };

  const resetTimer = (stepIndex: number) => {
    setActiveTimers(prev => prev.map(t =>
      t.stepIndex === stepIndex
        ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false }
        : t
    ));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scaleQuantity = (qty: string): string => {
    if (scale === 1) return qty;

    const match = qty.match(/^([\d.\/]+)\s*(.*)$/);
    if (!match) return qty;

    let num: number;
    if (match[1].includes('/')) {
      const [numerator, denominator] = match[1].split('/').map(Number);
      num = numerator / denominator;
    } else {
      num = parseFloat(match[1]);
    }

    const scaled = Math.round(num * scale * 10) / 10;
    return `${scaled}${match[2] ? ' ' + match[2] : ''}`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Desayuno';
      case 'lunch': return 'Almuerzo';
      case 'dinner': return 'Cena';
      default: return type;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-lg pr-2">{recipe.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Recipe Image */}
        {recipe.image_url ? (
          <div className="relative w-full h-48 bg-gray-100">
            <Image
              src={recipe.image_url}
              alt={recipe.name}
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 448px) 100vw, 448px"
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
              <span className="text-xs">Sin foto</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Type Badge + Difficulty */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className={`
              text-sm px-3 py-1 rounded-full
              ${recipe.type === 'breakfast' ? 'bg-orange-100 text-orange-700' : ''}
              ${recipe.type === 'lunch' ? 'bg-green-100 text-green-700' : ''}
              ${recipe.type === 'dinner' ? 'bg-blue-100 text-blue-700' : ''}
            `}>
              {getTypeLabel(recipe.type)}
            </span>

            {recipe.difficulty && (
              <DifficultyDisplay difficulty={recipe.difficulty} />
            )}

            {activeTimers.some(t => t.isRunning) && (
              <span className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-700 animate-pulse flex items-center gap-1">
                <Timer size={14} />
                Timer activo
              </span>
            )}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="mb-4 text-sm text-gray-600 italic">
              {recipe.description}
            </p>
          )}

          {/* Prep Time Display */}
          {(recipe.prep_time || recipe.cook_time || recipe.total_time) && (
            <div className="mb-4">
              <PrepTimeDisplay
                prepTime={recipe.prep_time}
                cookTime={recipe.cook_time}
                totalTime={recipe.total_time}
              />
            </div>
          )}

          {/* Dietary Tags */}
          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <div className="mb-4">
              <DietaryTags tags={recipe.dietary_tags} />
            </div>
          )}

          {/* Scale Control */}
          <div className="mb-4 p-3 bg-purple-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Users size={16} />
                Ajustar porciones
              </span>
              <span className="text-sm text-purple-600">
                {scale === 1 ? 'Original' : `×${scale}`}
              </span>
            </div>
            <div className="flex gap-2">
              {[0.5, 1, 1.5, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scale === s
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  {s === 1 ? '1x' : s < 1 ? '½' : `${s}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Substitutions Panel */}
          {missingIngredients.length > 0 && (
            <div className="mb-4">
              <SmartSubstitutionPanel
                missingIngredients={missingIngredients}
                dietaryTags={recipe.dietary_tags}
                onSubstitutionSelect={handleSubstitutionSelect}
              />
            </div>
          )}

          {/* Portions */}
          {recipe.portions && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="font-semibold mb-1">Porciones {scale !== 1 && `(×${scale})`}:</div>
              <div><strong>Porción grande:</strong> {recipe.portions.luis}</div>
              <div><strong>Porción pequeña:</strong> {recipe.portions.mariana}</div>
            </div>
          )}

          {/* Total */}
          {recipe.total && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>Total a preparar:</strong> {scaleQuantity(recipe.total)}
            </div>
          )}

          {/* Ingredients */}
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            Ingredientes
            {scale !== 1 && (
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                Escalado ×{scale}
              </span>
            )}
          </h4>
          <div className="space-y-2 mb-4">
            {ingredients.map((ing, i) => {
              const isMissing = missingIngredients.some(m =>
                ing.name.toLowerCase().includes(m.toLowerCase()) ||
                m.toLowerCase().includes(ing.name.toLowerCase())
              );

              return (
                <div key={i} className={`p-3 rounded-lg border ${isMissing ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="font-medium text-sm mb-1">
                    {ing.name}
                    {isMissing && <span className="ml-1 text-orange-500">⚠</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    {hasTotal && (
                      <div>
                        <span className="text-gray-400">Total:</span> {scaleQuantity(ing.total || '')}
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Grande:</span> {scaleQuantity(ing.luis)}
                    </div>
                    <div>
                      <span className="text-gray-400">Pequeña:</span> {scaleQuantity(ing.mariana)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Steps with Timers */}
          <h4 className="font-semibold mb-2">Preparación</h4>
          <ol className="space-y-3 text-sm">
            {recipe.steps.map((step, i) => {
              const timeSeconds = extractTime(step);
              const timer = activeTimers.find(t => t.stepIndex === i);

              return (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="leading-relaxed">{step}</p>

                    {/* Timer UI */}
                    {timeSeconds && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => startTimer(i, timeSeconds)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            timer?.isRunning
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {timer?.isRunning ? <Pause size={12} /> : <Play size={12} />}
                          {timer ? formatTime(timer.remainingSeconds) : formatTime(timeSeconds)}
                        </button>

                        {timer && (
                          <button
                            onClick={() => resetTimer(i)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}

                        {timer?.remainingSeconds === 0 && (
                          <span className="flex items-center gap-1 text-red-600 text-xs animate-pulse">
                            <Volume2 size={12} />
                            ¡Tiempo!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Tips */}
          {recipe.tips && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-amber-700 mb-1">Tips</h5>
                  <p className="text-sm text-amber-800">{recipe.tips}</p>
                </div>
              </div>
            </div>
          )}

          {/* Nutrition Info */}
          {recipe.nutrition && (
            <div className="mt-4">
              <NutritionDisplay nutrition={recipe.nutrition} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
