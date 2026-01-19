import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, cleanJsonResponse } from '@/lib/gemini/client';
import {
  getProteinIcon,
  getVegetableIcon,
  getTuberIcon,
  getFruitIcon,
  getDairyIcon,
  getGrainIcon,
  getPantryIcon,
  getSpiceIcon,
  getBeverageIcon,
  getFrozenIcon,
  getSnackIcon,
  getBakeryIcon,
  getHouseholdIcon,
  getPetFoodIcon
} from '@/lib/categoryIcons';

// Categorías disponibles con ejemplos para ayudar a la IA
const CATEGORIES_INFO = {
  proteins: {
    id: 'proteins',
    name: 'Proteínas',
    icon: '🥩',
    getIcon: getProteinIcon,
    examples: ['pollo', 'res', 'cerdo', 'pescado', 'camarones', 'atún', 'huevos', 'tocineta', 'jamón', 'salchicha', 'carne molida', 'langostinos', 'salmón', 'tilapia', 'sardinas', 'pulpo', 'calamar']
  },
  dairy: {
    id: 'dairy',
    name: 'Lácteos',
    icon: '🧀',
    getIcon: getDairyIcon,
    examples: ['leche', 'queso', 'yogurt', 'crema', 'mantequilla', 'crema de leche', 'queso crema', 'queso mozzarella', 'queso parmesano', 'leche condensada', 'kumis', 'kefir']
  },
  vegetables: {
    id: 'vegetables',
    name: 'Vegetales',
    icon: '🥬',
    getIcon: getVegetableIcon,
    examples: ['tomate', 'cebolla', 'ajo', 'pimentón', 'zanahoria', 'lechuga', 'espinaca', 'brócoli', 'pepino', 'apio', 'cilantro', 'perejil', 'aguacate', 'champiñones', 'coliflor', 'repollo']
  },
  tubers: {
    id: 'tubers',
    name: 'Tubérculos',
    icon: '🥔',
    getIcon: getTuberIcon,
    examples: ['papa', 'yuca', 'batata', 'camote', 'ñame', 'papa criolla', 'malanga']
  },
  fruits: {
    id: 'fruits',
    name: 'Frutas',
    icon: '🍎',
    getIcon: getFruitIcon,
    examples: ['manzana', 'banano', 'naranja', 'limón', 'fresa', 'mango', 'piña', 'uvas', 'sandía', 'papaya', 'melón', 'mora', 'arándanos', 'kiwi', 'cereza', 'durazno']
  },
  grains: {
    id: 'grains',
    name: 'Granos y Carbohidratos',
    icon: '🍚',
    getIcon: getGrainIcon,
    examples: ['arroz', 'pasta', 'pan', 'avena', 'quinoa', 'lentejas', 'frijoles', 'garbanzos', 'harina', 'tortillas', 'cereal', 'pan tajado', 'arepa', 'espagueti']
  },
  pantry: {
    id: 'pantry',
    name: 'Despensa',
    icon: '🫙',
    getIcon: getPantryIcon,
    examples: ['aceite', 'vinagre', 'salsa de tomate', 'mayonesa', 'mostaza', 'chocolate', 'café', 'té', 'miel', 'mermelada', 'atún enlatado', 'maíz enlatado', 'pasta de tomate', 'aceitunas', 'nueces', 'almendras']
  },
  spices: {
    id: 'spices',
    name: 'Especias y Condimentos',
    icon: '🧂',
    getIcon: getSpiceIcon,
    examples: ['sal', 'pimienta', 'comino', 'orégano', 'paprika', 'canela', 'laurel', 'tomillo', 'romero', 'curry', 'cúrcuma', 'adobo', 'sazonador', 'ajo en polvo']
  },
  beverages: {
    id: 'beverages',
    name: 'Bebidas',
    icon: '🥤',
    getIcon: getBeverageIcon,
    examples: ['agua', 'jugo', 'gaseosa', 'vino', 'cerveza', 'agua con gas', 'leche de almendras', 'leche de coco', 'bebida energética', 'café preparado', 'té preparado']
  },
  frozen: {
    id: 'frozen',
    name: 'Congelados',
    icon: '❄️',
    getIcon: getFrozenIcon,
    examples: ['helado', 'pizza congelada', 'vegetales congelados', 'papas congeladas', 'nuggets', 'empanadas congeladas', 'frutas congeladas']
  },
  snacks: {
    id: 'snacks',
    name: 'Snacks',
    icon: '🍿',
    getIcon: getSnackIcon,
    examples: ['papas fritas', 'galletas', 'chips', 'nachos', 'palomitas', 'gomitas', 'chocolates', 'dulces', 'maní', 'pasas']
  },
  bakery: {
    id: 'bakery',
    name: 'Panadería',
    icon: '🥖',
    getIcon: getBakeryIcon,
    examples: ['baguette', 'croissant', 'torta', 'pastel', 'dona', 'pan artesanal', 'buñuelos', 'churros', 'levadura', 'polvo de hornear']
  },
  household: {
    id: 'household',
    name: 'Hogar y Limpieza',
    icon: '🧹',
    getIcon: getHouseholdIcon,
    examples: ['papel higiénico', 'servilletas', 'detergente', 'jabón', 'cloro', 'desinfectante', 'bolsas de basura', 'papel aluminio', 'shampoo']
  },
  pet_food: {
    id: 'pet_food',
    name: 'Mascotas',
    icon: '🐾',
    getIcon: getPetFoodIcon,
    examples: ['comida para perro', 'comida para gato', 'croquetas', 'alimento mascota']
  },
  other: {
    id: 'other',
    name: 'Otros',
    icon: '📦',
    getIcon: null,
    examples: ['artículos varios']
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
- "Galletas Saltinas" → producto: "Galletas", marca: "Saltinas", categoría: snacks
- "Chocolate Luker" → producto: "Chocolate", marca: "Luker", categoría: pantry
- "Leche Alpina" → producto: "Leche", marca: "Alpina", categoría: dairy
- Los mariscos (camarones, langostinos, etc.) van en "proteins"
- Los tubérculos (papa, yuca, batata, ñame) van en "tubers" NO en vegetables
- Los snacks y galletas van en "snacks" NO en pantry
- La panadería fresca y repostería van en "bakery"
- Productos de limpieza y hogar van en "household"
- Comida para mascotas va en "pet_food"
- Si no se especifica cantidad, usa 1
- Unidades comunes: kg, g, lb, unid, bolsa, paquete, botella, lata, tarro, litro, ml
- Si hay ambigüedad, indica needsClarification con una pregunta breve

Responde SOLO con JSON válido en este formato:
{
  "items": [
    {
      "name": "Nombre limpio",
      "originalInput": "lo que escribió el usuario para este item",
      "categoryId": "proteins|dairy|vegetables|tubers|fruits|grains|pantry|spices|beverages|frozen|snacks|bakery|household|pet_food|other",
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

    const gemini = getGeminiClient();

    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{
        role: 'user',
        parts: [
          { text: systemPrompt },
          { text: userPrompt }
        ]
      }],
      config: {
        temperature: GEMINI_CONFIG.parsing.temperature,
        maxOutputTokens: GEMINI_CONFIG.parsing.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Limpiar y parsear la respuesta
    const jsonContent = cleanJsonResponse(content);
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

      // Usar función de icono específica si existe, sino usar el icono default de la categoría
      const icon = categoryInfo.getIcon
        ? categoryInfo.getIcon(item.name)
        : categoryInfo.icon;

      return {
        name: item.name,
        originalInput: item.originalInput || item.name,
        category: {
          id: categoryInfo.id,
          name: categoryInfo.name,
          icon: icon
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
