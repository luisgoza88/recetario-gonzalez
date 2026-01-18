import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface GenerateRecipeRequest {
  availableIngredients: string[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings?: number;
  preferences?: string[];
  recentRecipes?: string[]; // Nombres de recetas recientes a evitar
}

interface Preparation {
  name: string;
  ingredients: string[];
  description?: string;
}

// Obtener preparaciones disponibles basadas en ingredientes
async function getAvailablePreparations(availableIngredients: string[]): Promise<Preparation[]> {
  try {
    const { data: preparations } = await supabase
      .from('preparations')
      .select('name, ingredients, description');

    if (!preparations) return [];

    // Normalizar ingredientes disponibles para comparación
    const normalizedAvailable = availableIngredients.map(ing =>
      ing.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('(')[0].trim()
    );

    // Filtrar preparaciones que se pueden hacer (70%+ ingredientes disponibles)
    return preparations.filter(prep => {
      const prepIngredients = prep.ingredients as string[];
      if (!prepIngredients || prepIngredients.length === 0) return false;

      let available = 0;
      for (const ing of prepIngredients) {
        const normalizedIng = ing.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedAvailable.some(avail => avail.includes(normalizedIng) || normalizedIng.includes(avail))) {
          available++;
        }
      }

      return (available / prepIngredients.length) >= 0.7;
    }).map(p => ({
      name: p.name,
      ingredients: p.ingredients as string[],
      description: p.description as string | undefined
    }));
  } catch (error) {
    console.error('Error loading preparations:', error);
    return [];
  }
}

// Obtener recetas recientes para evitar repetición
async function getRecentRecipeNames(): Promise<string[]> {
  try {
    const { data: feedback } = await supabase
      .from('meal_feedback')
      .select('recipe_name')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!feedback) return [];
    return feedback.map(f => f.recipe_name).filter(Boolean) as string[];
  } catch (error) {
    console.error('Error loading recent recipes:', error);
    return [];
  }
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
    const { availableIngredients, mealType, servings = 5, preferences = [], recentRecipes = [] } = body;

    if (!availableIngredients || availableIngredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients provided' },
        { status: 400 }
      );
    }

    // Obtener preparaciones disponibles y recetas recientes
    const [availablePreparations, dbRecentRecipes] = await Promise.all([
      getAvailablePreparations(availableIngredients),
      getRecentRecipeNames()
    ]);

    // Combinar recetas recientes del request y de la base de datos
    const allRecentRecipes = [...new Set([...recentRecipes, ...dbRecentRecipes])];

    const mealTypeLabels = {
      breakfast: 'desayuno',
      lunch: 'almuerzo',
      dinner: 'cena'
    };

    // Construir sección de preparaciones disponibles
    let preparationsSection = '';
    if (availablePreparations.length > 0) {
      preparationsSection = `
PREPARACIONES CASERAS DISPONIBLES:
${availablePreparations.map(p => `- ${p.name}: hecha con ${p.ingredients.join(', ')}`).join('\n')}

Puedes usar estas preparaciones como ingredientes ya listos en tu receta.
`;
    }

    // Construir sección de recetas a evitar
    let avoidSection = '';
    if (allRecentRecipes.length > 0) {
      avoidSection = `
RECETAS A EVITAR (ya consumidas recientemente):
${allRecentRecipes.slice(0, 5).map(r => `- ${r}`).join('\n')}

Por favor NO sugieras estas recetas ni variaciones muy similares.
`;
    }

    const prompt = `Eres un chef profesional especializado en cocina colombiana y latinoamericana saludable.
Trabajas para la Familia González: Luis come porciones más grandes (3 porciones) y Mariana porciones medianas (2 porciones).

INGREDIENTES DISPONIBLES EN LA DESPENSA:
${availableIngredients.join('\n')}
${preparationsSection}${avoidSection}
REQUERIMIENTOS:
- Tipo de comida: ${mealTypeLabels[mealType]}
- Porciones totales: ${servings} (3 para Luis + 2 para Mariana)
- Preferencias: ${preferences.length > 0 ? preferences.join(', ') : 'Saludable, balanceada, fácil de preparar'}

CONTEXTO IMPORTANTE:
- Prioriza usar ingredientes que YA están disponibles
- Puedes usar las preparaciones caseras listadas arriba como ingredientes listos
- Minimiza ingredientes adicionales necesarios
- Las recetas deben ser prácticas para una familia de dos personas
- Considera que Luis prefiere porciones más sustanciosas y Mariana más ligeras

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
      "total": "cantidad total para 5 porciones",
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
  "additionalIngredients": ["ingredientes adicionales necesarios (si hay)"],
  "usedPreparations": ["lista de preparaciones caseras usadas (si aplica)"]
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
