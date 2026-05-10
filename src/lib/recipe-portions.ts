/**
 * Helpers para escalar ingredientes segun porciones.
 *
 * Trabaja con el tipo Ingredient de la app, cuyo campo de cantidad
 * relevante para escalar es `total` (cantidad total a preparar).
 * Los campos `luis` y `mariana` se escalan de forma independiente.
 */

export interface RawIngredient {
  name: string;
  quantity: string; // valor a escalar, ej: "500", "Al gusto", "1.5"
  unit?: string;
}

export interface ScaledIngredient extends RawIngredient {
  scaledQuantity: string;
  isExact: boolean; // false si el valor no es numerico ("Al gusto", "Pizca", etc.)
}

/**
 * Redondea un numero escalado de forma amigable para cocina:
 * - < 1    → 2 decimales, sin ceros finales (0.5, 0.25)
 * - 1-9.9  → 1 decimal si no es entero (2.5, 1.3)
 * - >= 10  → entero (280, 15)
 */
function formatScaled(value: number): string {
  if (value < 1) {
    return value.toFixed(2).replace(/\.?0+$/, "");
  }
  if (value < 10) {
    const rounded = Math.round(value * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  }
  return String(Math.round(value));
}

/**
 * Escala un array de ingredientes desde basePortions hacia newPortions.
 * Si la cantidad no es numerica (e.g. "Al gusto") devuelve el valor original
 * con isExact=false.
 */
export function scaleIngredients(
  ingredients: RawIngredient[],
  basePortions: number,
  newPortions: number,
): ScaledIngredient[] {
  if (basePortions <= 0)
    return ingredients.map((i) => ({
      ...i,
      scaledQuantity: i.quantity,
      isExact: false,
    }));

  const ratio = newPortions / basePortions;

  return ingredients.map((ing) => {
    const num = parseFloat(ing.quantity);
    if (isNaN(num)) {
      return { ...ing, scaledQuantity: ing.quantity, isExact: false };
    }

    const scaled = num * ratio;
    return {
      ...ing,
      scaledQuantity: formatScaled(scaled),
      isExact: true,
    };
  });
}
