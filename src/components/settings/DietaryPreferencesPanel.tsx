"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type {
  CarbTarget,
  DietaryIngredientGroup,
  DietaryMealPlan,
  DietaryPreferences,
  RecipeDifficulty,
} from "@/types";
import {
  CARB_TARGET_OPTIONS,
  DIETARY_GROUP_OPTIONS,
} from "@/lib/recipe-diet";

// =====================================================
// Constants
// =====================================================

const RESTRICTION_OPTIONS = [
  { id: "vegetariano", label: "Vegetariano", icon: "🥬" },
  { id: "vegano", label: "Vegano", icon: "🌱" },
  { id: "sin-gluten", label: "Sin gluten", icon: "🌾" },
  { id: "sin-lactosa", label: "Sin lactosa", icon: "🥛" },
  { id: "halal", label: "Halal", icon: "☪️" },
  { id: "kosher", label: "Kosher", icon: "✡️" },
];

const ALLERGY_OPTIONS = [
  { id: "maní", label: "Maní", icon: "🥜" },
  { id: "nueces", label: "Nueces", icon: "🌰" },
  { id: "mariscos", label: "Mariscos", icon: "🦐" },
  { id: "huevos", label: "Huevos", icon: "🥚" },
  { id: "soya", label: "Soya", icon: "🫘" },
  { id: "lácteos", label: "Lácteos", icon: "🧀" },
  { id: "trigo", label: "Trigo", icon: "🌾" },
];

const PREFERENCE_OPTIONS = [
  { id: "bajo-carbohidrato", label: "Bajo carbohidrato", icon: "🍞" },
  { id: "alto-proteina", label: "Alto proteína", icon: "💪" },
  { id: "bajo-sodio", label: "Bajo sodio", icon: "🧂" },
  { id: "bajo-azucar", label: "Bajo azúcar", icon: "🍬" },
  { id: "keto", label: "Keto", icon: "🥑" },
  { id: "paleo", label: "Paleo", icon: "🍖" },
];

// =====================================================
// Component
// =====================================================

interface DietaryPreferencesPanelProps {
  householdId: string;
  onBack: () => void;
}

export default function DietaryPreferencesPanel({
  householdId,
  onBack,
}: DietaryPreferencesPanelProps) {
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State for each category
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [avoidIngredients, setAvoidIngredients] = useState<string[]>([]);
  const [allowedGroups, setAllowedGroups] = useState<
    DietaryIngredientGroup[]
  >([]);
  const [excludedGroups, setExcludedGroups] = useState<
    DietaryIngredientGroup[]
  >([]);
  const [carbTarget, setCarbTarget] =
    useState<CarbTarget>("sin-limite");
  const [mealTypes, setMealTypes] = useState<
    Array<"breakfast" | "lunch" | "dinner">
  >([]);
  const [maxDifficulty, setMaxDifficulty] = useState<
    RecipeDifficulty | ""
  >("");
  const [maxTotalTime, setMaxTotalTime] = useState<number | "">("");
  const [colombiaEasyOnly, setColombiaEasyOnly] = useState(false);

  // Input states for custom entries
  const [customAllergyInput, setCustomAllergyInput] = useState("");
  const [avoidIngredientInput, setAvoidIngredientInput] = useState("");

  // =====================================================
  // Load data
  // =====================================================

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("households")
        .select("dietary_preferences")
        .eq("id", householdId)
        .single();

      if (error) throw error;

      const prefs = data?.dietary_preferences as DietaryPreferences | null;
      if (prefs) {
        setRestrictions(prefs.restrictions || []);
        setAllergies(prefs.allergies || []);
        setPreferences(prefs.preferences || []);
        setAvoidIngredients(prefs.avoid_ingredients || []);
        setAllowedGroups(prefs.meal_plan?.allowed_groups || []);
        setExcludedGroups(prefs.meal_plan?.excluded_groups || []);
        setCarbTarget(prefs.meal_plan?.carb_target || "sin-limite");
        setMealTypes(prefs.meal_plan?.meal_types || []);
        setMaxDifficulty(prefs.meal_plan?.max_difficulty || "");
        setMaxTotalTime(prefs.meal_plan?.max_total_time || "");
        setColombiaEasyOnly(prefs.meal_plan?.colombia_easy_only || false);
      }
    } catch (err) {
      console.error("Error loading dietary preferences:", err);
      toast.error("Error al cargar las preferencias");
    } finally {
      setIsLoading(false);
    }
  }, [householdId, toast]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // =====================================================
  // Toggle helpers
  // =====================================================

  function toggleItem(
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  }

  // =====================================================
  // Add tag helpers
  // =====================================================

  function addCustomAllergy() {
    const trimmed = customAllergyInput.trim();
    if (!trimmed) return;
    if (!allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
    }
    setCustomAllergyInput("");
  }

  function addAvoidIngredient() {
    const trimmed = avoidIngredientInput.trim();
    if (!trimmed) return;
    if (!avoidIngredients.includes(trimmed)) {
      setAvoidIngredients([...avoidIngredients, trimmed]);
    }
    setAvoidIngredientInput("");
  }

  function removeTag(
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) {
    setList(list.filter((i) => i !== item));
  }

  function cycleIngredientGroup(group: DietaryIngredientGroup) {
    if (allowedGroups.includes(group)) {
      setAllowedGroups(allowedGroups.filter((item) => item !== group));
      setExcludedGroups([...excludedGroups, group]);
      return;
    }
    if (excludedGroups.includes(group)) {
      setExcludedGroups(excludedGroups.filter((item) => item !== group));
      return;
    }
    setAllowedGroups([...allowedGroups, group]);
  }

  function applyChickenFishPreset() {
    setAllowedGroups(["pollo-aves", "pescado", "verduras"]);
    setExcludedGroups([]);
    setCarbTarget("muy-bajo");
    setMealTypes(["lunch", "dinner"]);
    setMaxDifficulty("media");
    setMaxTotalTime(60);
    setColombiaEasyOnly(true);
  }

  // =====================================================
  // Save
  // =====================================================

  async function handleSave() {
    setIsSaving(true);
    try {
      const dietaryPreferences: DietaryPreferences = {
        restrictions,
        allergies,
        preferences,
        avoid_ingredients: avoidIngredients,
        meal_plan: {
          preset_id:
            allowedGroups.length === 3 &&
            allowedGroups.includes("pollo-aves") &&
            allowedGroups.includes("pescado") &&
            allowedGroups.includes("verduras") &&
            carbTarget === "muy-bajo"
              ? "pollo-pescado-verduras"
              : "personalizado",
          preset_name:
            allowedGroups.length === 3 &&
            allowedGroups.includes("pollo-aves") &&
            allowedGroups.includes("pescado") &&
            allowedGroups.includes("verduras") &&
            carbTarget === "muy-bajo"
              ? "Pollo, pescado y verduras"
              : "Plan personalizado",
          allowed_groups: allowedGroups,
          excluded_groups: excludedGroups,
          required_any_groups:
            allowedGroups.includes("pollo-aves") &&
            allowedGroups.includes("pescado")
              ? ["pollo-aves", "pescado"]
              : undefined,
          carb_target: carbTarget,
          meal_types: mealTypes,
          max_difficulty: maxDifficulty || undefined,
          max_total_time: maxTotalTime || undefined,
          colombia_easy_only: colombiaEasyOnly,
        } satisfies DietaryMealPlan,
      };

      const { error } = await supabase
        .from("households")
        .update({ dietary_preferences: dietaryPreferences })
        .eq("id", householdId);

      if (error) throw error;

      toast.success("Preferencias dietéticas guardadas");
    } catch (err) {
      console.error("Error saving dietary preferences:", err);
      toast.error("Error al guardar las preferencias");
    } finally {
      setIsSaving(false);
    }
  }

  // =====================================================
  // Render
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" color="green" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Preferencias Dietéticas
          </h1>
          <p className="text-sm text-gray-500">
            Configura restricciones y preferencias alimentarias del hogar
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ─── Restricciones alimentarias ─── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Restricciones alimentarias
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {RESTRICTION_OPTIONS.map((opt) => {
              const active = restrictions.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    toggleItem(restrictions, setRestrictions, opt.id)
                  }
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
                    active
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Alergias ─── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Alergias
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {ALLERGY_OPTIONS.map((opt) => {
              const active = allergies.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleItem(allergies, setAllergies, opt.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
                    active
                      ? "border-red-400 bg-red-50 text-red-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom allergy input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customAllergyInput}
              onChange={(e) => setCustomAllergyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomAllergy();
                }
              }}
              placeholder="Agregar otra alergia..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
            <button
              onClick={addCustomAllergy}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Show custom allergies as tags (only those not in the predefined list) */}
          {allergies.filter((a) => !ALLERGY_OPTIONS.some((o) => o.id === a))
            .length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {allergies
                .filter((a) => !ALLERGY_OPTIONS.some((o) => o.id === a))
                .map((allergy) => (
                  <span
                    key={allergy}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                  >
                    {allergy}
                    <button
                      onClick={() =>
                        removeTag(allergies, setAllergies, allergy)
                      }
                      className="hover:bg-red-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </section>

        {/* ─── Preferencias ─── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Preferencias nutricionales
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {PREFERENCE_OPTIONS.map((opt) => {
              const active = preferences.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    toggleItem(preferences, setPreferences, opt.id)
                  }
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
                    active
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Plan alimentario automático ─── */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">
                Plan alimentario automático
              </h2>
              <p className="text-xs text-emerald-800/80 mt-1">
                El Recetario contará las recetas aptas y aplicará estas reglas al
                generar el menú semanal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={applyChickenFishPreset}
            className="w-full mb-5 px-3 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
          >
            Usar: pollo, pescado y verduras · muy bajo en carbohidratos
          </button>

          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Grupos de ingredientes
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Toca una vez para permitir, dos para excluir y tres para dejar sin
              regla. Si permites grupos, los demás grupos principales no entran.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DIETARY_GROUP_OPTIONS.map((group) => {
                const isAllowed = allowedGroups.includes(group.id);
                const isExcluded = excludedGroups.includes(group.id);
                const stateLabel = isAllowed
                  ? "Permitido"
                  : isExcluded
                    ? "Excluido"
                    : "Sin regla";
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => cycleIngredientGroup(group.id)}
                    aria-label={`${group.label}: ${stateLabel}`}
                    className={`rounded-xl border p-2.5 text-left transition-colors ${
                      isAllowed
                        ? "border-emerald-500 bg-white text-emerald-900"
                        : isExcluded
                          ? "border-red-400 bg-red-50 text-red-800"
                          : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span>{group.icon}</span>
                      <span>{group.label}</span>
                    </span>
                    <span
                      className={`block mt-1 text-[10px] font-semibold uppercase tracking-wide ${
                        isAllowed
                          ? "text-emerald-600"
                          : isExcluded
                            ? "text-red-500"
                            : "text-gray-400"
                      }`}
                    >
                      {stateLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Carbohidratos por porción
            </h3>
            <div className="space-y-2">
              {CARB_TARGET_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCarbTarget(option.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    carbTarget === option.id
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs opacity-75">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Horarios del plan
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              Sin selección se aplica a todos los horarios.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["breakfast", "Desayuno"],
                ["lunch", "Almuerzo"],
                ["dinner", "Cena"],
              ].map(([id, label]) => {
                const mealType = id as "breakfast" | "lunch" | "dinner";
                const active = mealTypes.includes(mealType);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setMealTypes(
                        active
                          ? mealTypes.filter((item) => item !== mealType)
                          : [...mealTypes, mealType],
                      )
                    }
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                      active
                        ? "border-violet-500 bg-violet-50 text-violet-800"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="text-xs font-semibold text-gray-700">
              Dificultad máxima
              <select
                value={maxDifficulty}
                onChange={(event) =>
                  setMaxDifficulty(event.target.value as RecipeDifficulty | "")
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal"
              >
                <option value="">Sin límite</option>
                <option value="fácil">Fácil</option>
                <option value="media">Media</option>
                <option value="difícil">Difícil</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Tiempo máximo
              <select
                value={maxTotalTime}
                onChange={(event) =>
                  setMaxTotalTime(
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal"
              >
                <option value="">Sin límite</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
                <option value="90">90 minutos</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={colombiaEasyOnly}
              onChange={(event) => setColombiaEasyOnly(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-700"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800">
                Ingredientes fáciles de conseguir en Colombia
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Excluye recetas con ingredientes especializados o de oferta muy
                variable.
              </span>
            </span>
          </label>
        </section>

        {/* ─── Ingredientes a evitar ─── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ingredientes a evitar
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Agrega ingredientes específicos que no quieres en tus recetas
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={avoidIngredientInput}
              onChange={(e) => setAvoidIngredientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAvoidIngredient();
                }
              }}
              placeholder="Ej: cilantro, hígado, coco..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
            <button
              onClick={addAvoidIngredient}
              className="px-3 py-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {avoidIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {avoidIngredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                >
                  {ingredient}
                  <button
                    onClick={() =>
                      removeTag(
                        avoidIngredients,
                        setAvoidIngredients,
                        ingredient,
                      )
                    }
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Save button - fixed at bottom */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Spinner size="md" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar preferencias
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
