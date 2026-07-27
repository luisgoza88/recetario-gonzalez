import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { Ingredient } from "@/types";
import { representativeQuantity } from "@/lib/portions";

interface Props {
  params: Promise<{ slug: string }>;
}

interface RecipeRow {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  prep_time?: number;
  cook_time?: number;
  region?: string;
  ingredients: Ingredient[];
  steps: string[];
}

const RECIPE_PUBLIC_COLUMNS =
  "id, name, description, image_url, prep_time, cook_time, region, ingredients, steps";

async function getRecipe(slug: string): Promise<RecipeRow | null> {
  // Página pública: se usa service-role en el servidor (nunca llega al cliente)
  // para que el share funcione sin exponer la tabla al rol anónimo.
  const supabase = createServiceRoleClient();

  // 1) Búsqueda exacta por id (parametrizada, sin riesgo de inyección de filtro).
  const byId = await supabase
    .from("recipes")
    .select(RECIPE_PUBLIC_COLUMNS)
    .eq("id", slug)
    .maybeSingle();
  if (byId.data) return byId.data as unknown as RecipeRow;

  // 2) Fallback por nombre normalizado. Se escapan los comodines de LIKE y se
  //    limita a 1 fila para no romper con múltiples coincidencias.
  const nameFromSlug = slug.replace(/-/g, " ");
  const escaped = nameFromSlug.replace(/[%_]/g, "\\$&");
  const byName = await supabase
    .from("recipes")
    .select(RECIPE_PUBLIC_COLUMNS)
    .ilike("name", `%${escaped}%`)
    .limit(1);

  return (byName.data?.[0] as unknown as RecipeRow | undefined) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipe(slug);
  if (!recipe) return { title: "Receta no encontrada" };

  return {
    title: `${recipe.name} - Recetario`,
    description: recipe.description ?? `Receta de ${recipe.name}`,
    openGraph: {
      title: recipe.name,
      description: recipe.description,
      images: recipe.image_url ? [recipe.image_url] : [],
      type: "article",
    },
  };
}

export default async function PublicRecipePage({ params }: Props) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);

  if (!recipe) notFound();

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <article className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {recipe.image_url && (
          <div className="relative w-full h-64">
            <Image
              src={recipe.image_url}
              alt={recipe.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {recipe.name}
          </h1>
          {recipe.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {recipe.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
            {totalTime > 0 && <span>⏱️ {totalTime} min</span>}
            <span>🍽️ 5 porciones</span>
            {recipe.region && <span>🇨🇴 {recipe.region}</span>}
          </div>

          <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
            Ingredientes
          </h2>
          <ul className="space-y-1 mb-6">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1"
              >
                <span className="text-gray-800 dark:text-gray-200">
                  {ing.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {representativeQuantity(ing)}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
            Preparacion
          </h2>
          <ol className="space-y-3 mb-8">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{step}</span>
              </li>
            ))}
          </ol>

          <div className="border-t dark:border-gray-800 pt-6 text-center">
            <a
              href="/auth/register"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
            >
              Agregar a mi recetario
            </a>
            <p className="text-xs text-gray-500 mt-3">
              Compartido desde Recetario
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
