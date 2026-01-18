import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedRecipe {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  description: string;
  total: string;
  portions: {
    luis: string;
    mariana: string;
  };
  ingredients: Array<{
    name: string;
    total: string;
    luis: string;
    mariana: string;
  }>;
  steps: string[];
  tips: string;
  prep_time: number;
  cook_time: number;
}

export async function POST(request: NextRequest) {
  try {
    const { image, description, type } = await request.json();

    if (!image && !description) {
      return NextResponse.json(
        { error: 'Se requiere una imagen o descripción' },
        { status: 400 }
      );
    }

    const systemPrompt = `Eres un chef experto colombiano que ayuda a la Familia González a crear recetas.

CONTEXTO FAMILIAR:
- Luis: Come porciones más grandes (aproximadamente 60% del total)
- Mariana: Come porciones más ligeras (aproximadamente 40% del total)
- Prefieren comida colombiana casera pero también les gustan recetas internacionales
- Cocinan para 2 personas

Tu tarea es generar una receta completa basada en la imagen o descripción proporcionada.

INSTRUCCIONES:
1. Identifica el plato y dale un nombre apropiado
2. Determina si es desayuno, almuerzo o cena
3. Lista TODOS los ingredientes con cantidades específicas
4. Calcula porciones para Luis (60%) y Mariana (40%)
5. Escribe pasos detallados de preparación
6. Incluye tips útiles

IMPORTANTE para ingredientes:
- Usa unidades colombianas cuando sea apropiado (lb, kg, g, ml, unidades, cucharadas, etc.)
- Sé específico con las cantidades (no "un poco", sino "2 cucharadas")
- Para el total, suma las cantidades de ambas porciones

Responde ÚNICAMENTE en formato JSON válido con esta estructura:
{
  "name": "Nombre del plato",
  "type": "lunch", // breakfast, lunch, o dinner
  "description": "Breve descripción del plato",
  "total": "Cantidad total a preparar (ej: 800g de pollo + 400ml de salsa)",
  "portions": {
    "luis": "Descripción de porción de Luis",
    "mariana": "Descripción de porción de Mariana"
  },
  "ingredients": [
    {
      "name": "Nombre del ingrediente",
      "total": "Cantidad total",
      "luis": "Porción Luis",
      "mariana": "Porción Mariana"
    }
  ],
  "steps": [
    "Paso 1 detallado",
    "Paso 2 detallado"
  ],
  "tips": "Consejos útiles para la preparación",
  "prep_time": 15,
  "cook_time": 30
}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Build user message based on input
    if (image) {
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: 'image_url',
          image_url: {
            url: image,
            detail: 'high'
          }
        }
      ];

      if (description) {
        userContent.push({
          type: 'text',
          text: `Genera una receta basada en esta imagen. Información adicional del usuario: "${description}". ${type ? `Tipo de comida: ${type}` : ''}`
        });
      } else {
        userContent.push({
          type: 'text',
          text: `Genera una receta completa basada en esta imagen del plato. ${type ? `Tipo de comida: ${type}` : 'Determina si es desayuno, almuerzo o cena.'}`
        });
      }

      messages.push({ role: 'user', content: userContent });
    } else {
      // Text only
      messages.push({
        role: 'user',
        content: `Genera una receta completa para: "${description}". ${type ? `Tipo de comida: ${type}` : 'Determina si es desayuno, almuerzo o cena basándote en el tipo de plato.'}`
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 2500,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract JSON from response
    let recipeData: GeneratedRecipe;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recipeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('Error parsing recipe response:', content);
      return NextResponse.json(
        { error: 'No se pudo generar la receta. Intenta con otra descripción.' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!recipeData.name || !recipeData.ingredients || !recipeData.steps) {
      return NextResponse.json(
        { error: 'La receta generada está incompleta. Intenta de nuevo.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      recipe: recipeData
    });

  } catch (error) {
    console.error('Error generating recipe:', error);
    return NextResponse.json(
      { error: 'Error al generar la receta' },
      { status: 500 }
    );
  }
}
