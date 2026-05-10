import { createServiceRoleClient } from "@/lib/supabase/server";
import { searchPexels, scorePexelsMatch } from "@/lib/pexels";

// Normaliza: lowercase, sin tildes, sin caracteres raros
export function normalizeRecipeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

export interface CachedRecipeImage {
  image_url: string;
  source: "pexels" | "unsplash" | "imagen3" | "manual";
  attribution: string | null;
  attribution_url: string | null;
}

export async function getCachedRecipeImage(
  recipeName: string,
): Promise<CachedRecipeImage | null> {
  const hash = normalizeRecipeName(recipeName);

  try {
    const supabase = createServiceRoleClient();

    const { data } = await supabase
      .from("recipe_image_cache")
      .select("image_url, source, attribution, attribution_url")
      .eq("recipe_name_hash", hash)
      .maybeSingle();

    return data as CachedRecipeImage | null;
  } catch (err) {
    console.error("[recipe-image-cache] getCachedRecipeImage error:", err);
    return null;
  }
}

export interface HybridImageResult {
  imageUrl: string | null;
  source: "cache" | "pexels" | "none";
  attribution?: string;
  attributionUrl?: string;
}

/**
 * Estrategia hibrida para obtener imagen de receta:
 *  1. Busca en cache (recipe_image_cache).
 *  2. Si no, busca en Pexels (gratis).
 *  3. Si encuentra, guarda en cache + actualiza recipes.image_url (si recipeId provisto).
 *  4. NO llama a Imagen 3 desde aqui (eso es responsabilidad del endpoint interactivo).
 *
 * Util para pre-cargar imagenes en batch (cron) sin generar costos.
 */
export async function getRecipeImageHybrid(
  recipeName: string,
  searchQuery?: string,
  recipeId?: string,
): Promise<HybridImageResult> {
  // 1. Intentar cache
  const cached = await getCachedRecipeImage(recipeName);
  if (cached?.image_url) {
    return {
      imageUrl: cached.image_url,
      source: "cache",
      attribution: cached.attribution ?? undefined,
      attributionUrl: cached.attribution_url ?? undefined,
    };
  }

  // 2. Buscar en Pexels
  const query = searchQuery || recipeName;
  const photos = await searchPexels(query, {
    perPage: 5,
    orientation: "landscape",
  });

  if (photos.length === 0) {
    return { imageUrl: null, source: "none" };
  }

  // Tomar la mejor (mayor score)
  const best = photos
    .map((p) => ({ p, score: scorePexelsMatch(p, recipeName) }))
    .sort((a, b) => b.score - a.score)[0].p;

  const imageUrl = best.src.large;
  const attribution = `Foto por ${best.photographer} en Pexels`;
  const attributionUrl = best.photographer_url;

  // 3. Guardar en cache (best-effort)
  await cacheRecipeImage({
    recipeName,
    imageUrl,
    source: "pexels",
    attribution,
    attributionUrl,
  });

  // 4. Actualizar recipes.image_url si se provee recipeId y el campo es null
  if (recipeId) {
    try {
      const supabase = createServiceRoleClient();
      await supabase
        .from("recipes")
        .update({ image_url: imageUrl })
        .eq("id", recipeId)
        .is("image_url", null);
    } catch (err) {
      console.error(
        "[recipe-image-cache] update recipes.image_url error:",
        err,
      );
    }
  }

  return { imageUrl, source: "pexels", attribution, attributionUrl };
}

export async function cacheRecipeImage(params: {
  recipeName: string;
  imageUrl: string;
  source: "pexels" | "unsplash" | "imagen3" | "manual";
  attribution?: string;
  attributionUrl?: string;
}): Promise<void> {
  const hash = normalizeRecipeName(params.recipeName);

  try {
    const supabase = createServiceRoleClient();

    await supabase.from("recipe_image_cache").upsert(
      {
        recipe_name_hash: hash,
        recipe_name: params.recipeName,
        image_url: params.imageUrl,
        source: params.source,
        attribution: params.attribution ?? null,
        attribution_url: params.attributionUrl ?? null,
      },
      {
        onConflict: "recipe_name_hash",
      },
    );
  } catch (err) {
    // No lanzar — el cache es best-effort, no debe romper el flujo principal
    console.error("[recipe-image-cache] cacheRecipeImage error:", err);
  }
}
