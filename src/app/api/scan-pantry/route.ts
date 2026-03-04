import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  GEMINI_CONFIG,
  cleanJsonResponse,
  base64ToGeminiFormat,
  geminiWithRetry,
} from "@/lib/gemini/client";
import { withRateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/lib/api/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Zod schemas for input validation
// Base64 images should start with data:image/ and have reasonable size
const Base64ImageSchema = z
  .string()
  .refine((val) => val.startsWith("data:image/"), {
    message: "Image must be a valid base64 data URL",
  })
  .refine(
    (val) => val.length <= 10 * 1024 * 1024, // Max 10MB base64 (roughly 7.5MB actual image)
    { message: "Image too large. Maximum size is 10MB" },
  );

const ScanPantryPostSchema = z
  .object({
    images: z
      .array(Base64ImageSchema)
      .max(5, "Maximum 5 images allowed")
      .optional(),
    image: Base64ImageSchema.optional(),
  })
  .refine((data) => data.images?.length || data.image, {
    message: "At least one image is required",
  });

const ProductSchema = z.object({
  name: z.string().max(200),
  genericName: z.string().max(200),
  quantity: z.number().min(0).max(10000),
  unit: z.string().max(50),
  category: z.string().max(100),
  confidence: z.number().min(0).max(1),
  matchesExisting: z.string().max(200).nullable().optional(),
});

const ScanPantryPutSchema = z.object({
  matched: z
    .array(
      z.object({
        marketItemId: z.string().uuid(),
        marketItemName: z.string().max(200),
        product: ProductSchema,
      }),
    )
    .max(100)
    .optional(),
  newItems: z
    .array(
      z.object({
        product: ProductSchema,
      }),
    )
    .max(50)
    .optional(),
});

function getSupabase() {
  return createServiceRoleClient();
}

interface IdentifiedProduct {
  name: string;
  genericName: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: number;
  matchesExisting?: string | null;
}

interface ScanResult {
  identified: IdentifiedProduct[];
  matched: Array<{
    product: IdentifiedProduct;
    marketItemId: string;
    marketItemName: string;
    action: "update_inventory";
  }>;
  newItems: Array<{
    product: IdentifiedProduct;
    action: "create_new";
  }>;
  summary: string;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Rate limiting
    const userId =
      request.headers.get("x-user-id") ||
      request.headers.get("x-forwarded-for") ||
      "anonymous";
    const rateLimit = await withRateLimit(userId, "scan-pantry");

    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimit.response, {
        status: 429,
        headers: rateLimit.headers,
      });
    }

    // Parse and validate request body with Zod
    let validatedBody;
    try {
      const rawBody = await request.json();
      validatedBody = ScanPantryPostSchema.parse(rawBody);
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

    // Soportar tanto 'image' (single) como 'images' (array) para compatibilidad
    const images: string[] =
      validatedBody.images ||
      (validatedBody.image ? [validatedBody.image] : []);

    const gemini = getGeminiClient();

    // 1. Obtener lista actual de items del mercado para matching
    const { data: marketItems } = (await getSupabase()
      .from("market_items")
      .select("id, name, category, quantity")) as {
      data: Array<{
        id: string;
        name: string;
        category: string;
        quantity: string;
      }> | null;
    };

    const marketItemsList =
      marketItems?.map((i) => `- ${i.name} (${i.category})`).join("\n") || "";

    const systemPrompt = `Eres un asistente experto en identificar productos de despensa y nevera en fotos.

Tu tarea es:
1. Identificar TODOS los productos visibles en la imagen
2. Convertir nombres de marca a nombres genéricos (ej: "Coca-Cola" → "Gaseosa", "Colgate" → "Crema dental", "Ramo" → "Pan tajado", "Alquería" → "Leche")
3. Estimar la cantidad aproximada de cada producto
4. Asignar una categoría apropiada

Categorías disponibles:
- Proteínas (carnes, pollo, pescado, huevos)
- Vegetales
- Frutas
- Lácteos (leche, queso, yogurt)
- Granos y Cereales (arroz, pasta, avena)
- Condimentos (sal, aceite, salsas)
- Bebidas
- Panadería
- Snacks
- Limpieza
- Otros

Lista de productos existentes en el mercado del usuario:
${marketItemsList}

Si un producto identificado coincide (o es similar) a uno de la lista existente, usa el MISMO nombre exacto de la lista.

Responde ÚNICAMENTE en formato JSON válido con esta estructura:
{
  "products": [
    {
      "name": "nombre original visto (puede incluir marca)",
      "genericName": "nombre genérico del producto",
      "quantity": 2,
      "unit": "unid",
      "category": "Categoría",
      "confidence": 0.95,
      "matchesExisting": "Nombre exacto del item existente si coincide, o null si es nuevo"
    }
  ],
  "summary": "Resumen breve de lo que se encontró"
}`;

    // 2. Procesar imágenes con concurrencia limitada (máx 3 simultáneas)
    const MAX_CONCURRENT = 3;
    const allProducts: IdentifiedProduct[] = [];
    const summaries: string[] = [];

    // Función para procesar una imagen
    const processImage = async (imageUrl: string, index: number) => {
      try {
        const imageData = base64ToGeminiFormat(imageUrl);

        const response = await geminiWithRetry(() =>
          gemini.models.generateContent({
            model: GEMINI_MODELS.FLASH,
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  imageData,
                  {
                    text: `Identifica todos los productos en esta imagen ${index + 1} de mi despensa/nevera. Convierte las marcas a nombres genéricos.`,
                  },
                ],
              },
            ],
            config: {
              temperature: GEMINI_CONFIG.parsing.temperature,
              maxOutputTokens: GEMINI_CONFIG.parsing.maxOutputTokens,
              responseMimeType: "application/json",
            },
          }),
        );

        const content =
          response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        try {
          const jsonContent = cleanJsonResponse(content);
          const productsData = JSON.parse(jsonContent);
          return {
            products: productsData.products || [],
            summary: productsData.summary || "",
          };
        } catch {
          return { products: [], summary: "" };
        }
      } catch (err) {
        logger.error(`Error processing image ${index + 1}`, {
          error: err instanceof Error ? err.message : String(err),
        });
        return { products: [], summary: "" };
      }
    };

    // Procesar con concurrencia limitada
    const results: Array<{ products: IdentifiedProduct[]; summary: string }> =
      [];
    for (let i = 0; i < images.length; i += MAX_CONCURRENT) {
      const batch = images.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map((img, batchIndex) => processImage(img, i + batchIndex)),
      );
      results.push(...batchResults);
    }

    // Combinar resultados de todas las imágenes
    for (const result of results) {
      allProducts.push(...result.products);
      if (result.summary) summaries.push(result.summary);
    }

    // 3. Deduplicar productos por nombre genérico (sumar cantidades si se repiten)
    const productMap = new Map<string, IdentifiedProduct>();

    for (const product of allProducts) {
      const key = product.genericName.toLowerCase();
      const existing = productMap.get(key);

      if (existing) {
        // Sumar cantidades si el producto ya existe
        existing.quantity += product.quantity;
        // Mantener la mayor confianza
        existing.confidence = Math.max(existing.confidence, product.confidence);
      } else {
        productMap.set(key, { ...product });
      }
    }

    const deduplicatedProducts = Array.from(productMap.values());

    // Crear resumen combinado
    const combinedSummary =
      images.length > 1
        ? `Se analizaron ${images.length} imágenes. ${summaries.join(" ")}`
        : summaries[0] || "Análisis completado";

    const productsData = {
      products: deduplicatedProducts,
      summary: combinedSummary,
    };

    if (deduplicatedProducts.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudieron identificar productos en las imágenes",
        },
        { status: 400 },
      );
    }

    // 4. Procesar productos identificados
    const result: ScanResult = {
      identified: productsData.products || [],
      matched: [],
      newItems: [],
      summary: productsData.summary || "",
    };

    for (const product of result.identified) {
      // Buscar coincidencia en items existentes
      let matchedItem = null;

      // Primero buscar por nombre exacto que sugirió la IA
      if (product.matchesExisting) {
        const existingMatch = product.matchesExisting;
        matchedItem = marketItems?.find(
          (i) => i.name.toLowerCase() === existingMatch.toLowerCase(),
        );
      }

      // Si no, buscar por nombre genérico
      if (!matchedItem) {
        matchedItem = marketItems?.find(
          (i) => i.name.toLowerCase() === product.genericName.toLowerCase(),
        );
      }

      // Buscar por coincidencia parcial
      if (!matchedItem) {
        const searchTerms = product.genericName.toLowerCase().split(" ");
        matchedItem = marketItems?.find((item) => {
          const itemName = item.name.toLowerCase();
          return searchTerms.some(
            (term) => term.length >= 4 && itemName.includes(term),
          );
        });
      }

      if (matchedItem) {
        result.matched.push({
          product,
          marketItemId: matchedItem.id,
          marketItemName: matchedItem.name,
          action: "update_inventory",
        });
      } else {
        result.newItems.push({
          product,
          action: "create_new",
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error scanning pantry", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error al procesar la imagen" },
      { status: 500 },
    );
  }
}

// Endpoint para aplicar los cambios después de que el usuario confirme
export async function PUT(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Parse and validate request body with Zod
    let validatedBody;
    try {
      const rawBody = await request.json();
      validatedBody = ScanPantryPutSchema.parse(rawBody);
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

    const { matched, newItems } = validatedBody;

    const results = {
      inventoryUpdated: 0,
      itemsCreated: 0,
      errors: [] as string[],
    };

    // 1. Actualizar inventario de items existentes
    for (const match of matched || []) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (getSupabase() as any).from("inventory").upsert(
          {
            item_id: match.marketItemId,
            current_quantity: `${match.product.quantity} ${match.product.unit}`,
            current_number: match.product.quantity,
            last_updated: new Date().toISOString(),
          },
          { onConflict: "item_id" },
        );

        if (error) throw error;
        results.inventoryUpdated++;
      } catch (err) {
        results.errors.push(
          `Error actualizando ${match.marketItemName}: ${err}`,
        );
      }
    }

    // 2. Crear nuevos items
    for (const newItem of newItems || []) {
      try {
        // Obtener el max order_index
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: maxOrder } = await (getSupabase() as any)
          .from("market_items")
          .select("order_index")
          .order("order_index", { ascending: false })
          .limit(1);

        const nextOrder = (maxOrder?.[0]?.order_index || 0) + 1;

        // Crear el nuevo item
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: createdItem, error: createError } = await (
          getSupabase() as any
        )
          .from("market_items")
          .insert({
            name: newItem.product.genericName,
            category: newItem.product.category,
            quantity: `${newItem.product.quantity} ${newItem.product.unit}`,
            order_index: nextOrder,
            is_custom: true,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Crear entrada de inventario
        if (createdItem) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (getSupabase() as any).from("inventory").upsert(
            {
              item_id: createdItem.id,
              current_quantity: `${newItem.product.quantity} ${newItem.product.unit}`,
              current_number: newItem.product.quantity,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "item_id" },
          );
        }

        results.itemsCreated++;
      } catch (err) {
        results.errors.push(
          `Error creando ${newItem.product.genericName}: ${err}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${results.inventoryUpdated} productos y se crearon ${results.itemsCreated} nuevos`,
      ...results,
    });
  } catch (error) {
    logger.error("Error applying scan results", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error al aplicar cambios" },
      { status: 500 },
    );
  }
}
