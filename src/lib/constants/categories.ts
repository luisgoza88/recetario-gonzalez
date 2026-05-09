// Constantes de categorías e iconos

export const CATEGORY_EMOJIS: Record<string, string> = {
  "Proteínas Premium": "🥩",
  "Proteínas Económicas": "🍗",
  Vegetales: "🥬",
  Tubérculos: "🥔",
  Carbohidratos: "🍚",
  Lácteos: "🧀",
  Despensa: "🫙",
  Especias: "🧂",
};

export const STORE_LABELS: Record<string, string> = {
  exito: "Éxito",
  d1: "D1",
  jumbo: "Jumbo",
  carulla: "Carulla",
  euro: "Euro",
};

export const STORE_COLORS: Record<string, string> = {
  exito: "#FFD700",
  d1: "#E53E3E",
  jumbo: "#38A169",
  carulla: "#DD6B20",
  euro: "#3182CE",
};

export type StoreKey = keyof typeof STORE_LABELS;
