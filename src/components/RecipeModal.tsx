"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Lightbulb,
  ChefHat,
  Flame,
  Beef,
  Users,
  CheckCircle2,
  Soup,
  Heart,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Recipe, Ingredient, ThermomixRecipe } from "@/types";
import { MoodChip } from "@/components/ui/MoodChip";
import NutritionDisplay, {
  DietaryTags,
  PrepTimeDisplay,
  DifficultyDisplay,
} from "./NutritionDisplay";
import SmartSubstitutionPanel from "./SmartSubstitutionPanel";
import { FavoriteButton } from "@/components/recipe/FavoriteButton";
import { ShareRecipeButton } from "@/components/share/ShareRecipeButton";
import ThermomixView from "./ThermomixView";
import { CookingMode } from "@/components/CookingMode";
// findThermomixRecipe is loaded lazily inside the handler to avoid 40KB in initial bundle

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

// Cache for Thermomix adaptations to avoid re-generating
const thermomixCache = new Map<string, ThermomixRecipe>();

export default function RecipeModal({
  recipe,
  onClose,
  missingIngredients = [],
}: RecipeModalProps) {
  const [scale, setScale] = useState(1);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<
    Map<string, string>
  >(new Map());
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [showThermomix, setShowThermomix] = useState(false);
  const [thermomixRecipe, setThermomixRecipe] =
    useState<ThermomixRecipe | null>(null);
  const [isAdaptingThermomix, setIsAdaptingThermomix] = useState(false);
  const [thermomixError, setThermomixError] = useState<string | null>(null);
  const [showNutrition, setShowNutrition] = useState(false);

  // Thermomix adaptation handler
  const handleThermomixAdapt = useCallback(async () => {
    // Check cache first
    const cacheKey = recipe.id || recipe.name;
    const cached = thermomixCache.get(cacheKey);
    if (cached) {
      setThermomixRecipe(cached);
      setShowThermomix(true);
      return;
    }

    // Check library for pre-adapted recipes (lazy import to keep 40KB out of initial bundle)
    const { findThermomixRecipe } = await import("@/data/thermomix-recipes");
    const libraryRecipe = findThermomixRecipe(recipe.name);
    if (libraryRecipe) {
      thermomixCache.set(cacheKey, libraryRecipe);
      setThermomixRecipe(libraryRecipe);
      setShowThermomix(true);
      return;
    }

    // Call API to adapt
    setIsAdaptingThermomix(true);
    setThermomixError(null);

    try {
      const ingredientNames = (recipe.ingredients as Ingredient[]).map(
        (i) => `${i.name}: ${i.total || i.luis}`,
      );

      const response = await fetch("/api/adapt-recipe-thermomix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeName: recipe.name,
          originalSteps: recipe.steps,
          ingredients: ingredientNames,
          servings: 5,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al adaptar la receta");
      }

      const data = await response.json();
      if (data.success && data.thermomixRecipe) {
        thermomixCache.set(cacheKey, data.thermomixRecipe);
        setThermomixRecipe(data.thermomixRecipe);
        setShowThermomix(true);
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (err) {
      setThermomixError(
        err instanceof Error ? err.message : "Error al adaptar",
      );
    } finally {
      setIsAdaptingThermomix(false);
    }
  }, [recipe]);

  const ingredients = recipe.ingredients as Ingredient[];
  const hasTotal = ingredients[0]?.total;

  const handleSubstitutionSelect = (original: string, substitute: string) => {
    setSelectedSubstitutions((prev) => {
      const next = new Map(prev);
      next.set(original, substitute);
      return next;
    });
  };

  // Detectar tiempos en los pasos (ej: "25 minutos", "10 min", "1 hora")
  const extractTime = (text: string): number | null => {
    const patterns = [/(\d+)\s*hora/i, /(\d+)\s*min/i, /(\d+)\s*segundo/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (text.toLowerCase().includes("hora")) return value * 3600;
        if (text.toLowerCase().includes("min")) return value * 60;
        return value;
      }
    }
    return null;
  };

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((timer) => {
          if (timer.isRunning && timer.remainingSeconds > 0) {
            const newRemaining = timer.remainingSeconds - 1;

            // Alarma cuando termina
            if (newRemaining === 0) {
              playAlarm();
            }

            return { ...timer, remainingSeconds: newRemaining };
          }
          return timer;
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const playAlarm = () => {
    // Vibrar si está disponible
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Reproducir sonido de alarma
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+Onp2SfGlqgYyZoZiGcWRtfouZoJaEb2FsfoqXnpWEb2BsfYqXnpWDb19rfImWnZSCbl5qfIiVnJOBbV1pe4eUm5KAbFxoeYaTmpF/a1tnd4SSl5B+altmdoORlY99aVpldIGQlI58aFlkc4CPk4x7Z1hjcoGOkot6ZsijkoqAaF1meoaPkIl4ZlsA",
    );
    audio.play().catch(() => {});

    // Notificación si está permitida
    if (Notification.permission === "granted") {
      new Notification("Timer terminado", {
        body: `El tiempo ha terminado para ${recipe.name}`,
        icon: "/icon.svg",
      });
    }
  };

  const startTimer = (stepIndex: number, seconds: number) => {
    const existingIndex = activeTimers.findIndex(
      (t) => t.stepIndex === stepIndex,
    );

    if (existingIndex >= 0) {
      // Toggle play/pause
      setActiveTimers((prev) =>
        prev.map((t, i) =>
          i === existingIndex ? { ...t, isRunning: !t.isRunning } : t,
        ),
      );
    } else {
      // Start new timer
      setActiveTimers((prev) => [
        ...prev,
        {
          stepIndex,
          totalSeconds: seconds,
          remainingSeconds: seconds,
          isRunning: true,
        },
      ]);
    }
  };

  const resetTimer = (stepIndex: number) => {
    setActiveTimers((prev) =>
      prev.map((t) =>
        t.stepIndex === stepIndex
          ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false }
          : t,
      ),
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const scaleQuantity = (qty: string): string => {
    if (scale === 1) return qty;

    const match = qty.match(/^([\d.\/]+)\s*(.*)$/);
    if (!match) return qty;

    let num: number;
    if (match[1].includes("/")) {
      const [numerator, denominator] = match[1].split("/").map(Number);
      num = numerator / denominator;
    } else {
      num = parseFloat(match[1]);
    }

    const scaled = Math.round(num * scale * 10) / 10;
    return `${scaled}${match[2] ? " " + match[2] : ""}`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "breakfast":
        return "Desayuno";
      case "lunch":
        return "Almuerzo";
      case "dinner":
        return "Cena";
      case "dessert":
        return "Postre";
      case "snack":
        return "Snack";
      default:
        return type;
    }
  };

  // ─── Metadata por tipo de comida (eyebrow + tinte del hero) ───
  const typeMeta = {
    breakfast: { color: "text-amber-700", tint: "from-amber-100 to-orange-50" },
    lunch: { color: "text-green-700", tint: "from-green-100 to-lime-50" },
    dinner: { color: "text-indigo-700", tint: "from-indigo-100 to-violet-50" },
    dessert: { color: "text-pink-700", tint: "from-pink-100 to-rose-50" },
    snack: { color: "text-yellow-700", tint: "from-yellow-100 to-amber-50" },
  }[recipe.type] ?? {
    color: "text-stone-700",
    tint: "from-stone-100 to-stone-50",
  };

  const totalTime =
    recipe.total_time ?? (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  // ─── Footer: acción primaria "Cocinar con esto" ───
  const footer = (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {/* Thermomix */}
        {recipe.thermomixCompatible !== false && (
          <button
            onClick={handleThermomixAdapt}
            disabled={isAdaptingThermomix}
            className="bg-stone-100 text-[var(--ink)] py-2.5 rounded-xl text-[12px] font-medium flex items-center justify-center gap-1.5 hover:bg-stone-200 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {isAdaptingThermomix ? <Spinner size="sm" /> : <Soup size={13} />}{" "}
            Thermomix
          </button>
        )}

        {/* Nutrición */}
        {recipe.nutrition && (
          <button
            onClick={() => setShowNutrition((v) => !v)}
            className={`py-2.5 rounded-xl text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
              showNutrition
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "bg-stone-100 text-[var(--ink)] hover:bg-stone-200"
            }`}
          >
            <Heart size={13} /> Nutrición
          </button>
        )}

        {/* Compartir (sustituye a "Calificar" — flujo existente del modal) */}
        {recipe.id && (
          <div className="bg-stone-100 rounded-xl flex items-center justify-center">
            <ShareRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
          </div>
        )}
      </div>

      {/* Cocinar con esto */}
      {recipe.steps && recipe.steps.length > 0 && (
        <button
          onClick={() => setShowCookingMode(true)}
          className="w-full bg-[var(--accent)] text-white py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
        >
          <ChefHat size={16} /> Cocinar con esto
        </button>
      )}

      {thermomixError && (
        <p className="text-red-500 text-xs text-center">{thermomixError}</p>
      )}
    </div>
  );

  return (
    <>
      <BottomSheet
        open={true}
        onClose={onClose}
        showCloseButton={false}
        maxHeight="92vh"
        footer={footer}
      >
        {/* Wrapper que cancela el padding del BottomSheet para el hero a sangre */}
        <div className="-mx-5 -my-4">
          {/* ─── Hero ─────────────────────────────────────── */}
          <div className="relative h-48 overflow-hidden flex items-end">
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt={recipe.name}
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 448px) 100vw, 448px"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${typeMeta.tint}`}
              >
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 8px)",
                  }}
                />
              </div>
            )}

            {/* Eyebrow categoría tipo de comida */}
            <span
              className={`absolute top-3 left-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold ${typeMeta.color}`}
            >
              {getTypeLabel(recipe.type)}
            </span>

            {/* Acciones del hero: favorito + cerrar */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {recipe.id && (
                <span className="w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center">
                  <FavoriteButton recipeId={recipe.id} size={16} />
                </span>
              )}
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[var(--ink)] hover:bg-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Timer activo */}
            {activeTimers.some((t) => t.isRunning) && (
              <span className="absolute bottom-3 right-3 text-[10px] px-2 py-1 rounded-full bg-red-500 text-white animate-pulse flex items-center gap-1 font-medium">
                <Timer size={12} />
                Timer activo
              </span>
            )}
          </div>

          {/* ─── Contenido ──────────────────────────────────── */}
          <div className="px-5 py-4">
            {/* Título */}
            <h2
              id="recipe-modal-title"
              className="text-[22px] font-semibold tracking-tight text-[var(--ink)] leading-tight"
            >
              {recipe.name}
            </h2>

            {/* Eyebrow categoría + dificultad + tags */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {recipe.category && (
                <>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-medium">
                    {recipe.category}
                  </span>
                  {recipe.difficulty && (
                    <span className="text-stone-300">·</span>
                  )}
                </>
              )}
              {recipe.difficulty && (
                <DifficultyDisplay difficulty={recipe.difficulty} />
              )}
            </div>

            {/* Dietary tags */}
            {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
              <div className="mt-2">
                <DietaryTags tags={recipe.dietary_tags} />
              </div>
            )}

            {/* Mood chips */}
            {recipe.moods && recipe.moods.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {recipe.moods.map((mood) => (
                  <MoodChip key={mood} mood={mood} size="sm" />
                ))}
              </div>
            )}

            {/* Region badge */}
            {recipe.region && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  🇨🇴 {recipe.region}
                </span>
              </div>
            )}

            {/* Descripción */}
            {recipe.description && (
              <p className="mt-3 text-[13px] text-[var(--ink-soft)] italic leading-relaxed">
                {recipe.description}
              </p>
            )}

            {/* ─── Stats grid (tiempo / kcal / proteína / porciones) ─── */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="bg-white rounded-xl border border-[var(--border)] p-2.5 text-center">
                <Timer size={14} className="text-stone-500 mx-auto" />
                <p className="text-[14px] font-semibold text-[var(--ink)] mt-1 tabular-nums">
                  {totalTime}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-stone-400">
                  min
                </p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border)] p-2.5 text-center">
                <Flame size={14} className="text-orange-500 mx-auto" />
                <p className="text-[14px] font-semibold text-[var(--ink)] mt-1 tabular-nums">
                  {recipe.nutrition?.calories ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-stone-400">
                  kcal
                </p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border)] p-2.5 text-center">
                <Beef size={14} className="text-red-500 mx-auto" />
                <p className="text-[14px] font-semibold text-[var(--ink)] mt-1 tabular-nums">
                  {recipe.nutrition?.protein ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-stone-400">
                  g prot
                </p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border)] p-2.5 text-center">
                <Users size={14} className="text-stone-500 mx-auto" />
                <p className="text-[14px] font-semibold text-[var(--ink)] mt-1 tabular-nums">
                  5
                </p>
                <p className="text-[9px] uppercase tracking-wider text-stone-400">
                  porc
                </p>
              </div>
            </div>

            {/* Prep time detallado */}
            {(recipe.prep_time || recipe.cook_time || recipe.total_time) && (
              <div className="mt-4">
                <PrepTimeDisplay
                  prepTime={recipe.prep_time}
                  cookTime={recipe.cook_time}
                  totalTime={recipe.total_time}
                />
              </div>
            )}

            {/* ─── Porciones por miembro ─────────────────────── */}
            {recipe.portions && (
              <div className="mt-4 bg-white rounded-2xl border border-[var(--border)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">
                  Porciones por miembro {scale !== 1 && `(×${scale})`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-[13px] flex-shrink-0">
                      L
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-stone-500">Luis</p>
                      <p className="text-[12.5px] font-medium text-[var(--ink)]">
                        {recipe.portions.luis}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-semibold text-[13px] flex-shrink-0">
                      M
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-stone-500">Mariana</p>
                      <p className="text-[12.5px] font-medium text-[var(--ink)]">
                        {recipe.portions.mariana}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Total a preparar */}
            {recipe.total && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl text-[13px] text-blue-700">
                <strong>Total a preparar:</strong> {scaleQuantity(recipe.total)}
              </div>
            )}

            {/* ─── Ajustar porciones (escala) ────────────────── */}
            <div className="mt-4 bg-white rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold flex items-center gap-1.5">
                  <Users size={13} />
                  Ajustar porciones
                </span>
                <span className="text-[12px] text-[var(--accent)] font-medium tabular-nums">
                  {scale === 1 ? "Original" : `×${scale}`}
                </span>
              </div>
              <div className="flex gap-2">
                {[0.5, 1, 1.5, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors tabular-nums ${
                      scale === s
                        ? "bg-[var(--accent)] text-white"
                        : "bg-stone-100 text-[var(--ink)] hover:bg-stone-200"
                    }`}
                  >
                    {s === 1 ? "1x" : s < 1 ? "½" : `${s}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Substitutions Panel */}
            {missingIngredients.length > 0 && (
              <div className="mt-4">
                <SmartSubstitutionPanel
                  missingIngredients={missingIngredients}
                  dietaryTags={recipe.dietary_tags}
                  onSubstitutionSelect={handleSubstitutionSelect}
                />
              </div>
            )}

            {/* ─── Ingredientes ──────────────────────────────── */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold flex items-center gap-2">
                  Ingredientes
                  {scale !== 1 && (
                    <span className="text-[10px] normal-case tracking-normal text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">
                      Escalado ×{scale}
                    </span>
                  )}
                </p>
                <span className="text-[11px] text-stone-400 tabular-nums">
                  {ingredients.length} items
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                {ingredients.map((ing, i) => {
                  const isMissing = missingIngredients.some(
                    (m) =>
                      ing.name.toLowerCase().includes(m.toLowerCase()) ||
                      m.toLowerCase().includes(ing.name.toLowerCase()),
                  );

                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          size={16}
                          className={`flex-shrink-0 ${
                            isMissing ? "text-orange-400" : "text-green-500"
                          }`}
                        />
                        <span className="text-[13.5px] text-[var(--ink)] font-medium flex-1">
                          {ing.name}
                        </span>
                        {isMissing && (
                          <span className="text-[10px] uppercase tracking-wider text-orange-500 font-medium">
                            Falta
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-500 mt-1.5 pl-7">
                        {hasTotal && (
                          <div className="tabular-nums">
                            <span className="text-stone-400">Total:</span>{" "}
                            {scaleQuantity(ing.total || "")}
                          </div>
                        )}
                        <div className="tabular-nums">
                          <span className="text-stone-400">Grande:</span>{" "}
                          {scaleQuantity(ing.luis)}
                        </div>
                        <div className="tabular-nums">
                          <span className="text-stone-400">Pequeña:</span>{" "}
                          {scaleQuantity(ing.mariana)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Preparación (pasos numerados con timers) ──── */}
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
                Preparación
              </p>
              <div className="bg-white rounded-2xl border border-[var(--border)] p-4 space-y-3">
                {recipe.steps.map((step, i) => {
                  const timeSeconds = extractTime(step);
                  const timer = activeTimers.find((t) => t.stepIndex === i);

                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-semibold text-[11px] flex-shrink-0 tabular-nums">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13.5px] text-[var(--ink)] leading-relaxed pt-0.5">
                          {step}
                        </p>

                        {/* Timer UI */}
                        {timeSeconds && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => startTimer(i, timeSeconds)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors tabular-nums ${
                                timer?.isRunning
                                  ? "bg-red-100 text-red-700"
                                  : "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-95"
                              }`}
                            >
                              {timer?.isRunning ? (
                                <Pause size={12} />
                              ) : (
                                <Play size={12} />
                              )}
                              {timer
                                ? formatTime(timer.remainingSeconds)
                                : formatTime(timeSeconds)}
                            </button>

                            {timer && (
                              <button
                                onClick={() => resetTimer(i)}
                                className="p-1.5 text-stone-500 hover:text-[var(--ink)] hover:bg-stone-100 rounded-lg"
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}

                            {timer?.remainingSeconds === 0 && (
                              <span className="flex items-center gap-1 text-red-600 text-[12px] animate-pulse">
                                <Volume2 size={12} />
                                ¡Tiempo!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips */}
            {recipe.tips && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-start gap-2">
                  <Lightbulb
                    size={16}
                    className="text-amber-600 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <h5 className="text-[12px] uppercase tracking-wider font-semibold text-amber-700 mb-1">
                      Tips
                    </h5>
                    <p className="text-[13px] text-amber-800 leading-relaxed">
                      {recipe.tips}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrición (toggle desde footer) */}
            {recipe.nutrition && showNutrition && (
              <div className="mt-4">
                <NutritionDisplay nutrition={recipe.nutrition} />
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Thermomix View Modal */}
      {showThermomix && thermomixRecipe && (
        <ThermomixView
          recipe={thermomixRecipe}
          onClose={() => setShowThermomix(false)}
        />
      )}

      {/* Cooking Mode — full-screen overlay */}
      {showCookingMode && (
        <CookingMode
          recipe={recipe}
          onClose={() => setShowCookingMode(false)}
        />
      )}
    </>
  );
}
