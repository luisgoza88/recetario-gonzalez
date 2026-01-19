import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, cleanJsonResponse } from '@/lib/gemini/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface IngredientWithContext {
  name: string;
  quantity: string;
  category?: string;
  isCustom?: boolean;
}

// Tipos de receta disponibles
export type RecipeStyle =
  | 'saludable'      // Balanceada, nutritiva
  | 'rapida'         // Menos de 30 minutos
  | 'economica'      // Ingredientes económicos
  | 'alta-proteina'  // Rica en proteínas
  | 'baja-carbohidrato' // Low carb / keto friendly
  | 'vegetariana'    // Sin carne
  | 'comfort'        // Reconfortante, tradicional
  | 'ligera';        // Baja en calorías

interface GenerateRecipeRequest {
  availableIngredients: string[] | IngredientWithContext[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings?: number;
  preferences?: string[];
  recipeStyle?: RecipeStyle;
  recentRecipes?: string[];
  ingredientsByCategory?: Record<string, string[]>;
  customItems?: string[];
  generateImage?: boolean; // Nueva opción para generar imagen junto con la receta
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
    const gemini = getGeminiClient();

    const body: GenerateRecipeRequest = await request.json();
    const {
      availableIngredients,
      mealType,
      servings = 5,
      preferences = [],
      recipeStyle = 'saludable',
      recentRecipes = [],
      ingredientsByCategory,
      customItems = [],
      generateImage = false
    } = body;

    // Instrucciones específicas según el estilo de receta
    const styleInstructions: Record<RecipeStyle, string> = {
      'saludable': 'La receta debe ser balanceada y nutritiva, con buen aporte de proteínas, carbohidratos complejos y vegetales.',
      'rapida': 'IMPORTANTE: La receta debe poder prepararse en MENOS DE 30 MINUTOS en total. Prioriza técnicas de cocción rápidas.',
      'economica': 'Usa ingredientes económicos y aprovecha al máximo los ingredientes disponibles. Evita ingredientes costosos.',
      'alta-proteina': 'La receta debe ser ALTA EN PROTEÍNAS (mínimo 25g por porción). Prioriza carnes, huevos, legumbres o lácteos.',
      'baja-carbohidrato': 'La receta debe ser BAJA EN CARBOHIDRATOS (menos de 20g por porción). Evita arroz, pasta, pan y azúcares.',
      'vegetariana': 'La receta debe ser VEGETARIANA. NO uses ningún tipo de carne, pollo, pescado o mariscos.',
      'comfort': 'La receta debe ser reconfortante y tradicional colombiana/latinoamericana. Sabores caseros y abundantes.',
      'ligera': 'La receta debe ser LIGERA y baja en calorías (menos de 350 kcal por porción). Prioriza vegetales y proteínas magras.'
    };

    const selectedStyleInstruction = styleInstructions[recipeStyle] || styleInstructions['saludable'];

    if (!availableIngredients || availableIngredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients provided' },
        { status: 400 }
      );
    }

    // Normalizar ingredientes a string[]
    const ingredientsList = availableIngredients.map(ing =>
      typeof ing === 'string' ? ing : `${ing.name} (${ing.quantity})`
    );

    // Obtener preparaciones disponibles y recetas recientes
    const [availablePreparations, dbRecentRecipes] = await Promise.all([
      getAvailablePreparations(ingredientsList),
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

    // Construir sección de ingredientes por categoría (si está disponible)
    let ingredientsSection = '';
    if (ingredientsByCategory && Object.keys(ingredientsByCategory).length > 0) {
      ingredientsSection = Object.entries(ingredientsByCategory)
        .map(([category, items]) => `${category}:\n${items.map(i => `  - ${i}`).join('\n')}`)
        .join('\n\n');
    } else {
      ingredientsSection = ingredientsList.join('\n');
    }

    // Construir sección de items personalizados
    let customSection = '';
    if (customItems.length > 0) {
      customSection = `
INGREDIENTES ESPECIALES (Compras recientes/regalos que queremos usar):
${customItems.map(c => `- ${c}`).join('\n')}

PRIORIZA usar estos ingredientes especiales! La familia los tiene disponibles y quiere aprovecharlos.
`;
    }

    const prompt = `Eres un chef profesional especializado en cocina colombiana y latinoamericana saludable.
Trabajas para la Familia González: Luis come porciones más grandes (3 porciones) y Mariana porciones medianas (2 porciones).

INGREDIENTES DISPONIBLES EN LA DESPENSA:
${ingredientsSection}
${customSection}${preparationsSection}${avoidSection}
REQUERIMIENTOS:
- Tipo de comida: ${mealTypeLabels[mealType]}
- Porciones totales: ${servings} (3 para Luis + 2 para Mariana)
- Estilo de receta: ${recipeStyle.toUpperCase()}
- ${selectedStyleInstruction}
- Preferencias adicionales: ${preferences.length > 0 ? preferences.join(', ') : 'Fácil de preparar'}

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

    // Llamar a Gemini
    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      config: {
        temperature: GEMINI_CONFIG.recipe.temperature,
        maxOutputTokens: GEMINI_CONFIG.recipe.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse JSON response with robust cleaning
    try {
      const jsonContent = cleanJsonResponse(content);
      const recipe = JSON.parse(jsonContent);

      // Validate essential fields
      if (!recipe.name || !recipe.ingredients || !recipe.steps) {
        throw new Error('Missing required recipe fields');
      }

      // Si se solicitó generar imagen, hacerlo de forma asíncrona
      let recipeImage = null;
      if (generateImage) {
        try {
          // Generar imagen con Gemini
          const ingredientNames = recipe.ingredients
            .map((ing: { name: string }) => ing.name)
            .slice(0, 5);

          const imagePrompt = `Genera una fotografía profesional de comida del plato "${recipe.name}".
${recipe.description ? `Descripción: ${recipe.description}` : ''}
Ingredientes principales: ${ingredientNames.join(', ')}.
Estilo: Fotografía gastronómica profesional, luz natural, plato emplatado elegantemente, fondo desenfocado.`;

          const imageResponse = await gemini.models.generateContent({
            model: GEMINI_MODELS.FLASH_IMAGE,
            contents: [{
              role: 'user',
              parts: [{ text: imagePrompt }]
            }],
            config: {
              responseModalities: ['image', 'text'],
              responseMimeType: 'image/png',
            },
          });

          const imageParts = imageResponse.candidates?.[0]?.content?.parts;
          if (imageParts) {
            for (const part of imageParts) {
              if (part.inlineData) {
                recipeImage = `data:image/png;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imageError) {
          console.error('Error generating recipe image:', imageError);
          // No fallar si la imagen no se genera
        }
      }

      return NextResponse.json({
        success: true,
        recipe,
        image: recipeImage
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content.slice(0, 500));

      return NextResponse.json(
        {
          error: 'Error al procesar la receta generada. Por favor intenta de nuevo.',
          details: parseError instanceof Error ? parseError.message : 'Parse error'
        },
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
