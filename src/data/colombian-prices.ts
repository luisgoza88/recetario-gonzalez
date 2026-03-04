// Precios promedio de supermercados colombianos (COP) - Marzo 2026
// Los precios reflejan unidades típicas de compra en cada tienda

export type StoreKey = "exito" | "d1" | "jumbo" | "carulla" | "euro";

export interface StorePrice {
  item_name: string;
  category: string;
  prices: Partial<Record<StoreKey, number>>;
}

export const STORE_LABELS: Record<StoreKey, string> = {
  exito: "Éxito",
  d1: "D1",
  jumbo: "Jumbo",
  carulla: "Carulla",
  euro: "Euro",
};

export const STORE_COLORS: Record<StoreKey, string> = {
  exito: "#FFD700",
  d1: "#E53E3E",
  jumbo: "#38A169",
  carulla: "#DD6B20",
  euro: "#3182CE",
};

export const COLOMBIAN_PRICES: StorePrice[] = [
  // =====================================================
  // PROTEÍNAS PREMIUM
  // =====================================================
  {
    item_name: "Salmón en filetes",
    category: "Proteínas Premium",
    prices: {
      exito: 58900,
      d1: 49900,
      jumbo: 62900,
      carulla: 68900,
      euro: 52900,
    },
  },
  {
    item_name: "Lomo de res",
    category: "Proteínas Premium",
    prices: {
      exito: 42900,
      d1: 37900,
      jumbo: 45900,
      carulla: 49900,
      euro: 39900,
    },
  },

  // =====================================================
  // PROTEÍNAS ECONÓMICAS
  // =====================================================
  {
    item_name: "Pechuga de pollo",
    category: "Proteínas Económicas",
    prices: {
      exito: 16900,
      d1: 13900,
      jumbo: 17900,
      carulla: 19900,
      euro: 14900,
    },
  },
  {
    item_name: "Solomillo de cerdo",
    category: "Proteínas Económicas",
    prices: {
      exito: 28900,
      d1: 24900,
      jumbo: 30900,
      carulla: 33900,
      euro: 26900,
    },
  },
  {
    item_name: "Bistec de res (punta anca)",
    category: "Proteínas Económicas",
    prices: {
      exito: 32900,
      d1: 27900,
      jumbo: 34900,
      carulla: 37900,
      euro: 29900,
    },
  },
  {
    item_name: "Carne molida de res",
    category: "Proteínas Económicas",
    prices: {
      exito: 22900,
      d1: 18900,
      jumbo: 24900,
      carulla: 26900,
      euro: 20900,
    },
  },
  {
    item_name: "Tilapia en filetes",
    category: "Proteínas Económicas",
    prices: {
      exito: 24900,
      d1: 19900,
      jumbo: 26900,
      carulla: 29900,
      euro: 21900,
    },
  },
  {
    item_name: "Jamón de pierna",
    category: "Proteínas Económicas",
    prices: {
      exito: 12900,
      d1: 8900,
      jumbo: 13900,
      carulla: 16900,
      euro: 9900,
    },
  },
  {
    item_name: "Huesos de pollo",
    category: "Proteínas Económicas",
    prices: { exito: 5900, d1: 3900, jumbo: 6500, carulla: 7900, euro: 4500 },
  },
  {
    item_name: "Tocineta/Bacon",
    category: "Proteínas Económicas",
    prices: {
      exito: 14900,
      d1: 10900,
      jumbo: 15900,
      carulla: 18900,
      euro: 11900,
    },
  },
  {
    item_name: "Huevos",
    category: "Proteínas Económicas",
    prices: {
      exito: 22900,
      d1: 17900,
      jumbo: 24500,
      carulla: 26900,
      euro: 19500,
    },
  },

  // =====================================================
  // VEGETALES
  // =====================================================
  {
    item_name: "Tomate chonto",
    category: "Vegetales",
    prices: { exito: 4900, d1: 3500, jumbo: 5200, carulla: 5900, euro: 3900 },
  },
  {
    item_name: "Cebolla larga",
    category: "Vegetales",
    prices: { exito: 3200, d1: 2200, jumbo: 3500, carulla: 4200, euro: 2600 },
  },
  {
    item_name: "Cebolla cabezona",
    category: "Vegetales",
    prices: { exito: 3900, d1: 2800, jumbo: 4200, carulla: 4900, euro: 3200 },
  },
  {
    item_name: "Cebolla morada",
    category: "Vegetales",
    prices: { exito: 4500, d1: 3200, jumbo: 4900, carulla: 5500, euro: 3600 },
  },
  {
    item_name: "Ajo",
    category: "Vegetales",
    prices: { exito: 3500, d1: 2500, jumbo: 3900, carulla: 4500, euro: 2900 },
  },
  {
    item_name: "Jengibre",
    category: "Vegetales",
    prices: { exito: 4200, d1: 3200, jumbo: 4500, carulla: 5200, euro: 3500 },
  },
  {
    item_name: "Perejil fresco",
    category: "Vegetales",
    prices: { exito: 2200, d1: 1500, jumbo: 2500, carulla: 2900, euro: 1800 },
  },
  {
    item_name: "Cilantro",
    category: "Vegetales",
    prices: { exito: 1800, d1: 1200, jumbo: 2000, carulla: 2500, euro: 1400 },
  },
  {
    item_name: "Cebollín",
    category: "Vegetales",
    prices: { exito: 2500, d1: 1800, jumbo: 2800, carulla: 3200, euro: 2000 },
  },
  {
    item_name: "Romero fresco",
    category: "Vegetales",
    prices: { exito: 2800, d1: 2000, jumbo: 3200, carulla: 3500, euro: 2300 },
  },
  {
    item_name: "Brócoli",
    category: "Vegetales",
    prices: { exito: 5900, d1: 4200, jumbo: 6500, carulla: 7500, euro: 4800 },
  },
  {
    item_name: "Coliflor",
    category: "Vegetales",
    prices: { exito: 5500, d1: 3900, jumbo: 5900, carulla: 6900, euro: 4200 },
  },
  {
    item_name: "Calabacín",
    category: "Vegetales",
    prices: { exito: 4200, d1: 3200, jumbo: 4500, carulla: 5200, euro: 3500 },
  },
  {
    item_name: "Pimentón rojo",
    category: "Vegetales",
    prices: { exito: 6500, d1: 4900, jumbo: 6900, carulla: 7900, euro: 5200 },
  },
  {
    item_name: "Pimentón amarillo",
    category: "Vegetales",
    prices: { exito: 7200, d1: 5500, jumbo: 7500, carulla: 8500, euro: 5900 },
  },
  {
    item_name: "Espárragos",
    category: "Vegetales",
    prices: { exito: 9900, d1: 7500, jumbo: 10900, carulla: 12900, euro: 8200 },
  },
  {
    item_name: "Kale/Col rizada",
    category: "Vegetales",
    prices: { exito: 5500, d1: 3900, jumbo: 5900, carulla: 6900, euro: 4200 },
  },
  {
    item_name: "Champiñones",
    category: "Vegetales",
    prices: { exito: 7500, d1: 5200, jumbo: 7900, carulla: 9500, euro: 5900 },
  },
  {
    item_name: "Lechuga crespa",
    category: "Vegetales",
    prices: { exito: 3500, d1: 2500, jumbo: 3800, carulla: 4500, euro: 2800 },
  },
  {
    item_name: "Lechuga iceberg",
    category: "Vegetales",
    prices: { exito: 4200, d1: 3200, jumbo: 4500, carulla: 5200, euro: 3500 },
  },
  {
    item_name: "Espinaca",
    category: "Vegetales",
    prices: { exito: 4900, d1: 3500, jumbo: 5200, carulla: 5900, euro: 3900 },
  },
  {
    item_name: "Tomate cherry",
    category: "Vegetales",
    prices: { exito: 6900, d1: 4900, jumbo: 7500, carulla: 8900, euro: 5500 },
  },
  {
    item_name: "Pepino",
    category: "Vegetales",
    prices: { exito: 3200, d1: 2200, jumbo: 3500, carulla: 3900, euro: 2500 },
  },
  {
    item_name: "Aguacate",
    category: "Vegetales",
    prices: { exito: 8900, d1: 6900, jumbo: 9500, carulla: 10900, euro: 7500 },
  },
  {
    item_name: "Limones",
    category: "Vegetales",
    prices: { exito: 3900, d1: 2800, jumbo: 4200, carulla: 4900, euro: 3200 },
  },
  {
    item_name: "Manzana verde",
    category: "Vegetales",
    prices: { exito: 7900, d1: 5900, jumbo: 8500, carulla: 9900, euro: 6500 },
  },
  {
    item_name: "Zanahoria",
    category: "Vegetales",
    prices: { exito: 3200, d1: 2200, jumbo: 3500, carulla: 3900, euro: 2600 },
  },

  // =====================================================
  // TUBÉRCULOS
  // =====================================================
  {
    item_name: "Batata/Camote",
    category: "Tubérculos",
    prices: { exito: 4500, d1: 3200, jumbo: 4900, carulla: 5500, euro: 3600 },
  },
  {
    item_name: "Papa criolla",
    category: "Tubérculos",
    prices: { exito: 3900, d1: 2800, jumbo: 4200, carulla: 4900, euro: 3100 },
  },
  {
    item_name: "Papa común",
    category: "Tubérculos",
    prices: { exito: 3200, d1: 2200, jumbo: 3500, carulla: 3900, euro: 2600 },
  },

  // =====================================================
  // CARBOHIDRATOS
  // =====================================================
  {
    item_name: "Arroz blanco",
    category: "Carbohidratos",
    prices: {
      exito: 12900,
      d1: 9900,
      jumbo: 13900,
      carulla: 14900,
      euro: 10900,
    },
  },
  {
    item_name: "Masarepa (P.A.N.)",
    category: "Carbohidratos",
    prices: { exito: 5900, d1: 4500, jumbo: 6200, carulla: 6900, euro: 4900 },
  },
  {
    item_name: "Pan rallado",
    category: "Carbohidratos",
    prices: { exito: 4900, d1: 3500, jumbo: 5200, carulla: 5900, euro: 3900 },
  },
  {
    item_name: "Maíz desgranado",
    category: "Carbohidratos",
    prices: { exito: 4200, d1: 2900, jumbo: 4500, carulla: 5200, euro: 3200 },
  },

  // =====================================================
  // LÁCTEOS
  // =====================================================
  {
    item_name: "Yogur griego natural",
    category: "Lácteos",
    prices: { exito: 9900, d1: 6900, jumbo: 10500, carulla: 12900, euro: 7900 },
  },
  {
    item_name: "Crema de leche",
    category: "Lácteos",
    prices: { exito: 5900, d1: 4200, jumbo: 6200, carulla: 6900, euro: 4500 },
  },
  {
    item_name: "Queso mozzarella",
    category: "Lácteos",
    prices: {
      exito: 12900,
      d1: 8900,
      jumbo: 13900,
      carulla: 15900,
      euro: 9900,
    },
  },
  {
    item_name: "Queso costeño/cuajada",
    category: "Lácteos",
    prices: { exito: 8900, d1: 6500, jumbo: 9500, carulla: 10900, euro: 7200 },
  },
  {
    item_name: "Queso parmesano",
    category: "Lácteos",
    prices: {
      exito: 18900,
      d1: 14900,
      jumbo: 19900,
      carulla: 24900,
      euro: 15900,
    },
  },
  {
    item_name: "Queso crema",
    category: "Lácteos",
    prices: { exito: 8900, d1: 5900, jumbo: 9500, carulla: 10900, euro: 6500 },
  },
  {
    item_name: "Mantequilla",
    category: "Lácteos",
    prices: { exito: 7900, d1: 5500, jumbo: 8500, carulla: 9900, euro: 6200 },
  },
  {
    item_name: "Crema agria (opc)",
    category: "Lácteos",
    prices: { exito: 7500, d1: 5200, jumbo: 7900, carulla: 9500, euro: 5900 },
  },

  // =====================================================
  // DESPENSA
  // =====================================================
  {
    item_name: "Aceite de oliva",
    category: "Despensa",
    prices: {
      exito: 32900,
      d1: 24900,
      jumbo: 34900,
      carulla: 39900,
      euro: 27900,
    },
  },
  {
    item_name: "Aceite vegetal",
    category: "Despensa",
    prices: {
      exito: 12900,
      d1: 9900,
      jumbo: 13500,
      carulla: 14900,
      euro: 10900,
    },
  },
  {
    item_name: "Salsa de soya",
    category: "Despensa",
    prices: { exito: 9900, d1: 6900, jumbo: 10500, carulla: 12900, euro: 7500 },
  },
  {
    item_name: "Mirin",
    category: "Despensa",
    prices: { exito: 16900, jumbo: 18900, carulla: 21900 },
  },
  {
    item_name: "Vinagre vino tinto",
    category: "Despensa",
    prices: { exito: 8900, d1: 5900, jumbo: 9500, carulla: 10900, euro: 6500 },
  },
  {
    item_name: "Salsa de tomate",
    category: "Despensa",
    prices: { exito: 6500, d1: 3900, jumbo: 6900, carulla: 7900, euro: 4500 },
  },
  {
    item_name: "Mayonesa",
    category: "Despensa",
    prices: { exito: 9900, d1: 6500, jumbo: 10500, carulla: 12500, euro: 7200 },
  },
  {
    item_name: "Mostaza",
    category: "Despensa",
    prices: { exito: 7900, d1: 4900, jumbo: 8500, carulla: 9900, euro: 5500 },
  },
  {
    item_name: "Ketchup",
    category: "Despensa",
    prices: { exito: 8500, d1: 5500, jumbo: 8900, carulla: 10500, euro: 6200 },
  },
  {
    item_name: "Salsa BBQ",
    category: "Despensa",
    prices: {
      exito: 12900,
      d1: 8900,
      jumbo: 13900,
      carulla: 15900,
      euro: 9900,
    },
  },
  {
    item_name: "Pepinillos",
    category: "Despensa",
    prices: { exito: 8900, d1: 5900, jumbo: 9500, carulla: 10900, euro: 6500 },
  },
  {
    item_name: "Azúcar morena",
    category: "Despensa",
    prices: { exito: 5900, d1: 3900, jumbo: 6200, carulla: 6900, euro: 4200 },
  },
  {
    item_name: "Miel",
    category: "Despensa",
    prices: {
      exito: 14900,
      d1: 9900,
      jumbo: 15900,
      carulla: 18900,
      euro: 11900,
    },
  },
  {
    item_name: "Café espresso",
    category: "Despensa",
    prices: {
      exito: 18900,
      d1: 12900,
      jumbo: 19900,
      carulla: 24900,
      euro: 14900,
    },
  },
  {
    item_name: "Nueces/almendras",
    category: "Despensa",
    prices: {
      exito: 19900,
      d1: 14900,
      jumbo: 21900,
      carulla: 24900,
      euro: 16900,
    },
  },
  {
    item_name: "Semillas sésamo",
    category: "Despensa",
    prices: { exito: 6900, d1: 4500, jumbo: 7500, carulla: 8900, euro: 5200 },
  },
  {
    item_name: "Maicena",
    category: "Despensa",
    prices: { exito: 4500, d1: 2900, jumbo: 4900, carulla: 5500, euro: 3200 },
  },

  // =====================================================
  // ESPECIAS
  // =====================================================
  {
    item_name: "Sal marina",
    category: "Especias",
    prices: { exito: 4900, d1: 2900, jumbo: 5200, carulla: 5900, euro: 3500 },
  },
  {
    item_name: "Pimienta molida",
    category: "Especias",
    prices: { exito: 5500, d1: 3500, jumbo: 5900, carulla: 6900, euro: 3900 },
  },
  {
    item_name: "Pimienta en grano",
    category: "Especias",
    prices: { exito: 6900, d1: 4500, jumbo: 7200, carulla: 8500, euro: 5200 },
  },
  {
    item_name: "Comino molido",
    category: "Especias",
    prices: { exito: 4900, d1: 2900, jumbo: 5200, carulla: 5900, euro: 3200 },
  },
  {
    item_name: "Paprika",
    category: "Especias",
    prices: { exito: 6500, d1: 4200, jumbo: 6900, carulla: 7900, euro: 4900 },
  },
  {
    item_name: "Paprika ahumada",
    category: "Especias",
    prices: { exito: 8900, d1: 5900, jumbo: 9500, carulla: 10900, euro: 6500 },
  },
  {
    item_name: "Orégano seco",
    category: "Especias",
    prices: { exito: 4500, d1: 2900, jumbo: 4900, carulla: 5500, euro: 3200 },
  },
  {
    item_name: "Tomillo seco",
    category: "Especias",
    prices: { exito: 4900, d1: 3200, jumbo: 5200, carulla: 5900, euro: 3500 },
  },
  {
    item_name: "Ajo en polvo",
    category: "Especias",
    prices: { exito: 5200, d1: 3500, jumbo: 5500, carulla: 6200, euro: 3900 },
  },
  {
    item_name: "Cebolla en polvo",
    category: "Especias",
    prices: { exito: 5200, d1: 3500, jumbo: 5500, carulla: 6200, euro: 3900 },
  },
  {
    item_name: "Laurel seco",
    category: "Especias",
    prices: { exito: 3900, d1: 2500, jumbo: 4200, carulla: 4900, euro: 2800 },
  },
  {
    item_name: "Eneldo seco",
    category: "Especias",
    prices: { exito: 5500, d1: 3900, jumbo: 5900, carulla: 6500, euro: 4200 },
  },
];

// =====================================================
// UTILIDADES
// =====================================================

/** Obtener el precio mas bajo para un item y en que tienda */
export function getCheapestStore(
  prices: Partial<Record<StoreKey, number>>,
): { store: StoreKey; price: number } | null {
  let cheapest: { store: StoreKey; price: number } | null = null;
  for (const [store, price] of Object.entries(prices)) {
    if (price !== undefined && (cheapest === null || price < cheapest.price)) {
      cheapest = { store: store as StoreKey, price };
    }
  }
  return cheapest;
}

/** Obtener el precio mas alto para un item */
export function getMostExpensiveStore(
  prices: Partial<Record<StoreKey, number>>,
): { store: StoreKey; price: number } | null {
  let expensive: { store: StoreKey; price: number } | null = null;
  for (const [store, price] of Object.entries(prices)) {
    if (
      price !== undefined &&
      (expensive === null || price > expensive.price)
    ) {
      expensive = { store: store as StoreKey, price };
    }
  }
  return expensive;
}

/** Formatear precio en COP */
export function formatCOP(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/** Calcular total de mercado completo en una tienda */
export function calculateStoreTotal(storeKey: StoreKey): number {
  return COLOMBIAN_PRICES.reduce((sum, item) => {
    return sum + (item.prices[storeKey] || 0);
  }, 0);
}

/** Calcular total optimizado (comprando cada item en la tienda mas barata) */
export function calculateOptimizedTotal(): {
  total: number;
  breakdown: { item_name: string; store: StoreKey; price: number }[];
} {
  let total = 0;
  const breakdown: { item_name: string; store: StoreKey; price: number }[] = [];

  for (const item of COLOMBIAN_PRICES) {
    const cheapest = getCheapestStore(item.prices);
    if (cheapest) {
      total += cheapest.price;
      breakdown.push({
        item_name: item.item_name,
        store: cheapest.store,
        price: cheapest.price,
      });
    }
  }

  return { total, breakdown };
}

/** Obtener categorias unicas */
export function getCategories(): string[] {
  const cats = new Set<string>();
  for (const item of COLOMBIAN_PRICES) {
    cats.add(item.category);
  }
  return Array.from(cats);
}

/** Generar lista optimizada dividida por tiendas */
export function generateOptimizedList(): Record<
  StoreKey,
  { item_name: string; price: number; category: string }[]
> {
  const result: Record<
    StoreKey,
    { item_name: string; price: number; category: string }[]
  > = {
    exito: [],
    d1: [],
    jumbo: [],
    carulla: [],
    euro: [],
  };

  for (const item of COLOMBIAN_PRICES) {
    const cheapest = getCheapestStore(item.prices);
    if (cheapest) {
      result[cheapest.store].push({
        item_name: item.item_name,
        price: cheapest.price,
        category: item.category,
      });
    }
  }

  return result;
}
