"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { DietaryPreferences } from "@/types";

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
