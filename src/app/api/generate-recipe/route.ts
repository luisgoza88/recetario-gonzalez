import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface GenerateRecipeRequest {
  availableIngredients: string[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings?: number;
  preferences?: string[];
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: GenerateRecipeRequest = await request.json();
    const { availableIngredients, mealType, servings = 5, preferences = [] } = body;

    if (!availableIngredients || availableIngredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients provided' },
        { status: 400 }
      );
    }

    const mealTypeLabels = {
      breakfast: 'desayuno',
      lunch: 'almuerzo',
      dinner: 'cena'
    };

    const prompt = `Eres un chef profesional especializado en cocina colombiana y latinoamericana saludable.

INGREDIENTES DISPONIBLES:
${availableIngredients.join('\n')}

REQUERIMIENTOS:
- Tipo de comida: ${mealTypeLabels[mealType]}
- Porciones: ${servings}
- Preferencias: ${preferences.length > 0 ? preferences.join(', ') : 'Saludable, balanceada'}

INSTRUCCIONES:
Genera UNA receta saludable y deliciosa que pueda prepararse PRINCIPALMENTE con los ingredientes disponibles.
Si necesitas algún ingrediente básico adicional (sal, aceite, especias comunes), indícalo.

Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:
{
  "name": "Nombre de la receta",
  "description": "Breve descripción de la receta (1-2 oraciones)",
  "type": "${mealType}",
  "prepTime": "tiempo de preparación",
  "cookTime": "tiempo de cocción",
  "totalTime": "tiempo total",
  "servings": ${servings},
  "calories": "calorías aproximadas por porción",
  "ingredients": [
    {
      "name": "ingrediente",
      "total": "cantidad total",
      "luis": "cantidad para 3 porciones",
      "mariana": "cantidad para 2 porciones",
      "available": true o false (si está en los ingredientes disponibles)
    }
  ],
  "steps": [
    "Paso 1...",
    "Paso 2..."
  ],
  "tips": "Consejos adicionales para la receta",
  "nutritionHighlights": ["Alto en proteína", "Bajo en carbohidratos", etc.],
  "usedIngredients": ["lista de ingredientes disponibles que se usaron"],
  "additionalIngredients": ["ingredientes adicionales necesarios (si hay)"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente de cocina experto. Siempre respondes en JSON válido sin texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Error generating recipe' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const recipe = JSON.parse(jsonContent);

      return NextResponse.json({
        success: true,
        recipe
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      return NextResponse.json(
        { error: 'Invalid recipe format from AI' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate recipe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
