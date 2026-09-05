import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { cleanJsonResponse, sanitizeUserInput } from "@/lib/gemini/client";
import { generateText } from "@/lib/ai/generate";
import { logger } from "@/lib/logger";

const InputSchema = z.object({
  ingredient: z.string().min(1).max(100),
  recipeName: z.string().max(200).optional(),
  reason: z.enum(["unavailable", "allergy", "diet", "preference"]).optional(),
});

export async function POST(request: NextRequest) {
  // Auth
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Rate limiting
  const rateLimit = await withRateLimit(auth.userId, "suggest-substitution");
  if (!rateLimit.allowed) {
    return NextResponse.json(rateLimit.response, {
      status: rateLimit.status ?? 429,
      headers: rateLimit.headers,
    });
  }

  let body: z.infer<typeof InputSchema>;
  try {
    const raw = await request.json();
    body = InputSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos invalidos", details: err.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  try {
    const safeIngredient = sanitizeUserInput(body.ingredient, 100);
    const safeRecipeName = body.recipeName
      ? sanitizeUserInput(body.recipeName, 200)
      : undefined;

    const reasonLine =
      body.reason === "allergy"
        ? "Razon: alergia — priorizar opciones sin alergenos comunes."
        : body.reason === "diet"
          ? "Razon: dieta vegana/vegetariana — evitar productos animales."
          : body.reason === "unavailable"
            ? "Razon: ingrediente no disponible en despensa."
            : "";

    const prompt = `Sugiere exactamente 3 sustituciones para "${safeIngredient}"${safeRecipeName ? ` en la receta "${safeRecipeName}"` : ""}.
${reasonLine}

Responde SOLO en JSON con este formato exacto:
{
  "substitutions": [
    { "name": "ingrediente sustituto", "ratio": "1:1", "notes": "nota corta sobre sabor o textura" }
  ]
}

Contexto: cocina colombiana/latinoamericana, ingredientes comunes en Colombia.`;

    const content = await generateText({
      prompt,
      temperature: 0.7,
      maxTokens: 2500,
      json: true,
    });

    const text = cleanJsonResponse(content || "{}");
    const json = JSON.parse(text);

    return NextResponse.json(json, { headers: rateLimit.headers });
  } catch (err) {
    logger.error("[suggest-substitution] Error generating substitutions", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Error al generar sustituciones" },
      { status: 500 },
    );
  }
}
