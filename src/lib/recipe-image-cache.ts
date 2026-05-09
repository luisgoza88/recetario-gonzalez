import { createServiceRoleClient } from "@/lib/supabase/server";

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
