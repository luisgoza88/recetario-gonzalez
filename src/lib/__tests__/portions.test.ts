import { describe, it, expect } from "vitest";
import {
  portionLabel,
  ingredientPortions,
  resolvePortions,
  resolveIngredientPortions,
  portionMemberKeys,
  emptyIngredient,
  representativeQuantity,
  sumPortions,
} from "../portions";
import type { Ingredient } from "@/types";

const LEGACY: Ingredient = { name: "Pollo", luis: "300g", mariana: "200g" };
const NUEVO: Ingredient = {
  name: "Pollo",
  per_person: { Ana: "250g", Beto: "150g", Caro: "100g" },
};

describe("ingredientPortions", () => {
  it("lee el modelo nuevo", () => {
    expect(ingredientPortions(NUEVO)).toEqual({
      Ana: "250g",
      Beto: "150g",
      Caro: "100g",
    });
  });

  it("lee el modelo legacy luis/mariana", () => {
    expect(ingredientPortions(LEGACY)).toEqual({
      luis: "300g",
      mariana: "200g",
    });
  });

  it("prefiere per_person cuando estan los dos", () => {
    const mixto: Ingredient = { ...NUEVO, luis: "999g", mariana: "999g" };
    expect(ingredientPortions(mixto)).toEqual(NUEVO.per_person);
  });

  it("devuelve vacio cuando no hay porciones", () => {
    expect(ingredientPortions({ name: "Sal" })).toEqual({});
  });

  it("ignora un per_person vacio y cae al legacy", () => {
    const ing: Ingredient = { name: "Pollo", per_person: {}, luis: "300g" };
    expect(ingredientPortions(ing)).toEqual({ luis: "300g" });
  });
});

describe("portionLabel", () => {
  it("mapea las claves legacy a nombres presentables", () => {
    expect(portionLabel("luis")).toBe("Luis");
    expect(portionLabel("mariana")).toBe("Mariana");
  });

  it("respeta el nombre del miembro segun el perfil del hogar", () => {
    expect(portionLabel("ana", { Ana: 2 })).toBe("Ana");
  });

  it("capitaliza cualquier clave desconocida", () => {
    expect(portionLabel("abuela")).toBe("Abuela");
  });
});

describe("resolvePortions", () => {
  it("descarta cantidades vacias", () => {
    const out = resolvePortions({ Ana: "250g", Beto: "  ", Caro: "" });
    expect(out.map((p) => p.key)).toEqual(["Ana"]);
  });

  it("ordena segun el perfil del hogar, no alfabeticamente", () => {
    const out = resolvePortions(
      { Caro: "100g", Ana: "250g", Beto: "150g" },
      { Beto: 2, Ana: 3, Caro: 1 },
    );
    expect(out.map((p) => p.key)).toEqual(["Beto", "Ana", "Caro"]);
  });

  it("ordena alfabeticamente cuando no hay perfil", () => {
    const out = resolvePortions({ Caro: "100g", Ana: "250g" });
    expect(out.map((p) => p.key)).toEqual(["Ana", "Caro"]);
  });

  it("devuelve vacio si no hay porciones", () => {
    expect(resolvePortions(undefined)).toEqual([]);
    expect(resolvePortions({})).toEqual([]);
  });

  it("mantiene el orden estable entre llamadas (mismo input, mismo output)", () => {
    const input = { Zoe: "1", Ana: "2", Mia: "3" };
    expect(resolvePortions(input)).toEqual(resolvePortions(input));
  });
});

describe("resolveIngredientPortions", () => {
  it("resuelve un ingrediente legacy con etiquetas bonitas", () => {
    const out = resolveIngredientPortions(LEGACY);
    expect(out).toEqual([
      { key: "luis", label: "Luis", amount: "300g" },
      { key: "mariana", label: "Mariana", amount: "200g" },
    ]);
  });

  it("soporta hogares de mas de dos miembros", () => {
    const out = resolveIngredientPortions(NUEVO, { Ana: 3, Beto: 2, Caro: 1 });
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.label)).toEqual(["Ana", "Beto", "Caro"]);
  });
});

describe("portionMemberKeys", () => {
  it("usa los miembros del hogar cuando existen", () => {
    expect(portionMemberKeys({ Ana: 2, Beto: 3 })).toEqual(["Ana", "Beto"]);
  });

  it("cae a las claves legacy cuando el hogar no configuro miembros", () => {
    expect(portionMemberKeys()).toEqual(["luis", "mariana"]);
    expect(portionMemberKeys({})).toEqual(["luis", "mariana"]);
  });
});

describe("emptyIngredient", () => {
  it("crea una casilla por miembro del hogar", () => {
    expect(emptyIngredient({ Ana: 2, Beto: 3, Caro: 1 })).toEqual({
      name: "",
      total: "",
      per_person: { Ana: "", Beto: "", Caro: "" },
    });
  });
});

describe("representativeQuantity", () => {
  it("prefiere el total del hogar", () => {
    expect(representativeQuantity({ ...LEGACY, total: "500g" })).toBe("500g");
  });

  it("cae a la primera porcion disponible si no hay total", () => {
    expect(representativeQuantity(LEGACY)).toBe("300g");
  });

  it("devuelve el fallback cuando no hay nada", () => {
    expect(representativeQuantity({ name: "Sal" }, "1")).toBe("1");
  });

  it("ignora un total en blanco", () => {
    expect(representativeQuantity({ ...LEGACY, total: "   " })).toBe("300g");
  });
});

describe("sumPortions", () => {
  it("suma cantidades con la misma unidad", () => {
    expect(sumPortions({ a: "300g", b: "200g" })).toBe("500 g");
  });

  it("suma numeros sin unidad", () => {
    expect(sumPortions({ a: "2", b: "3" })).toBe("5");
  });

  it("acepta coma decimal", () => {
    expect(sumPortions({ a: "1,5 kg", b: "0,5 kg" })).toBe("2 kg");
  });

  it("devuelve null si las unidades no coinciden", () => {
    expect(sumPortions({ a: "300g", b: "2 tazas" })).toBeNull();
  });

  it("devuelve null ante cantidades no numericas", () => {
    expect(sumPortions({ a: "al gusto", b: "200g" })).toBeNull();
  });

  it("devuelve null cuando no hay porciones", () => {
    expect(sumPortions({})).toBeNull();
    expect(sumPortions(undefined)).toBeNull();
  });
});
