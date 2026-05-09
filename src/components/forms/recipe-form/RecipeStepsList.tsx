"use client";

import { Plus, Trash2 } from "lucide-react";
import { RecipeFormAction, RecipeFormState } from "@/hooks/useRecipeForm";

interface RecipeStepsListProps {
  state: Pick<RecipeFormState, "steps" | "errors">;
  dispatch: React.Dispatch<RecipeFormAction>;
}

export function RecipeStepsList({ state, dispatch }: RecipeStepsListProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Pasos *</label>
      {state.errors.steps && (
        <p className="text-red-500 text-xs mb-2">{state.errors.steps}</p>
      )}

      {state.steps.map((step: string, index: number) => (
        <div key={index} className="flex gap-2 mb-2">
          <span className="text-gray-400 pt-2">{index + 1}.</span>
          <input
            type="text"
            value={step}
            onChange={(e) =>
              dispatch({ type: "update_step", index, value: e.target.value })
            }
            className="flex-1 p-2 border rounded-lg text-sm"
            placeholder={`Paso ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => dispatch({ type: "remove_step", index })}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            disabled={state.steps.length === 1}
            aria-label="Eliminar paso"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => dispatch({ type: "add_step" })}
        className="text-sm text-green-700 flex items-center gap-1 hover:underline"
      >
        <Plus size={16} /> Agregar paso
      </button>
    </div>
  );
}
