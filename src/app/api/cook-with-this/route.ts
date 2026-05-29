import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { cleanJsonResponse } from "@/lib/gemini/client";
import { generateText } from "@/lib/ai/generate";
import { logger } from "@/lib/logger";

const InputSchema = z.object({
  ingredients: z.array(z.string().min(1).max(100)).min(1).max(20),
  householdId: z.string().uuid().optional(),
});

// Schema del OUTPUT del modelo (fallback Gemini). Validamos la respuesta antes
// de reenviarla al cliente: el LLM puede devolver `recipes` ausente o no array,
// o recetas con campos faltantes. Tipamos solo lo esencial; `.passthrough()`
// conserva campos extra y cada receta acepta forma flexible (time como string,
// missing_ingredients opcional).
const CookWithThisRecipeSchema = z
  .object({
    name: z.string().min(1),
  })
  .passthrough();

const CookWithThisOutputSchema = z
  .object({
    recipes: z.array(CookWithThisRecipeSchema).optional(),
  })
  .passthrough();

interface RecipeRow {
  id: string;
  name: string;
  ingredients: unknown;
  image_url: string | null;
  total_time: number | null;
  moods: string[] | null;
  region: string | null;
}

interface ScoredRecipe extends RecipeRow {
  matchScore: number;
  matchedIngredients: string[];
}

export async function POST(request: NextRequest) {
  // Auth
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Rate limiting
  const rateLimit = await withRateLimit(auth.userId, "cook-with-this");
  if (!rateLimit.allowed) {
    return NextResponse.json(rateLimit.response, {
      status: 429,
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
    const supabase = createServiceRoleClient();

    // Buscar recetas que usen el mayor numero de ingredientes dados
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, name, ingredients, image_url, total_time, moods, region")
      .limit(50);

    const normalizedInput = body.ingredients.map((i) => i.toLowerCase().trim());

    const scored: ScoredRecipe[] = (recipes || [])
      .map((r: RecipeRow) => {
        const recipeIngs = (
          Array.isArray(r.ingredients) ? r.ingredients : []
        ).map((i: unknown) => {
          if (typeof i === "object" && i !== null && "name" in i) {
            return String((i as { name: unknown }).name).toLowerCase();
          }
          return String(i).toLowerCase();
        });

        const matches = normalizedInput.filter((needed) =>
          recipeIngs.some((ri) => ri.includes(needed) || needed.includes(ri)),
        );

        return {
          ...r,
          matchScore: matches.length,
          matchedIngredients: matches,
        };
      })
      .filter((r) => r.matchScore >= 2)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    if (scored.length >= 3) {
      return NextResponse.json(
        { source: "database", recipes: scored },
        { headers: rateLimit.headers },
      );
    }

    // Fallback: la IA sugiere recetas con esos ingredientes
    const ingredientList = body.ingredients.join(", ");

    const prompt = `Tengo estos ingredientes disponibles: ${ingredientList}.
Sugiere 3 recetas colombianas o latinoamericanas que pueda cocinar usando principalmente estos ingredientes.
Puede faltar 1 o 2 ingredientes muy comunes (sal, aceite, cebolla, ajo).

Responde SOLO en JSON con este formato exacto:
{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "description": "Descripcion en una linea",
      "estimated_time_min": 30,
      "missing_ingredients": ["ingrediente que falta"]
    }
  ]
}`;

    const content = await generateText({
      prompt,
      temperature: 0.8,
      json: true,
    });

    const text = cleanJsonResponse(content || "{}");
    const raw = JSON.parse(text);

    // Validar forma y tipos del output del modelo antes de reenviar al cliente
    const parsed = CookWithThisOutputSchema.safeParse(raw);
    if (!parsed.success) {
      logger.error("AI cook-with-this failed schema validation", {
        issues: parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      return NextResponse.json(
        { error: "La IA devolvió recetas con formato inválido" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { source: "ai", ...parsed.data },
      { headers: rateLimit.headers },
    );
  } catch (err) {
    logger.error("[cook-with-this] Error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Error al buscar recetas" },
      { status: 500 },
    );
  }
}
