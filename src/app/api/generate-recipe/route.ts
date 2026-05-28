import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  GEMINI_CONFIG,
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
import { type Mood, MOODS } from "@/lib/moods";
import { getAvoidPromptSection } from "@/lib/recipe-recommendations";

// Zod schemas for input validation
const IngredientWithContextSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(100),
  category: z.string().max(100).optional(),
  isCustom: z.boolean().optional(),
});

const RecipeStyleSchema = z.enum([
  "saludable",
  "rapida",
  "economica",
  "alta-proteina",
  "baja-carbohidrato",
  "vegetariana",
  "comfort",
  "ligera",
]);

const MoodSchema = z.enum([
  "nutritivo",
  "saludable",
  "antojo",
  "tradicional",
  "rapido",
  "economico",
  "sorpresa",
]);

const GenerateRecipeRequestSchema = z.object({
  availableIngredients: z.union([
    z.array(z.string().min(1).max(200)).min(1).max(100),
    z.array(IngredientWithContextSchema).min(1).max(100),
  ]),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  servings: z.number().min(1).max(20).optional(),
  preferences: z.array(z.string().max(200)).max(10).optional(),
  recipeStyle: RecipeStyleSchema.optional(),
  recentRecipes: z.array(z.string().max(200)).max(20).optional(),
  ingredientsByCategory: z
    .record(z.string(), z.array(z.string().max(200)))
    .optional(),
  customItems: z.array(z.string().max(200)).max(50).optional(),
  generateImage: z.boolean().optional(),
  householdId: z.string().uuid().optional(),
  mood: MoodSchema.optional(),
});

// Schema del OUTPUT del modelo. Validamos la respuesta de Gemini antes de
// usarla/persistirla: el LLM puede devolver tipos inesperados (ej. quantity
// como objeto, ingredients ausente). `.passthrough()` conserva campos extra
// (luis, mariana, moods, available, etc.) sin imponer un esquema rigido.
const GeneratedRecipeSchema = z
  .object({
    name: z.string().min(1),
    ingredients: z
      .array(z.object({ name: z.string().min(1) }).passthrough())
      .min(1),
    steps: z.array(z.unknown()).min(1),
  })
  .passthrough();

function getSupabase() {
  return createServiceRoleClient();
}

interface IngredientWithContext {
  name: string;
  quantity: string;
  category?: string;
  isCustom?: boolean;
}

// Tipos de receta disponibles
export type RecipeStyle =
  | "saludable" // Balanceada, nutritiva
  | "rapida" // Menos de 30 minutos
  | "economica" // Ingredientes económicos
  | "alta-proteina" // Rica en proteínas
  | "baja-carbohidrato" // Low carb / keto friendly
  | "vegetariana" // Sin carne
  | "comfort" // Reconfortante, tradicional
  | "ligera"; // Baja en calorías

interface GenerateRecipeRequest {
  availableIngredients: string[] | IngredientWithContext[];
  mealType: "breakfast" | "lunch" | "dinner";
  servings?: number;
  preferences?: string[];
  recipeStyle?: RecipeStyle;
  recentRecipes?: string[];
  ingredientsByCategory?: Record<string, string[]>;
  customItems?: string[];
  generateImage?: boolean; // Nueva opción para generar imagen junto con la receta
  householdId?: string;
  mood?: Mood;
}

interface Preparation {
  name: string;
  ingredients: string[];
  description?: string;
}

// Obtener preparaciones disponibles basadas en ingredientes
async function getAvailablePreparations(
  availableIngredients: string[],
): Promise<Preparation[]> {
  try {
    const { data: preparations } = (await getSupabase()
      .from("preparations")
      .select("name, ingredients, description")) as {
      data: Array<{
        name: string;
        ingredients: unknown;
        description: unknown;
      }> | null;
    };

    if (!preparations) return [];

    // Normalizar ingredientes disponibles para comparación
    const normalizedAvailable = availableIngredients.map((ing) =>
      ing
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split("(")[0]
        .trim(),
    );

    // Filtrar preparaciones que se pueden hacer (70%+ ingredientes disponibles)
    return preparations
      .filter((prep) => {
        const prepIngredients = prep.ingredients as string[];
        if (!prepIngredients || prepIngredients.length === 0) return false;

        let available = 0;
        for (const ing of prepIngredients) {
          const normalizedIng = ing
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          if (
            normalizedAvailable.some(
              (avail) =>
                avail.includes(normalizedIng) || normalizedIng.includes(avail),
            )
          ) {
            available++;
          }
        }

        return available / prepIngredients.length >= 0.7;
      })
      .map((p) => ({
        name: p.name,
        ingredients: p.ingredients as string[],
        description: p.description as string | undefined,
      }));
  } catch (error) {
    logger.error("Error loading preparations", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// Obtener recetas recientes para evitar repetición
async function getRecentRecipeNames(): Promise<string[]> {
  try {
    const { data: feedback } = (await getSupabase()
      .from("meal_feedback")
      .select("recipe_name")
      .order("created_at", { ascending: false })
      .limit(10)) as { data: Array<{ recipe_name: string | null }> | null };

    if (!feedback) return [];
    return feedback.map((f) => f.recipe_name).filter(Boolean) as string[];
  } catch (error) {
    logger.error("Error loading recent recipes", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Rate limiting - usar user ID del header (set by middleware) o IP como fallback
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

    const gemini = getGeminiClient();

    // Parse and validate request body with Zod
    let body: GenerateRecipeRequest;
    try {
      const rawBody = await request.json();
      body = GenerateRecipeRequestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Datos de entrada inválidos",
            details: validationError.issues.map(
              (e) => `${e.path.join(".")}: ${e.message}`,
            ),
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Error parsing request body" },
        { status: 400 },
      );
    }

    const {
      availableIngredients,
      mealType,
      servings = 5,
      preferences = [],
      recipeStyle = "saludable",
      recentRecipes = [],
      ingredientsByCategory,
      customItems = [],
      generateImage = false,
      householdId,
      mood,
    } = body;

    // Fetch cooking profile for this household
    const cookingProfile = await getCookingProfile(householdId);
    const familyName = getFamilyDisplayName(cookingProfile);
    const location = getLocationString(cookingProfile);

    // Instrucciones específicas según el estilo de receta
    const styleInstructions: Record<RecipeStyle, string> = {
      saludable:
        "La receta debe ser balanceada y nutritiva, con buen aporte de proteínas, carbohidratos complejos y vegetales.",
      rapida:
        "IMPORTANTE: La receta debe poder prepararse en MENOS DE 30 MINUTOS en total. Prioriza técnicas de cocción rápidas.",
      economica:
        "Usa ingredientes económicos y aprovecha al máximo los ingredientes disponibles. Evita ingredientes costosos.",
      "alta-proteina":
        "La receta debe ser ALTA EN PROTEÍNAS (mínimo 25g por porción). Prioriza carnes, huevos, legumbres o lácteos.",
      "baja-carbohidrato":
        "La receta debe ser BAJA EN CARBOHIDRATOS (menos de 20g por porción). Evita arroz, pasta, pan y azúcares.",
      vegetariana:
        "La receta debe ser VEGETARIANA. NO uses ningún tipo de carne, pollo, pescado o mariscos.",
      comfort:
        "La receta debe ser reconfortante y tradicional colombiana/latinoamericana. Sabores caseros y abundantes.",
      ligera:
        "La receta debe ser LIGERA y baja en calorías (menos de 350 kcal por porción). Prioriza vegetales y proteínas magras.",
    };

    const selectedStyleInstruction =
      styleInstructions[recipeStyle] || styleInstructions["saludable"];

    if (!availableIngredients || availableIngredients.length === 0) {
      return NextResponse.json(
        { error: "No ingredients provided" },
        { status: 400 },
      );
    }

    // Normalizar y sanitizar ingredientes a string[]
    const ingredientsList = availableIngredients.map((ing) => {
      const text =
        typeof ing === "string" ? ing : `${ing.name} (${ing.quantity})`;
      return sanitizeUserInput(text, 200); // Limitar longitud por ingrediente
    });

    // Obtener preparaciones disponibles, recetas recientes y recetas a evitar
    const [availablePreparations, dbRecentRecipes, lowRatedSection] =
      await Promise.all([
        getAvailablePreparations(ingredientsList),
        getRecentRecipeNames(),
        getAvoidPromptSection(householdId),
      ]);

    // Combinar recetas recientes del request y de la base de datos
    const allRecentRecipes = [
      ...new Set([...recentRecipes, ...dbRecentRecipes]),
    ];

    const mealTypeLabels = {
      breakfast: "desayuno",
      lunch: "almuerzo",
      dinner: "cena",
    };

    // Construir sección de preparaciones disponibles
    let preparationsSection = "";
    if (availablePreparations.length > 0) {
      preparationsSection = `
PREPARACIONES CASERAS DISPONIBLES:
${availablePreparations.map((p) => `- ${p.name}: hecha con ${p.ingredients.join(", ")}`).join("\n")}

Puedes usar estas preparaciones como ingredientes ya listos en tu receta.
`;
    }

    // Construir sección de recetas a evitar
    let avoidSection = "";
    if (allRecentRecipes.length > 0) {
      avoidSection = `
RECETAS A EVITAR (ya consumidas recientemente):
${allRecentRecipes
  .slice(0, 5)
  .map((r) => `- ${r}`)
  .join("\n")}

Por favor NO sugieras estas recetas ni variaciones muy similares.
`;
    }

    // Construir sección de ingredientes por categoría (si está disponible)
    let ingredientsSection = "";
    if (
      ingredientsByCategory &&
      Object.keys(ingredientsByCategory).length > 0
    ) {
      ingredientsSection = Object.entries(ingredientsByCategory)
        .map(
          ([category, items]) =>
            `${category}:\n${items.map((i) => `  - ${i}`).join("\n")}`,
        )
        .join("\n\n");
    } else {
      ingredientsSection = ingredientsList.join("\n");
    }

    // Construir sección de items personalizados (sanitizados)
    let customSection = "";
    if (customItems.length > 0) {
      const sanitizedCustomItems = customItems.map((c) =>
        sanitizeUserInput(c, 200),
      );
      customSection = `
INGREDIENTES ESPECIALES (Compras recientes/regalos que queremos usar):
${sanitizedCustomItems.map((c) => `- ${c}`).join("\n")}

PRIORIZA usar estos ingredientes especiales! La familia los tiene disponibles y quiere aprovecharlos.
`;
    }

    // Sanitizar preferencias
    const sanitizedPreferences = preferences.map((p) =>
      sanitizeUserInput(p, 200),
    );

    // Build mood section if provided
    let moodSection = "";
    if (mood && mood !== "sorpresa") {
      const moodData = MOODS.find((m) => m.id === mood);
      if (moodData) {
        moodSection = `
MOOD SOLICITADO: ${moodData.label} ${moodData.emoji} - ${moodData.description}
La receta DEBE alinearse con este mood. Prioriza características propias del mood.
`;
      }
    }

    const prompt = `Eres un chef profesional especializado en cocina ${cookingProfile.cooking_style || "colombiana y latinoamericana saludable"}.
Trabajas para ${familyName} ${location}. Cocinas para ${cookingProfile.family_size} personas.

INGREDIENTES DISPONIBLES EN LA DESPENSA:
${ingredientsSection}
${customSection}${preparationsSection}${avoidSection}${lowRatedSection}${moodSection}
REQUERIMIENTOS:
- Tipo de comida: ${mealTypeLabels[mealType]}
- Porciones totales: ${servings}
- Estilo de receta: ${recipeStyle.toUpperCase()}
- ${selectedStyleInstruction}
- Preferencias adicionales: ${sanitizedPreferences.length > 0 ? sanitizedPreferences.join(", ") : "Fácil de preparar"}
- Estilo de cocina del hogar: ${cookingProfile.cooking_style}
- Región: ${cookingProfile.region || cookingProfile.country || "Colombia"}

CONTEXTO IMPORTANTE:
- Prioriza usar ingredientes que YA están disponibles
- Puedes usar las preparaciones caseras listadas arriba como ingredientes listos
- Minimiza ingredientes adicionales necesarios
- Las recetas deben ser prácticas para una familia de ${cookingProfile.family_size} personas

INSTRUCCIONES:
Genera UNA receta saludable y deliciosa que pueda prepararse PRINCIPALMENTE con los ingredientes disponibles.
Si necesitas algún ingrediente básico adicional (sal, aceite, especias comunes), indícalo.

Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:
{
  "name": "Nombre de la receta",
  "description": "Breve descripción de la receta (1-2 oraciones)",
  "type": "${mealType}",
  "prepTime": "tiempo de preparación",
  "cookTime": "tiempo de cocción",
  "totalTime": "tiempo total",
  "servings": ${servings},
  "calories": "calorías aproximadas por porción",
  "ingredients": [
    {
      "name": "ingrediente",
      "total": "cantidad total para 5 porciones",
      "luis": "cantidad para 3 porciones",
      "mariana": "cantidad para 2 porciones",
      "available": true o false (si está en los ingredientes disponibles)
    }
  ],
  "steps": [
    "Paso 1...",
    "Paso 2..."
  ],
  "tips": "Consejos adicionales para la receta",
  "nutritionHighlights": ["Alto en proteína", "Bajo en carbohidratos", etc.],
  "usedIngredients": ["lista de ingredientes disponibles que se usaron"],
  "additionalIngredients": ["ingredientes adicionales necesarios (si hay)"],
  "usedPreparations": ["lista de preparaciones caseras usadas (si aplica)"],
  "moods": ["moods aplicables a esta receta, ej: nutritivo, saludable"]
}`;

    // Llamar a Gemini con retry automático
    const response = await geminiWithRetry(() =>
      gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        config: {
          temperature: GEMINI_CONFIG.recipe.temperature,
          maxOutputTokens: GEMINI_CONFIG.recipe.maxOutputTokens,
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

    // Parse JSON response with robust cleaning
    try {
      const jsonContent = cleanJsonResponse(content);
      const rawRecipe = JSON.parse(jsonContent);

      // Validar forma y tipos del output del modelo (no solo truthy)
      const parsedRecipe = GeneratedRecipeSchema.safeParse(rawRecipe);
      if (!parsedRecipe.success) {
        logger.error("AI recipe failed schema validation", {
          issues: parsedRecipe.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")}: ${i.message}`),
        });
        return NextResponse.json(
          { error: "La IA devolvió una receta con formato inválido" },
          { status: 502 },
        );
      }
      const recipe = parsedRecipe.data;

      // Si se solicitó generar imagen, hacerlo de forma asíncrona
      let recipeImage = null;
      if (generateImage) {
        try {
          // Generar imagen con Gemini
          const ingredientNames = recipe.ingredients
            .map((ing: { name: string }) => ing.name)
            .slice(0, 5);

          const imagePrompt = `Genera una fotografía profesional de comida del plato "${recipe.name}".
${recipe.description ? `Descripción: ${recipe.description}` : ""}
Ingredientes principales: ${ingredientNames.join(", ")}.
Estilo: Fotografía gastronómica profesional, luz natural, plato emplatado elegantemente, fondo desenfocado.`;

          const imageResponse = await geminiWithRetry(() =>
            gemini.models.generateContent({
              model: GEMINI_MODELS.FLASH_IMAGE,
              contents: [
                {
                  role: "user",
                  parts: [{ text: imagePrompt }],
                },
              ],
              config: {
                responseModalities: ["image", "text"],
                responseMimeType: "image/png",
              },
            }),
          );

          const imageParts = imageResponse.candidates?.[0]?.content?.parts;
          if (imageParts) {
            for (const part of imageParts) {
              if (part.inlineData) {
                recipeImage = `data:image/png;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imageError) {
          logger.error("Error generating recipe image", {
            error:
              imageError instanceof Error
                ? imageError.message
                : String(imageError),
          });
          // No fallar si la imagen no se genera
        }
      }

      return NextResponse.json({
        success: true,
        recipe,
        image: recipeImage,
      });
    } catch (parseError) {
      logger.error("JSON parse error", {
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      logger.error(`Raw content: ${content.slice(0, 500)}`);

      return NextResponse.json(
        {
          error:
            "Error al procesar la receta generada. Por favor intenta de nuevo.",
          details:
            parseError instanceof Error ? parseError.message : "Parse error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Generate recipe error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
