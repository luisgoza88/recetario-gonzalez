"use client";

import { DIETARY_PREFERENCES } from "../constants";

interface DietaryStepProps {
  dietaryPreferences: string[];
  toggleDietary: (id: string) => void;
  allergies: string;
  setAllergies: (allergies: string) => void;
}

export function DietaryStep({
  dietaryPreferences,
  toggleDietary,
  allergies,
  setAllergies,
}: DietaryStepProps) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Preferencias alimentarias
      </h2>
      <p className="text-gray-600 mb-6">
        ¿Tienen restricciones o preferencias especiales?
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {DIETARY_PREFERENCES.map((pref) => (
          <button
            key={pref.id}
            onClick={() => toggleDietary(pref.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              dietaryPreferences.includes(pref.id)
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-2xl mb-2">{pref.icon}</div>
            <h3 className="font-medium text-gray-800 text-sm">{pref.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{pref.description}</p>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alergias específicas (opcional)
        </label>
        <input
          type="text"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Ej: nueces, mariscos, huevo..."
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <p className="text-xs text-gray-500 mt-2">
          Separa con comas si hay varias
        </p>
      </div>
    </div>
  );
}
