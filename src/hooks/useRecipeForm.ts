"use client";

import { useReducer, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Recipe,
  Ingredient,
  MealType,
  RecipeCategory,
  ColombianRegion,
  RecipeDifficulty,
  DietaryTag,
  NutritionInfo,
} from "@/types";

// ---- State types ----

export interface RecipeFormState {
  // Basic fields
  name: string;
  description: string;
  type: MealType;
  category: RecipeCategory | "";
  region: ColombianRegion | "";
  difficulty: RecipeDifficulty | "";
  total: string;
  imageUrl: string | null;
  portionsLuis: string;
  portionsMariana: string;
  ingredients: Ingredient[];
  steps: string[];
  errors: Record<string, string>;

  // Time fields
  prepTime: number | "";
  cookTime: number | "";
  totalTime: number | "";
  totalTimeManual: boolean;

  // Dietary tags
  dietaryTags: DietaryTag[];

  // Nutrition
  showNutrition: boolean;
  nutritionCalories: number | "";
  nutritionProtein: number | "";
  nutritionCarbs: number | "";
  nutritionFat: number | "";
  aiNutritionLoading: boolean;

  // AI generation panel
  showAIPanel: boolean;
  aiLoading: boolean;
  aiDescription: string;
  aiImagePreview: string | null;
  aiError: string | null;

  // Submit loading
  loading: boolean;
}

// ---- Action types ----

export type RecipeFormAction =
  | {
      type: "set_field";
      field: keyof RecipeFormState;
      value: RecipeFormState[keyof RecipeFormState];
    }
  | { type: "add_ingredient" }
  | { type: "remove_ingredient"; index: number }
  | {
      type: "update_ingredient";
      index: number;
      field: keyof Ingredient;
      value: string;
    }
  | { type: "add_step" }
  | { type: "remove_step"; index: number }
  | { type: "update_step"; index: number; value: string }
  | { type: "toggle_dietary_tag"; tag: DietaryTag }
  | {
      type: "set_nutrition";
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }
  | { type: "set_errors"; errors: Record<string, string> }
  | { type: "clear_errors" }
  | {
      type: "fill_from_ai";
      recipe: Partial<RecipeFormState> & {
        ingredients?: Ingredient[];
        steps?: string[];
      };
    }
  | { type: "reset"; initial: Partial<Recipe> };

// ---- Reducer ----

function recipeFormReducer(
  state: RecipeFormState,
  action: RecipeFormAction,
): RecipeFormState {
  switch (action.type) {
    case "set_field":
      return { ...state, [action.field]: action.value };

    case "add_ingredient":
      return {
        ...state,
        ingredients: [
          ...state.ingredients,
          { name: "", luis: "", mariana: "", total: "" },
        ],
      };

    case "remove_ingredient":
      if (state.ingredients.length <= 1) return state;
      return {
        ...state,
        ingredients: state.ingredients.filter((_, i) => i !== action.index),
      };

    case "update_ingredient": {
      const updated = [...state.ingredients];
      updated[action.index] = {
        ...updated[action.index],
        [action.field]: action.value,
      };
      return { ...state, ingredients: updated };
    }

    case "add_step":
      return { ...state, steps: [...state.steps, ""] };

    case "remove_step":
      if (state.steps.length <= 1) return state;
      return {
        ...state,
        steps: state.steps.filter((_, i) => i !== action.index),
      };

    case "update_step": {
      const updatedSteps = [...state.steps];
      updatedSteps[action.index] = action.value;
      return { ...state, steps: updatedSteps };
    }

    case "toggle_dietary_tag":
      return {
        ...state,
        dietaryTags: state.dietaryTags.includes(action.tag)
          ? state.dietaryTags.filter((t) => t !== action.tag)
          : [...state.dietaryTags, action.tag],
      };

    case "set_nutrition":
      return {
        ...state,
        nutritionCalories: action.calories,
        nutritionProtein: action.protein,
        nutritionCarbs: action.carbs,
        nutritionFat: action.fat,
        showNutrition: true,
        aiNutritionLoading: false,
      };

    case "set_errors":
      return { ...state, errors: action.errors };

    case "clear_errors":
      return { ...state, errors: {} };

    case "fill_from_ai": {
      const r = action.recipe;
      return {
        ...state,
        name: r.name ?? state.name,
        type: r.type ?? state.type,
        total: r.total ?? state.total,
        portionsLuis: r.portionsLuis ?? state.portionsLuis,
        portionsMariana: r.portionsMariana ?? state.portionsMariana,
        ingredients:
          r.ingredients && r.ingredients.length > 0
            ? r.ingredients
            : state.ingredients,
        steps: r.steps && r.steps.length > 0 ? r.steps : state.steps,
        showAIPanel: false,
        aiDescription: "",
        aiImagePreview: null,
        aiLoading: false,
        aiError: null,
      };
    }

    case "reset":
      return { ...buildInitialState(action.initial) };

    default:
      return state;
  }
}

// ---- Initial state builder ----

function buildInitialState(recipe?: Partial<Recipe> | null): RecipeFormState {
  return {
    name: recipe?.name ?? "",
    description: recipe?.description ?? "",
    type: recipe?.type ?? "lunch",
    category: recipe?.category ?? "",
    region: recipe?.region ?? "",
    difficulty: recipe?.difficulty ?? "",
    total: recipe?.total ?? "",
    imageUrl: recipe?.image_url ?? null,
    portionsLuis: recipe?.portions?.luis ?? "",
    portionsMariana: recipe?.portions?.mariana ?? "",
    ingredients: (recipe?.ingredients as Ingredient[]) ?? [
      { name: "", luis: "", mariana: "", total: "" },
    ],
    steps: recipe?.steps ?? [""],
    errors: {},
    prepTime: recipe?.prep_time ?? "",
    cookTime: recipe?.cook_time ?? "",
    totalTime: recipe?.total_time ?? "",
    totalTimeManual: false,
    dietaryTags: recipe?.dietary_tags ?? [],
    showNutrition: !!recipe?.nutrition?.calories,
    nutritionCalories: recipe?.nutrition?.calories ?? "",
    nutritionProtein: recipe?.nutrition?.protein ?? "",
    nutritionCarbs: recipe?.nutrition?.carbs ?? "",
    nutritionFat: recipe?.nutrition?.fat ?? "",
    aiNutritionLoading: false,
    showAIPanel: false,
    aiLoading: false,
    aiDescription: "",
    aiImagePreview: null,
    aiError: null,
    loading: false,
  };
}

// ---- Hook ----

export interface UseRecipeFormReturn {
  state: RecipeFormState;
  dispatch: React.Dispatch<RecipeFormAction>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAIImageCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  generateWithAI: () => Promise<void>;
  clearAIImage: () => void;
  handleGenerateNutrition: (
    onError: (msg: string) => void,
    onSuccess: (msg: string) => void,
  ) => void;
  handleSubmit: (
    e: React.FormEvent,
    recipe: Recipe | null,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ) => Promise<void>;
}

export function useRecipeForm(recipe: Recipe | null): UseRecipeFormReturn {
  const [state, dispatch] = useReducer(
    recipeFormReducer,
    buildInitialState(recipe),
  );

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate total time when prep or cook time changes
  useEffect(() => {
    if (!state.totalTimeManual) {
      const prep = typeof state.prepTime === "number" ? state.prepTime : 0;
      const cook = typeof state.cookTime === "number" ? state.cookTime : 0;
      if (prep > 0 || cook > 0) {
        dispatch({ type: "set_field", field: "totalTime", value: prep + cook });
      } else {
        dispatch({ type: "set_field", field: "totalTime", value: "" });
      }
    }
  }, [state.prepTime, state.cookTime, state.totalTimeManual]);

  // ---- AI image capture ----
  const handleAIImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      dispatch({
        type: "set_field",
        field: "aiImagePreview",
        value: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const clearAIImage = () => {
    dispatch({ type: "set_field", field: "aiImagePreview", value: null });
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---- Generate recipe with AI ----
  const generateWithAI = async () => {
    if (!state.aiDescription && !state.aiImagePreview) {
      dispatch({
        type: "set_field",
        field: "aiError",
        value: "Ingresa una descripcion o sube una foto del plato",
      });
      return;
    }

    dispatch({ type: "set_field", field: "aiLoading", value: true });
    dispatch({ type: "set_field", field: "aiError", value: null });

    try {
      const response = await fetch("/api/generate-recipe-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: state.aiImagePreview,
          description: state.aiDescription,
          type: state.type !== "lunch" ? state.type : undefined,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const generatedRecipe = data.recipe;
      const mappedIngredients: Ingredient[] =
        generatedRecipe.ingredients?.map(
          (ing: {
            name: string;
            total?: string;
            luis?: string;
            mariana?: string;
          }) => ({
            name: ing.name,
            total: ing.total || "",
            luis: ing.luis || "",
            mariana: ing.mariana || "",
          }),
        ) ?? [];

      dispatch({
        type: "fill_from_ai",
        recipe: {
          name: generatedRecipe.name,
          type: generatedRecipe.type,
          total: generatedRecipe.total || "",
          portionsLuis: generatedRecipe.portions?.luis || "",
          portionsMariana: generatedRecipe.portions?.mariana || "",
          ingredients: mappedIngredients,
          steps: generatedRecipe.steps ?? [],
        },
      });
    } catch (err) {
      dispatch({
        type: "set_field",
        field: "aiError",
        value:
          err instanceof Error ? err.message : "Error al generar la receta",
      });
      dispatch({ type: "set_field", field: "aiLoading", value: false });
    }
  };

  // ---- Estimate nutrition ----
  const handleGenerateNutrition = (
    onError: (msg: string) => void,
    onSuccess: (msg: string) => void,
  ) => {
    const filledIngredients = state.ingredients.filter((i) => i.name.trim());
    if (filledIngredients.length === 0) {
      onError("Agrega al menos un ingrediente con nombre para estimar");
      return;
    }
    dispatch({ type: "set_field", field: "aiNutritionLoading", value: true });
    setTimeout(() => {
      const estimation = estimateNutritionFromIngredients(filledIngredients);
      dispatch({
        type: "set_nutrition",
        calories: estimation.calories,
        protein: estimation.protein,
        carbs: estimation.carbs,
        fat: estimation.fat,
      });
      onSuccess("Nutricion estimada con base en los ingredientes");
    }, 800);
  };

  // ---- Submit ----
  const handleSubmit = async (
    e: React.FormEvent,
    recipe: Recipe | null,
    onSuccess: () => void,
    onError: (msg: string) => void,
  ) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!state.name.trim()) newErrors.name = "El nombre es requerido";
    if (state.ingredients.some((i) => !i.name.trim()))
      newErrors.ingredients = "Todos los ingredientes deben tener nombre";
    if (state.steps.some((s) => !s.trim()))
      newErrors.steps = "Todos los pasos deben tener contenido";

    if (Object.keys(newErrors).length > 0) {
      dispatch({ type: "set_errors", errors: newErrors });
      return;
    }

    dispatch({ type: "clear_errors" });
    dispatch({ type: "set_field", field: "loading", value: true });

    try {
      let nutrition: NutritionInfo | null = null;
      if (
        state.nutritionCalories !== "" ||
        state.nutritionProtein !== "" ||
        state.nutritionCarbs !== "" ||
        state.nutritionFat !== ""
      ) {
        nutrition = {
          calories:
            typeof state.nutritionCalories === "number"
              ? state.nutritionCalories
              : 0,
          protein:
            typeof state.nutritionProtein === "number"
              ? state.nutritionProtein
              : 0,
          carbs:
            typeof state.nutritionCarbs === "number" ? state.nutritionCarbs : 0,
          fat: typeof state.nutritionFat === "number" ? state.nutritionFat : 0,
        };
      }

      const recipeData = {
        name: state.name.trim(),
        type: state.type,
        description: state.description.trim() || null,
        category: state.category || null,
        region:
          state.category === "colombiana" && state.region ? state.region : null,
        difficulty: state.difficulty || null,
        total: state.total.trim() || null,
        prep_time: typeof state.prepTime === "number" ? state.prepTime : null,
        cook_time: typeof state.cookTime === "number" ? state.cookTime : null,
        total_time:
          typeof state.totalTime === "number" ? state.totalTime : null,
        dietary_tags: state.dietaryTags.length > 0 ? state.dietaryTags : null,
        nutrition,
        portions:
          state.portionsLuis || state.portionsMariana
            ? { luis: state.portionsLuis, mariana: state.portionsMariana }
            : null,
        ingredients: state.ingredients.filter((i) => i.name.trim()),
        steps: state.steps.filter((s) => s.trim()),
        image_url: state.imageUrl,
      };

      if (recipe) {
        const { error } = await supabase
          .from("recipes")
          .update(recipeData)
          .eq("id", recipe.id);
        if (error) throw error;
      } else {
        const id = `custom_${Date.now()}`;
        const { error } = await supabase
          .from("recipes")
          .insert({ id, ...recipeData });
        if (error) throw error;
      }

      onSuccess();
    } catch {
      onError("Error al guardar la receta");
    } finally {
      dispatch({ type: "set_field", field: "loading", value: false });
    }
  };

  return {
    state,
    dispatch,
    cameraInputRef,
    fileInputRef,
    handleAIImageCapture,
    generateWithAI,
    clearAIImage,
    handleGenerateNutrition,
    handleSubmit,
  };
}

// ---- Nutrition estimation (extracted from component) ----

interface IngredientCalorieEntry {
  keywords: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

const CALORIE_DATABASE: IngredientCalorieEntry[] = [
  {
    keywords: ["pollo", "pechuga", "muslo", "chicken"],
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
  },
  {
    keywords: ["carne", "res", "lomo", "beef", "bistec"],
    caloriesPer100g: 250,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 15,
  },
  {
    keywords: ["cerdo", "pork", "chuleta"],
    caloriesPer100g: 242,
    proteinPer100g: 27,
    carbsPer100g: 0,
    fatPer100g: 14,
  },
  {
    keywords: ["pescado", "salmon", "trucha", "tilapia", "atún", "tuna"],
    caloriesPer100g: 206,
    proteinPer100g: 22,
    carbsPer100g: 0,
    fatPer100g: 13,
  },
  {
    keywords: ["huevo", "huevos", "egg"],
    caloriesPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
  },
  {
    keywords: ["jamón", "jamon"],
    caloriesPer100g: 145,
    proteinPer100g: 21,
    carbsPer100g: 1.5,
    fatPer100g: 6,
  },
  {
    keywords: ["queso", "cheese", "mozzarella"],
    caloriesPer100g: 300,
    proteinPer100g: 22,
    carbsPer100g: 2,
    fatPer100g: 22,
  },
  {
    keywords: ["leche", "milk"],
    caloriesPer100g: 42,
    proteinPer100g: 3.4,
    carbsPer100g: 5,
    fatPer100g: 1,
  },
  {
    keywords: ["crema", "nata", "cream"],
    caloriesPer100g: 195,
    proteinPer100g: 2.8,
    carbsPer100g: 3,
    fatPer100g: 19,
  },
  {
    keywords: ["yogur", "yogurt"],
    caloriesPer100g: 59,
    proteinPer100g: 3.5,
    carbsPer100g: 5,
    fatPer100g: 3.3,
  },
  {
    keywords: ["mantequilla", "butter"],
    caloriesPer100g: 717,
    proteinPer100g: 0.9,
    carbsPer100g: 0.1,
    fatPer100g: 81,
  },
  {
    keywords: ["arroz", "rice"],
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
  },
  {
    keywords: ["pasta", "espagueti", "fideo", "spaghetti", "macarrones"],
    caloriesPer100g: 131,
    proteinPer100g: 5,
    carbsPer100g: 25,
    fatPer100g: 1.1,
  },
  {
    keywords: ["pan", "bread", "arepa"],
    caloriesPer100g: 265,
    proteinPer100g: 9,
    carbsPer100g: 49,
    fatPer100g: 3.2,
  },
  {
    keywords: ["papa", "patata", "potato"],
    caloriesPer100g: 77,
    proteinPer100g: 2,
    carbsPer100g: 17,
    fatPer100g: 0.1,
  },
  {
    keywords: ["yuca", "cassava"],
    caloriesPer100g: 160,
    proteinPer100g: 1.4,
    carbsPer100g: 38,
    fatPer100g: 0.3,
  },
  {
    keywords: ["plátano", "platano", "banana", "banano"],
    caloriesPer100g: 122,
    proteinPer100g: 1.3,
    carbsPer100g: 32,
    fatPer100g: 0.4,
  },
  {
    keywords: ["avena", "oats"],
    caloriesPer100g: 68,
    proteinPer100g: 2.5,
    carbsPer100g: 12,
    fatPer100g: 1.4,
  },
  {
    keywords: ["lenteja", "lentil"],
    caloriesPer100g: 116,
    proteinPer100g: 9,
    carbsPer100g: 20,
    fatPer100g: 0.4,
  },
  {
    keywords: ["frijol", "frijoles", "beans"],
    caloriesPer100g: 127,
    proteinPer100g: 8.7,
    carbsPer100g: 22,
    fatPer100g: 0.5,
  },
  {
    keywords: ["tomate", "tomato"],
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
  },
  {
    keywords: ["cebolla", "onion"],
    caloriesPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9,
    fatPer100g: 0.1,
  },
  {
    keywords: ["ajo", "garlic"],
    caloriesPer100g: 149,
    proteinPer100g: 6.4,
    carbsPer100g: 33,
    fatPer100g: 0.5,
  },
  {
    keywords: ["zanahoria", "carrot"],
    caloriesPer100g: 41,
    proteinPer100g: 0.9,
    carbsPer100g: 10,
    fatPer100g: 0.2,
  },
  {
    keywords: ["brócoli", "brocoli", "broccoli"],
    caloriesPer100g: 34,
    proteinPer100g: 2.8,
    carbsPer100g: 7,
    fatPer100g: 0.4,
  },
  {
    keywords: ["espinaca", "spinach"],
    caloriesPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
  },
  {
    keywords: ["lechuga", "lettuce"],
    caloriesPer100g: 15,
    proteinPer100g: 1.4,
    carbsPer100g: 2.9,
    fatPer100g: 0.2,
  },
  {
    keywords: ["pimentón", "pimenton", "pimiento", "pepper"],
    caloriesPer100g: 31,
    proteinPer100g: 1,
    carbsPer100g: 6,
    fatPer100g: 0.3,
  },
  {
    keywords: ["aguacate", "avocado"],
    caloriesPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 9,
    fatPer100g: 15,
  },
  {
    keywords: ["aceite", "oil", "oliva"],
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
  },
  {
    keywords: ["manzana", "apple"],
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 14,
    fatPer100g: 0.2,
  },
  {
    keywords: ["naranja", "orange"],
    caloriesPer100g: 47,
    proteinPer100g: 0.9,
    carbsPer100g: 12,
    fatPer100g: 0.1,
  },
  {
    keywords: ["limón", "limon", "lime", "lemon"],
    caloriesPer100g: 29,
    proteinPer100g: 1.1,
    carbsPer100g: 9,
    fatPer100g: 0.3,
  },
  {
    keywords: ["azúcar", "azucar", "sugar"],
    caloriesPer100g: 387,
    proteinPer100g: 0,
    carbsPer100g: 100,
    fatPer100g: 0,
  },
  {
    keywords: ["harina", "flour"],
    caloriesPer100g: 364,
    proteinPer100g: 10,
    carbsPer100g: 76,
    fatPer100g: 1,
  },
  {
    keywords: ["chocolate", "cacao"],
    caloriesPer100g: 546,
    proteinPer100g: 5,
    carbsPer100g: 60,
    fatPer100g: 31,
  },
];

function parseQuantityGrams(quantityStr: string): number {
  if (!quantityStr) return 100;
  const lower = quantityStr.toLowerCase().trim();
  const numMatch = lower.match(/(\d+[\.,]?\d*)/);
  if (!numMatch) return 100;
  const num = parseFloat(numMatch[1].replace(",", "."));
  if (lower.includes("kg")) return num * 1000;
  if (lower.includes("ml") || lower.includes("cc")) return num;
  if (lower.includes("lb") || lower.includes("libra")) return num * 454;
  if (lower.includes("oz") || lower.includes("onza")) return num * 28.35;
  if (lower.includes("l") && !lower.includes("ml")) return num * 1000;
  if (lower.includes("cdta") || lower.includes("cucharadita")) return num * 5;
  if (lower.includes("cda") || lower.includes("cucharada")) return num * 15;
  if (lower.includes("taza") || lower.includes("cup")) return num * 240;
  if (lower.includes("unidad") || lower.includes("und") || /^\d+$/.test(lower))
    return num * 100;
  if (lower.includes("g")) return num;
  return num;
}

function estimateNutritionFromIngredients(
  ingredientsList: Ingredient[],
): NutritionInfo {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const ing of ingredientsList) {
    if (!ing.name.trim()) continue;
    const nameLower = ing.name.toLowerCase();
    const grams = parseQuantityGrams(ing.total || "");
    const match = CALORIE_DATABASE.find((entry) =>
      entry.keywords.some((kw) => nameLower.includes(kw)),
    );
    const ratio = grams / 100;
    if (match) {
      totalCalories += match.caloriesPer100g * ratio;
      totalProtein += match.proteinPer100g * ratio;
      totalCarbs += match.carbsPer100g * ratio;
      totalFat += match.fatPer100g * ratio;
    } else {
      totalCalories += 50 * ratio;
      totalProtein += 2 * ratio;
      totalCarbs += 8 * ratio;
      totalFat += 1 * ratio;
    }
  }

  const servings = 2;
  return {
    calories: Math.round(totalCalories / servings),
    protein: Math.round(totalProtein / servings),
    carbs: Math.round(totalCarbs / servings),
    fat: Math.round(totalFat / servings),
  };
}
