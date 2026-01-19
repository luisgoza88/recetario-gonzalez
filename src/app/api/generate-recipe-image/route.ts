import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_MODELS } from '@/lib/gemini/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GenerateImageRequest {
  recipeName: string;
  recipeDescription?: string;
  recipeType?: 'breakfast' | 'lunch' | 'dinner';
  ingredients?: string[];
  saveToSupabase?: boolean;
  recipeId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const {
      recipeName,
      recipeDescription,
      recipeType,
      ingredients,
      saveToSupabase = false,
      recipeId
    } = body;

    if (!recipeName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre de la receta' },
        { status: 400 }
      );
    }

    const gemini = getGeminiClient();

    // Construir el prompt para generar una imagen de comida fotorrealista
    const mealTypeContext = {
      breakfast: 'plato de desayuno',
      lunch: 'plato de almuerzo',
      dinner: 'plato de cena'
    };

    const typeContext = recipeType ? mealTypeContext[recipeType] : 'plato';
    const ingredientsContext = ingredients?.length
      ? `Los ingredientes principales son: ${ingredients.slice(0, 5).join(', ')}.`
      : '';

    const prompt = `Genera una fotografía profesional de comida del siguiente plato:

"${recipeName}"
${recipeDescription ? `Descripción: ${recipeDescription}` : ''}
${ingredientsContext}

Requisitos de la imagen:
- Estilo: Fotografía gastronómica profesional de alta calidad
- Iluminación: Luz natural suave, difusa, estilo food photography
- Presentación: Plato bellamente emplatado en vajilla elegante pero sencilla
- Ángulo: Vista desde arriba o ángulo de 45 grados
- Fondo: Mesa de madera o mármol con fondo desenfocado (bokeh)
- Ambiente: Cocina hogareña colombiana/latinoamericana acogedora
- El ${typeContext} debe verse apetitoso, fresco y casero
- NO incluir texto, marcas de agua ni elementos artificiales
- Colores vibrantes y naturales`;

    // Usar Imagen 3 primero para mejor calidad fotorrealista
    let imageData: string | null = null;
    let textResponse: string | null = null;

    try {
      console.log('Generando imagen con Imagen 3...');
      const imagen3Response = await gemini.models.generateImages({
        model: GEMINI_MODELS.IMAGE_GEN,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '4:3',
          outputMimeType: 'image/png',
        },
      });

      const generatedImage = imagen3Response.generatedImages?.[0];
      if (generatedImage?.image?.imageBytes) {
        imageData = generatedImage.image.imageBytes;
        console.log('Imagen generada exitosamente con Imagen 3');
      }
    } catch (imagen3Error) {
      console.error('Imagen 3 error, intentando con Gemini Flash:', imagen3Error);
    }

    // Si Imagen 3 falla, usar Gemini 2.0 Flash Exp como respaldo
    if (!imageData) {
      try {
        const response = await gemini.models.generateContent({
          model: GEMINI_MODELS.FLASH_IMAGE,
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          config: {
            responseModalities: ['Text', 'Image'],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              imageData = part.inlineData.data as string;
            }
            if (part.text) {
              textResponse = part.text;
            }
          }
        }
      } catch (flashError) {
        console.error('Gemini Flash error:', flashError);
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: 'No se pudo generar la imagen. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    let imageUrl: string | null = null;

    // Guardar en Supabase Storage si se solicita
    if (saveToSupabase) {
      try {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const fileName = `recipes/${timestamp}-${randomId}.png`;

        // Convertir base64 a buffer
        const imageBuffer = Buffer.from(imageData, 'base64');

        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading to Supabase:', uploadError);
        } else {
          // Obtener URL pública
          const { data: urlData } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(fileName);

          imageUrl = urlData?.publicUrl || null;

          // Si hay recipeId, actualizar la receta con la URL de la imagen
          if (recipeId && imageUrl) {
            await supabase
              .from('recipes')
              .update({ image_url: imageUrl })
              .eq('id', recipeId);
          }
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
      }
    }

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${imageData}`,
      imageUrl,
      recipeName,
      message: textResponse
    });

  } catch (error) {
    console.error('Error generating recipe image:', error);
    return NextResponse.json(
      { error: 'Error al generar la imagen de la receta' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener todas las recetas sin imagen y generar automáticamente
export async function GET() {
  try {
    // Obtener todas las recetas sin imagen
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, name, description, type, ingredients, image_url')
      .or('image_url.is.null,image_url.eq.');

    if (error) {
      return NextResponse.json(
        { error: 'Error al obtener recetas' },
        { status: 500 }
      );
    }

    if (!recipes || recipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todas las recetas ya tienen imágenes',
        recipesWithoutImages: 0
      });
    }

    return NextResponse.json({
      success: true,
      recipesWithoutImages: recipes.length,
      recipes: recipes.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        hasImage: !!r.image_url
      })),
      message: `Hay ${recipes.length} recetas sin imagen. Usa el endpoint PUT con los IDs para generar imágenes.`
    });

  } catch (error) {
    console.error('Error checking recipes:', error);
    return NextResponse.json(
      { error: 'Error al verificar recetas' },
      { status: 500 }
    );
  }
}

// Endpoint para generar imágenes en batch para múltiples recetas
export async function PUT(request: NextRequest) {
  try {
    const { recipeIds } = await request.json();

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de recetas' },
        { status: 400 }
      );
    }

    // Limitar a 10 recetas por batch para evitar timeouts
    const limitedIds = recipeIds.slice(0, 10);

    // Obtener las recetas sin imagen
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, name, description, type, ingredients')
      .in('id', limitedIds)
      .or('image_url.is.null,image_url.eq.');

    if (error || !recipes || recipes.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron recetas para procesar' },
        { status: 404 }
      );
    }

    const results: { recipeId: string; recipeName: string; success: boolean; imageUrl?: string; error?: string }[] = [];

    // Procesar cada receta secuencialmente para evitar rate limits
    for (const recipe of recipes) {
      try {
        // Hacer llamada interna al endpoint POST
        const ingredientNames = Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((ing: { name?: string } | string) =>
              typeof ing === 'string' ? ing : ing.name || ''
            ).filter(Boolean)
          : [];

        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-recipe-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeName: recipe.name,
            recipeDescription: recipe.description,
            recipeType: recipe.type,
            ingredients: ingredientNames.slice(0, 5),
            saveToSupabase: true,
            recipeId: recipe.id
          })
        });

        const result = await generateResponse.json();

        results.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          success: result.success || false,
          imageUrl: result.imageUrl,
          error: result.error
        });

        // Esperar 2 segundos entre generaciones para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (recipeError) {
        results.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          success: false,
          error: String(recipeError)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results
    });

  } catch (error) {
    console.error('Batch image generation error:', error);
    return NextResponse.json(
      { error: 'Error en la generación de imágenes en batch' },
      { status: 500 }
    );
  }
}
