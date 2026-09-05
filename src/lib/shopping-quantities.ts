import { normalizeQuantity, formatQuantity } from "./units";

/** Unknown or incompatible units require review; never assume stock is sufficient. */
export function shoppingRequirement(amounts: string[], available?: string) {
  const parsed = amounts.map(normalizeQuantity);
  const first = parsed[0];
  if (
    !first ||
    parsed.some(
      (p) =>
        p.unitType === "unknown" ||
        p.baseUnit !== first.baseUnit ||
        p.value <= 0,
    )
  ) {
    return {
      quantity: amounts.filter(Boolean).join(" + ") || "Cantidad por confirmar",
      inStock: false,
    };
  }
  const required = parsed.reduce((sum, p) => sum + p.value, 0);
  const stock = available ? normalizeQuantity(available) : null;
  const availableAmount =
    stock && stock.unitType !== "unknown" && stock.baseUnit === first.baseUnit
      ? stock.value
      : 0;
  const missing = Math.max(0, required - availableAmount);
  return {
    quantity: formatQuantity(missing || required, first.baseUnit),
    inStock: missing === 0,
  };
}
