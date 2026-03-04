"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Loader2, MapPin, ChefHat } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { CookingProfile } from "@/types";

// =====================================================
// Constants
// =====================================================

const REGION_OPTIONS = [
  { id: "Andina", label: "Andina" },
  { id: "Costa Caribe", label: "Costa Caribe" },
  { id: "Pacífico", label: "Pacífico" },
  { id: "Llanos", label: "Llanos" },
  { id: "Santander", label: "Santander" },
  { id: "Valle del Cauca", label: "Valle del Cauca" },
  { id: "Tolima-Huila", label: "Tolima-Huila" },
];

const DEFAULT_VALUES: Required<CookingProfile> = {
  city: "Medellín",
  region: "Andina",
  country: "Colombia",
  cooking_style: "colombiana casera con variaciones internacionales",
  family_name: "",
  family_size: 2,
  portions_config: {},
};

// =====================================================
// Component
// =====================================================

interface CookingProfilePanelProps {
  householdId: string;
  onBack: () => void;
}

export default function CookingProfilePanel({
  householdId,
  onBack,
}: CookingProfilePanelProps) {
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [city, setCity] = useState(DEFAULT_VALUES.city);
  const [region, setRegion] = useState(DEFAULT_VALUES.region);
  const [country, setCountry] = useState(DEFAULT_VALUES.country);
  const [cookingStyle, setCookingStyle] = useState(
    DEFAULT_VALUES.cooking_style,
  );
  const [familyName, setFamilyName] = useState(DEFAULT_VALUES.family_name);
  const [familySize, setFamilySize] = useState(DEFAULT_VALUES.family_size);

  // =====================================================
  // Load data
  // =====================================================

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("households")
        .select("cooking_profile, name")
        .eq("id", householdId)
        .single();

      if (error) {
        toast.error("Error al cargar el perfil de cocina");
        return;
      }

      const profile = (data?.cooking_profile as CookingProfile) || {};

      setCity(profile.city || DEFAULT_VALUES.city);
      setRegion(profile.region || DEFAULT_VALUES.region);
      setCountry(profile.country || DEFAULT_VALUES.country);
      setCookingStyle(profile.cooking_style || DEFAULT_VALUES.cooking_style);
      setFamilyName(profile.family_name || "");
      setFamilySize(profile.family_size ?? DEFAULT_VALUES.family_size);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [householdId, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // =====================================================
  // Save
  // =====================================================

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newProfile: CookingProfile = {
        city: city.trim() || DEFAULT_VALUES.city,
        region,
        country: country.trim() || DEFAULT_VALUES.country,
        cooking_style: cookingStyle.trim() || DEFAULT_VALUES.cooking_style,
        family_name: familyName.trim() || undefined,
        family_size: familySize,
      };

      const { error } = await supabase
        .from("households")
        .update({
          cooking_profile: newProfile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", householdId);

      if (error) {
        toast.error("Error al guardar el perfil de cocina");
        return;
      }

      toast.success("Perfil de cocina actualizado");
      setHasChanges(false);
    } catch {
      toast.error("Error de conexión al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  // Track changes
  const markChanged = () => setHasChanges(true);

  // =====================================================
  // Render
  // =====================================================

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Perfil de Cocina</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Perfil de Cocina
            </h1>
            <p className="text-sm text-gray-500">
              Personaliza la IA para tu hogar
            </p>
          </div>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Guardar
          </button>
        )}
      </div>

      {/* Nombre de Familia */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">
          NOMBRE DE FAMILIA (OPCIONAL)
        </p>
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">
            La IA usará este nombre en los prompts y respuestas.
          </p>
          <input
            type="text"
            value={familyName}
            onChange={(e) => {
              setFamilyName(e.target.value);
              markChanged();
            }}
            placeholder="Ej: Familia González, Mi Casa..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Miembros del hogar */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1">
          MIEMBROS DEL HOGAR
        </p>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Cantidad de personas que comen
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFamilySize(Math.max(1, familySize - 1));
                  markChanged();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-lg font-bold"
              >
                -
              </button>
              <span className="text-xl font-bold text-green-600 w-8 text-center">
                {familySize}
              </span>
              <button
                onClick={() => {
                  setFamilySize(Math.min(20, familySize + 1));
                  markChanged();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ubicación */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1 flex items-center gap-1">
          <MapPin size={14} />
          UBICACIÓN
        </p>
        <div className="bg-white rounded-xl p-4 space-y-4">
          {/* Ciudad */}
          <div>
            <label className="text-sm text-gray-600 block mb-1">Ciudad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                markChanged();
              }}
              placeholder="Ej: Medellín, Bogotá, Cali..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Región */}
          <div>
            <label className="text-sm text-gray-600 block mb-1">Región</label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                markChanged();
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* País */}
          <div>
            <label className="text-sm text-gray-600 block mb-1">País</label>
            <input
              type="text"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                markChanged();
              }}
              placeholder="Ej: Colombia"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Estilo de Cocina */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2 px-1 flex items-center gap-1">
          <ChefHat size={14} />
          ESTILO DE COCINA
        </p>
        <div className="bg-white rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-2">
            Describe el estilo de cocina que prefieres. La IA adaptará las
            recetas a este estilo.
          </p>
          <textarea
            value={cookingStyle}
            onChange={(e) => {
              setCookingStyle(e.target.value);
              markChanged();
            }}
            placeholder="Ej: colombiana casera con variaciones internacionales"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "colombiana casera",
              "saludable y ligera",
              "internacional variada",
              "mediterránea",
              "fitness / alta proteína",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setCookingStyle(suggestion);
                  markChanged();
                }}
                className="text-xs px-3 py-1 bg-gray-100 rounded-full hover:bg-green-100 hover:text-green-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save button (sticky bottom) */}
      {hasChanges && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Guardar cambios
          </button>
        </div>
      )}
    </div>
  );
}
