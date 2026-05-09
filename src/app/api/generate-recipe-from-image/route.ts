import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  GEMINI_CONFIG,
  cleanJsonResponse,
  base64ToGeminiFormat,
} from "@/lib/gemini/client";
import { requireAuth } from "@/lib/api/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  getCookingProfile,
  getFamilyDisplayName,
  getLocationString,
} from "@/lib/cooking-profile";

// Zod schema for input validation
const GenerateRecipeFromImageSchema = z
  .object({
    image: z.string().max(20_000_000).optional(), // base64-encoded image, ~15 MB max raw
    description: z.string().min(1).max(2000).optional(),
    type: z.enum(["breakfast", "lunch", "dinner"]).optional(),
    householdId: z.string().uuid().optional(),
  })
  .refine((data) => data.image || data.description, {
    message: "Se requiere una imagen o descripción",
  });

interface GeneratedRecipe {
  name: string;
  type: "breakfast" | "lunch" | "dinner";
  description: string;
  total: string;
  portions: {
    luis: string;
    mariana: string;
  };
  ingredients: Array<{
    name: string;
    total: string;
    luis: string;
    mariana: string;
  }>;
  steps: string[];
  tips: string;
  prep_time: number;
  cook_time: number;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const userId =
    request.headers.get("x-user-id") ||
    request.headers.get("x-forwarded-for") ||
    "anonymous";
  const rateLimit = await withRateLimit(userId, "analyze-image");
  if (!rateLimit.allowed) {
    return NextResponse.json(rateLimit.response, {
      status: 429,
      headers: rateLimit.headers,
    });
  }

  try {
    const body = await request.json();
    const parsed = GenerateRecipeFromImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { image, description, type, householdId } = parsed.data;

    // Fetch cooking profile
    const cookingProfile = await getCookingProfile(householdId);
    const familyName = getFamilyDisplayName(cookingProfile);
    const location = getLocationString(cookingProfile);

    const gemini = getGeminiClient();

    const systemPrompt = `Eres un chef experto que ayuda a ${familyName} a crear recetas. Estilo: ${cookingProfile.cooking_style}.

CONTEXTO DEL HOGAR:
- ${cookingProfile.family_size} personas en el hogar
- Ubicación: ${[cookingProfile.city, cookingProfile.region, cookingProfile.country].filter(Boolean).join(", ")}
- Prefieren cocina ${cookingProfile.cooking_style}

Tu tarea es generar una receta completa basada en la imagen o descripción proporcionada.

INSTRUCCIONES:
1. Identifica el plato y dale un nombre apropiado
2. Determina si es desayuno, almuerzo o cena
3. Lista TODOS los ingredientes con cantidades específicas
4. Calcula porciones distribuidas para ${cookingProfile.family_size} personas
5. Escribe pasos detallados de preparación
6. Incluye tips útiles

IMPORTANTE para ingredientes:
- Usa unidades apropiadas para la región (${cookingProfile.region || cookingProfile.country || "Colombia"})
- Sé específico con las cantidades (no "un poco", sino "2 cucharadas")
- Para el total, suma las cantidades de todas las porciones

Responde ÚNICAMENTE en formato JSON válido con esta estructura:
{
  "name": "Nombre del plato",
  "type": "lunch",
  "description": "Breve descripción del plato",
  "total": "Cantidad total a preparar (ej: 800g de pollo + 400ml de salsa)",
  "portions": {
    "luis": "Descripción de porción de Luis",
    "mariana": "Descripción de porción de Mariana"
  },
  "ingredients": [
    {
      "name": "Nombre del ingrediente",
      "total": "Cantidad total",
      "luis": "Porción Luis",
      "mariana": "Porción Mariana"
    }
  ],
  "steps": [
    "Paso 1 detallado",
    "Paso 2 detallado"
  ],
  "tips": "Consejos útiles para la preparación",
  "prep_time": 15,
  "cook_time": 30
}`;

    // Build content parts
    const contentParts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [];

    // Add system prompt
    contentParts.push({ text: systemPrompt });

    // Add image if provided
    if (image) {
      const imageData = base64ToGeminiFormat(image);
      contentParts.push(imageData);

      if (description) {
        contentParts.push({
          text: `Genera una receta basada en esta imagen. Información adicional del usuario: "${description}". ${type ? `Tipo de comida: ${type}` : ""}`,
        });
      } else {
        contentParts.push({
          text: `Genera una receta completa basada en esta imagen del plato. ${type ? `Tipo de comida: ${type}` : "Determina si es desayuno, almuerzo o cena."}`,
        });
      }
    } else {
      // Text only
      contentParts.push({
        text: `Genera una receta completa para: "${description}". ${type ? `Tipo de comida: ${type}` : "Determina si es desayuno, almuerzo o cena basándote en el tipo de plato."}`,
      });
    }

    // Call Gemini
    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [
        {
          role: "user",
          parts: contentParts,
        },
      ],
      config: {
        temperature: GEMINI_CONFIG.vision.temperature,
        maxOutputTokens: GEMINI_CONFIG.vision.maxOutputTokens,
        responseMimeType: "application/json",
      },
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response
    let recipeData: GeneratedRecipe;
    try {
      const jsonContent = cleanJsonResponse(content);
      recipeData = JSON.parse(jsonContent);
    } catch {
      logger.error(`Error parsing recipe response: ${content}`);
      return NextResponse.json(
        {
          error: "No se pudo generar la receta. Intenta con otra descripción.",
        },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!recipeData.name || !recipeData.ingredients || !recipeData.steps) {
      return NextResponse.json(
        { error: "La receta generada está incompleta. Intenta de nuevo." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      recipe: recipeData,
    });
  } catch (error) {
    logger.error("Error generating recipe", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error al generar la receta" },
      { status: 500 },
    );
  }
}
