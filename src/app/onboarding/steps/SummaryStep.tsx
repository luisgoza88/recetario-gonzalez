"use client";

import { Sparkles } from "lucide-react";
import type { ProfileType, SpaceConfig, EmployeeConfig } from "../types";
import {
  DIETARY_PREFERENCES,
  CUISINE_TEMPLATES,
  GOAL_OPTIONS,
} from "../constants";

interface SummaryStepProps {
  householdName: string;
  membersCount: number;
  selectedCuisine: string;
  dietaryPreferences: string[];
  selectedGoals: string[];
  profileType: ProfileType;
  spaces: SpaceConfig[];
  employees: EmployeeConfig[];
}

export function SummaryStep({
  householdName,
  membersCount,
  selectedCuisine,
  dietaryPreferences,
  selectedGoals,
  profileType,
  spaces,
  employees,
}: SummaryStepProps) {
  const selectedCuisineData = CUISINE_TEMPLATES.find(
    (c) => c.id === selectedCuisine,
  );
  const selectedDietaryNames = dietaryPreferences
    .map((id) => DIETARY_PREFERENCES.find((d) => d.id === id)?.name)
    .filter(Boolean);
  const selectedGoalNames = selectedGoals
    .map((id) => GOAL_OPTIONS.find((g) => g.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Resumen</h2>
      <p className="text-gray-600 mb-6">Confirma tu configuración</p>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Hogar</h3>
          <p className="font-semibold text-gray-800">{householdName}</p>
          <p className="text-sm text-gray-600">{membersCount} personas</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Estilo de cocina
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedCuisineData?.flag}</span>
            <span className="font-semibold text-gray-800">
              {selectedCuisineData?.name}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Preferencias dietéticas
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedDietaryNames.map((name, i) => (
              <span
                key={i}
                className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Objetivos</h3>
          <div className="flex flex-wrap gap-2">
            {selectedGoalNames.map((name, i) => (
              <span
                key={i}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {profileType === "admin" && (
          <>
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Espacios
              </h3>
              <p className="text-gray-800">
                {spaces.filter((s) => s.selected).length} espacios seleccionados
              </p>
            </div>

            {employees.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Empleados
                </h3>
                <p className="text-gray-800">
                  {employees.length} empleado(s) registrado(s)
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 bg-green-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-green-800">
              ¡Todo listo para empezar!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Recibirás recetas personalizadas, lista de compras inteligente y
              sugerencias de IA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
