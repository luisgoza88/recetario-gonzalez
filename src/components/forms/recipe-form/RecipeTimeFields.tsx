"use client";

import { Clock } from "lucide-react";
import { RecipeFormAction, RecipeFormState } from "@/hooks/useRecipeForm";

interface RecipeTimeFieldsProps {
  state: Pick<
    RecipeFormState,
    "prepTime" | "cookTime" | "totalTime" | "totalTimeManual"
  >;
  dispatch: React.Dispatch<RecipeFormAction>;
}

export function RecipeTimeFields({ state, dispatch }: RecipeTimeFieldsProps) {
  const set = (
    field: keyof RecipeFormState,
    value: RecipeFormState[keyof RecipeFormState],
  ) => dispatch({ type: "set_field", field, value });

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
        <Clock size={14} />
        Tiempos
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Prep (min)</label>
          <input
            type="number"
            min={0}
            value={state.prepTime}
            onChange={(e) =>
              set(
                "prepTime",
                e.target.value === "" ? "" : parseInt(e.target.value),
              )
            }
            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="15"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Coccion (min)
          </label>
          <input
            type="number"
            min={0}
            value={state.cookTime}
            onChange={(e) =>
              set(
                "cookTime",
                e.target.value === "" ? "" : parseInt(e.target.value),
              )
            }
            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="30"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
            Total (min)
            <button
              type="button"
              onClick={() => {
                const next = !state.totalTimeManual;
                set("totalTimeManual", next);
                if (!next) {
                  // switching back to auto
                  const prep =
                    typeof state.prepTime === "number" ? state.prepTime : 0;
                  const cook =
                    typeof state.cookTime === "number" ? state.cookTime : 0;
                  if (prep > 0 || cook > 0) set("totalTime", prep + cook);
                }
              }}
              className="text-[10px] text-green-700 hover:underline"
              title={
                state.totalTimeManual
                  ? "Volver a auto-calcular"
                  : "Editar manualmente"
              }
            >
              {state.totalTimeManual ? "(auto)" : "(editar)"}
            </button>
          </label>
          <input
            type="number"
            min={0}
            value={state.totalTime}
            onChange={(e) => {
              set("totalTimeManual", true);
              set(
                "totalTime",
                e.target.value === "" ? "" : parseInt(e.target.value),
              );
            }}
            disabled={!state.totalTimeManual}
            className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 ${
              state.totalTimeManual
                ? "border-gray-200 bg-white"
                : "border-gray-100 bg-gray-50 text-gray-500"
            }`}
            placeholder="45"
          />
        </div>
      </div>
    </div>
  );
}
