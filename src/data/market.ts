// Lista de mercado para el ciclo de 15 días

export interface MarketItemData {
  id: string;
  category: string;
  name: string;
  quantity: string;
  order_index: number;
}

export const INITIAL_MARKET_ITEMS: MarketItemData[] = [
  // Proteínas Premium
  { id: 'p1', category: 'Proteínas Premium', name: 'Salmón en filetes', quantity: '2.5 kg', order_index: 1 },
  { id: 'p2', category: 'Proteínas Premium', name: 'Lomo de res', quantity: '2.5 kg', order_index: 2 },

  // Proteínas Económicas
  { id: 'p3', category: 'Proteínas Económicas', name: 'Pechuga de pollo', quantity: '8 kg', order_index: 3 },
  { id: 'p4', category: 'Proteínas Económicas', name: 'Solomillo de cerdo', quantity: '1.2 kg', order_index: 4 },
  { id: 'p5', category: 'Proteínas Económicas', name: 'Bistec de res (punta anca)', quantity: '5 kg', order_index: 5 },
  { id: 'p6', category: 'Proteínas Económicas', name: 'Carne molida de res', quantity: '2.5 kg', order_index: 6 },
  { id: 'p7', category: 'Proteínas Económicas', name: 'Tilapia en filetes', quantity: '1.2 kg', order_index: 7 },
  { id: 'p8', category: 'Proteínas Económicas', name: 'Jamón de pierna', quantity: '600g', order_index: 8 },
  { id: 'p9', category: 'Proteínas Económicas', name: 'Huesos de pollo', quantity: '2 kg', order_index: 9 },
  { id: 'p10', category: 'Proteínas Económicas', name: 'Tocineta/Bacon', quantity: '300g', order_index: 10 },
  { id: 'p11', category: 'Proteínas Económicas', name: 'Huevos', quantity: '6 docenas', order_index: 11 },

  // Vegetales
  { id: 'v1', category: 'Vegetales', name: 'Tomate chonto', quantity: '30 unid', order_index: 12 },
  { id: 'v2', category: 'Vegetales', name: 'Cebolla larga', quantity: '15 tallos', order_index: 13 },
  { id: 'v3', category: 'Vegetales', name: 'Cebolla cabezona', quantity: '15 unid', order_index: 14 },
  { id: 'v4', category: 'Vegetales', name: 'Cebolla morada', quantity: '4 unid', order_index: 15 },
  { id: 'v5', category: 'Vegetales', name: 'Ajo', quantity: '5 cabezas', order_index: 16 },
  { id: 'v6', category: 'Vegetales', name: 'Jengibre', quantity: '2 raíces', order_index: 17 },
  { id: 'v7', category: 'Vegetales', name: 'Perejil fresco', quantity: '8 manojos', order_index: 18 },
  { id: 'v8', category: 'Vegetales', name: 'Cilantro', quantity: '6 manojos', order_index: 19 },
  { id: 'v9', category: 'Vegetales', name: 'Cebollín', quantity: '3 manojos', order_index: 20 },
  { id: 'v10', category: 'Vegetales', name: 'Romero fresco', quantity: '2 manojos', order_index: 21 },
  { id: 'v11', category: 'Vegetales', name: 'Brócoli', quantity: '6 cabezas', order_index: 22 },
  { id: 'v12', category: 'Vegetales', name: 'Coliflor', quantity: '2 cabezas', order_index: 23 },
  { id: 'v13', category: 'Vegetales', name: 'Calabacín', quantity: '10 unid', order_index: 24 },
  { id: 'v14', category: 'Vegetales', name: 'Pimentón rojo', quantity: '10 unid', order_index: 25 },
  { id: 'v15', category: 'Vegetales', name: 'Pimentón amarillo', quantity: '4 unid', order_index: 26 },
  { id: 'v16', category: 'Vegetales', name: 'Espárragos', quantity: '3 manojos', order_index: 27 },
  { id: 'v17', category: 'Vegetales', name: 'Kale/Col rizada', quantity: '1 manojo', order_index: 28 },
  { id: 'v18', category: 'Vegetales', name: 'Champiñones', quantity: '4 bandejas', order_index: 29 },
  { id: 'v19', category: 'Vegetales', name: 'Lechuga crespa', quantity: '5 cabezas', order_index: 30 },
  { id: 'v20', category: 'Vegetales', name: 'Lechuga iceberg', quantity: '2 cabezas', order_index: 31 },
  { id: 'v21', category: 'Vegetales', name: 'Espinaca', quantity: '2 bolsas', order_index: 32 },
  { id: 'v22', category: 'Vegetales', name: 'Tomate cherry', quantity: '2 bandejas', order_index: 33 },
  { id: 'v23', category: 'Vegetales', name: 'Pepino', quantity: '6 unid', order_index: 34 },
  { id: 'v24', category: 'Vegetales', name: 'Aguacate', quantity: '20 unid', order_index: 35 },
  { id: 'v25', category: 'Vegetales', name: 'Limones', quantity: '25 unid', order_index: 36 },
  { id: 'v26', category: 'Vegetales', name: 'Manzana verde', quantity: '4 unid', order_index: 37 },
  { id: 'v27', category: 'Vegetales', name: 'Zanahoria', quantity: '10 unid', order_index: 38 },

  // Tubérculos
  { id: 't1', category: 'Tubérculos', name: 'Batata/Camote', quantity: '8 unid grandes', order_index: 39 },
  { id: 't2', category: 'Tubérculos', name: 'Papa criolla', quantity: '2 libras', order_index: 40 },
  { id: 't3', category: 'Tubérculos', name: 'Papa común', quantity: '8 unid grandes', order_index: 41 },

  // Carbohidratos
  { id: 'c1', category: 'Carbohidratos', name: 'Arroz blanco', quantity: '1 bolsa (3kg)', order_index: 42 },
  { id: 'c2', category: 'Carbohidratos', name: 'Masarepa (P.A.N.)', quantity: '3 paquetes', order_index: 43 },
  { id: 'c3', category: 'Carbohidratos', name: 'Pan rallado', quantity: '1 bolsa peq', order_index: 44 },
  { id: 'c4', category: 'Carbohidratos', name: 'Maíz desgranado', quantity: '2 latas', order_index: 45 },

  // Lácteos
  { id: 'l1', category: 'Lácteos', name: 'Yogur griego natural', quantity: '3 potes', order_index: 46 },
  { id: 'l2', category: 'Lácteos', name: 'Crema de leche', quantity: '4 cajas', order_index: 47 },
  { id: 'l3', category: 'Lácteos', name: 'Queso mozzarella', quantity: '2 bolsas', order_index: 48 },
  { id: 'l4', category: 'Lácteos', name: 'Queso costeño/cuajada', quantity: '1 bloque', order_index: 49 },
  { id: 'l5', category: 'Lácteos', name: 'Queso parmesano', quantity: '1 cuña', order_index: 50 },
  { id: 'l6', category: 'Lácteos', name: 'Queso crema', quantity: '1 pote', order_index: 51 },
  { id: 'l7', category: 'Lácteos', name: 'Mantequilla', quantity: '1 barra', order_index: 52 },
  { id: 'l8', category: 'Lácteos', name: 'Crema agria (opc)', quantity: '1 pote', order_index: 53 },

  // Despensa
  { id: 'd1', category: 'Despensa', name: 'Aceite de oliva', quantity: '2 botellas', order_index: 54 },
  { id: 'd2', category: 'Despensa', name: 'Aceite vegetal', quantity: '1 botella', order_index: 55 },
  { id: 'd3', category: 'Despensa', name: 'Salsa de soya', quantity: '1 botella', order_index: 56 },
  { id: 'd4', category: 'Despensa', name: 'Mirin', quantity: '1 botella', order_index: 57 },
  { id: 'd5', category: 'Despensa', name: 'Vinagre vino tinto', quantity: '1 botella', order_index: 58 },
  { id: 'd6', category: 'Despensa', name: 'Salsa de tomate', quantity: '1 frasco', order_index: 59 },
  { id: 'd7', category: 'Despensa', name: 'Mayonesa', quantity: '1 frasco', order_index: 60 },
  { id: 'd8', category: 'Despensa', name: 'Mostaza', quantity: '1 frasco', order_index: 61 },
  { id: 'd9', category: 'Despensa', name: 'Ketchup', quantity: '1 frasco', order_index: 62 },
  { id: 'd10', category: 'Despensa', name: 'Salsa BBQ', quantity: '1 frasco', order_index: 63 },
  { id: 'd11', category: 'Despensa', name: 'Pepinillos', quantity: '1 frasco', order_index: 64 },
  { id: 'd12', category: 'Despensa', name: 'Azúcar morena', quantity: '1 bolsa', order_index: 65 },
  { id: 'd13', category: 'Despensa', name: 'Miel', quantity: '1 frasco', order_index: 66 },
  { id: 'd14', category: 'Despensa', name: 'Café espresso', quantity: '1 bolsa peq', order_index: 67 },
  { id: 'd15', category: 'Despensa', name: 'Nueces/almendras', quantity: '1 bolsa', order_index: 68 },
  { id: 'd16', category: 'Despensa', name: 'Semillas sésamo', quantity: '1 bolsa peq', order_index: 69 },
  { id: 'd17', category: 'Despensa', name: 'Maicena', quantity: '1 caja peq', order_index: 70 },

  // Especias
  { id: 'e1', category: 'Especias', name: 'Sal marina', quantity: '1 bolsa', order_index: 71 },
  { id: 'e2', category: 'Especias', name: 'Pimienta molida', quantity: '1 frasco', order_index: 72 },
  { id: 'e3', category: 'Especias', name: 'Pimienta en grano', quantity: '1 frasco peq', order_index: 73 },
  { id: 'e4', category: 'Especias', name: 'Comino molido', quantity: '1 frasco', order_index: 74 },
  { id: 'e5', category: 'Especias', name: 'Paprika', quantity: '1 frasco', order_index: 75 },
  { id: 'e6', category: 'Especias', name: 'Paprika ahumada', quantity: '1 frasco', order_index: 76 },
  { id: 'e7', category: 'Especias', name: 'Orégano seco', quantity: '1 frasco', order_index: 77 },
  { id: 'e8', category: 'Especias', name: 'Tomillo seco', quantity: '1 frasco', order_index: 78 },
  { id: 'e9', category: 'Especias', name: 'Ajo en polvo', quantity: '1 frasco', order_index: 79 },
  { id: 'e10', category: 'Especias', name: 'Cebolla en polvo', quantity: '1 frasco', order_index: 80 },
  { id: 'e11', category: 'Especias', name: 'Laurel seco', quantity: '1 bolsa peq', order_index: 81 },
  { id: 'e12', category: 'Especias', name: 'Eneldo seco', quantity: '1 frasco peq', order_index: 82 },
];

// Emojis por categoría
export const CATEGORY_EMOJIS: Record<string, string> = {
  'Proteínas Premium': '🥩',
  'Proteínas Económicas': '🍗',
  'Vegetales': '🥬',
  'Tubérculos': '🥔',
  'Carbohidratos': '🍚',
  'Lácteos': '🧀',
  'Despensa': '🫙',
  'Especias': '🧂'
};
