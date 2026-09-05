import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cleanJsonResponse } from "@/lib/gemini/client";
import { generateText } from "@/lib/ai/generate";
import { withRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import type { ThermomixRecipe } from "@/types";
import { validateThermomixRecipe } from "@/lib/thermomix-validation";

// =====================================================
// Input validation
// =====================================================

const AdaptRecipeRequestSchema = z.object({
  recipeName: z.string().min(1).max(300),
  originalSteps: z.array(z.string()).min(1).max(50),
  ingredients: z.array(z.string()).optional(),
  servings: z.number().optional().default(5),
});

// Schema del OUTPUT del modelo. Validamos la respuesta de Gemini antes de
// devolverla como `thermomixRecipe`: el LLM puede omitir `thermomixSteps` o
// devolverlo con forma inesperada. Tipamos solo lo esencial que el consumidor
// renderiza por paso (stepNumber/description); `.passthrough()` conserva el
// resto (speed, temperature, time, accessory, totalTimeMinutes, etc.) sin
// imponer un esquema rigido. Generoso con opcionales para no rechazar
// respuestas validas.
const ThermomixStepSchema = z.object({
  description: z.string().min(3),
  stepNumber: z.number().int().positive(),
  speed: z.string().min(1),
  temperature: z.string().min(1),
  time: z.string().min(1),
  accessory: z.enum([
    "cuchilla",
    "mariposa",
    "cestillo",
    "varoma",
    "cubrecuchillas",
    "protector-antisalpicaduras",
    "vaso-medidor",
    "espatula",
    "ninguno",
  ]),
  accessoryEmoji: z.string().min(1),
  tip: z.string().optional(),
  mode: z
    .enum([
      "manual",
      "triturar",
      "turbo",
      "amasar",
      "coccion-lenta",
      "sous-vide",
      "fermentar",
      "espesar",
      "hervidor",
      "cocinar-arroz",
      "cocer-huevos",
      "prelavado",
      "vapor",
    ])
    .optional(),
  reverse: z.boolean().optional(),
});

const ThermomixRecipeOutputSchema = z.object({
  name: z.string().min(1),
  thermomixSteps: z.array(ThermomixStepSchema).min(2).max(20),
  totalTimeMinutes: z.number().positive(),
  manualTimeMinutes: z.number().positive(),
  timeSaved: z.string(),
  difficulty: z.enum(["fácil", "media", "avanzada"]),
  accessories: z.array(z.string()),
  tips: z.array(z.string()),
  vasoPrincipal: z.boolean(),
  varoma: z.boolean(),
  cestillo: z.boolean(),
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
        status: rateLimit.status ?? 429,
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

    // Generación de texto (DeepSeek con fallback a Gemini)
    const content = await generateText({
      prompt,
      temperature: 0.6,
      maxTokens: 4000,
      json: true,
    });
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
      const raw = JSON.parse(jsonContent);

      // Validar forma y tipos del output del modelo antes de devolverlo
      const parsed = ThermomixRecipeOutputSchema.safeParse(raw);
      if (!parsed.success) {
        logger.error("AI Thermomix adaptation failed schema validation", {
          issues: parsed.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")}: ${i.message}`),
        });
        return NextResponse.json(
          { error: "La IA devolvió una adaptación con formato inválido" },
          { status: 502 },
        );
      }
      thermomixRecipe = parsed.data as unknown as ThermomixRecipe;
      const validation = validateThermomixRecipe(thermomixRecipe);
      if (!validation.valid) {
        logger.error("AI Thermomix adaptation failed safety validation", {
          errors: validation.errors.slice(0, 8),
        });
        return NextResponse.json(
          {
            error:
              "La adaptación no pasó las validaciones de seguridad de Thermomix",
          },
          { status: 502 },
        );
      }
      thermomixRecipe.qualityWarnings = validation.warnings;
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
- Velocidades manuales: 0.5 a 10, Turbo (pulsos cortos), Cuchara o Amasar
- "Giro inverso" NO es una velocidad: indícalo con reverse: true
- Temperaturas manuales: 37°C a 120°C, Varoma, o "Sin temp" si no calienta
- Nunca inventes Alta Temperatura ni Puntos del azúcar: son modos cerrados de Cocina Guiada
- Accesorios válidos: cuchilla, mariposa, cestillo, varoma, cubrecuchillas, protector-antisalpicaduras, vaso-medidor, espatula, ninguno
- Mariposa: nunca superar velocidad 4 e indicar claramente cuándo ponerla o retirarla
- Varoma: indicar el líquido del vaso; como referencia de seguridad, al menos 250 ml por cada 15 min de vapor
- Si necesita lavar el vaso entre pasos, agrégalo como paso
- Velocidad progresiva para triturar: ir subiendo 5→7→9
- Mariposa: para montar claras, nata, mezclas suaves
- Cestillo: para cocinar al vapor dentro del vaso, colar, escurrir
- Varoma: para cocinar al vapor encima del vaso (dos bandejas)
- Giro inverso + velocidad Cuchara: para mover preparaciones delicadas sin triturarlas
- Los modos automáticos permitidos en esta guía son: manual, triturar, turbo, amasar, coccion-lenta, sous-vide, fermentar, espesar, hervidor, cocinar-arroz, cocer-huevos, prelavado y vapor

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
      "mode": "manual",
      "reverse": false,
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
- Cada paso debe indicar exactamente tiempo, temperatura, velocidad, modo, giro y accesorio
- Incluye pasos de preparación (pelar, cortar lo que no cabe en vaso)
- Incluye pasos de limpieza del vaso si se necesita entre preparaciones
- El tiempo total debe ser REALISTA para Thermomix
- El tiempo manual es una estimación de cuánto tardaría sin Thermomix
- "difficulty": "fácil" si < 8 pasos y básico, "media" si moderado, "avanzada" si complejo
- Genera entre 4 y 15 pasos según la complejidad
- Los tips deben ser prácticos y específicos de TM6`;
}
