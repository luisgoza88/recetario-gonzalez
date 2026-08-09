import { describe, expect, it } from "vitest";
import type { DietaryPreferences, Recipe } from "@/types";
import {
  analyzeRecipeForDiet,
  assessRecipePracticality,
  classifyIngredientGroups,
  summarizeDietCompatibility,
} from "@/lib/recipe-diet";

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "test",
    name: "Pollo con verduras",
    type: "lunch",
    ingredients: [
      { name: "Pechuga de pollo" },
      { name: "Brócoli" },
      { name: "Aceite de oliva" },
    ],
    steps: ["Cocinar el pollo", "Saltear el brócoli"],
    nutrition: { calories: 340, protein: 42, carbs: 9, fat: 14 },
    prep_time: 10,
    cook_time: 20,
    difficulty: "fácil",
    ...overrides,
  };
}

const strictChickenFish: DietaryPreferences = {
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

describe("clasificación de ingredientes", () => {
  it("separa pollo, pescado, mariscos, res y cerdo", () => {
    expect(classifyIngredientGroups("Pechuga de pollo")).toContain("pollo-aves");
    expect(classifyIngredientGroups("Filete de salmón")).toContain("pescado");
    expect(classifyIngredientGroups("Camarones frescos")).toContain("mariscos");
    expect(classifyIngredientGroups("Bistec de res")).toContain("res");
    expect(classifyIngredientGroups("Lomo de cerdo")).toContain("cerdo");
  });

  it("no confunde bebidas vegetales con lácteos", () => {
    expect(classifyIngredientGroups("Leche de coco")).not.toContain("lacteos");
    expect(classifyIngredientGroups("Leche entera")).toContain("lacteos");
  });

  it("trata la salsa de soya como condimento, no como leguminosa principal", () => {
    expect(classifyIngredientGroups("Salsa de soya baja en sodio")).not.toContain(
      "leguminosas",
    );
  });

  it("reconoce arroz de coliflor como verdura, no cereal", () => {
    expect(classifyIngredientGroups("Arroz de coliflor")).toEqual(["verduras"]);
  });
});

describe("compatibilidad con un plan", () => {
  it("acepta pollo con verduras y pocos carbohidratos", () => {
    expect(analyzeRecipeForDiet(recipe(), strictChickenFish).status).toBe(
      "compatible",
    );
  });

  it("rechaza arroz aunque la receta tenga pollo", () => {
    const result = analyzeRecipeForDiet(
      recipe({
        name: "Arroz con pollo",
        ingredients: [{ name: "Pollo" }, { name: "Arroz blanco" }],
        nutrition: { calories: 520, protein: 31, carbs: 62, fat: 15 },
      }),
      strictChickenFish,
    );
    expect(result.status).toBe("incompatible");
    expect(result.reasons.join(" ")).toMatch(/Cereales|62 g/);
  });

  it("rechaza res si solo se permiten pollo, pescado y verduras", () => {
    const result = analyzeRecipeForDiet(
      recipe({ ingredients: [{ name: "Bistec de res" }, { name: "Ensalada" }] }),
      strictChickenFish,
    );
    expect(result.status).toBe("incompatible");
    expect(result.reasons.join(" ")).toContain("Carne de res");
  });

  it("exige una de las proteínas permitidas cuando el plan también permite verduras", () => {
    const result = analyzeRecipeForDiet(
      recipe({
        name: "Verduras salteadas",
        ingredients: [{ name: "Brócoli" }, { name: "Calabacín" }],
      }),
      strictChickenFish,
    );
    expect(result.status).toBe("incompatible");
    expect(result.reasons.join(" ")).toMatch(/proteína permitida/);
  });

  it("marca para revisión una receta sin nutrición pero sin almidones", () => {
    const result = analyzeRecipeForDiet(
      recipe({ nutrition: undefined, dietary_tags: [] }),
      strictChickenFish,
    );
    expect(result.status).toBe("review");
    expect(result.reviewReasons).toContain("Falta confirmar carbohidratos por porción");
  });

  it("rechaza una receta de desayuno cuando el plan solo aplica a almuerzo y cena", () => {
    expect(
      analyzeRecipeForDiet(recipe({ type: "breakfast" }), strictChickenFish)
        .status,
    ).toBe("incompatible");
  });

  it("rechaza productos animales en un plan vegano", () => {
    const result = analyzeRecipeForDiet(recipe(), {
      restrictions: ["vegano"],
      meal_plan: { preset_id: "vegana", excluded_groups: ["pollo-aves"] },
    });
    expect(result.status).toBe("incompatible");
    expect(result.reasons.join(" ")).toMatch(/vegana/i);
  });

  it("respeta alergias además del plan elegido", () => {
    const result = analyzeRecipeForDiet(
      recipe({ ingredients: [{ name: "Camarones frescos" }, { name: "Ajo" }] }),
      { allergies: ["mariscos"], meal_plan: { preset_id: "mediterranea" } },
    );
    expect(result.status).toBe("incompatible");
    expect(result.reasons.join(" ")).toMatch(/alérgeno/i);
  });

  it("valida objetivos de proteína y sodio", () => {
    const result = analyzeRecipeForDiet(
      recipe({
        nutrition: {
          calories: 300,
          protein: 12,
          carbs: 20,
          fat: 8,
          sodium: 800,
        },
      }),
      { meal_plan: { min_protein: 25, max_sodium: 600 } },
    );
    expect(result.status).toBe("incompatible");
    expect(result.reasons.join(" ")).toMatch(/proteína.*sodio/i);
  });

  it("resume las tres clases de resultados", () => {
    const summary = summarizeDietCompatibility(
      [
        recipe({ id: "ok" }),
        recipe({ id: "review", nutrition: undefined, dietary_tags: [] }),
        recipe({
          id: "no",
          ingredients: [{ name: "Arroz" }],
          nutrition: { calories: 300, protein: 5, carbs: 60, fat: 2 },
        }),
      ],
      strictChickenFish,
    );
    expect(summary).toEqual({ compatible: 1, review: 1, incompatible: 1 });
  });
});

describe("viabilidad práctica", () => {
  it("sube la dificultad por tiempo, pasos e ingredientes especializados", () => {
    const result = assessRecipePracticality(
      recipe({
        ingredients: [
          ...Array.from({ length: 14 }, (_, index) => ({ name: `Ingrediente ${index}` })),
          { name: "Gochujang" },
        ],
        steps: Array.from({ length: 11 }, (_, index) => `Paso ${index}`),
        total_time: 120,
      }),
    );
    expect(result.difficulty).toBe("difícil");
    expect(result.colombiaAvailability).toBe("variable");
  });
});
