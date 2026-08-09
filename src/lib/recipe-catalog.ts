import type { ExpandedRecipe } from "@/data/expanded-recipes";
import type { RegionalRecipe } from "@/data/regional-colombian-recipes";
import type { Recipe } from "@/types";

export function mapLibraryRecipe(
  recipe: ExpandedRecipe | RegionalRecipe,
): Recipe {
  const regional = recipe as RegionalRecipe;
  return {
    id: recipe.id,
    name: recipe.name,
    type: recipe.type,
    portions: recipe.portions,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    total_time: regional.total_time,
    category: recipe.category,
    region: regional.region,
    thermomixCompatible: recipe.thermomixCompatible,
    tags: recipe.tags,
    nutrition: regional.nutrition,
    difficulty: regional.difficulty,
    dietary_tags: regional.dietary_tags,
    description: regional.description,
    source: "manual",
  };
}

export function mergeRecipeCatalog(
  databaseRecipes: Recipe[],
  expandedRecipes: ExpandedRecipe[],
  regionalRecipes: RegionalRecipe[],
): Recipe[] {
  const ids = new Set(databaseRecipes.map((recipe) => recipe.id));
  const merged = [...databaseRecipes];

  for (const recipe of [...expandedRecipes, ...regionalRecipes]) {
    if (ids.has(recipe.id)) continue;
    ids.add(recipe.id);
    merged.push(mapLibraryRecipe(recipe));
  }

  return merged;
}
