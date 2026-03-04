import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  cleanJsonResponse,
  geminiWithRetry,
} from "@/lib/gemini/client";
import { withRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import type { ThermomixRecipe } from "@/types";

// =====================================================
// Input validation
// =====================================================

const AdaptRecipeRequestSchema = z.object({
  recipeName: z.string().min(1).max(300),
  originalSteps: z.array(z.string()).min(1).max(50),
  ingredients: z.array(z.string()).optional(),
  servings: z.number().optional().default(5),
});

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
    let body: z.infer<typeof AdaptRecipeRequestSchema>;
    try {
      const rawBody = await request.json();
      body = AdaptRecipeRequestSchema.parse(rawBody);
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

    const { recipeName, originalSteps, ingredients, servings } = body;

    // Build the prompt
    const prompt = buildThermomixPrompt(
      recipeName,
      originalSteps,
      ingredients,
      servings,
    );

    // Call Gemini
    const gemini = getGeminiClient();
    const response = await geminiWithRetry(() =>
      gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.6,
          maxOutputTokens: 4000,
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
    let thermomixRecipe: ThermomixRecipe;
    try {
      const jsonContent = cleanJsonResponse(content);
      thermomixRecipe = JSON.parse(jsonContent);

      // Validate structure
      if (
        !thermomixRecipe.thermomixSteps ||
        !Array.isArray(thermomixRecipe.thermomixSteps)
      ) {
        throw new Error(
          "Invalid Thermomix recipe structure: missing thermomixSteps",
        );
      }
    } catch (parseError) {
      logger.error("JSON parse error for Thermomix adaptation", {
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      return NextResponse.json(
        {
          error: "Error al procesar la adaptación Thermomix. Intenta de nuevo.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      thermomixRecipe,
    });
  } catch (error) {
    logger.error("Adapt recipe thermomix error", {
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

function buildThermomixPrompt(
  recipeName: string,
  originalSteps: string[],
  ingredients?: string[],
  servings: number = 5,
): string {
  const ingredientsList =
    ingredients && ingredients.length > 0
      ? `\nINGREDIENTES:\n${ingredients.map((i) => `- ${i}`).join("\n")}`
      : "";

  return `Eres un experto en Thermomix TM6. Tu trabajo es convertir recetas normales a instrucciones
paso a paso optimizadas para Thermomix TM6.

RECETA A ADAPTAR: "${recipeName}"
PORCIONES: ${servings} (Luis come 3, Mariana come 2)
${ingredientsList}

PASOS ORIGINALES:
${originalSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

REGLAS THERMOMIX TM6:
- Capacidad vaso principal: 2.2L máximo
- Velocidades: 1 a 10, Turbo (pulsos cortos), Spátula (velocidad cuchara, giro inverso)
- Temperaturas: 37°C a 120°C, Varoma (aprox 120°C con vapor), o "Sin temp" si no calienta
- Accesorios: Cuchilla (🔪), Mariposa (🦋), Cestillo (🧺), Varoma (🫕)
- Si necesita lavar el vaso entre pasos, agrégalo como paso
- Velocidad progresiva para triturar: ir subiendo 5→7→9
- Mariposa: para montar claras, nata, mezclas suaves
- Cestillo: para cocinar al vapor dentro del vaso, colar, escurrir
- Varoma: para cocinar al vapor encima del vaso (dos bandejas)
- Giro inverso (spátula): para sofritos sin triturar

FORMATO DE RESPUESTA - JSON ESTRICTO:
{
  "name": "${recipeName} (TM6)",
  "thermomixSteps": [
    {
      "stepNumber": 1,
      "description": "Descripción clara del paso",
      "speed": "5",
      "temperature": "Sin temp",
      "time": "10 seg",
      "accessory": "cuchilla",
      "accessoryEmoji": "🔪",
      "tip": "Tip opcional (solo si agrega valor)"
    }
  ],
  "totalTimeMinutes": 25,
  "manualTimeMinutes": 45,
  "timeSaved": "Ahorra 20 min",
  "difficulty": "fácil",
  "accessories": ["Cuchilla", "Varoma"],
  "tips": ["Tip general 1", "Tip general 2"],
  "vasoPrincipal": true,
  "varoma": false,
  "cestillo": false
}

IMPORTANTE:
- Cada paso debe ser claro y específico para Thermomix
- Incluye pasos de preparación (pelar, cortar lo que no cabe en vaso)
- Incluye pasos de limpieza del vaso si se necesita entre preparaciones
- El tiempo total debe ser REALISTA para Thermomix
- El tiempo manual es una estimación de cuánto tardaría sin Thermomix
- "difficulty": "fácil" si < 8 pasos y básico, "media" si moderado, "avanzada" si complejo
- Genera entre 4 y 15 pasos según la complejidad
- Los tips deben ser prácticos y específicos de TM6`;
}
