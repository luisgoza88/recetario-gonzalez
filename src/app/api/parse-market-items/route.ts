import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Categorías disponibles con ejemplos para ayudar a la IA
const CATEGORIES_INFO = {
  proteins: {
    id: 'proteins',
    name: 'Proteínas',
    icon: '🥩',
    examples: ['pollo', 'res', 'cerdo', 'pescado', 'camarones', 'atún', 'huevos', 'tocineta', 'jamón', 'salchicha', 'carne molida', 'langostinos', 'salmón', 'tilapia']
  },
  dairy: {
    id: 'dairy',
    name: 'Lácteos',
    icon: '🧀',
    examples: ['leche', 'queso', 'yogurt', 'crema', 'mantequilla', 'crema de leche', 'queso crema', 'queso mozzarella', 'queso parmesano', 'leche condensada']
  },
  vegetables: {
    id: 'vegetables',
    name: 'Vegetales',
    icon: '🥬',
    examples: ['tomate', 'cebolla', 'ajo', 'pimentón', 'zanahoria', 'papa', 'lechuga', 'espinaca', 'brócoli', 'pepino', 'apio', 'cilantro', 'perejil', 'aguacate', 'champiñones']
  },
  fruits: {
    id: 'fruits',
    name: 'Frutas',
    icon: '🍎',
    examples: ['manzana', 'banano', 'naranja', 'limón', 'fresa', 'mango', 'piña', 'uvas', 'sandía', 'papaya', 'melón', 'mora', 'arándanos']
  },
  grains: {
    id: 'grains',
    name: 'Granos y Carbohidratos',
    icon: '🍚',
    examples: ['arroz', 'pasta', 'pan', 'avena', 'quinoa', 'lentejas', 'frijoles', 'garbanzos', 'harina', 'tortillas', 'cereal', 'pan tajado', 'arepa']
  },
  pantry: {
    id: 'pantry',
    name: 'Despensa',
    icon: '🫙',
    examples: ['aceite', 'sal', 'azúcar', 'vinagre', 'salsa de tomate', 'mayonesa', 'mostaza', 'galletas', 'chocolate', 'café', 'té', 'miel', 'mermelada', 'atún enlatado', 'sardinas', 'maíz enlatado', 'pasta de tomate']
  },
  spices: {
    id: 'spices',
    name: 'Especias y Hierbas',
    icon: '🌿',
    examples: ['pimienta', 'comino', 'orégano', 'paprika', 'canela', 'laurel', 'tomillo', 'romero', 'curry', 'cúrcuma', 'adobo', 'sazonador']
  },
  beverages: {
    id: 'beverages',
    name: 'Bebidas',
    icon: '🥤',
    examples: ['agua', 'jugo', 'gaseosa', 'vino', 'cerveza', 'agua con gas', 'leche de almendras', 'leche de coco', 'bebida energética']
  },
  frozen: {
    id: 'frozen',
    name: 'Congelados',
    icon: '❄️',
    examples: ['helado', 'pizza congelada', 'vegetales congelados', 'papas congeladas', 'nuggets', 'empanadas congeladas']
  },
  other: {
    id: 'other',
    name: 'Otros',
    icon: '📦',
    examples: ['servilletas', 'papel aluminio', 'bolsas', 'detergente', 'jabón']
  }
};

export interface ParsedMarketItem {
  name: string;           // Nombre limpio del producto
  originalInput: string;  // Lo que escribió el usuario
  category: {
    id: string;
    name: string;
    icon: string;
  };
  quantity: number;
  unit: string;
  brand?: string;         // Marca si se detectó
  confidence: number;     // 0-1 qué tan segura está la IA
  needsClarification?: string;  // Pregunta si hay duda
}

export interface ParseResponse {
  items: ParsedMarketItem[];
  hasQuestions: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Construir el prompt para la IA
    const categoriesDescription = Object.values(CATEGORIES_INFO)
      .map(cat => `- ${cat.id} (${cat.name}): ${cat.examples.join(', ')}`)
      .join('\n');

    const systemPrompt = `Eres un asistente para categorizar productos de supermercado en Colombia/Latinoamérica.

CATEGORÍAS DISPONIBLES:
${categoriesDescription}

Tu tarea es analizar el texto del usuario y extraer:
1. Nombre del producto (limpio, sin marca)
2. Categoría correcta
3. Cantidad y unidad
4. Marca (si se menciona)

REGLAS IMPORTANTES:
- Si mencionan una marca (ej: "Chocolate Luker", "Galletas Saltinas", "Leche Alpina"), extrae el producto genérico y guarda la marca aparte
- "Galletas Saltinas" → producto: "Galletas", marca: "Saltinas", categoría: pantry
- "Chocolate Luker" → producto: "Chocolate", marca: "Luker", categoría: pantry
- "Leche Alpina" → producto: "Leche", marca: "Alpina", categoría: dairy
- Los mariscos (camarones, langostinos, etc.) van en "proteins"
- Si no se especifica cantidad, usa 1
- Unidades comunes: kg, g, lb, unid, bolsa, paquete, botella, lata, tarro, litro, ml
- Si hay ambigüedad, indica needsClarification con una pregunta breve

Responde SOLO con JSON válido en este formato:
{
  "items": [
    {
      "name": "Nombre limpio",
      "originalInput": "lo que escribió el usuario para este item",
      "categoryId": "proteins|dairy|vegetables|fruits|grains|pantry|spices|beverages|frozen|other",
      "quantity": 1,
      "unit": "kg",
      "brand": "Marca o null",
      "confidence": 0.95,
      "needsClarification": "Pregunta si hay duda o null"
    }
  ]
}`;

    const userPrompt = `Analiza y categoriza estos productos: "${input}"

Separa múltiples productos si los hay (pueden estar separados por comas, "y", o saltos de línea).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Limpiar y parsear la respuesta
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

    // Mapear la respuesta al formato esperado
    const items: ParsedMarketItem[] = parsed.items.map((item: {
      name: string;
      originalInput?: string;
      categoryId: string;
      quantity?: number;
      unit?: string;
      brand?: string | null;
      confidence?: number;
      needsClarification?: string | null;
    }) => {
      const categoryInfo = CATEGORIES_INFO[item.categoryId as keyof typeof CATEGORIES_INFO] || CATEGORIES_INFO.other;

      return {
        name: item.name,
        originalInput: item.originalInput || item.name,
        category: {
          id: categoryInfo.id,
          name: categoryInfo.name,
          icon: categoryInfo.icon
        },
        quantity: item.quantity || 1,
        unit: item.unit || 'unid',
        brand: item.brand || undefined,
        confidence: item.confidence || 0.8,
        needsClarification: item.needsClarification || undefined
      };
    });

    const hasQuestions = items.some((item: ParsedMarketItem) => item.needsClarification);

    return NextResponse.json({ items, hasQuestions });

  } catch (error) {
    console.error('Error parsing market items:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}
