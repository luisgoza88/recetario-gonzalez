"use client";

import { Camera, Loader2, Sparkles, Upload, Wand2, X } from "lucide-react";
import { RecipeFormAction, RecipeFormState } from "@/hooks/useRecipeForm";

interface RecipeAIPanelProps {
  state: Pick<
    RecipeFormState,
    "showAIPanel" | "aiLoading" | "aiDescription" | "aiImagePreview" | "aiError"
  >;
  dispatch: React.Dispatch<RecipeFormAction>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onGenerate: () => void;
}

export function RecipeAIPanel({
  state,
  dispatch,
  cameraInputRef,
  fileInputRef,
  onImageCapture,
  onClearImage,
  onGenerate,
}: RecipeAIPanelProps) {
  const set = (
    field: keyof RecipeFormState,
    value: RecipeFormState[keyof RecipeFormState],
  ) => dispatch({ type: "set_field", field, value });

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => set("showAIPanel", !state.showAIPanel)}
        className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
          state.showAIPanel
            ? "bg-purple-600 text-white"
            : "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-indigo-100"
        }`}
      >
        <Sparkles size={18} />
        {state.showAIPanel ? "Ocultar asistente IA" : "Generar con IA"}
      </button>

      {state.showAIPanel && (
        <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
          <p className="text-sm text-purple-700 mb-3">
            Sube una foto de un plato o describe lo que quieres cocinar y la IA
            generara la receta completa.
          </p>

          {state.aiError && (
            <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
              {state.aiError}
            </div>
          )}

          {state.aiImagePreview && (
            <div className="mb-3 relative">
              <img
                src={state.aiImagePreview}
                alt="Preview"
                className="w-full h-40 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={onClearImage}
                className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow"
                aria-label="Eliminar imagen"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {!state.aiImagePreview && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 bg-white rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-100 text-sm"
              >
                <Camera size={16} />
                Tomar foto
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 bg-white rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-100 text-sm"
              >
                <Upload size={16} />
                Subir imagen
              </button>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onImageCapture}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onImageCapture}
            className="hidden"
          />

          <div className="mb-3">
            <input
              type="text"
              value={state.aiDescription}
              onChange={(e) => set("aiDescription", e.target.value)}
              placeholder="Ej: Arroz con pollo colombiano, Pasta carbonara..."
              className="w-full p-3 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={
              state.aiLoading || (!state.aiDescription && !state.aiImagePreview)
            }
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.aiLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generando receta...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Generar receta
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
