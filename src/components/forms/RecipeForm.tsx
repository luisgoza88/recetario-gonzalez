"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Camera,
  Upload,
  Loader2,
  Wand2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
} from "lucide-react";
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
import ImageUpload from "../ImageUpload";
import { CanEdit } from "@/components/auth/RoleGate";
import { useToast } from "@/components/ui/Toast";
import { useEscapeKey } from "@/hooks/useEscapeKey";

// -- Constants --

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

// -- Simple client-side calorie estimation --

interface IngredientCalorieEntry {
  keywords: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

const CALORIE_DATABASE: IngredientCalorieEntry[] = [
  // Proteins
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
  // Dairy
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
  // Carbs
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
  // Vegetables
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
  // Oils and fats
  {
    keywords: ["aceite", "oil", "oliva"],
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
  },
  // Fruits
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
  // Misc
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
  if (!quantityStr) return 100; // default assumption
  const lower = quantityStr.toLowerCase().trim();

  // Try to extract number
  const numMatch = lower.match(/(\d+[\.,]?\d*)/);
  if (!numMatch) return 100;
  const num = parseFloat(numMatch[1].replace(",", "."));

  // Convert to grams
  if (lower.includes("kg")) return num * 1000;
  if (lower.includes("ml") || lower.includes("cc")) return num; // approximate 1ml = 1g
  if (lower.includes("lb") || lower.includes("libra")) return num * 454;
  if (lower.includes("oz") || lower.includes("onza")) return num * 28.35;
  if (lower.includes("l") && !lower.includes("ml")) return num * 1000;
  if (lower.includes("cdta") || lower.includes("cucharadita")) return num * 5;
  if (lower.includes("cda") || lower.includes("cucharada")) return num * 15;
  if (lower.includes("taza") || lower.includes("cup")) return num * 240;
  if (
    lower.includes("unidad") ||
    lower.includes("und") ||
    /^\d+$/.test(lower)
  ) {
    // For unit-based items, assume ~100g each
    return num * 100;
  }
  if (lower.includes("g")) return num;

  return num; // assume grams if no unit
}

function estimateNutrition(ingredientsList: Ingredient[]): NutritionInfo {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const ing of ingredientsList) {
    if (!ing.name.trim()) continue;
    const nameLower = ing.name.toLowerCase();
    const grams = parseQuantityGrams(ing.total || "");

    // Find matching entry from calorie database
    const match = CALORIE_DATABASE.find((entry) =>
      entry.keywords.some((kw) => nameLower.includes(kw)),
    );

    if (match) {
      const ratio = grams / 100;
      totalCalories += match.caloriesPer100g * ratio;
      totalProtein += match.proteinPer100g * ratio;
      totalCarbs += match.carbsPer100g * ratio;
      totalFat += match.fatPer100g * ratio;
    } else {
      // Unknown ingredient: estimate ~50 kcal per 100g as a fallback
      const ratio = grams / 100;
      totalCalories += 50 * ratio;
      totalProtein += 2 * ratio;
      totalCarbs += 8 * ratio;
      totalFat += 1 * ratio;
    }
  }

  // Divide by 2 for approximate per-serving (family of 2 adults)
  const servings = 2;
  return {
    calories: Math.round(totalCalories / servings),
    protein: Math.round(totalProtein / servings),
    carbs: Math.round(totalCarbs / servings),
    fat: Math.round(totalFat / servings),
  };
}

// -- Component --

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
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(recipe?.name || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [type, setType] = useState<MealType>(recipe?.type || "lunch");
  const [category, setCategory] = useState<RecipeCategory | "">(
    recipe?.category || "",
  );
  const [region, setRegion] = useState<ColombianRegion | "">(
    recipe?.region || "",
  );
  const [difficulty, setDifficulty] = useState<RecipeDifficulty | "">(
    recipe?.difficulty || "",
  );
  const [total, setTotal] = useState(recipe?.total || "");
  const [imageUrl, setImageUrl] = useState<string | null>(
    recipe?.image_url || null,
  );
  const [portionsLuis, setPortionsLuis] = useState(
    recipe?.portions?.luis || "",
  );
  const [portionsMariana, setPortionsMariana] = useState(
    recipe?.portions?.mariana || "",
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    (recipe?.ingredients as Ingredient[]) || [
      { name: "", luis: "", mariana: "", total: "" },
    ],
  );
  const [steps, setSteps] = useState<string[]>(recipe?.steps || [""]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Time fields
  const [prepTime, setPrepTime] = useState<number | "">(
    recipe?.prep_time ?? "",
  );
  const [cookTime, setCookTime] = useState<number | "">(
    recipe?.cook_time ?? "",
  );
  const [totalTime, setTotalTime] = useState<number | "">(
    recipe?.total_time ?? "",
  );
  const [totalTimeManual, setTotalTimeManual] = useState(false);

  // Dietary tags
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>(
    recipe?.dietary_tags || [],
  );

  // Nutrition
  const [showNutrition, setShowNutrition] = useState(
    !!recipe?.nutrition?.calories,
  );
  const [nutritionCalories, setNutritionCalories] = useState<number | "">(
    recipe?.nutrition?.calories ?? "",
  );
  const [nutritionProtein, setNutritionProtein] = useState<number | "">(
    recipe?.nutrition?.protein ?? "",
  );
  const [nutritionCarbs, setNutritionCarbs] = useState<number | "">(
    recipe?.nutrition?.carbs ?? "",
  );
  const [nutritionFat, setNutritionFat] = useState<number | "">(
    recipe?.nutrition?.fat ?? "",
  );
  const [aiNutritionLoading, setAiNutritionLoading] = useState(false);

  // AI Generation state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculate total time when prep or cook time changes
  useEffect(() => {
    if (!totalTimeManual) {
      const prep = typeof prepTime === "number" ? prepTime : 0;
      const cook = typeof cookTime === "number" ? cookTime : 0;
      if (prep > 0 || cook > 0) {
        setTotalTime(prep + cook);
      } else {
        setTotalTime("");
      }
    }
  }, [prepTime, cookTime, totalTimeManual]);

  const toggleDietaryTag = (tag: DietaryTag) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleGenerateNutrition = () => {
    const filledIngredients = ingredients.filter((i) => i.name.trim());
    if (filledIngredients.length === 0) {
      toast.error("Agrega al menos un ingrediente con nombre para estimar");
      return;
    }
    setAiNutritionLoading(true);
    // Simulate a brief delay for UX
    setTimeout(() => {
      const estimation = estimateNutrition(filledIngredients);
      setNutritionCalories(estimation.calories);
      setNutritionProtein(estimation.protein);
      setNutritionCarbs(estimation.carbs);
      setNutritionFat(estimation.fat);
      setShowNutrition(true);
      setAiNutritionLoading(false);
      toast.success("Nutricion estimada con base en los ingredientes");
    }, 800);
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", luis: "", mariana: "", total: "" },
    ]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string,
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addStep = () => {
    setSteps([...steps, ""]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  // AI Functions
  const handleAIImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAiImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateWithAI = async () => {
    if (!aiDescription && !aiImagePreview) {
      setAiError("Ingresa una descripcion o sube una foto del plato");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/generate-recipe-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: aiImagePreview,
          description: aiDescription,
          type: type !== "lunch" ? type : undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedRecipe = data.recipe;

      // Fill form with generated data
      setName(generatedRecipe.name);
      setType(generatedRecipe.type);
      setTotal(generatedRecipe.total || "");
      setPortionsLuis(generatedRecipe.portions?.luis || "");
      setPortionsMariana(generatedRecipe.portions?.mariana || "");

      // Set ingredients
      if (
        generatedRecipe.ingredients &&
        generatedRecipe.ingredients.length > 0
      ) {
        setIngredients(
          generatedRecipe.ingredients.map(
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
          ),
        );
      }

      // Set steps
      if (generatedRecipe.steps && generatedRecipe.steps.length > 0) {
        setSteps(generatedRecipe.steps);
      }

      // Close AI panel
      setShowAIPanel(false);
      setAiDescription("");
      setAiImagePreview(null);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Error al generar la receta",
      );
    } finally {
      setAiLoading(false);
    }
  };

  const clearAIImage = () => {
    setAiImagePreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "El nombre es requerido";
    }
    if (ingredients.some((i) => !i.name.trim())) {
      newErrors.ingredients = "Todos los ingredientes deben tener nombre";
    }
    if (steps.some((s) => !s.trim())) {
      newErrors.steps = "Todos los pasos deben tener contenido";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // Build nutrition object if any field is filled
      let nutrition: NutritionInfo | null = null;
      if (
        nutritionCalories !== "" ||
        nutritionProtein !== "" ||
        nutritionCarbs !== "" ||
        nutritionFat !== ""
      ) {
        nutrition = {
          calories:
            typeof nutritionCalories === "number" ? nutritionCalories : 0,
          protein: typeof nutritionProtein === "number" ? nutritionProtein : 0,
          carbs: typeof nutritionCarbs === "number" ? nutritionCarbs : 0,
          fat: typeof nutritionFat === "number" ? nutritionFat : 0,
        };
      }

      const recipeData = {
        name: name.trim(),
        type,
        description: description.trim() || null,
        category: category || null,
        region: category === "colombiana" && region ? region : null,
        difficulty: difficulty || null,
        total: total.trim() || null,
        prep_time: typeof prepTime === "number" ? prepTime : null,
        cook_time: typeof cookTime === "number" ? cookTime : null,
        total_time: typeof totalTime === "number" ? totalTime : null,
        dietary_tags: dietaryTags.length > 0 ? dietaryTags : null,
        nutrition,
        portions:
          portionsLuis || portionsMariana
            ? {
                luis: portionsLuis,
                mariana: portionsMariana,
              }
            : null,
        ingredients: ingredients.filter((i) => i.name.trim()),
        steps: steps.filter((s) => s.trim()),
        image_url: imageUrl,
      };

      if (recipe) {
        // Update
        const { error } = await supabase
          .from("recipes")
          .update(recipeData)
          .eq("id", recipe.id);

        if (error) throw error;
      } else {
        // Create
        const id = `custom_${Date.now()}`;
        const { error } = await supabase
          .from("recipes")
          .insert({ id, ...recipeData });

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      toast.error("Error al guardar la receta");
    } finally {
      setLoading(false);
    }
  };

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
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1">
            {/* AI Generation Button - Only for new recipes */}
            {!recipe && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    showAIPanel
                      ? "bg-purple-600 text-white"
                      : "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-indigo-100"
                  }`}
                >
                  <Sparkles size={18} />
                  {showAIPanel ? "Ocultar asistente IA" : "Generar con IA"}
                </button>

                {/* AI Panel */}
                {showAIPanel && (
                  <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-sm text-purple-700 mb-3">
                      Sube una foto de un plato o describe lo que quieres
                      cocinar y la IA generara la receta completa.
                    </p>

                    {/* AI Error */}
                    {aiError && (
                      <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-lg text-sm">
                        {aiError}
                      </div>
                    )}

                    {/* Image Preview */}
                    {aiImagePreview && (
                      <div className="mb-3 relative">
                        <img
                          src={aiImagePreview}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={clearAIImage}
                          className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Image capture buttons */}
                    {!aiImagePreview && (
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

                    {/* Hidden inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAIImageCapture}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAIImageCapture}
                      className="hidden"
                    />

                    {/* Description input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="Ej: Arroz con pollo colombiano, Pasta carbonara..."
                        className="w-full p-3 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Generate button */}
                    <button
                      type="button"
                      onClick={generateWithAI}
                      disabled={
                        aiLoading || (!aiDescription && !aiImagePreview)
                      }
                      className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? (
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
            )}

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Foto de la receta
              </label>
              <ImageUpload
                currentImageUrl={imageUrl}
                onImageUploaded={setImageUrl}
              />
            </div>

            {/* ====== SECTION: Basic Info ====== */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Informacion basica
              </h4>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 ${errors.name ? "border-red-500" : "border-gray-200"}`}
                  placeholder="Ej: Pollo a la Criolla"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Descripcion
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 text-sm resize-none"
                  placeholder="Breve descripcion de la receta..."
                />
              </div>

              {/* Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MealType)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                >
                  <option value="breakfast">Desayuno</option>
                  <option value="lunch">Almuerzo</option>
                  <option value="dinner">Cena</option>
                </select>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value as RecipeCategory | "";
                    setCategory(val);
                    if (val !== "colombiana") setRegion("");
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

              {/* Region (shown only when category is colombiana) */}
              {category === "colombiana" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Region colombiana
                  </label>
                  <select
                    value={region}
                    onChange={(e) =>
                      setRegion(e.target.value as ColombianRegion | "")
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
                <label className="block text-sm font-medium mb-2">
                  Dificultad
                </label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setDifficulty(difficulty === opt.value ? "" : opt.value)
                      }
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        difficulty === opt.value
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
            </div>

            {/* ====== SECTION: Time ====== */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Clock size={14} />
                Tiempos
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Prep (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={prepTime}
                    onChange={(e) =>
                      setPrepTime(
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
                    value={cookTime}
                    onChange={(e) =>
                      setCookTime(
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
                        setTotalTimeManual(!totalTimeManual);
                        if (totalTimeManual) {
                          // Switching back to auto
                          const prep =
                            typeof prepTime === "number" ? prepTime : 0;
                          const cook =
                            typeof cookTime === "number" ? cookTime : 0;
                          if (prep > 0 || cook > 0) {
                            setTotalTime(prep + cook);
                          }
                        }
                      }}
                      className="text-[10px] text-green-700 hover:underline"
                      title={
                        totalTimeManual
                          ? "Volver a auto-calcular"
                          : "Editar manualmente"
                      }
                    >
                      {totalTimeManual ? "(auto)" : "(editar)"}
                    </button>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={totalTime}
                    onChange={(e) => {
                      setTotalTimeManual(true);
                      setTotalTime(
                        e.target.value === "" ? "" : parseInt(e.target.value),
                      );
                    }}
                    disabled={!totalTimeManual}
                    className={`w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700 ${
                      totalTimeManual
                        ? "border-gray-200 bg-white"
                        : "border-gray-100 bg-gray-50 text-gray-500"
                    }`}
                    placeholder="45"
                  />
                </div>
              </div>
            </div>

            {/* ====== SECTION: Dietary Tags ====== */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Etiquetas dieteticas
              </h4>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleDietaryTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      dietaryTags.includes(tag.value)
                        ? "bg-green-100 border-green-400 text-green-800"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total (for lunch) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Total a preparar
              </label>
              <input
                type="text"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
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
                    value={portionsLuis}
                    onChange={(e) => setPortionsLuis(e.target.value)}
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
                    value={portionsMariana}
                    onChange={(e) => setPortionsMariana(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="Ej: 180g + 1 huevo"
                  />
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Ingredientes *
              </label>
              {errors.ingredients && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.ingredients}
                </p>
              )}
              {ingredients.map((ing, index) => (
                <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                  {/* Row 1: Name + Delete */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) =>
                        updateIngredient(index, "name", e.target.value)
                      }
                      className="flex-1 p-2 border rounded-lg text-sm bg-white"
                      placeholder="Nombre del ingrediente"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg shrink-0"
                      disabled={ingredients.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {/* Row 2: Total, Porcion grande, Porcion pequena */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Total
                      </label>
                      <input
                        type="text"
                        value={ing.total || ""}
                        onChange={(e) =>
                          updateIngredient(index, "total", e.target.value)
                        }
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        placeholder="500g"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        P. grande
                      </label>
                      <input
                        type="text"
                        value={ing.luis}
                        onChange={(e) =>
                          updateIngredient(index, "luis", e.target.value)
                        }
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        placeholder="300g"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        P. pequena
                      </label>
                      <input
                        type="text"
                        value={ing.mariana}
                        onChange={(e) =>
                          updateIngredient(index, "mariana", e.target.value)
                        }
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                        placeholder="200g"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm text-green-700 flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Agregar ingrediente
              </button>
            </div>

            {/* Steps */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Pasos *</label>
              {errors.steps && (
                <p className="text-red-500 text-xs mt-1">{errors.steps}</p>
              )}
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <span className="text-gray-400 pt-2">{index + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    className="flex-1 p-2 border rounded-lg text-sm"
                    placeholder={`Paso ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    disabled={steps.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addStep}
                className="text-sm text-green-700 flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> Agregar paso
              </button>
            </div>

            {/* ====== SECTION: Nutrition (collapsible) ====== */}
            <div className="mb-5 border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowNutrition(!showNutrition)}
                className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Informacion Nutricional
                </span>
                {showNutrition ? (
                  <ChevronUp size={18} className="text-gray-400" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400" />
                )}
              </button>

              {showNutrition && (
                <div className="p-3 space-y-3">
                  {/* AI Estimate button */}
                  <button
                    type="button"
                    onClick={handleGenerateNutrition}
                    disabled={aiNutritionLoading}
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:from-amber-100 hover:to-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {aiNutritionLoading ? (
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
                        value={nutritionCalories}
                        onChange={(e) =>
                          setNutritionCalories(
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
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
                        value={nutritionProtein}
                        onChange={(e) =>
                          setNutritionProtein(
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
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
                        value={nutritionCarbs}
                        onChange={(e) =>
                          setNutritionCarbs(
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
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
                        value={nutritionFat}
                        onChange={(e) =>
                          setNutritionFat(
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
                          )
                        }
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                        placeholder="12"
                      />
                    </div>
                  </div>

                  {/* Summary bar */}
                  {nutritionCalories !== "" && (
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                      <span>
                        <strong>{nutritionCalories}</strong> kcal
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        P: <strong>{nutritionProtein || 0}</strong>g
                      </span>
                      <span>
                        C: <strong>{nutritionCarbs || 0}</strong>g
                      </span>
                      <span>
                        G: <strong>{nutritionFat || 0}</strong>g
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                disabled={loading}
                className="flex-1 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {loading
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
