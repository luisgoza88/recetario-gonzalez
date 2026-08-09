import type {
  DietPresetId,
  DietaryIngredientGroup,
  DietaryMealPlan,
  DietaryPreferences,
} from "@/types";

export type DietPresetCategory =
  | "equilibrada"
  | "vegetal"
  | "bajo-carbohidrato"
  | "objetivo";

export interface DietPreset {
  id: DietPresetId;
  name: string;
  shortName: string;
  emoji: string;
  category: DietPresetCategory;
  description: string;
  includes: string[];
  limits: string[];
  color: string;
  restrictions: string[];
  preferences: string[];
  plan: DietaryMealPlan;
  caution?: string;
  referenceUrl: string;
}

const ANIMAL_MEATS: DietaryIngredientGroup[] = [
  "pollo-aves",
  "pescado",
  "mariscos",
  "res",
  "cerdo",
  "otras-carnes",
];

export const DIET_PRESETS: readonly DietPreset[] = [
  {
    id: "pollo-pescado-verduras",
    name: "Pollo, pescado y verduras",
    shortName: "Tu plan actual",
    emoji: "🐟",
    category: "bajo-carbohidrato",
    description:
      "Plan práctico, muy bajo en carbohidratos y con ingredientes fáciles de conseguir en Colombia.",
    includes: ["Pollo y aves", "Pescado", "Verduras"],
    limits: ["Harinas", "Tubérculos", "Azúcares", "Otras carnes"],
    color: "from-emerald-700 to-teal-600",
    restrictions: [],
    preferences: ["bajo-carbohidrato", "alto-proteina"],
    plan: {
      allowed_groups: ["pollo-aves", "pescado", "verduras"],
      required_any_groups: ["pollo-aves", "pescado"],
      carb_target: "muy-bajo",
      meal_types: ["lunch", "dinner"],
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    referenceUrl:
      "https://www.heart.org/en/news/2023/04/27/heres-how-10-popular-diets-scored-for-heart-health",
  },
  {
    id: "mediterranea",
    name: "Mediterránea",
    shortName: "Mediterránea",
    emoji: "🫒",
    category: "equilibrada",
    description:
      "Prioriza vegetales, frutas, granos integrales, leguminosas, pescado, frutos secos y aceite de oliva.",
    includes: ["Vegetales y frutas", "Pescado", "Leguminosas", "Aceite de oliva"],
    limits: ["Carnes rojas", "Dulces", "Ultraprocesados"],
    color: "from-sky-700 to-cyan-600",
    restrictions: [],
    preferences: ["mediterranea", "bajo-azucar"],
    plan: {
      carb_target: "moderado",
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    referenceUrl:
      "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/mediterranean-diet",
  },
  {
    id: "pescetariana",
    name: "Pescetariana",
    shortName: "Pescetariana",
    emoji: "🐠",
    category: "equilibrada",
    description:
      "Alimentación principalmente vegetal que admite pescados y mariscos, y puede incluir huevos y lácteos.",
    includes: ["Pescado", "Mariscos", "Huevos", "Vegetales"],
    limits: ["Pollo", "Res", "Cerdo", "Otras carnes"],
    color: "from-blue-700 to-sky-500",
    restrictions: ["pescetariano"],
    preferences: [],
    plan: {
      excluded_groups: ["pollo-aves", "res", "cerdo", "otras-carnes"],
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    referenceUrl:
      "https://professional.heart.org/en/science-news/popular-dietary-patterns-alignment-with-american-heart-association-2021-dietary-guidance/top-things-to-know",
  },
  {
    id: "vegetariana",
    name: "Vegetariana",
    shortName: "Vegetariana",
    emoji: "🥬",
    category: "vegetal",
    description:
      "Elimina carnes, pollo, pescado y mariscos; esta variante permite huevos y lácteos.",
    includes: ["Verduras", "Frutas", "Leguminosas", "Huevos y lácteos"],
    limits: ["Todas las carnes", "Pescados", "Mariscos"],
    color: "from-lime-700 to-green-600",
    restrictions: ["vegetariano"],
    preferences: [],
    plan: {
      excluded_groups: ANIMAL_MEATS,
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    referenceUrl: "https://medlineplus.gov/vegetariandiet.html",
  },
  {
    id: "vegana",
    name: "Vegana",
    shortName: "Vegana",
    emoji: "🌱",
    category: "vegetal",
    description:
      "Usa únicamente alimentos de origen vegetal y excluye todos los productos animales.",
    includes: ["Verduras", "Frutas", "Leguminosas", "Semillas"],
    limits: ["Carnes", "Huevos", "Lácteos", "Pescados y mariscos"],
    color: "from-green-800 to-emerald-600",
    restrictions: ["vegano"],
    preferences: [],
    plan: {
      excluded_groups: [...ANIMAL_MEATS, "huevos", "lacteos"],
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    caution: "Conviene vigilar especialmente vitamina B12, hierro, calcio, zinc y proteína.",
    referenceUrl: "https://medlineplus.gov/vegetariandiet.html",
  },
  {
    id: "bajo-carbohidrato",
    name: "Baja en carbohidratos",
    shortName: "Low carb",
    emoji: "🥦",
    category: "bajo-carbohidrato",
    description:
      "Reduce harinas, azúcares y almidones sin llegar necesariamente al nivel restrictivo de keto.",
    includes: ["Proteínas", "Verduras", "Grasas", "Porciones moderadas"],
    limits: ["Azúcares", "Harinas", "Arroz", "Tubérculos"],
    color: "from-violet-700 to-indigo-600",
    restrictions: [],
    preferences: ["bajo-carbohidrato"],
    plan: {
      carb_target: "bajo",
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    referenceUrl:
      "https://newsroom.heart.org/news/10-popular-diets-scored-for-heart-healthy-elements-some-need-improvement",
  },
  {
    id: "keto",
    name: "Cetogénica · Keto",
    shortName: "Keto",
    emoji: "🥑",
    category: "bajo-carbohidrato",
    description:
      "Plan muy bajo en carbohidratos. La aplicación lo trata como un filtro estricto, no como prescripción médica.",
    includes: ["Proteínas", "Verduras bajas en almidón", "Grasas"],
    limits: ["Granos", "Leguminosas", "Tubérculos", "Azúcar y frutas"],
    color: "from-purple-800 to-violet-600",
    restrictions: [],
    preferences: ["keto", "bajo-carbohidrato"],
    plan: {
      excluded_groups: [
        "frutas",
        "leguminosas",
        "cereales-harinas",
        "tuberculos-platanos",
        "azucares",
      ],
      carb_target: "muy-bajo",
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    caution:
      "Por ser restrictiva y poder afectar lípidos o medicamentos, conviene validarla con un profesional de salud.",
    referenceUrl:
      "https://newsroom.heart.org/news/10-dietas-populares-calificadas-por-elementos-saludables-para-el-corazon-algunas-necesitan-mejorar",
  },
  {
    id: "paleo",
    name: "Paleo",
    shortName: "Paleo",
    emoji: "🍖",
    category: "bajo-carbohidrato",
    description:
      "Prioriza carnes, pescado, huevos, vegetales, frutas, frutos secos y semillas; excluye varios grupos completos.",
    includes: ["Carnes y pescado", "Huevos", "Vegetales", "Frutos secos"],
    limits: ["Granos", "Leguminosas", "Lácteos", "Azúcares"],
    color: "from-amber-800 to-orange-600",
    restrictions: [],
    preferences: ["paleo"],
    plan: {
      excluded_groups: [
        "lacteos",
        "leguminosas",
        "cereales-harinas",
        "azucares",
      ],
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    caution:
      "Excluir granos, leguminosas y lácteos puede crear vacíos nutricionales si no se planifica bien.",
    referenceUrl: "https://www.ncbi.nlm.nih.gov/books/NBK482457/",
  },
  {
    id: "alta-proteina",
    name: "Alta en proteína",
    shortName: "Alta proteína",
    emoji: "💪",
    category: "objetivo",
    description:
      "Busca recetas con al menos 25 g de proteína por porción cuando el dato nutricional está disponible.",
    includes: ["Pollo", "Pescado", "Huevos", "Leguminosas"],
    limits: ["Recetas con poca proteína", "Ultraprocesados"],
    color: "from-rose-700 to-red-600",
    restrictions: [],
    preferences: ["alto-proteina"],
    plan: {
      min_protein: 25,
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    referenceUrl:
      "https://www.niddk.nih.gov/health-information/diet-nutrition",
  },
  {
    id: "dash",
    name: "DASH · Corazón",
    shortName: "DASH",
    emoji: "❤️",
    category: "objetivo",
    description:
      "Patrón equilibrado que prioriza vegetales, frutas, granos integrales y alimentos bajos en sodio y grasa saturada.",
    includes: ["Vegetales y frutas", "Granos integrales", "Pescado y pollo", "Lácteos bajos en grasa"],
    limits: ["Sodio", "Grasas saturadas", "Bebidas azucaradas", "Dulces"],
    color: "from-red-700 to-rose-500",
    restrictions: [],
    preferences: ["bajo-sodio", "bajo-azucar"],
    plan: {
      max_sodium: 600,
      max_difficulty: "media",
      max_total_time: 60,
      colombia_easy_only: true,
    },
    caution:
      "Si existe hipertensión, enfermedad renal o medicación, el objetivo de sodio debe definirlo el profesional tratante.",
    referenceUrl: "https://www.nhlbi.nih.gov/health/dash-eating-plan",
  },
] as const;

export function getDietPreset(id?: string | null): DietPreset | undefined {
  return DIET_PRESETS.find((preset) => preset.id === id);
}

export function buildPreferencesForDietPreset(
  preset: DietPreset,
  current?: DietaryPreferences | null,
  overrides?: Partial<DietaryMealPlan>,
): DietaryPreferences {
  return {
    ...current,
    restrictions: preset.restrictions,
    preferences: preset.preferences,
    allergies: current?.allergies ?? [],
    avoid_ingredients: current?.avoid_ingredients ?? [],
    meal_plan: {
      ...preset.plan,
      ...overrides,
      preset_id: preset.id,
      preset_name: preset.name,
    },
  };
}
