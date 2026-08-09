"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { DIET_PRESETS, buildPreferencesForDietPreset, getDietPreset } from "@/data/diet-presets";
import type { DietPreset, DietPresetCategory } from "@/data/diet-presets";
import type { ExpandedRecipe } from "@/data/expanded-recipes";
import type { RegionalRecipe } from "@/data/regional-colombian-recipes";
import type { DietaryPreferences, Recipe, RecipeDifficulty } from "@/types";
import { mergeRecipeCatalog } from "@/lib/recipe-catalog";
import { summarizeDietCompatibility } from "@/lib/recipe-diet";
import { supabase } from "@/lib/supabase/client";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

type MealType = "breakfast" | "lunch" | "dinner";

interface DietsViewProps {
  recipes: Recipe[];
  onOpenRecipes: () => void;
  onOpenCalendar: () => void;
}

const CATEGORIES: Array<{
  id: "all" | DietPresetCategory;
  label: string;
}> = [
  { id: "all", label: "Todas" },
  { id: "equilibrada", label: "Equilibradas" },
  { id: "vegetal", label: "Vegetales" },
  { id: "bajo-carbohidrato", label: "Bajo carb." },
  { id: "objetivo", label: "Objetivos" },
];

const MEAL_TYPES: Array<{ id: MealType; label: string }> = [
  { id: "breakfast", label: "Desayuno" },
  { id: "lunch", label: "Almuerzo" },
  { id: "dinner", label: "Cena" },
];

export default function DietsView({
  recipes,
  onOpenRecipes,
  onOpenCalendar,
}: DietsViewProps) {
  const householdId = useHouseholdId();
  const toast = useToast();
  const [expandedRecipes, setExpandedRecipes] = useState<ExpandedRecipe[]>([]);
  const [regionalRecipes, setRegionalRecipes] = useState<RegionalRecipe[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [preferences, setPreferences] = useState<DietaryPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<"all" | DietPresetCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mealTypes, setMealTypes] = useState<MealType[]>([
    "breakfast",
    "lunch",
    "dinner",
  ]);
  const [maxDifficulty, setMaxDifficulty] = useState<RecipeDifficulty | "">(
    "media",
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      import("@/data/expanded-recipes"),
      import("@/data/regional-colombian-recipes"),
    ]).then(([expanded, regional]) => {
      if (!mounted) return;
      setExpandedRecipes(expanded.expandedRecipes);
      setRegionalRecipes(regional.regionalRecipes);
      setCatalogLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!householdId) {
      setLoadingPreferences(false);
      return;
    }
    supabase
      .from("households")
      .select("dietary_preferences")
      .eq("id", householdId)
      .single()
      .then(({ data }) => {
        if (!mounted) return;
        const current =
          (data?.dietary_preferences as DietaryPreferences | null) ?? null;
        setPreferences(current);
        setSelectedId(current?.meal_plan?.preset_id ?? null);
        setMealTypes(
          current?.meal_plan?.meal_types?.length
            ? [...current.meal_plan.meal_types]
            : ["breakfast", "lunch", "dinner"],
        );
        setMaxDifficulty(current?.meal_plan?.max_difficulty ?? "media");
        setLoadingPreferences(false);
      });
    return () => {
      mounted = false;
    };
  }, [householdId]);

  const allRecipes = useMemo(
    () => mergeRecipeCatalog(recipes, expandedRecipes, regionalRecipes),
    [recipes, expandedRecipes, regionalRecipes],
  );

  const summaries = useMemo(() => {
    return new Map(
      DIET_PRESETS.map((preset) => [
        preset.id,
        summarizeDietCompatibility(
          allRecipes,
          buildPreferencesForDietPreset(preset, preferences, {
            meal_types: preset.plan.meal_types?.length
              ? [...preset.plan.meal_types]
              : ["breakfast", "lunch", "dinner"],
          }),
        ),
      ]),
    );
  }, [allRecipes, preferences]);

  const selectedPreset = getDietPreset(selectedId);
  const previewPreferences = useMemo(() => {
    if (!selectedPreset) return null;
    return buildPreferencesForDietPreset(selectedPreset, preferences, {
      meal_types: mealTypes,
      max_difficulty: maxDifficulty || undefined,
    });
  }, [selectedPreset, preferences, mealTypes, maxDifficulty]);
  const previewSummary = useMemo(
    () =>
      previewPreferences
        ? summarizeDietCompatibility(allRecipes, previewPreferences)
        : null,
    [allRecipes, previewPreferences],
  );

  const visiblePresets = DIET_PRESETS.filter(
    (preset) => category === "all" || preset.category === category,
  );
  const activePreset = getDietPreset(preferences?.meal_plan?.preset_id);

  function selectPreset(preset: DietPreset) {
    setSelectedId(preset.id);
    setMealTypes(
      preset.plan.meal_types?.length
        ? [...preset.plan.meal_types]
        : ["breakfast", "lunch", "dinner"],
    );
    setMaxDifficulty(preset.plan.max_difficulty ?? "media");
  }

  function toggleMealType(mealType: MealType) {
    setMealTypes((current) => {
      if (current.includes(mealType)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== mealType);
      }
      return [...current, mealType];
    });
  }

  async function applySelectedPreset() {
    if (!selectedPreset || !householdId || !previewPreferences) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("households")
        .update({ dietary_preferences: previewPreferences })
        .eq("id", householdId);
      if (error) throw error;
      setPreferences(previewPreferences);
      toast.success(`${selectedPreset.name} quedó activa en el Recetario`);
    } catch (error) {
      console.error("Error saving diet preset", error);
      toast.error("No se pudo guardar la dieta");
    } finally {
      setSaving(false);
    }
  }

  if (catalogLoading || loadingPreferences) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" color="green" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 pb-28">
      <section className="overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Dietas y objetivos
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              Tu recetario se adapta a ti
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Elige una forma de comer y sabrás cuántas recetas son aptas antes de guardar el plan.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles size={20} className="text-emerald-300" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-300" />
            <p className="text-xs font-semibold">
              {activePreset ? `Plan activo: ${activePreset.name}` : "Todavía no hay una dieta activa"}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Las alergias e ingredientes evitados siempre se conservan al cambiar de plan.
          </p>
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              category === item.id
                ? "bg-emerald-800 text-white"
                : "border border-stone-200 bg-white text-stone-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {visiblePresets.map((preset) => {
          const summary = summaries.get(preset.id);
          const isSelected = selectedId === preset.id;
          const isActive = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset)}
              aria-pressed={isSelected}
              className={`relative overflow-hidden rounded-2xl border p-3 text-left transition-all ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                  : "border-stone-200 bg-white"
              }`}
            >
              {isActive && (
                <span className="absolute right-2 top-2 rounded-full bg-emerald-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Activa
                </span>
              )}
              <span className="text-2xl">{preset.emoji}</span>
              <p className="mt-2 pr-7 text-[13px] font-semibold leading-tight text-slate-900">
                {preset.shortName}
              </p>
              <p className="mt-2 text-[11px] font-semibold text-emerald-700 tabular-nums">
                {summary?.compatible ?? 0} recetas aptas
              </p>
              <p className="mt-0.5 text-[10px] text-stone-400 tabular-nums">
                {summary?.review ?? 0} por revisar
              </p>
            </button>
          );
        })}
      </div>

      {selectedPreset && previewSummary && (
        <section className="mt-5 overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-sm">
          <div className={`bg-gradient-to-r ${selectedPreset.color} p-5 text-white`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl">{selectedPreset.emoji}</p>
                <h2 className="mt-2 text-xl font-semibold">{selectedPreset.name}</h2>
              </div>
              <Check className="mt-1 rounded-full bg-white/15 p-1" size={28} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              {selectedPreset.description}
            </p>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              <Metric value={previewSummary.compatible} label="Aptas" tone="emerald" />
              <Metric value={previewSummary.review} label="Revisar" tone="amber" />
              <Metric value={previewSummary.incompatible} label="Fuera" tone="stone" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="font-semibold text-emerald-900">Incluye</p>
                <ul className="mt-2 space-y-1 text-emerald-800">
                  {selectedPreset.includes.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="font-semibold text-rose-900">Limita</p>
                <ul className="mt-2 space-y-1 text-rose-800">
                  {selectedPreset.limits.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CalendarDays size={15} /> ¿En qué horarios?
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MEAL_TYPES.map((item) => {
                  const active = mealTypes.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleMealType(item.id)}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                        active
                          ? "border-violet-500 bg-violet-50 text-violet-800"
                          : "border-stone-200 text-stone-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-900">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={15} /> Dificultad máxima
              </span>
              <div className="relative mt-2">
                <select
                  value={maxDifficulty}
                  onChange={(event) =>
                    setMaxDifficulty(event.target.value as RecipeDifficulty | "")
                  }
                  className="w-full appearance-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-normal text-slate-700"
                >
                  <option value="fácil">Solo fáciles</option>
                  <option value="media">Fáciles y medias</option>
                  <option value="">Sin límite</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 text-stone-400" size={15} />
              </div>
            </label>

            {selectedPreset.caution && (
              <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <p>{selectedPreset.caution}</p>
              </div>
            )}

            <p className="mt-4 text-[10.5px] leading-relaxed text-stone-500">
              Esta función organiza recetas; no diagnostica ni reemplaza indicaciones de nutrición o medicina.
            </p>

            <button
              type="button"
              onClick={applySelectedPreset}
              disabled={saving || !householdId}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Spinner size="sm" /> : <Check size={16} />}
              {activePreset?.id === selectedPreset.id ? "Actualizar esta dieta" : "Usar esta dieta"}
            </button>

            {activePreset?.id === selectedPreset.id && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenRecipes}
                  className="flex items-center justify-center gap-1 rounded-xl border border-emerald-200 px-3 py-2.5 text-xs font-semibold text-emerald-800"
                >
                  Ver recetas <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={onOpenCalendar}
                  className="flex items-center justify-center gap-1 rounded-xl border border-violet-200 px-3 py-2.5 text-xs font-semibold text-violet-800"
                >
                  Menú semanal <CalendarDays size={13} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "emerald" | "amber" | "stone";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    stone: "bg-stone-100 text-stone-700",
  }[tone];
  return (
    <div className={`rounded-xl p-2.5 text-center ${colors}`}>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
    </div>
  );
}
