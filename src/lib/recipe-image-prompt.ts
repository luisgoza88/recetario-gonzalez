interface RecipeImagePromptInput {
  recipeName: string;
  recipeDescription?: string;
  recipeType?: "breakfast" | "lunch" | "dinner";
  ingredients?: string[];
}

function cleanIngredient(ingredient: string): string {
  return ingredient
    .replace(/\s*[:|-]\s*\d.*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildRecipeImagePrompt({
  recipeName,
  recipeDescription,
  recipeType,
  ingredients = [],
}: RecipeImagePromptInput): string {
  const visibleIngredients = ingredients
    .map(cleanIngredient)
    .filter(Boolean)
    .slice(0, 10);
  const meal = {
    breakfast: "desayuno",
    lunch: "almuerzo",
    dinner: "cena",
  }[recipeType ?? "lunch"];

  return `Fotografía gastronómica editorial, fotorrealista y fiel a una receta real.

PLATO EXACTO: ${recipeName}
TIPO: ${meal}
${recipeDescription ? `DESCRIPCIÓN REAL: ${recipeDescription}` : ""}
${visibleIngredients.length ? `INGREDIENTES QUE DEBEN GUIAR LA IMAGEN: ${visibleIngredients.join(", ")}.` : ""}

FIDELIDAD CULINARIA OBLIGATORIA:
- Representar exactamente el plato indicado, no una comida genérica ni otra receta parecida.
- Mostrar solo ingredientes plausibles para esta receta; no inventar guarniciones, salsas, queso, pan, arroz, pasta, carne ni hierbas que no correspondan.
- Hacer visibles, cuando sea natural, los ingredientes principales listados y respetar su método de preparación.
- Porción casera realista, cocción creíble, texturas naturales y emplatado posible de reproducir en Colombia.
- Si es una receta colombiana, conservar su presentación auténtica sin convertirla en alta cocina extranjera.

DIRECCIÓN VISUAL:
- Una sola preparación terminada, centro claro, vajilla sencilla y elegante.
- Luz natural suave lateral, balance de blancos neutro, color apetitoso pero real.
- Cámara a 45 grados, encuadre horizontal 3:2, espacio seguro en los bordes para recorte 4:3.
- Cocina hogareña contemporánea, fondo discreto de piedra clara o madera, poca profundidad de campo.
- Sin personas, manos, utensilios flotantes, texto, letras, logotipos, marcas de agua, collage ni ingredientes crudos decorativos excesivos.`;
}

