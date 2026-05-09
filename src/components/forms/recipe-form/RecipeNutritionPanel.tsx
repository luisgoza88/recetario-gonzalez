"use client";

import { ChevronDown, ChevronUp, Loader2, Zap } from "lucide-react";
import { RecipeFormAction, RecipeFormState } from "@/hooks/useRecipeForm";

interface RecipeNutritionPanelProps {
  state: Pick<
    RecipeFormState,
    | "showNutrition"
    | "nutritionCalories"
    | "nutritionProtein"
    | "nutritionCarbs"
    | "nutritionFat"
    | "aiNutritionLoading"
  >;
  dispatch: React.Dispatch<RecipeFormAction>;
  onGenerateNutrition: () => void;
}

export function RecipeNutritionPanel({
  state,
  dispatch,
  onGenerateNutrition,
}: RecipeNutritionPanelProps) {
  const set = (
    field: keyof RecipeFormState,
    value: RecipeFormState[keyof RecipeFormState],
  ) => dispatch({ type: "set_field", field, value });

  return (
    <div className="mb-5 border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => set("showNutrition", !state.showNutrition)}
        className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          Informacion Nutricional
        </span>
        {state.showNutrition ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {state.showNutrition && (
        <div className="p-3 space-y-3">
          {/* AI Estimate button */}
          <button
            type="button"
            onClick={onGenerateNutrition}
            disabled={state.aiNutritionLoading}
            className="w-full py-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:from-amber-100 hover:to-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {state.aiNutritionLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Estimando...
              </>
            ) : (
              <>
                <Zap size={16} />
                Generar nutricion con IA
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Calorias (kcal)
              </label>
              <input
                type="number"
                min={0}
                value={state.nutritionCalories}
                onChange={(e) =>
                  set(
                    "nutritionCalories",
                    e.target.value === "" ? "" : parseInt(e.target.value),
                  )
                }
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="350"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Proteina (g)
              </label>
              <input
                type="number"
                min={0}
                value={state.nutritionProtein}
                onChange={(e) =>
                  set(
                    "nutritionProtein",
                    e.target.value === "" ? "" : parseInt(e.target.value),
                  )
                }
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="25"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Carbohidratos (g)
              </label>
              <input
                type="number"
                min={0}
                value={state.nutritionCarbs}
                onChange={(e) =>
                  set(
                    "nutritionCarbs",
                    e.target.value === "" ? "" : parseInt(e.target.value),
                  )
                }
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="40"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Grasa (g)
              </label>
              <input
                type="number"
                min={0}
                value={state.nutritionFat}
                onChange={(e) =>
                  set(
                    "nutritionFat",
                    e.target.value === "" ? "" : parseInt(e.target.value),
                  )
                }
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="12"
              />
            </div>
          </div>

          {state.nutritionCalories !== "" && (
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span>
                <strong>{state.nutritionCalories}</strong> kcal
              </span>
              <span className="text-gray-300">|</span>
              <span>
                P: <strong>{state.nutritionProtein || 0}</strong>g
              </span>
              <span>
                C: <strong>{state.nutritionCarbs || 0}</strong>g
              </span>
              <span>
                G: <strong>{state.nutritionFat || 0}</strong>g
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
