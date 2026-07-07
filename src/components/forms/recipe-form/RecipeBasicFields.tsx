"use client";

import {
  RecipeCategory,
  ColombianRegion,
  RecipeDifficulty,
  DietaryTag,
} from "@/types";
import { RecipeFormAction, RecipeFormState } from "@/hooks/useRecipeForm";

const CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = [
  { value: "colombiana", label: "Colombiana" },
  { value: "rapida", label: "Rapida" },
  { value: "thermomix", label: "Thermomix" },
  { value: "fitness", label: "Fitness" },
  { value: "internacional", label: "Internacional" },
  { value: "meal-prep", label: "Meal Prep" },
  { value: "cena-ligera", label: "Cena Ligera" },
];

const REGION_OPTIONS: ColombianRegion[] = [
  "Andina",
  "Costa Caribe",
  "Pacífico",
  "Llanos",
  "Santander",
  "Valle del Cauca",
  "Tolima-Huila",
];

const DIFFICULTY_OPTIONS: { value: RecipeDifficulty; label: string }[] = [
  { value: "fácil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "difícil", label: "Difícil" },
];

const DIETARY_TAG_OPTIONS: { value: DietaryTag; label: string }[] = [
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin-gluten", label: "Sin Gluten" },
  { value: "sin-lactosa", label: "Sin Lactosa" },
  { value: "bajo-carbohidrato", label: "Bajo Carb" },
  { value: "alto-proteina", label: "Alto Proteína" },
];

interface RecipeBasicFieldsProps {
  state: Pick<
    RecipeFormState,
    | "name"
    | "description"
    | "type"
    | "category"
    | "region"
    | "difficulty"
    | "dietaryTags"
    | "errors"
  >;
  dispatch: React.Dispatch<RecipeFormAction>;
}

export function RecipeBasicFields({ state, dispatch }: RecipeBasicFieldsProps) {
  const set = (
    field: keyof RecipeFormState,
    value: RecipeFormState[keyof RecipeFormState],
  ) => dispatch({ type: "set_field", field, value });

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Informacion basica
      </h4>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Nombre *</label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => set("name", e.target.value)}
          className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 ${state.errors.name ? "border-red-500" : "border-gray-200"}`}
          placeholder="Ej: Pollo a la Criolla"
        />
        {state.errors.name && (
          <p className="text-red-500 text-xs mt-1">{state.errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Descripcion</label>
        <textarea
          value={state.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 text-sm resize-none"
          placeholder="Breve descripcion de la receta..."
        />
      </div>

      {/* Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Tipo *</label>
        <select
          value={state.type}
          onChange={(e) =>
            set("type", e.target.value as RecipeFormState["type"])
          }
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          <option value="breakfast">Desayuno</option>
          <option value="lunch">Almuerzo</option>
          <option value="dinner">Cena</option>
          <option value="dessert">Postre</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Categoria</label>
        <select
          value={state.category}
          onChange={(e) => {
            const val = e.target.value as RecipeCategory | "";
            set("category", val);
            if (val !== "colombiana") set("region", "");
          }}
          className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          <option value="">Seleccionar categoria...</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Region — only for colombiana */}
      {state.category === "colombiana" && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Region colombiana
          </label>
          <select
            value={state.region}
            onChange={(e) =>
              set("region", e.target.value as ColombianRegion | "")
            }
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            <option value="">Seleccionar region...</option>
            {REGION_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Difficulty */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Dificultad</label>
        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                set(
                  "difficulty",
                  state.difficulty === opt.value ? "" : opt.value,
                )
              }
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                state.difficulty === opt.value
                  ? opt.value === "fácil"
                    ? "bg-green-100 border-green-400 text-green-800"
                    : opt.value === "media"
                      ? "bg-yellow-100 border-yellow-400 text-yellow-800"
                      : "bg-red-100 border-red-400 text-red-800"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Tags */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Etiquetas dieteticas
        </h4>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAG_OPTIONS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() =>
                dispatch({ type: "toggle_dietary_tag", tag: tag.value })
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                state.dietaryTags.includes(tag.value)
                  ? "bg-green-100 border-green-400 text-green-800"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
