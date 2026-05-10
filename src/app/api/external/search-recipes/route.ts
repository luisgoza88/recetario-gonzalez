import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { withRateLimit } from "@/lib/rate-limit";
import {
  searchRecipes,
  findByIngredients,
  spoonacularToInternal,
  type SpoonacularRecipe,
} from "@/lib/spoonacular/client";

const InputSchema = z.object({
  query: z.string().max(200).optional(),
  ingredients: z.array(z.string().max(100)).max(20).optional(),
  diet: z
    .enum(["vegetarian", "vegan", "gluten-free", "dairy-free", "ketogenic"])
    .optional(),
  maxTime: z.number().positive().max(480).optional(),
  number: z.number().positive().max(20).optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const identifier =
    request.headers.get("x-user-id") ||
    request.headers.get("x-forwarded-for") ||
    "anonymous";

  const rateLimit = await withRateLimit(identifier, "external-recipe-search");
  if (!rateLimit.allowed) {
    return NextResponse.json(rateLimit.response, {
      status: 429,
      headers: rateLimit.headers,
    });
  }

  let body: z.infer<typeof InputSchema>;
  try {
    body = InputSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  }

  try {
    let raw: SpoonacularRecipe[];

    if (body.ingredients?.length) {
      raw = await findByIngredients(body.ingredients, {
        number: body.number,
      });
    } else {
      raw = await searchRecipes({
        query: body.query,
        diet: body.diet,
        maxReadyTime: body.maxTime,
        number: body.number,
      });
    }

    const recipes = raw
      .map((r) => {
        try {
          return spoonacularToInternal(r);
        } catch {
          return null;
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return NextResponse.json(
      { recipes, count: recipes.length },
      { headers: rateLimit.headers },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("not configured")) {
      return NextResponse.json(
        {
          error: "Spoonacular no configurado",
          recipes: [],
          instructions:
            "Agrega SPOONACULAR_API_KEY a las variables de entorno. Obtén una key gratis en https://spoonacular.com/food-api",
        },
        { status: 503 },
      );
    }

    if (message.includes("quota exceeded")) {
      return NextResponse.json(
        {
          error:
            "Cuota de Spoonacular agotada por hoy (150 req/día en plan gratis)",
          recipes: [],
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: message, recipes: [] }, { status: 500 });
  }
}
