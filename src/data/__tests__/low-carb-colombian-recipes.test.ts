import { describe, expect, it } from "vitest";
import type { DietaryPreferences } from "@/types";
import { lowCarbColombianRecipes } from "@/data/low-carb-colombian-recipes";
import { analyzeRecipeForDiet } from "@/lib/recipe-diet";

const requestedPlan: DietaryPreferences = {
  avoid_ingredients: [],
  meal_plan: {
    allowed_groups: ["pollo-aves", "pescado", "verduras"],
    carb_target: "muy-bajo",
    meal_types: ["lunch", "dinner"],
    max_difficulty: "media",
    max_total_time: 60,
    colombia_easy_only: true,
  },
};

describe("colección colombiana baja en carbohidratos", () => {
  it("incluye 30 recetas únicas y completas", () => {
    expect(lowCarbColombianRecipes).toHaveLength(30);
    expect(new Set(lowCarbColombianRecipes.map((recipe) => recipe.id)).size).toBe(
      30,
    );

    for (const recipe of lowCarbColombianRecipes) {
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(5);
      expect(recipe.steps.length).toBeGreaterThanOrEqual(3);
      expect(recipe.total_time).toBeLessThanOrEqual(60);
      expect(recipe.nutrition?.carbs).toBeLessThanOrEqual(15);
      expect(recipe.dietary_tags).toContain("bajo-carbohidrato");
    }
  });

  it("clasifica las 30 como aptas para pollo/pescado/verduras", () => {
    const analyses = lowCarbColombianRecipes.map((recipe) =>
      analyzeRecipeForDiet(recipe, requestedPlan),
    );
    expect(analyses.every((analysis) => analysis.status === "compatible")).toBe(
      true,
    );
  });

  it("mantiene variedad equilibrada entre pollo y pescado", () => {
    const analyses = lowCarbColombianRecipes.map((recipe) =>
      analyzeRecipeForDiet(recipe, requestedPlan),
    );
    expect(
      analyses.filter((analysis) => analysis.groups.includes("pollo-aves")),
    ).toHaveLength(15);
    expect(
      analyses.filter((analysis) => analysis.groups.includes("pescado")),
    ).toHaveLength(15);
  });
});
