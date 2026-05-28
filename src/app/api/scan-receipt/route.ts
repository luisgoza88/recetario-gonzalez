import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  GEMINI_CONFIG,
  cleanJsonResponse,
} from "@/lib/gemini/client";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

// Zod schema for formData validation
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

const ScanReceiptInputSchema = z.object({
  image: z
    .instanceof(File, { message: "Se requiere un archivo de imagen" })
    .refine((file) => file.size > 0, {
      message: "El archivo de imagen está vacío",
    })
    .refine((file) => file.size <= MAX_IMAGE_SIZE, {
      message: "La imagen no debe superar 10 MB",
    })
    .refine(
      (file) =>
        ALLOWED_MIME_TYPES.includes(
          file.type as (typeof ALLOWED_MIME_TYPES)[number],
        ),
      {
        message: `Tipo de imagen no soportado. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
      },
    ),
});

// Categorías disponibles para mapear
const CATEGORIES_MAP: Record<
  string,
  { id: string; name: string; icon: string }
> = {
  proteínas: { id: "proteins", name: "Proteínas", icon: "🥩" },
  proteinas: { id: "proteins", name: "Proteínas", icon: "🥩" },
  carnes: { id: "proteins", name: "Proteínas", icon: "🥩" },
  lácteos: { id: "dairy", name: "Lácteos", icon: "🧀" },
  lacteos: { id: "dairy", name: "Lácteos", icon: "🧀" },
  vegetales: { id: "vegetables", name: "Vegetales", icon: "🥬" },
  verduras: { id: "vegetables", name: "Vegetales", icon: "🥬" },
  frutas: { id: "fruits", name: "Frutas", icon: "🍎" },
  granos: { id: "grains", name: "Granos y Carbohidratos", icon: "🍚" },
  carbohidratos: { id: "grains", name: "Granos y Carbohidratos", icon: "🍚" },
  despensa: { id: "pantry", name: "Despensa", icon: "🫙" },
  abarrotes: { id: "pantry", name: "Despensa", icon: "🫙" },
  especias: { id: "spices", name: "Especias y Hierbas", icon: "🌿" },
  bebidas: { id: "beverages", name: "Bebidas", icon: "🥤" },
  congelados: { id: "frozen", name: "Congelados", icon: "❄️" },
  otros: { id: "other", name: "Otros", icon: "📦" },
};

export interface ScannedProduct {
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  category: {
    id: string;
    name: string;
    icon: string;
  };
  brand?: string;
}

// Schema del OUTPUT del modelo. Validamos la respuesta de Gemini antes de
// mapearla/persistirla: el LLM puede devolver tipos inesperados (ej. items
// no array, name ausente, quantity como string). Tipamos solo lo que el codigo
// consume downstream; `.passthrough()` conserva campos extra (store, total,
// error). Los items pueden venir vacios y los campos numericos venir como
// string, asi que somos generosos para no rechazar respuestas validas.
const ScanReceiptItemSchema = z
  .object({
    name: z.string().min(1),
    quantity: z.union([z.number(), z.string()]).optional(),
    unit: z.string().optional(),
    price: z.union([z.number(), z.string()]).optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
  })
  .passthrough();

const ScanReceiptOutputSchema = z
  .object({
    items: z.array(ScanReceiptItemSchema).optional(),
    store: z.unknown().optional(),
    total: z.unknown().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const rawImage = formData.get("image");

    const validatedInput = ScanReceiptInputSchema.safeParse({
      image: rawImage,
    });
    if (!validatedInput.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validatedInput.error.flatten() },
        { status: 400 },
      );
    }

    const image = validatedInput.data.image;

    // Convert to base64
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = image.type || "image/jpeg";

    const gemini = getGeminiClient();

    const prompt = `Analiza esta imagen de un recibo de supermercado y extrae todos los productos comprados.

Para cada producto, identifica:
- name: nombre del producto (limpio, sin códigos)
- quantity: cantidad numérica (default 1)
- unit: unidad (kg, g, lb, unid, paquete, botella, lata, litro, etc.)
- price: precio si es visible (número decimal)
- category: categoría del producto (proteínas, lácteos, vegetales, frutas, granos, despensa, especias, bebidas, congelados, otros)
- brand: marca si se menciona

Responde ÚNICAMENTE con JSON válido en este formato exacto:
{
  "items": [
    {
      "name": "Leche entera",
      "quantity": 2,
      "unit": "litro",
      "price": 4500,
      "category": "lácteos",
      "brand": "Alpina"
    }
  ],
  "store": "nombre de la tienda si es visible",
  "total": "total de la compra si es visible"
}

Si no puedes leer claramente el recibo, devuelve: {"items": [], "error": "No se pudo leer el recibo"}`;

    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: GEMINI_CONFIG.parsing.temperature,
        maxOutputTokens: GEMINI_CONFIG.parsing.maxOutputTokens,
        responseMimeType: "application/json",
      },
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return NextResponse.json({
        items: [],
        error: "No hubo respuesta de la IA",
      });
    }

    // Clean and parse response
    const jsonContent = cleanJsonResponse(content);
    const raw = JSON.parse(jsonContent);

    // Validar forma y tipos del output del modelo antes de mapear/persistir
    const parsedResult = ScanReceiptOutputSchema.safeParse(raw);
    if (!parsedResult.success) {
      logger.error("AI receipt scan failed schema validation", {
        issues: parsedResult.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      return NextResponse.json(
        { error: "La IA devolvió un recibo con formato inválido", items: [] },
        { status: 502 },
      );
    }
    const parsed = parsedResult.data;

    if (parsed.error) {
      return NextResponse.json({ items: [], error: parsed.error });
    }

    // Coercionar quantity/price (pueden venir como string desde el LLM)
    const toNumber = (value: unknown): number | undefined => {
      if (typeof value === "number")
        return Number.isFinite(value) ? value : undefined;
      if (typeof value === "string") {
        const n = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };

    // Map categories to our format
    const items: ScannedProduct[] = (parsed.items || []).map((item) => {
      const categoryKey = (item.category || "otros").toLowerCase();
      const categoryInfo =
        CATEGORIES_MAP[categoryKey] || CATEGORIES_MAP["otros"];

      return {
        name: item.name,
        quantity: toNumber(item.quantity) ?? 1,
        unit: item.unit || "unid",
        price: toNumber(item.price),
        category: categoryInfo,
        brand: item.brand,
      };
    });

    return NextResponse.json({
      items,
      store: parsed.store,
      total: parsed.total,
    });
  } catch (error) {
    logger.error("Error scanning receipt", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error al procesar el recibo", items: [] },
      { status: 500 },
    );
  }
}
