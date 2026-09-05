import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createHouseholdClient } from "@/lib/supabase/server";
import { expandedRecipes } from "@/data/expanded-recipes";
import { regionalRecipes } from "@/data/regional-colombian-recipes";
import { mapLibraryRecipe } from "@/lib/recipe-catalog";
import type { Json } from "@/types/database.types";

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const parsed = z
    .object({ recipeId: z.string().min(1).max(150) })
    .safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Receta inválida" }, { status: 400 });
  const db = await createHouseholdClient();
  const { data } = await db
    .from("recipes")
    .select(
      "id,name,description,image_url,ingredients,steps,prep_time,cook_time,portions,type",
    )
    .eq("id", parsed.data.recipeId)
    .maybeSingle();
  const library = [...expandedRecipes, ...regionalRecipes].find(
    (r) => r.id === parsed.data.recipeId,
  );
  const recipe = data ?? (library ? mapLibraryRecipe(library) : null);
  if (!recipe)
    return NextResponse.json(
      { error: "Receta no encontrada" },
      { status: 404 },
    );
  // Only an explicit Share action creates a public, unguessable snapshot.
  const { data: share, error } = await db
    .from("recipe_shares")
    .insert({
      recipe_id: parsed.data.recipeId,
      snapshot: recipe as unknown as Json,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "No se pudo crear el enlace" },
      { status: 500 },
    );
  return NextResponse.json({ url: `/r/${share.id}` });
}

export async function DELETE(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Enlace inválido" }, { status: 400 });
  const db = await createHouseholdClient();
  const { error } = await db
    .from("recipe_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ success: !error }, { status: error ? 500 : 200 });
}
