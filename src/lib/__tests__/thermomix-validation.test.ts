import { describe, expect, it } from "vitest";
import type { ThermomixRecipe } from "@/types";
import { validateThermomixRecipe } from "@/lib/thermomix-validation";
import { THERMOMIX_LIBRARY } from "@/data/thermomix-recipes";

function thermomixRecipe(
  overrides: Partial<ThermomixRecipe> = {},
): ThermomixRecipe {
  return {
    name: "Crema de verduras (TM6)",
    thermomixSteps: [
      {
        stepNumber: 1,
        description: "Agregar las verduras al vaso",
        speed: "5",
        temperature: "Sin temp",
        time: "5 seg",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        mode: "manual",
        reverse: false,
      },
      {
        stepNumber: 2,
        description: "Cocinar la mezcla",
        speed: "2",
        temperature: "100°C",
        time: "20 min",
        accessory: "cuchilla",
        accessoryEmoji: "🔪",
        mode: "manual",
        reverse: false,
      },
    ],
    totalTimeMinutes: 25,
    manualTimeMinutes: 35,
    timeSaved: "Ahorra 10 min",
    difficulty: "fácil",
    accessories: ["Cuchilla"],
    tips: [],
    vasoPrincipal: true,
    varoma: false,
    cestillo: false,
    ...overrides,
  };
}

describe("validateThermomixRecipe", () => {
  it("acepta una adaptación manual coherente", () => {
    expect(validateThermomixRecipe(thermomixRecipe()).valid).toBe(true);
  });

  it("bloquea mariposa por encima de velocidad 4", () => {
    const recipe = thermomixRecipe();
    recipe.thermomixSteps[0] = {
      ...recipe.thermomixSteps[0],
      accessory: "mariposa",
      speed: "6",
    };
    const result = validateThermomixRecipe(recipe);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/mariposa.*velocidad 4/i);
  });

  it("bloquea temperaturas manuales superiores a 120 °C", () => {
    const recipe = thermomixRecipe();
    recipe.thermomixSteps[1] = {
      ...recipe.thermomixSteps[1],
      temperature: "160°C",
    };
    expect(validateThermomixRecipe(recipe).valid).toBe(false);
  });

  it("audita todas las adaptaciones curadas de la biblioteca", () => {
    const unsafe = THERMOMIX_LIBRARY.flatMap((item) => {
      const result = validateThermomixRecipe(item);
      return result.errors.map((error) => `${item.name}: ${error}`);
    });
    expect(unsafe).toEqual([]);
  });
});
