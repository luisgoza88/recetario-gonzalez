/**
 * Cron / endpoint manual para pre-cachear imagenes de recetas seed colombianas.
 *
 * Itera sobre las recetas con tag `seed_colombian`, busca foto en Pexels
 * y guarda en recipe_image_cache + actualiza recipes.image_url.
 * Solo procesa recetas que aun no tienen image_url para no desperdiciar
 * cuota de Pexels (200 req/h en plan gratuito).
 *
 * Autenticacion: Bearer token via CRON_SECRET (mismo patron que cleanup-proposals).
 *
 * Invocacion manual:
 *   curl -H "Authorization: Bearer <CRON_SECRET>" \
 *        https://recetario-app-self.vercel.app/api/cron/preload-recipe-images
 *
 * Invocacion local (desarrollo):
 *   curl -H "Authorization: Bearer test" \
 *        http://localhost:3000/api/cron/preload-recipe-images
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getRecipeImageHybrid } from "@/lib/recipe-image-cache";
import { logger } from "@/lib/logger";

// Delay entre requests para respetar el rate limit de Pexels (200 req/h)
// 500ms = ~120 req/min, muy por debajo del limite
const DELAY_BETWEEN_REQUESTS_MS = 500;

interface RecipeRow {
  id: string;
  name: string;
  region: string | null;
  category: string | null;
  image_url: string | null;
}

interface ProcessResult {
  id: string;
  name: string;
  status: "cached" | "already_has_image" | "no_match" | "error";
  source?: string;
  imageUrl?: string;
}

export async function GET(request: NextRequest) {
  // Validar CRON_SECRET (estandar Vercel Cron)
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const db = createServiceRoleClient();

    // Obtener recetas seed colombianas sin imagen aun
    const { data: recipes, error } = await db
      .from("recipes")
      .select("id, name, region, category, image_url")
      .contains("tags", ["seed_colombian"])
      .order("name", { ascending: true });

    if (error) {
      logger.error("[preload-recipe-images] Error fetching recipes", {
        error: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allRecipes = (recipes ?? []) as RecipeRow[];
    const toProcess = allRecipes.filter((r) => !r.image_url);
    const alreadyDone = allRecipes.length - toProcess.length;

    logger.info("[preload-recipe-images] Iniciando pre-cache", {
      total: allRecipes.length,
      toProcess: toProcess.length,
      alreadyDone,
    });

    let cached = 0;
    let noMatch = 0;
    let failed = 0;
    const results: ProcessResult[] = [];

    for (const recipe of toProcess) {
      try {
        const result = await getRecipeImageHybrid(
          recipe.name,
          undefined,
          recipe.id,
        );

        if (result.imageUrl) {
          cached++;
          results.push({
            id: recipe.id,
            name: recipe.name,
            status: "cached",
            source: result.source ?? undefined,
            imageUrl: result.imageUrl,
          });
          logger.info("[preload-recipe-images] Imagen cacheada", {
            name: recipe.name,
            source: result.source,
            fromCache: result.source === "cache",
          });
        } else {
          noMatch++;
          results.push({
            id: recipe.id,
            name: recipe.name,
            status: "no_match",
          });
          logger.info("[preload-recipe-images] Sin match en Pexels", {
            name: recipe.name,
          });
        }
      } catch (err) {
        failed++;
        logger.error("[preload-recipe-images] Error procesando receta", {
          recipeId: recipe.id,
          name: recipe.name,
          error: String(err),
        });
        results.push({
          id: recipe.id,
          name: recipe.name,
          status: "error",
        });
      }

      // Delay para respetar rate limit de Pexels
      if (toProcess.indexOf(recipe) < toProcess.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      }
    }

    const durationMs = Date.now() - startedAt;

    logger.info("[preload-recipe-images] Pre-cache completado", {
      total: allRecipes.length,
      alreadyDone,
      processed: toProcess.length,
      cached,
      noMatch,
      failed,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_seed_recipes: allRecipes.length,
        already_had_image: alreadyDone,
        processed: toProcess.length,
        cached,
        no_pexels_match: noMatch,
        failed,
        duration_ms: durationMs,
      },
      // Solo muestra los primeros 10 para no sobrecargar la respuesta
      sample: results.slice(0, 10),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[preload-recipe-images] Error inesperado", {
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
