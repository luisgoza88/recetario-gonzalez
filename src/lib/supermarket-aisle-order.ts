/**
 * Orden fisico estandar de un supermercado colombiano (Exito, D1, Carulla).
 * Se usa para ordenar la lista de compras siguiendo el flujo natural de la compra.
 */
export const AISLE_ORDER: Record<string, number> = {
  // Empieza la compra (zona fresca)
  frutas: 1,
  verduras: 2,
  vegetales: 2,
  panaderia: 3,
  "panaderia y pasteleria": 3,

  // Carnes y pescados (refrigerados)
  carnes: 4,
  carne: 4,
  "proteinas premium": 4,
  "proteinas economicas": 4,
  pescados: 5,
  "pescado y mariscos": 5,
  embutidos: 6,

  // Lacteos
  lacteos: 7,
  "lacteos y quesos": 7,
  huevos: 8,

  // Congelados
  congelados: 9,

  // Granos y basicos
  granos: 10,
  legumbres: 10,
  arroces: 11,
  carbohidratos: 11,
  pastas: 12,
  tuberculos: 12,

  // Despensa
  salsas: 13,
  aceites: 14,
  condimentos: 14,
  especias: 14,
  despensa: 14,
  enlatados: 15,

  // Snacks y bebidas (final del super)
  snacks: 16,
  dulces: 17,
  postres: 17,
  bebidas: 18,

  // Limpieza
  limpieza: 19,
  aseo: 19,
  "cuidado personal": 20,
};

export function getAisleOrder(category: string | null | undefined): number {
  if (!category) return 999;
  const normalized = category
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return AISLE_ORDER[normalized] ?? 999; // categorias desconocidas al final
}

export function sortItemsByAisle<T extends { category?: string | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const orderA = getAisleOrder(a.category);
    const orderB = getAisleOrder(b.category);
    if (orderA !== orderB) return orderA - orderB;
    // Mismo pasillo: mantener orden original
    return 0;
  });
}

export function groupByAisle<T extends { category?: string | null }>(
  items: T[],
): { aisle: string; order: number; items: T[] }[] {
  const sorted = sortItemsByAisle(items);
  const groups: Record<string, { order: number; items: T[] }> = {};

  for (const item of sorted) {
    const key = item.category || "Otros";
    if (!groups[key]) {
      groups[key] = { order: getAisleOrder(item.category), items: [] };
    }
    groups[key].items.push(item);
  }

  return Object.entries(groups)
    .map(([aisle, { order, items }]) => ({ aisle, order, items }))
    .sort((a, b) => a.order - b.order);
}
