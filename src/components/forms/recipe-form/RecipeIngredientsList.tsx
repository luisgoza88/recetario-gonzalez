"use client";

import { Plus, Trash2 } from "lucide-react";
import { Ingredient } from "@/types";
import { RecipeFormAction, RecipeFormState } from "@/hooks/useRecipeForm";
import { ingredientPortions, portionLabel } from "@/lib/portions";
import { usePortionsConfig } from "@/lib/stores/useHouseholdStore";

interface RecipeIngredientsListProps {
  state: Pick<RecipeFormState, "ingredients" | "errors" | "memberKeys">;
  dispatch: React.Dispatch<RecipeFormAction>;
}

export function RecipeIngredientsList({
  state,
  dispatch,
}: RecipeIngredientsListProps) {
  const portionsConfig = usePortionsConfig();

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Ingredientes *</label>
      {state.errors.ingredients && (
        <p className="text-red-500 text-xs mb-2">{state.errors.ingredients}</p>
      )}

      {state.ingredients.map((ing: Ingredient, index: number) => (
        <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
          {/* Row 1: Name + Delete */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={ing.name}
              onChange={(e) =>
                dispatch({
                  type: "update_ingredient",
                  index,
                  field: "name",
                  value: e.target.value,
                })
              }
              className="flex-1 p-2 border rounded-lg text-sm bg-white"
              placeholder="Nombre del ingrediente"
            />
            <button
              type="button"
              onClick={() => dispatch({ type: "remove_ingredient", index })}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg shrink-0"
              disabled={state.ingredients.length === 1}
              aria-label="Eliminar ingrediente"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Row 2: Total + una casilla por cada miembro del hogar */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total</label>
              <input
                type="text"
                value={ing.total || ""}
                onChange={(e) =>
                  dispatch({
                    type: "update_ingredient",
                    index,
                    field: "total",
                    value: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-lg text-sm bg-white"
                placeholder="500g"
              />
            </div>
            {state.memberKeys.map((memberKey) => {
              const current = ingredientPortions(ing)[memberKey] ?? "";
              const label = portionLabel(memberKey, portionsConfig);
              return (
                <div key={memberKey}>
                  <label className="block text-xs text-gray-500 mb-1 truncate">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={current}
                    onChange={(e) =>
                      dispatch({
                        type: "update_ingredient_portion",
                        index,
                        memberKey,
                        value: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                    placeholder="300g"
                    aria-label={`Cantidad para ${label} de ${ing.name || "el ingrediente"}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => dispatch({ type: "add_ingredient" })}
        className="text-sm text-green-700 flex items-center gap-1 hover:underline"
      >
        <Plus size={16} /> Agregar ingrediente
      </button>
    </div>
  );
}
