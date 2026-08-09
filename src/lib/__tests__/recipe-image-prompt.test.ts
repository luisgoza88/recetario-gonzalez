import { describe, expect, it } from "vitest";
import { buildRecipeImagePrompt } from "@/lib/recipe-image-prompt";

describe("buildRecipeImagePrompt", () => {
  it("ancla la imagen al plato y sus ingredientes reales", () => {
    const prompt = buildRecipeImagePrompt({
      recipeName: "Tilapia al ajillo con brócoli",
      recipeDescription: "Filete dorado sin arroz ni papa",
      recipeType: "dinner",
      ingredients: ["Tilapia: 400 g", "Brócoli - 1 cabeza", "Ajo: 3 dientes"],
    });
    expect(prompt).toContain("Tilapia al ajillo con brócoli");
    expect(prompt).toContain("Tilapia, Brócoli, Ajo");
    expect(prompt).toMatch(/no inventar guarniciones/i);
    expect(prompt).toMatch(/Colombia/i);
  });
});

