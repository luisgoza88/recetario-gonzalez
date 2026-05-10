import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  cleanJsonResponse,
  geminiWithRetry,
  sanitizeUserInput,
} from "@/lib/gemini/client";
import { withRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  getCookingProfile,
  getFamilyDisplayName,
  getLocationString,
} from "@/lib/cooking-profile";
import type { CookingProfile } from "@/types";
import { getSeasonalPromptText } from "@/data/colombian-seasons";
import type { Mood } from "@/lib/moods";
import {
  getHouseholdMoodPatterns,
  formatMoodPatternsForPrompt,
} from "@/lib/mood-learning";
import { getAvoidPromptSection } from "@/lib/recipe-recommendations";

// =====================================================
// Input validation
// =====================================================

const GenerateWeeklyMenuRequestSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  householdId: z.string().uuid().optional(),
  preferences: z
    .object({
      excludeRecent: z.number().min(0).max(8).optional(),
      style: z.string().max(200).optional(),
      prioritizeThermomix: z.boolean().optional(),
    })
    .optional(),
  desiredMoods: z.record(z.string(), z.string()).optional(),
});

// =====================================================
// Supabase client (server-side, service role for DB ops)
// =====================================================

function getSupabase() {
  return createServiceRoleClient();
}

// =====================================================
// Data fetching helpers
// =====================================================

interface InventoryItemRow {
  current_number: number;
  market_items: { name: string; category: string } | null;
}

async function getAvailableInventory(): Promise<string[]> {
  try {
    const { data } = (await getSupabase()
      .from("inventory")
      .select("current_number, market_items(name, category)")
      .gt("current_number", 0)) as { data: InventoryItemRow[] | null };

    if (!data) return [];
    return data
      .filter((item) => item.market_items)
      .map(
        (item) =>
          `${item.market_items!.name} (${item.current_number} disponible)`,
      );
  } catch (error) {
    logger.error("Error loading inventory", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function getMarketItems(): Promise<string[]> {
  try {
    const { data } = (await getSupabase()
      .from("market_items")
      .select("name, category")
      .order("category")) as {
      data: Array<{ name: string; category: string }> | null;
    };

    if (!data) return [];
    return data.map((item) => item.name);
  } catch (error) {
    logger.error("Error loading market items", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

interface FeedbackRow {
  recipe_name: string | null;
  star_rating: number | null;
  would_repeat: boolean | null;
  notes: string | null;
}

async function getRecentMenuRecipes(weeksBack: number = 3): Promise<string[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7);

    const { data } = (await getSupabase()
      .from("generated_menus")
      .select("menu_data")
      .gte("week_start_date", cutoffDate.toISOString().split("T")[0])
      .order("week_start_date", { ascending: false })) as {
      data: Array<{ menu_data: unknown }> | null;
    };

    if (!data) return [];

    const recipeNames: string[] = [];
    for (const menu of data) {
      const menuData = menu.menu_data as Array<{
        breakfast?: { name?: string } | null;
        lunch?: { name?: string } | null;
        dinner?: { name?: string } | null;
      }>;
      if (!Array.isArray(menuData)) continue;
      for (const day of menuData) {
        if (day.breakfast?.name) recipeNames.push(day.breakfast.name);
        if (day.lunch?.name) recipeNames.push(day.lunch.name);
        if (day.dinner?.name) recipeNames.push(day.dinner.name);
      }
    }
    return [...new Set(recipeNames)];
  } catch (error) {
    logger.error("Error loading recent menus", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function getMealFeedback(): Promise<{
  liked: string[];
  disliked: string[];
}> {
  try {
    const { data } = (await getSupabase()
      .from("meal_feedback")
      .select("recipe_name, star_rating, would_repeat, notes")
      .not("recipe_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(50)) as { data: FeedbackRow[] | null };

    if (!data) return { liked: [], disliked: [] };

    const liked: string[] = [];
    const disliked: string[] = [];

    for (const fb of data) {
      if (!fb.recipe_name) continue;
      if ((fb.star_rating && fb.star_rating >= 4) || fb.would_repeat === true) {
        liked.push(fb.recipe_name);
      }
      if (
        (fb.star_rating && fb.star_rating <= 2) ||
        fb.would_repeat === false
      ) {
        disliked.push(fb.recipe_name);
      }
    }

    return {
      liked: [...new Set(liked)],
      disliked: [...new Set(disliked)],
    };
  } catch (error) {
    logger.error("Error loading feedback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { liked: [], disliked: [] };
  }
}

interface DietaryPreferencesRow {
  restrictions?: string[];
  allergies?: string[];
  preferences?: string[];
  avoid_ingredients?: string[];
}

async function getHouseholdDietaryPreferences(
  householdId?: string,
): Promise<DietaryPreferencesRow | null> {
  if (!householdId) return null;
  try {
    const { data } = await getSupabase()
      .from("households")
      .select("dietary_preferences")
      .eq("id", householdId)
      .single();

    if (!data?.dietary_preferences) return null;
    return data.dietary_preferences as DietaryPreferencesRow;
  } catch (error) {
    logger.error("Error loading dietary preferences", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

interface PreparationRow {
  name: string;
  ingredients: string[];
  description?: string;
}

async function getPreparations(): Promise<PreparationRow[]> {
  try {
    const { data } = (await getSupabase()
      .from("preparations")
      .select("name, ingredients, description")) as {
      data: PreparationRow[] | null;
    };

    return data || [];
  } catch (error) {
    logger.error("Error loading preparations", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// =====================================================
// Day name helpers
// =====================================================

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function getWeekDates(
  weekStartDate: string,
): Array<{ dayNumber: number; dayName: string; date: string }> {
  const start = new Date(weekStartDate + "T12:00:00"); // avoid timezone issues
  const days: Array<{ dayNumber: number; dayName: string; date: string }> = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({
      dayNumber: i,
      dayName: DAY_NAMES[i],
      date: d.toISOString().split("T")[0],
    });
  }
  return days;
}

// =====================================================
// POST handler
// =====================================================

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Rate limit
    const userId =
      request.headers.get("x-user-id") ||
      request.headers.get("x-forwarded-for") ||
      "anonymous";
    const rateLimit = await withRateLimit(userId, "generate-recipe");
    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimit.response, {
        status: 429,
        headers: rateLimit.headers,
      });
    }

    // Parse & validate
    let body: z.infer<typeof GenerateWeeklyMenuRequestSchema>;
    try {
      const rawBody = await request.json();
      body = GenerateWeeklyMenuRequestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Datos inválidos",
            details: validationError.issues.map(
              (e) => `${e.path.join(".")}: ${e.message}`,
            ),
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Error parsing request" },
        { status: 400 },
      );
    }

    const { weekStartDate, householdId, preferences, desiredMoods } = body;
    const excludeRecentWeeks = preferences?.excludeRecent ?? 3;
    const style = preferences?.style
      ? sanitizeUserInput(preferences.style, 200)
      : "colombiana casera con variaciones internacionales";
    const prioritizeThermomix = preferences?.prioritizeThermomix ?? false;

    // Gather context in parallel
    const [
      inventory,
      marketItems,
      recentRecipes,
      feedback,
      preparations,
      expandedRecipeNames,
      cookingProfile,
      dietaryPreferences,
      moodPatterns,
      avoidSection,
    ] = await Promise.all([
      getAvailableInventory(),
      getMarketItems(),
      getRecentMenuRecipes(excludeRecentWeeks),
      getMealFeedback(),
      getPreparations(),
      getExpandedRecipeNames(),
      getCookingProfile(householdId),
      getHouseholdDietaryPreferences(householdId),
      householdId
        ? getHouseholdMoodPatterns(householdId)
        : Promise.resolve(null),
      getAvoidPromptSection(householdId),
    ]);

    const weekDays = getWeekDates(weekStartDate);

    // Build the prompt
    const prompt = buildPrompt({
      weekDays,
      inventory,
      marketItems,
      recentRecipes,
      feedback,
      preparations,
      style,
      prioritizeThermomix,
      expandedRecipeNames,
      cookingProfile,
      dietaryPreferences,
      desiredMoods: desiredMoods as Record<string, Mood> | undefined,
      moodPatterns: formatMoodPatternsForPrompt(moodPatterns),
      avoidSection,
    });

    // Call Gemini
    const gemini = getGeminiClient();
    const response = await geminiWithRetry(() =>
      gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.8,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
        },
      }),
    );

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 },
      );
    }

    // Parse the response
    let menuData;
    try {
      const jsonContent = cleanJsonResponse(content);
      menuData = JSON.parse(jsonContent);

      // Validate structure
      if (!menuData.days || !Array.isArray(menuData.days)) {
        throw new Error("Invalid menu structure: missing days array");
      }
    } catch (parseError) {
      logger.error("JSON parse error for weekly menu", {
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      return NextResponse.json(
        { error: "Error al procesar el menú generado. Intenta de nuevo." },
        { status: 500 },
      );
    }

    // Store in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedMenu, error: saveError } = await (getSupabase() as any)
      .from("generated_menus")
      .insert({
        household_id: householdId || null,
        week_start_date: weekStartDate,
        status: "draft",
        menu_data: menuData.days,
        generated_by: "ai",
      })
      .select()
      .single();

    if (saveError) {
      logger.error("Error saving generated menu", { error: saveError.message });
      // Still return the menu even if save fails
      return NextResponse.json({
        success: true,
        menu: {
          id: null,
          week_start_date: weekStartDate,
          status: "draft",
          menu_data: menuData.days,
          generated_by: "ai",
        },
        saveError: "No se pudo guardar en la base de datos",
      });
    }

    return NextResponse.json({
      success: true,
      menu: savedMenu,
    });
  } catch (error) {
    logger.error("Generate weekly menu error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =====================================================
// Prompt builder
// =====================================================

// Lazy-load expanded recipe names to avoid bloating the bundle at module level
async function getExpandedRecipeNames(): Promise<string[]> {
  try {
    const { getRecipeNamesForPrompt } = await import("@/data/expanded-recipes");
    return getRecipeNamesForPrompt();
  } catch {
    return [];
  }
}

function buildDietarySection(prefs?: DietaryPreferencesRow | null): string {
  if (!prefs) return "";

  const restrictions = prefs.restrictions || [];
  const allergies = prefs.allergies || [];
  const preferences = prefs.preferences || [];
  const avoidIngredients = prefs.avoid_ingredients || [];

  // If everything is empty, skip the section
  if (
    restrictions.length === 0 &&
    allergies.length === 0 &&
    preferences.length === 0 &&
    avoidIngredients.length === 0
  ) {
    return "";
  }

  return `
RESTRICCIONES DIETÉTICAS DEL HOGAR:
- Restricciones: ${restrictions.join(", ") || "Ninguna"}
- Alergias: ${allergies.join(", ") || "Ninguna"}
- Preferencias: ${preferences.join(", ") || "Ninguna"}
- Ingredientes a evitar: ${avoidIngredients.join(", ") || "Ninguno"}

IMPORTANTE: NUNCA incluyas ingredientes que contengan alérgenos listados. Respeta estrictamente todas las restricciones alimentarias. Si el hogar es vegetariano o vegano, NO incluyas carne, pollo, pescado ni mariscos. Si hay alergias, verifica que NINGÚN ingrediente contenga el alérgeno.`;
}

function buildMoodSection(desiredMoods?: Record<string, Mood>): string {
  const userMoodsLines =
    desiredMoods && Object.keys(desiredMoods).length > 0
      ? Object.entries(desiredMoods)
          .map(([day, mood]) => `  - Día ${day}: ${mood}`)
          .join("\n")
      : null;

  return `DISTRIBUCIÓN DE VARIEDAD SEMANAL OBLIGATORIA:
Cada día debe tener un mood asignado para evitar monotonía.
${userMoodsLines ? `Moods solicitados por el usuario (RESPETAR EXACTAMENTE):\n${userMoodsLines}\n` : ""}Para los días sin mood especificado, distribuye así:
- 2 días Nutritivo (ideal lunes/jueves para semana activa)
- 2 días Saludable (martes/miércoles para mantener equilibrio)
- 1 día Tradicional Colombia (sábado familiar)
- 1 día Antojo (viernes premio)
- 1 día Rápido (cualquiera con tiempo limitado)

REGLAS ANTI-MONOTONÍA (CRÍTICAS):
1. NO repetir la misma proteína principal en días consecutivos
2. NO repetir el mismo mood 2 días seguidos
3. ALTERNAR técnicas de cocción: horneado, sartén, sopa, ensalada, parrilla, plancha
4. Si una receta tuvo feedback < 3 estrellas en los últimos 30 días, NO sugerirla
5. Variar regiones colombianas si mood=tradicional (no solo paisa, también costeño, llanero, etc.)`;
}

function buildPrompt(ctx: {
  weekDays: Array<{ dayNumber: number; dayName: string; date: string }>;
  inventory: string[];
  marketItems: string[];
  recentRecipes: string[];
  feedback: { liked: string[]; disliked: string[] };
  preparations: PreparationRow[];
  style: string;
  prioritizeThermomix?: boolean;
  expandedRecipeNames?: string[];
  cookingProfile: Required<CookingProfile>;
  dietaryPreferences?: DietaryPreferencesRow | null;
  desiredMoods?: Record<string, Mood>;
  moodPatterns?: string;
  avoidSection?: string;
}): string {
  const {
    weekDays,
    inventory,
    recentRecipes,
    feedback,
    preparations,
    style,
    prioritizeThermomix,
    expandedRecipeNames,
    cookingProfile,
    dietaryPreferences,
    desiredMoods,
    moodPatterns,
    avoidSection,
  } = ctx;

  const familyName = getFamilyDisplayName(cookingProfile);
  const location = getLocationString(cookingProfile);

  const inventorySection =
    inventory.length > 0
      ? `INGREDIENTES DISPONIBLES EN INVENTARIO:\n${inventory.map((i) => `- ${i}`).join("\n")}`
      : "INVENTARIO: No hay datos de inventario disponibles. Usa ingredientes comunes colombianos.";

  const preparationsSection =
    preparations.length > 0
      ? `\nPREPARACIONES CASERAS DISPONIBLES (se pueden usar como ingredientes listos):\n${preparations.map((p) => `- ${p.name}: ${(p.ingredients || []).join(", ")}`).join("\n")}`
      : "";

  const recentSection =
    recentRecipes.length > 0
      ? `\nRECETAS RECIENTES A EVITAR (no repetir):\n${recentRecipes.map((r) => `- ${r}`).join("\n")}`
      : "";

  const likedSection =
    feedback.liked.length > 0
      ? `\nRECETAS QUE LES GUSTARON (puedes inspirarte en estilos similares):\n${feedback.liked.map((r) => `- ${r}`).join("\n")}`
      : "";

  const dislikedSection =
    feedback.disliked.length > 0
      ? `\nRECETAS QUE NO LES GUSTARON (evitar estilos similares):\n${feedback.disliked.map((r) => `- ${r}`).join("\n")}`
      : "";

  const lowRatedSection = avoidSection || "";

  const expandedSection =
    expandedRecipeNames && expandedRecipeNames.length > 0
      ? `\nRECETAS DE NUESTRA BIBLIOTECA (puedes usar estas como base o crear variaciones):\n${expandedRecipeNames.map((r) => `- ${r}`).join("\n")}`
      : "";

  const daysDescription = weekDays
    .map((d) => {
      const hasDinner = d.dayNumber < 4; // Mon-Thu have dinner; Fri-Sat don't
      const dayMood = desiredMoods?.[String(d.dayNumber)];
      const moodSuffix = dayMood ? ` [mood: ${dayMood}]` : "";
      return `- ${d.dayName} (${d.date}): desayuno + almuerzo${hasDinner ? " + cena" : " (SIN CENA - salen a comer)"}${moodSuffix}`;
    })
    .join("\n");

  // Build mood distribution section
  const moodSection = buildMoodSection(desiredMoods);
  const moodPatternsSection = moodPatterns ? `\n${moodPatterns}\n` : "";

  return `Eres el chef personal de ${familyName} ${location}.
Tu trabajo es crear un menú semanal variado, delicioso y práctico.

FAMILIA:
- ${cookingProfile.family_size} miembros en el hogar.
- Total por receta: 5 porciones siempre (distribuidas según preferencias del hogar).

REGLAS DEL MENÚ:
- 6 días: Lunes a Sábado (domingos libres, no incluir)
- Viernes y sábado SIN CENA (salen a comer)
- Lunes a jueves: desayuno + almuerzo + cena
- Cada comida debe ser diferente, variada
- Estilo: ${style}
- Mezclar: colombiano casero, algo internacional, healthy, comfort food
- Incluir preparaciones base cuando aplique (hogao, chimichurri, guacamole, etc.)
- Priorizar ingredientes del inventario disponible
- Cenas más ligeras que almuerzos
- Cocina adaptada a la región: ${cookingProfile.region || "Colombia"}

DÍAS DE LA SEMANA:
${daysDescription}

${inventorySection}
${preparationsSection}
${recentSection}
${likedSection}
${dislikedSection}
${lowRatedSection}
${expandedSection}
${getSeasonalPromptText()}
${moodPatternsSection}
${moodSection}
${buildDietarySection(dietaryPreferences)}
${
  prioritizeThermomix
    ? `
THERMOMIX TM6:
La familia tiene una Thermomix TM6. Prioriza recetas que se puedan preparar fácilmente en Thermomix:
- Cremas, sopas, sofritos, arroces, masas, batidos
- Recetas con cocción al vapor (varoma)
- Evita recetas que requieren principalmente horno, plancha o freidora
- Marca las recetas adaptables a Thermomix con "thermomix_adapted": true en el JSON
`
    : ""
}
FORMATO DE RESPUESTA - JSON ESTRICTO:
Responde ÚNICAMENTE con un JSON válido con esta estructura:

{
  "days": [
    {
      "dayNumber": 0,
      "dayName": "Lunes",
      "date": "${weekDays[0]?.date || "2026-02-23"}",
      "mood": "nutritivo",
      "breakfast": {
        "name": "Nombre del desayuno",
        "description": "Descripción breve",
        "mood": "nutritivo",
        "ingredients": [
          { "name": "Ingrediente", "total": "cantidad total", "luis": "porción Luis", "mariana": "porción Mariana", "available": true }
        ],
        "steps": ["Paso 1", "Paso 2"],
        "prepTime": "10 min",
        "totalTime": "20 min",
        "tips": "Consejo opcional",
        "usedPreparations": ["Hogao"]
      },
      "lunch": { ... mismo formato con campo mood ... },
      "dinner": { ... mismo formato con campo mood ... }
    },
    ... (6 días total, viernes y sábado con dinner: null)
  ]
}

IMPORTANTE:
- Cada ingrediente debe tener "total" (5 porciones), "luis" (3 porciones), "mariana" (2 porciones)
- "available": true si el ingrediente está en el inventario
- Viernes (dayNumber 4) y Sábado (dayNumber 5): dinner DEBE ser null
- Genera exactamente 6 días (dayNumber 0-5)
- Sé creativo con los nombres de los platos
- Incluye al menos 2-3 recetas colombianas por semana
- Varía las proteínas: no repetir la misma proteína principal en días consecutivos
- Cada día y cada receta DEBE incluir el campo "mood" (nutritivo|saludable|antojo|tradicional|rapido|economico|sorpresa)`;
}
