"use client";

import { Recipe } from "@/types";
import ImageUpload from "../ImageUpload";
import { CanEdit } from "@/components/auth/RoleGate";
import { useToast } from "@/components/ui/Toast";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useRecipeForm } from "@/hooks/useRecipeForm";
import { RecipeBasicFields } from "./recipe-form/RecipeBasicFields";
import { RecipeTimeFields } from "./recipe-form/RecipeTimeFields";
import { RecipeIngredientsList } from "./recipe-form/RecipeIngredientsList";
import { RecipeStepsList } from "./recipe-form/RecipeStepsList";
import { RecipeNutritionPanel } from "./recipe-form/RecipeNutritionPanel";
import { RecipeAIPanel } from "./recipe-form/RecipeAIPanel";
import { X } from "lucide-react";

interface RecipeFormProps {
  recipe: Recipe | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecipeForm({
  recipe,
  onClose,
  onSuccess,
}: RecipeFormProps) {
  const toast = useToast();
  useEscapeKey(onClose);

  const {
    state,
    dispatch,
    cameraInputRef,
    fileInputRef,
    handleAIImageCapture,
    generateWithAI,
    clearAIImage,
    handleGenerateNutrition,
    handleSubmit,
  } = useRecipeForm(recipe);

  return (
    <CanEdit
      what="recipes"
      fallback={
        <div
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-2xl p-6 text-center max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-600 mb-4">
              No tienes permisos para editar recetas.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-form-modal-title"
        className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
            <h3 id="recipe-form-modal-title" className="font-semibold text-lg">
              {recipe ? "Editar Receta" : "Nueva Receta"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
              aria-label="Cerrar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) =>
              handleSubmit(e, recipe, onSuccess, () =>
                toast.error("Error al guardar la receta"),
              )
            }
            className="p-5 overflow-y-auto flex-1"
          >
            {/* AI Generation — only for new recipes */}
            {!recipe && (
              <RecipeAIPanel
                state={state}
                dispatch={dispatch}
                cameraInputRef={cameraInputRef}
                fileInputRef={fileInputRef}
                onImageCapture={handleAIImageCapture}
                onClearImage={clearAIImage}
                onGenerate={generateWithAI}
              />
            )}

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Foto de la receta
              </label>
              <ImageUpload
                currentImageUrl={state.imageUrl}
                onImageUploaded={(url) =>
                  dispatch({ type: "set_field", field: "imageUrl", value: url })
                }
              />
            </div>

            {/* Basic fields: name, description, type, category, region, difficulty, dietary tags */}
            <RecipeBasicFields state={state} dispatch={dispatch} />

            {/* Time fields: prep, cook, total */}
            <RecipeTimeFields state={state} dispatch={dispatch} />

            {/* Total a preparar */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Total a preparar
              </label>
              <input
                type="text"
                value={state.total}
                onChange={(e) =>
                  dispatch({
                    type: "set_field",
                    field: "total",
                    value: e.target.value,
                  })
                }
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="Ej: 1.3kg pechuga + 300ml salsa"
              />
            </div>

            {/* Portions */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">
                Porciones resumidas
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Porcion grande
                  </label>
                  <input
                    type="text"
                    value={state.portionsLuis}
                    onChange={(e) =>
                      dispatch({
                        type: "set_field",
                        field: "portionsLuis",
                        value: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="Ej: 300g + 2 huevos"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Porcion pequena
                  </label>
                  <input
                    type="text"
                    value={state.portionsMariana}
                    onChange={(e) =>
                      dispatch({
                        type: "set_field",
                        field: "portionsMariana",
                        value: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="Ej: 180g + 1 huevo"
                  />
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <RecipeIngredientsList state={state} dispatch={dispatch} />

            {/* Steps */}
            <RecipeStepsList state={state} dispatch={dispatch} />

            {/* Nutrition (collapsible) */}
            <RecipeNutritionPanel
              state={state}
              dispatch={dispatch}
              onGenerateNutrition={() =>
                handleGenerateNutrition(
                  (msg) => toast.error(msg),
                  (msg) => toast.success(msg),
                )
              }
            />

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={state.loading}
                className="flex-1 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {state.loading
                  ? "Guardando..."
                  : recipe
                    ? "Guardar cambios"
                    : "Crear receta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CanEdit>
  );
}
