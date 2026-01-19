import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_MODELS, cleanJsonResponse } from '@/lib/gemini/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MatchRequest {
  recipeName: string;
  recipeDescription?: string;
  recipeType?: 'breakfast' | 'lunch' | 'dinner';
  ingredients?: string[];
  recipeId?: string;
  autoAssign?: boolean;
}

interface LibraryImage {
  id: string;
  image_url: string;
  name_es: string;
  name_en: string;
  description_en: string;
  tags: string[];
  category: string;
  cuisine_type: string;
  main_protein: string | null;
  key_ingredients: string[];
}

// POST: Match a recipe to the best image from the library
export async function POST(request: NextRequest) {
  try {
    const body: MatchRequest = await request.json();
    const {
      recipeName,
      recipeDescription,
      recipeType,
      ingredients,
      recipeId,
      autoAssign = false
    } = body;

    if (!recipeName) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 });
    }

    // Get images from library, filtered by category if available
    let query = supabase
      .from('image_library')
      .select('*');

    // Filter by category if recipe type is provided
    if (recipeType === 'breakfast') {
      query = query.eq('category', 'breakfast');
    } else if (recipeType === 'lunch' || recipeType === 'dinner') {
      query = query.in('category', ['lunch', 'dinner']);
    }

    const { data: libraryImages, error: fetchError } = await query.limit(100);

    if (fetchError || !libraryImages || libraryImages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No images in library or error fetching',
        fallback: true,
        message: 'Consider generating a new image'
      });
    }

    // Prepare candidates for AI matching
    const candidates = (libraryImages as LibraryImage[]).map((img, index) => ({
      index,
      id: img.id,
      name: img.name_en,
      name_es: img.name_es,
      description: img.description_en,
      tags: img.tags,
      cuisine: img.cuisine_type,
      protein: img.main_protein,
      ingredients: img.key_ingredients
    }));

    // Build prompt for Gemini Flash
    const ingredientsList = ingredients?.slice(0, 8).join(', ') || 'not specified';

    const prompt = `You are a food matching assistant. Match this recipe to the BEST image from the library.

RECIPE TO MATCH:
Name: "${recipeName}"
${recipeDescription ? `Description: ${recipeDescription}` : ''}
Type: ${recipeType || 'main dish'}
Main ingredients: ${ingredientsList}

AVAILABLE IMAGES (pick the best match):
${JSON.stringify(candidates.slice(0, 50), null, 2)}

MATCHING CRITERIA (in order of importance):
1. Visual similarity - the image should look like what this recipe produces
2. Key ingredients match - similar main ingredients visible
3. Cuisine style - similar cooking tradition
4. Meal type - breakfast with breakfast, lunch/dinner together

Respond with JSON only:
{
  "bestMatchIndex": <number>,
  "confidence": <"high" | "medium" | "low">,
  "reason": "<brief explanation>",
  "alternativeIndices": [<up to 2 other good matches>]
}`;

    const gemini = getGeminiClient();

    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = cleanJsonResponse(responseText);

    let matchResult;
    try {
      matchResult = JSON.parse(cleanedJson);
    } catch {
      console.error('Failed to parse AI response:', responseText);
      // Fallback: return a random match
      const randomIndex = Math.floor(Math.random() * candidates.length);
      matchResult = {
        bestMatchIndex: randomIndex,
        confidence: 'low',
        reason: 'AI parsing failed, random selection',
        alternativeIndices: []
      };
    }

    const bestMatch = candidates[matchResult.bestMatchIndex];
    const matchedImage = libraryImages.find(img => img.id === bestMatch?.id);

    if (!matchedImage) {
      return NextResponse.json({
        success: false,
        error: 'No suitable match found',
        fallback: true
      });
    }

    // Get alternative matches
    const alternatives = (matchResult.alternativeIndices || [])
      .map((idx: number) => {
        const alt = candidates[idx];
        const altImg = libraryImages.find(img => img.id === alt?.id);
        return altImg ? {
          id: altImg.id,
          image_url: altImg.image_url,
          name_es: altImg.name_es,
          name_en: altImg.name_en
        } : null;
      })
      .filter(Boolean);

    // If autoAssign and recipeId provided, update the recipe with this image
    if (autoAssign && recipeId) {
      await supabase
        .from('recipes')
        .update({ image_url: matchedImage.image_url })
        .eq('id', recipeId);

      // Increment usage count
      await supabase
        .from('image_library')
        .update({ usage_count: (matchedImage.usage_count || 0) + 1 })
        .eq('id', matchedImage.id);
    }

    return NextResponse.json({
      success: true,
      match: {
        id: matchedImage.id,
        image_url: matchedImage.image_url,
        name_es: matchedImage.name_es,
        name_en: matchedImage.name_en,
        description_en: matchedImage.description_en,
        confidence: matchResult.confidence,
        reason: matchResult.reason
      },
      alternatives,
      autoAssigned: autoAssign && recipeId ? true : false
    });

  } catch (error) {
    console.error('Match recipe image error:', error);
    return NextResponse.json({ error: 'Matching failed' }, { status: 500 });
  }
}

// GET: Get statistics about the library
export async function GET() {
  try {
    const { data: stats, error } = await supabase
      .from('image_library')
      .select('category, cuisine_type, usage_count');

    if (error) {
      return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
    }

    const byCategory: Record<string, number> = {};
    const byCuisine: Record<string, number> = {};
    let totalUsage = 0;

    stats?.forEach(img => {
      byCategory[img.category] = (byCategory[img.category] || 0) + 1;
      byCuisine[img.cuisine_type] = (byCuisine[img.cuisine_type] || 0) + 1;
      totalUsage += img.usage_count || 0;
    });

    return NextResponse.json({
      success: true,
      totalImages: stats?.length || 0,
      totalUsage,
      byCategory,
      byCuisine
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Error getting stats' }, { status: 500 });
  }
}
