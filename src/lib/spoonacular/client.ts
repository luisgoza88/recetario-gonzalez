/**
 * Cliente Spoonacular API.
 * Plan gratis: 150 requests/día.
 * Ver: https://spoonacular.com/food-api
 *
 * Variable env requerida: SPOONACULAR_API_KEY
 */

const BASE_URL = "https://api.spoonacular.com";

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  extendedIngredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    original: string;
  }>;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

export interface SearchOptions {
  query?: string;
  ingredients?: string[];
  cuisine?: string;
  diet?: string; // "vegan", "vegetarian", etc.
  intolerances?: string[];
  maxReadyTime?: number;
  number?: number; // results per page
  language?: "es" | "en";
}

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw new Error(
      "SPOONACULAR_API_KEY not configured. Get one at https://spoonacular.com/food-api",
    );
  }
  return key;
}

/**
 * Buscar recetas por query con filtros opcionales.
 */
export async function searchRecipes(
  options: SearchOptions,
): Promise<SpoonacularRecipe[]> {
  const params = new URLSearchParams({
    apiKey: getApiKey(),
    addRecipeInformation: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
    number: String(options.number ?? 10),
  });

  if (options.query) params.set("query", options.query);
  if (options.cuisine) params.set("cuisine", options.cuisine);
  if (options.diet) params.set("diet", options.diet);
  if (options.intolerances?.length)
    params.set("intolerances", options.intolerances.join(","));
  if (options.maxReadyTime)
    params.set("maxReadyTime", String(options.maxReadyTime));

  const url = `${BASE_URL}/recipes/complexSearch?${params}`;
  const res = await fetch(url, { next: { revalidate: 86400 } }); // Cache 1 día

  if (!res.ok) {
    if (res.status === 402)
      throw new Error("Spoonacular quota exceeded for today");
    throw new Error(`Spoonacular error: ${res.status}`);
  }

  const data = await res.json();
  return data.results || [];
}

/**
 * Buscar por ingredientes disponibles - usa endpoint findByIngredients.
 */
export async function findByIngredients(
  ingredients: string[],
  options?: { number?: number; ranking?: 1 | 2 },
): Promise<SpoonacularRecipe[]> {
  const params = new URLSearchParams({
    apiKey: getApiKey(),
    ingredients: ingredients.join(","),
    number: String(options?.number ?? 10),
    ranking: String(options?.ranking ?? 1), // 1: maximize used ingredients, 2: minimize missing
    ignorePantry: "true",
  });

  const res = await fetch(`${BASE_URL}/recipes/findByIngredients?${params}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`Spoonacular error: ${res.status}`);
  return res.json();
}

/**
 * Convertir Spoonacular recipe a formato interno de la app.
 */
export function spoonacularToInternal(s: SpoonacularRecipe) {
  return {
    id: `sp_${s.id}`,
    name: s.title,
    description: s.summary?.replace(/<[^>]+>/g, "").slice(0, 200),
    image_url: s.image,
    prep_time: 0,
    cook_time: s.readyInMinutes,
    total_time: s.readyInMinutes,
    total_servings: s.servings,
    ingredients: s.extendedIngredients.map((i) => ({
      name: i.name,
      quantity: String(i.amount),
      unit: i.unit,
    })),
    steps: s.analyzedInstructions[0]?.steps.map((step) => step.step) || [],
    source: "spoonacular" as const,
    region: "internacional",
    moods:
      s.diets.includes("vegan") || s.diets.includes("vegetarian")
        ? ["saludable"]
        : [],
    tags: [...s.cuisines, ...s.dishTypes],
  };
}
