// Calendario de productos de temporada en Colombia
// Colombia no tiene estaciones tradicionales sino dos ciclos de cosecha principales:
// - Primera cosecha (cosecha principal): marzo-junio
// - Segunda cosecha (traviesa/mitaca): septiembre-diciembre
// Las lluvias bimodales (abril-mayo y octubre-noviembre) influyen en la disponibilidad.

export interface SeasonalItem {
  name: string;
  category: "fruta" | "verdura" | "tuberculo" | "hierba";
  months: number[]; // 1-12
  peak_months: number[]; // meses donde esta mas barato / mejor calidad
  region?: string; // si es especifico de una region
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const COLOMBIAN_SEASONAL_PRODUCE: SeasonalItem[] = [
  // =====================================================
  // FRUTAS (20 items)
  // =====================================================
  {
    name: "Mango",
    category: "fruta",
    months: [3, 4, 5, 6, 7, 11, 12],
    peak_months: [4, 5, 6],
    region: "Tierra caliente (Valle, Costa)",
  },
  {
    name: "Mandarina",
    category: "fruta",
    months: [1, 2, 3, 10, 11, 12],
    peak_months: [11, 12, 1],
  },
  {
    name: "Guanabana",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [3, 4, 5],
    region: "Valle del Cauca, Tolima",
  },
  {
    name: "Lulo",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [6, 7, 8],
    region: "Huila, Nariño, Antioquia",
  },
  {
    name: "Maracuya",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [1, 2, 7, 8],
    region: "Huila, Valle, Meta",
  },
  {
    name: "Feijoa",
    category: "fruta",
    months: [3, 4, 5, 9, 10, 11],
    peak_months: [4, 5, 10],
    region: "Boyaca, Cundinamarca",
  },
  {
    name: "Uchuva",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Boyaca, Cundinamarca",
  },
  {
    name: "Tomate de Arbol",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [5, 6, 11, 12],
    region: "Antioquia, Nariño",
  },
  {
    name: "Papaya",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [2, 3, 8, 9],
    region: "Valle, Meta, Casanare",
  },
  {
    name: "Pitahaya",
    category: "fruta",
    months: [1, 2, 5, 6, 7, 11, 12],
    peak_months: [1, 2, 6, 7],
    region: "Boyaca, Valle",
  },
  {
    name: "Curuba",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Boyaca, Cundinamarca",
  },
  {
    name: "Guayaba",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Santander, Boyaca",
  },
  {
    name: "Mora",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Cundinamarca, Antioquia",
  },
  {
    name: "Fresa",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [2, 3, 8, 9],
    region: "Cundinamarca, Antioquia",
  },
  {
    name: "Zapote",
    category: "fruta",
    months: [3, 4, 5, 6, 9, 10, 11],
    peak_months: [4, 5, 10],
    region: "Costa Atlantica, Antioquia",
  },
  {
    name: "Chirimoya",
    category: "fruta",
    months: [1, 2, 3, 7, 8, 9],
    peak_months: [2, 3, 8],
    region: "Boyaca, Santander",
  },
  {
    name: "Granadilla",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Huila, Antioquia",
  },
  {
    name: "Chontaduro",
    category: "fruta",
    months: [1, 2, 3, 4, 5],
    peak_months: [2, 3, 4],
    region: "Choco, Valle (Pacifico)",
  },
  {
    name: "Borojo",
    category: "fruta",
    months: ALL_MONTHS,
    peak_months: [5, 6, 7],
    region: "Choco (Pacifico)",
  },
  {
    name: "Nispero",
    category: "fruta",
    months: [3, 4, 5, 9, 10, 11],
    peak_months: [4, 5, 10],
    region: "Costa Atlantica",
  },

  // =====================================================
  // VERDURAS (12 items)
  // =====================================================
  {
    name: "Ahuyama",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
  },
  {
    name: "Mazorca",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [5, 6, 11, 12],
    region: "Antioquia, Tolima",
  },
  {
    name: "Habichuela",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [2, 3, 8, 9],
  },
  {
    name: "Tomate chonto",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Norte de Santander, Valle",
  },
  {
    name: "Cebolla larga",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Boyaca, Cundinamarca",
  },
  {
    name: "Cebolla cabezona",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Boyaca",
  },
  {
    name: "Pimenton",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Santander, Valle",
  },
  {
    name: "Zanahoria",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Boyaca, Cundinamarca",
  },
  {
    name: "Pepino",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [2, 3, 8, 9],
  },
  {
    name: "Calabacin",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
  },
  {
    name: "Arveja verde",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Nariño, Boyaca",
  },
  {
    name: "Espinaca",
    category: "verdura",
    months: ALL_MONTHS,
    peak_months: [2, 3, 8, 9],
    region: "Cundinamarca",
  },

  // =====================================================
  // TUBERCULOS (8 items)
  // =====================================================
  {
    name: "Papa criolla",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
    region: "Boyaca, Cundinamarca, Nariño",
  },
  {
    name: "Yuca",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [1, 2, 7, 8],
    region: "Costa Atlantica, Llanos",
  },
  {
    name: "Platano",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [3, 4, 5, 9, 10, 11],
    region: "Quindio, Risaralda, Meta",
  },
  {
    name: "Arracacha",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Tolima, Boyaca",
  },
  {
    name: "Name",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [1, 2, 7, 8],
    region: "Costa Atlantica, Choco",
  },
  {
    name: "Batata",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
  },
  {
    name: "Papa comun",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
    region: "Boyaca, Cundinamarca, Nariño",
  },
  {
    name: "Platano harton",
    category: "tuberculo",
    months: ALL_MONTHS,
    peak_months: [3, 4, 5, 9, 10, 11],
    region: "Meta, Quindio, Llanos",
  },

  // =====================================================
  // HIERBAS (5 items)
  // =====================================================
  {
    name: "Cilantro",
    category: "hierba",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
  },
  {
    name: "Albahaca",
    category: "hierba",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
  },
  {
    name: "Hierbabuena",
    category: "hierba",
    months: ALL_MONTHS,
    peak_months: [3, 4, 9, 10],
  },
  {
    name: "Tomillo",
    category: "hierba",
    months: ALL_MONTHS,
    peak_months: [5, 6, 11, 12],
  },
  {
    name: "Oregano fresco",
    category: "hierba",
    months: ALL_MONTHS,
    peak_months: [4, 5, 10, 11],
  },
];

// =====================================================
// Helper functions
// =====================================================

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Obtiene el nombre del mes en espanol
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES_ES[month - 1] || "";
}

/**
 * Obtiene los productos que estan en temporada para un mes dado
 */
export function getSeasonalProduceForMonth(month: number): {
  peak: SeasonalItem[];
  inSeason: SeasonalItem[];
} {
  const peak: SeasonalItem[] = [];
  const inSeason: SeasonalItem[] = [];

  for (const item of COLOMBIAN_SEASONAL_PRODUCE) {
    if (item.peak_months.includes(month)) {
      peak.push(item);
    } else if (item.months.includes(month)) {
      inSeason.push(item);
    }
  }

  return { peak, inSeason };
}

/**
 * Genera el texto de temporada para usar en prompts de IA
 */
export function getSeasonalPromptText(month?: number): string {
  const currentMonth = month || new Date().getMonth() + 1;
  const monthName = getMonthName(currentMonth);
  const { peak, inSeason } = getSeasonalProduceForMonth(currentMonth);

  if (peak.length === 0 && inSeason.length === 0) {
    return "";
  }

  const lines: string[] = [];
  lines.push(`\nINGREDIENTES DE TEMPORADA EN COLOMBIA (${monthName}):`);

  if (peak.length > 0) {
    lines.push(
      `- Temporada alta (mejor precio y calidad): ${peak.map((p) => p.name).join(", ")}`,
    );
  }

  if (inSeason.length > 0) {
    lines.push(
      `- Disponible en temporada: ${inSeason.map((p) => p.name).join(", ")}`,
    );
  }

  lines.push("Prioriza ingredientes de temporada para mejor sabor y precio.");

  return lines.join("\n");
}
