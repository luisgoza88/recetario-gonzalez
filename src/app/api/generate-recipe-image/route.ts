import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import { requireAuth } from "@/lib/api/auth";
import { withRateLimit } from "@/lib/rate-limit";
import {
  createAuthenticatedClient,
  createStorageAdminClient,
} from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { searchPexels, scorePexelsMatch } from "@/lib/pexels";
import {
  getCachedRecipeImage,
  cacheRecipeImage,
} from "@/lib/recipe-image-cache";

const PEXELS_SCORE_THRESHOLD = 30;

interface GenerateImageRequest {
  recipeName: string;
  recipeDescription?: string;
  recipeType?: "breakfast" | "lunch" | "dinner";
  ingredients?: string[];
  saveToSupabase?: boolean;
  recipeId?: string;
}

// Determina si la receta es tipicamente colombiana para mejorar la query a Pexels
function buildPexelsQuery(recipeName: string): string {
  const colombianKeywords = [
    "ajiaco",
    "bandeja paisa",
    "sancocho",
    "changua",
    "arepa",
    "patacon",
    "sudado",
    "calentado",
    "mondongo",
    "lechona",
    "fritanga",
    "empanada",
    "buñuelo",
    "almojabana",
    "envuelto",
    "mazamorra",
    "aguapanela",
    "cholado",
    "lulada",
    "hogao",
    "sobrebarriga",
  ];

  const nameLower = recipeName.toLowerCase();
  const isColombian = colombianKeywords.some((kw) => nameLower.includes(kw));

  if (isColombian) {
    return `${recipeName} colombian food dish`;
  }
  return `${recipeName} food dish`;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const userId =
    request.headers.get("x-user-id") ||
    request.headers.get("x-forwarded-for") ||
    "anonymous";

  try {
    const body: GenerateImageRequest = await request.json();
    const {
      recipeName,
      recipeDescription,
      recipeType,
      ingredients,
      saveToSupabase = false,
      recipeId,
    } = body;

    if (!recipeName) {
      return NextResponse.json(
        { error: "Se requiere el nombre de la receta" },
        { status: 400 },
      );
    }

    // --- PASO 1: Verificar cache ---
    const cached = await getCachedRecipeImage(recipeName);
    if (cached) {
      logger.info(`[generate-recipe-image] Cache hit para "${recipeName}"`, {
        source: cached.source,
      });

      // Si hay recipeId y saveToSupabase, actualizar receta con la URL cacheada
      if (saveToSupabase && recipeId) {
        try {
          const supabase = await createAuthenticatedClient();
          await supabase
            .from("recipes")
            .update({ image_url: cached.image_url })
            .eq("id", recipeId);
        } catch (updateErr) {
          logger.error(
            "[generate-recipe-image] Error actualizando receta con cache",
            {
              error:
                updateErr instanceof Error
                  ? updateErr.message
                  : String(updateErr),
            },
          );
        }
      }

      return NextResponse.json({
        success: true,
        imageUrl: cached.image_url,
        source: cached.source,
        attribution: cached.attribution,
        attributionUrl: cached.attribution_url,
        fromCache: true,
        recipeName,
      });
    }

    // --- PASO 2: Buscar en Pexels (gratis, fotos reales) ---
    const pexelsQuery = buildPexelsQuery(recipeName);
    logger.info(`[generate-recipe-image] Buscando en Pexels: "${pexelsQuery}"`);

    const pexelsPhotos = await searchPexels(pexelsQuery, {
      perPage: 5,
      orientation: "landscape",
    });

    if (pexelsPhotos.length > 0) {
      const bestPhoto = pexelsPhotos[0];
      const score = scorePexelsMatch(bestPhoto, recipeName);

      logger.info(
        `[generate-recipe-image] Pexels score: ${score} para "${bestPhoto.alt}"`,
      );

      if (score >= PEXELS_SCORE_THRESHOLD) {
        const imageUrl = bestPhoto.src.large;

        // Cachear el resultado de Pexels (best-effort)
        await cacheRecipeImage({
          recipeName,
          imageUrl,
          source: "pexels",
          attribution: bestPhoto.photographer,
          attributionUrl: bestPhoto.photographer_url,
        });

        // Guardar en receta si se solicita
        if (saveToSupabase && recipeId) {
          try {
            const supabase = await createAuthenticatedClient();
            await supabase
              .from("recipes")
              .update({ image_url: imageUrl })
              .eq("id", recipeId);
          } catch (updateErr) {
            logger.error(
              "[generate-recipe-image] Error actualizando receta con Pexels",
              {
                error:
                  updateErr instanceof Error
                    ? updateErr.message
                    : String(updateErr),
              },
            );
          }
        }

        return NextResponse.json({
          success: true,
          imageUrl,
          source: "pexels",
          attribution: bestPhoto.photographer,
          attributionUrl: bestPhoto.photographer_url,
          fromCache: false,
          recipeName,
        });
      }

      logger.info(
        `[generate-recipe-image] Pexels no superó umbral (${score} < ${PEXELS_SCORE_THRESHOLD}), usando Imagen 3`,
      );
    }

    // --- PASO 3: Fallback a Imagen 3 (aplica rate limit aqui) ---
    const rateLimit = await withRateLimit(userId, "generate-image");
    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimit.response, {
        status: 429,
        headers: rateLimit.headers,
      });
    }

    const gemini = getGeminiClient();

    const mealTypeContext = {
      breakfast: "plato de desayuno",
      lunch: "plato de almuerzo",
      dinner: "plato de cena",
    };

    const typeContext = recipeType ? mealTypeContext[recipeType] : "plato";
    const ingredientsContext = ingredients?.length
      ? `Los ingredientes principales son: ${ingredients.slice(0, 5).join(", ")}.`
      : "";

    const prompt = `Genera una fotografía profesional de comida del siguiente plato:

"${recipeName}"
${recipeDescription ? `Descripción: ${recipeDescription}` : ""}
${ingredientsContext}

Requisitos de la imagen:
- Estilo: Fotografía gastronómica profesional de alta calidad
- Iluminación: Luz natural suave, difusa, estilo food photography
- Presentación: Plato bellamente emplatado en vajilla elegante pero sencilla
- Ángulo: Vista desde arriba o ángulo de 45 grados
- Fondo: Mesa de madera o mármol con fondo desenfocado (bokeh)
- Ambiente: Cocina hogareña colombiana/latinoamericana acogedora
- El ${typeContext} debe verse apetitoso, fresco y casero
- NO incluir texto, marcas de agua ni elementos artificiales
- Colores vibrantes y naturales`;

    let imageData: string | null = null;
    let textResponse: string | null = null;

    // Intentar con Imagen 3 primero
    try {
      logger.info("[generate-recipe-image] Generando imagen con Imagen 3...");
      const imagen3Response = await gemini.models.generateImages({
        model: GEMINI_MODELS.IMAGE_GEN,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "4:3",
          outputMimeType: "image/png",
        },
      });

      const generatedImage = imagen3Response.generatedImages?.[0];
      if (generatedImage?.image?.imageBytes) {
        imageData = generatedImage.image.imageBytes;
        logger.info(
          "[generate-recipe-image] Imagen generada exitosamente con Imagen 3",
        );
      }
    } catch (imagen3Error) {
      logger.error(
        "[generate-recipe-image] Imagen 3 error, intentando con Gemini Flash",
        {
          error:
            imagen3Error instanceof Error
              ? imagen3Error.message
              : String(imagen3Error),
        },
      );
    }

    // Si Imagen 3 falla, usar Gemini 2.0 Flash Exp como respaldo
    if (!imageData) {
      try {
        const response = await gemini.models.generateContent({
          model: GEMINI_MODELS.FLASH_IMAGE,
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseModalities: ["Text", "Image"],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              imageData = part.inlineData.data as string;
            }
            if (part.text) {
              textResponse = part.text;
            }
          }
        }
      } catch (flashError) {
        logger.error("[generate-recipe-image] Gemini Flash error", {
          error:
            flashError instanceof Error
              ? flashError.message
              : String(flashError),
        });
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "No se pudo generar la imagen. Intenta de nuevo." },
        { status: 500 },
      );
    }

    let imageUrl: string | null = null;

    // Guardar en Supabase Storage si se solicita
    if (saveToSupabase) {
      try {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const fileName = `recipes/${timestamp}-${randomId}.png`;

        const imageBuffer = Buffer.from(imageData, "base64");

        const storageClient = createStorageAdminClient();
        const { error: uploadError } = await storageClient.storage
          .from("recipe-images")
          .upload(fileName, imageBuffer, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          logger.error("[generate-recipe-image] Error uploading to Supabase", {
            error:
              uploadError instanceof Error
                ? uploadError.message
                : String(uploadError),
          });
        } else {
          const { data: urlData } = storageClient.storage
            .from("recipe-images")
            .getPublicUrl(fileName);

          imageUrl = urlData?.publicUrl || null;

          if (recipeId && imageUrl) {
            const supabase = await createAuthenticatedClient();
            await supabase
              .from("recipes")
              .update({ image_url: imageUrl })
              .eq("id", recipeId);
          }
        }
      } catch (storageError) {
        logger.error("[generate-recipe-image] Storage error", {
          error:
            storageError instanceof Error
              ? storageError.message
              : String(storageError),
        });
      }
    }

    // Cachear imagen generada con Imagen 3
    // Usar imageUrl (Supabase Storage) si está disponible; si no, skip (base64 no cacheamos)
    if (imageUrl) {
      await cacheRecipeImage({
        recipeName,
        imageUrl,
        source: "imagen3",
      });
    }

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${imageData}`,
      imageUrl,
      source: "imagen3",
      fromCache: false,
      recipeName,
      message: textResponse,
    });
  } catch (error) {
    logger.error("[generate-recipe-image] Error generating recipe image", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error al generar la imagen de la receta" },
      { status: 500 },
    );
  }
}

// Endpoint para obtener todas las recetas sin imagen
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await createAuthenticatedClient();
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("id, name, description, type, ingredients, image_url")
      .or("image_url.is.null,image_url.eq.");

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener recetas" },
        { status: 500 },
      );
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Todas las recetas ya tienen imágenes",
        recipesWithoutImages: 0,
      });
    }

    return NextResponse.json({
      success: true,
      recipesWithoutImages: recipes.length,
      recipes: recipes.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        hasImage: !!r.image_url,
      })),
      message: `Hay ${recipes.length} recetas sin imagen. Usa el endpoint PUT con los IDs para generar imágenes.`,
    });
  } catch (error) {
    logger.error("[generate-recipe-image] Error checking recipes", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error al verificar recetas" },
      { status: 500 },
    );
  }
}

// Endpoint para generar imágenes en batch para múltiples recetas
export async function PUT(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { recipeIds } = await request.json();

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs de recetas" },
        { status: 400 },
      );
    }

    const limitedIds = recipeIds.slice(0, 10);

    const supabase = await createAuthenticatedClient();
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("id, name, description, type, ingredients")
      .in("id", limitedIds)
      .or("image_url.is.null,image_url.eq.");

    if (error || !recipes || recipes.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron recetas para procesar" },
        { status: 404 },
      );
    }

    const results: {
      recipeId: string;
      recipeName: string;
      success: boolean;
      imageUrl?: string;
      source?: string;
      error?: string;
    }[] = [];
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const cookieHeader = request.headers.get("cookie");

    for (const recipe of recipes) {
      try {
        const ingredientNames = Array.isArray(recipe.ingredients)
          ? (recipe.ingredients as Array<{ name?: string } | string>)
              .map((ing) => (typeof ing === "string" ? ing : ing?.name || ""))
              .filter(Boolean)
          : [];

        const generateResponse = await fetch(
          `${appOrigin}/api/generate-recipe-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": auth.userId,
              ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
            body: JSON.stringify({
              recipeName: recipe.name,
              recipeDescription: recipe.description,
              recipeType: recipe.type,
              ingredients: ingredientNames.slice(0, 5),
              saveToSupabase: true,
              recipeId: recipe.id,
            }),
          },
        );

        const result = await generateResponse.json();

        results.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          success: result.success || false,
          imageUrl: result.imageUrl,
          source: result.source,
          error: result.error,
        });

        // Solo esperar entre generaciones si usamos Imagen 3 (costoso)
        // Para Pexels o cache el delay no es necesario pero tampoco hace daño
        if (!result.fromCache && result.source === "imagen3") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (recipeError) {
        results.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          success: false,
          error: String(recipeError),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (error) {
    logger.error("[generate-recipe-image] Batch image generation error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error en la generación de imágenes en batch" },
      { status: 500 },
    );
  }
}
