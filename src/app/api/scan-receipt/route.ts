import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Categorías disponibles para mapear
const CATEGORIES_MAP: Record<string, { id: string; name: string; icon: string }> = {
  'proteínas': { id: 'proteins', name: 'Proteínas', icon: '🥩' },
  'proteinas': { id: 'proteins', name: 'Proteínas', icon: '🥩' },
  'carnes': { id: 'proteins', name: 'Proteínas', icon: '🥩' },
  'lácteos': { id: 'dairy', name: 'Lácteos', icon: '🧀' },
  'lacteos': { id: 'dairy', name: 'Lácteos', icon: '🧀' },
  'vegetales': { id: 'vegetables', name: 'Vegetales', icon: '🥬' },
  'verduras': { id: 'vegetables', name: 'Vegetales', icon: '🥬' },
  'frutas': { id: 'fruits', name: 'Frutas', icon: '🍎' },
  'granos': { id: 'grains', name: 'Granos y Carbohidratos', icon: '🍚' },
  'carbohidratos': { id: 'grains', name: 'Granos y Carbohidratos', icon: '🍚' },
  'despensa': { id: 'pantry', name: 'Despensa', icon: '🫙' },
  'abarrotes': { id: 'pantry', name: 'Despensa', icon: '🫙' },
  'especias': { id: 'spices', name: 'Especias y Hierbas', icon: '🌿' },
  'bebidas': { id: 'beverages', name: 'Bebidas', icon: '🥤' },
  'congelados': { id: 'frozen', name: 'Congelados', icon: '❄️' },
  'otros': { id: 'other', name: 'Otros', icon: '📦' },
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

    // Convert to base64
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = image.type || 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen de un recibo de supermercado y extrae todos los productos comprados.

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

Si no puedes leer claramente el recibo, devuelve: {"items": [], "error": "No se pudo leer el recibo"}

IMPORTANTE: Solo devuelve el JSON, sin texto adicional ni markdown.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ items: [], error: 'No hubo respuesta de la IA' });
    }

    // Clean and parse response
    let jsonContent = content;
    jsonContent = jsonContent.replace(/```json\s*/gi, '');
    jsonContent = jsonContent.replace(/```\s*/g, '');
    const firstBrace = jsonContent.indexOf('{');
    if (firstBrace > 0) {
      jsonContent = jsonContent.slice(firstBrace);
    }
    const lastBrace = jsonContent.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < jsonContent.length - 1) {
      jsonContent = jsonContent.slice(0, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonContent);

    if (parsed.error) {
      return NextResponse.json({ items: [], error: parsed.error });
    }

    // Map categories to our format
    const items: ScannedProduct[] = (parsed.items || []).map((item: {
      name: string;
      quantity?: number;
      unit?: string;
      price?: number;
      category?: string;
      brand?: string;
    }) => {
      const categoryKey = (item.category || 'otros').toLowerCase();
      const categoryInfo = CATEGORIES_MAP[categoryKey] || CATEGORIES_MAP['otros'];

      return {
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'unid',
        price: item.price,
        category: categoryInfo,
        brand: item.brand
      };
    });

    return NextResponse.json({
      items,
      store: parsed.store,
      total: parsed.total
    });

  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json(
      { error: 'Error al procesar el recibo', items: [] },
      { status: 500 }
    );
  }
}
