import { withRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import type { DishForLibrary } from "@/data/image-library-dishes";
import { requireAuth } from "@/lib/api/auth";
import {
  createAuthenticatedClient,
  createStorageAdminClient,
} from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { buildRecipeImagePrompt } from "@/lib/recipe-image-prompt";
import { generateRecipeImageWithOpenAI } from "@/lib/openai-images";

// Generate food photography prompt for a dish
function generatePrompt(dish: DishForLibrary): string {
  return buildRecipeImagePrompt({
    recipeName: `${dish.name_es} (${dish.name_en})`,
    recipeDescription: dish.description_en,
    recipeType:
      dish.category === "breakfast"
        ? "breakfast"
        : dish.category === "dinner"
          ? "dinner"
          : "lunch",
    ingredients: dish.key_ingredients,
  });
}

// Generate a single image
async function generateImage(dish: DishForLibrary): Promise<{
  success: boolean;
  imageData?: string;
  mimeType?: "image/jpeg" | "image/png";
  source?: "openai" | "imagen3";
  error?: string;
}> {
  try {
    const gemini = getGeminiClient();
    const prompt = generatePrompt(dish);

    try {
      const openAIImage = await generateRecipeImageWithOpenAI(prompt);
      if (openAIImage) {
        return {
          success: true,
          imageData: openAIImage.imageData,
          mimeType: openAIImage.mimeType,
          source: "openai",
        };
      }
    } catch (openAIError) {
      logger.error(`OpenAI failed for ${dish.name_en}`, {
        error:
          openAIError instanceof Error
            ? openAIError.message
            : String(openAIError),
      });
    }

    // Try Imagen 3 first
    try {
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
        return {
          success: true,
          imageData: generatedImage.image.imageBytes,
          mimeType: "image/png",
          source: "imagen3",
        };
      }
    } catch (imagen3Error) {
      logger.error(`Imagen 3 failed for ${dish.name_en}`, {
        error:
          imagen3Error instanceof Error
            ? imagen3Error.message
            : String(imagen3Error),
      });
    }

    // Fallback to Gemini Flash
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH_IMAGE,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseModalities: ["Text", "Image"] },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            return {
              success: true,
              imageData: part.inlineData.data as string,
              mimeType: "image/png",
              source: "imagen3",
            };
          }
        }
      }
    } catch (flashError) {
      logger.error(`Gemini Flash failed for ${dish.name_en}`, {
        error:
          flashError instanceof Error ? flashError.message : String(flashError),
      });
    }

    return { success: false, error: "Both image generation methods failed" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// GET: Check status and list dishes to generate
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createAuthenticatedClient();

  try {
    // Get existing images in library
    const { data: existingImages, error: fetchError } = await supabase
      .from("image_library")
      .select("name_en");

    if (fetchError) {
      return NextResponse.json(
        { error: "Error fetching existing images" },
        { status: 500 },
      );
    }

    const { allDishes, dishStats } = await import(
      "@/data/image-library-dishes"
    );
    const existingNames = new Set(
      existingImages?.map((img) => img.name_en) || [],
    );
    const remainingDishes = allDishes.filter(
      (dish) => !existingNames.has(dish.name_en),
    );

    // Group by category for summary
    const byCuisine: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    remainingDishes.forEach((dish) => {
      byCuisine[dish.cuisine_type] = (byCuisine[dish.cuisine_type] || 0) + 1;
      byCategory[dish.category] = (byCategory[dish.category] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats: dishStats,
      existingImages: existingImages?.length || 0,
      remainingDishes: remainingDishes.length,
      estimatedCost: `$${(
        remainingDishes.length * (process.env.OPENAI_API_KEY ? 0.041 : 0.035)
      ).toFixed(2)}`,
      byCuisine,
      byCategory,
      nextBatch: remainingDishes.slice(0, 10).map((d) => ({
        name_en: d.name_en,
        name_es: d.name_es,
        category: d.category,
        cuisine_type: d.cuisine_type,
      })),
    });
  } catch (error) {
    logger.error("Error checking library status", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error checking library" },
      { status: 500 },
    );
  }
}

// POST: Generate images for a batch of dishes
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const rateLimit = await withRateLimit(auth.userId, "generate-image");
  if (!rateLimit.allowed)
    return NextResponse.json(rateLimit.response, {
      status: rateLimit.status ?? 429,
      headers: rateLimit.headers,
    });

  const supabase = await createAuthenticatedClient();
  const storageClient = createStorageAdminClient();

  try {
    const body = await request.json();
    const { batchSize = 5, startIndex = 0, specificDishes } = body;

    // Limit batch size to avoid timeouts
    const limitedBatchSize = Math.max(1, Math.min(Number(batchSize) || 1, 1));

    // Get existing images
    const { data: existingImages } = await supabase
      .from("image_library")
      .select("name_en");

    const { allDishes: allDishesData } = await import(
      "@/data/image-library-dishes"
    );
    const existingNames = new Set(
      existingImages?.map((img) => img.name_en) || [],
    );

    // Get dishes to process
    let dishesToProcess: DishForLibrary[];

    if (specificDishes && Array.isArray(specificDishes)) {
      // Process specific dishes by name
      dishesToProcess = allDishesData.filter(
        (d) =>
          specificDishes.slice(0, limitedBatchSize).includes(d.name_en) &&
          !existingNames.has(d.name_en),
      );
    } else {
      // Process next batch of remaining dishes
      const remainingDishes = allDishesData.filter(
        (dish) => !existingNames.has(dish.name_en),
      );
      dishesToProcess = remainingDishes.slice(
        startIndex,
        startIndex + limitedBatchSize,
      );
    }

    if (dishesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All requested dishes already have images",
        processed: 0,
      });
    }

    const results: Array<{
      name_en: string;
      name_es: string;
      success: boolean;
      imageUrl?: string;
      error?: string;
    }> = [];

    // Process dishes sequentially
    for (const dish of dishesToProcess) {
      logger.info(`Generating image for: ${dish.name_en}`);

      const imageResult = await generateImage(dish);

      if (imageResult.success && imageResult.imageData) {
        // Upload to Supabase Storage
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const mimeType = imageResult.mimeType ?? "image/png";
        const extension = mimeType === "image/jpeg" ? "jpg" : "png";
        const fileName = `library/${dish.cuisine_type}/${timestamp}-${randomId}.${extension}`;

        const imageBuffer = Buffer.from(imageResult.imageData, "base64");

        const { error: uploadError } = await storageClient.storage
          .from("recipe-images")
          .upload(fileName, imageBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          logger.error(`Upload failed for ${dish.name_en}`, {
            error:
              uploadError instanceof Error
                ? uploadError.message
                : String(uploadError),
          });
          results.push({
            name_en: dish.name_en,
            name_es: dish.name_es,
            success: false,
            error: "Upload failed: " + uploadError.message,
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = storageClient.storage
          .from("recipe-images")
          .getPublicUrl(fileName);

        const imageUrl = urlData?.publicUrl;

        // Insert into image_library table
        const { error: insertError } = await supabase
          .from("image_library")
          .insert({
            image_url: imageUrl,
            name_es: dish.name_es,
            name_en: dish.name_en,
            description_en: dish.description_en,
            tags: dish.tags,
            category: dish.category,
            cuisine_type: dish.cuisine_type,
            main_protein: dish.main_protein,
            key_ingredients: dish.key_ingredients,
          });

        if (insertError) {
          logger.error(`Insert failed for ${dish.name_en}`, {
            error:
              insertError instanceof Error
                ? insertError.message
                : String(insertError),
          });
          results.push({
            name_en: dish.name_en,
            name_es: dish.name_es,
            success: false,
            error: "Database insert failed: " + insertError.message,
          });
          continue;
        }

        results.push({
          name_en: dish.name_en,
          name_es: dish.name_es,
          success: true,
          imageUrl,
        });

        logger.info(`Generated: ${dish.name_en}`);
      } else {
        results.push({
          name_en: dish.name_en,
          name_es: dish.name_es,
          success: false,
          error: imageResult.error,
        });
      }

      // Wait 2 seconds between generations to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCost =
      successCount * (process.env.OPENAI_API_KEY ? 0.041 : 0.035);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      estimatedCost: `$${totalCost.toFixed(2)}`,
      results,
    });
  } catch (error) {
    logger.error("Batch generation error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Batch generation failed" },
      { status: 500 },
    );
  }
}
