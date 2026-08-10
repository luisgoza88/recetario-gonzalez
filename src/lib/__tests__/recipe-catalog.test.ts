import { describe, expect, it } from "vitest";
import type { Recipe } from "@/types";
import {
  applyRecipeImageOverride,
  mapLibraryRecipe,
} from "@/lib/recipe-catalog";
import { RECIPE_IMAGE_OVERRIDES } from "@/data/recipe-image-overrides";
import { lowCarbColombianRecipes } from "@/data/low-carb-colombian-recipes";

describe("recipe catalog image overrides", () => {
  it("adds the approved pilot image to a static library recipe", () => {
    const recipe = lowCarbColombianRecipes.find(
      (candidate) => candidate.id === "lc-co-01",
    );

    expect(recipe).toBeDefined();
    expect(mapLibraryRecipe(recipe!).image_url).toBe(
      "/images/recipes/pilot-2026-08/lc-co-01-pechuga-limon-brocoli.webp",
    );
  });

  it("replaces a weak remote image for an approved recipe", () => {
    const recipe = {
      id: "lc-co-16",
      name: "Tilapia en Hogao con Calabacín",
      type: "lunch",
      ingredients: [],
      steps: [],
      image_url: "https://example.com/generic-fish.jpg",
    } satisfies Recipe;

    expect(applyRecipeImageOverride(recipe).image_url).toBe(
      "/images/recipes/pilot-2026-08/lc-co-16-tilapia-hogao-calabacin.webp",
    );
  });

  it("does not alter recipes outside the approved pilot", () => {
    const recipe = {
      id: "other-recipe",
      name: "Otra receta",
      type: "dinner",
      ingredients: [],
      steps: [],
      image_url: "https://example.com/original.jpg",
    } satisfies Recipe;

    expect(applyRecipeImageOverride(recipe)).toBe(recipe);
  });

  it("includes the fifty-image follow-up batch", () => {
    expect(Object.keys(RECIPE_IMAGE_OVERRIDES)).toHaveLength(62);
    expect(
      applyRecipeImageOverride({
        id: "reg-08",
        name: "Tapao de Pescado",
        type: "lunch",
        ingredients: [],
        steps: [],
      }).image_url,
    ).toBe("/images/recipes/batch-2026-08/reg-08.webp");
  });
});
