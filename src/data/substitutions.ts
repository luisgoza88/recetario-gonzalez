// Sustituciones inteligentes de ingredientes
// Clave: ingrediente original (en minúsculas)
// Valor: array de alternativas posibles

export const INGREDIENT_SUBSTITUTIONS: Record<string, string[]> = {
  // Lácteos
  'crema': [
    'Leche evaporada',
    'Yogurt natural',
    'Leche de coco (para sabor diferente)',
  ],
  'leche': [
    'Leche evaporada diluida',
    'Leche de almendras',
    'Leche de coco',
  ],
  'mantequilla': [
    'Aceite de oliva (para cocinar)',
    'Margarina',
    'Aceite de coco',
  ],
  'queso crema': [
    'Ricotta',
    'Yogurt griego espeso',
    'Queso cottage licuado',
  ],
  'queso parmesano': [
    'Queso pecorino',
    'Queso añejo rallado',
    'Levadura nutricional (vegano)',
  ],
  'yogurt': [
    'Crema agria',
    'Leche con limón (dejar reposar 10 min)',
  ],

  // Ácidos
  'limón': [
    'Vinagre blanco (mitad de cantidad)',
    'Lima',
    'Naranja agria',
  ],
  'vinagre': [
    'Jugo de limón',
    'Vino blanco',
  ],
  'vino blanco': [
    'Caldo de pollo + chorrito de vinagre',
    'Jugo de uva blanca',
  ],
  'vino tinto': [
    'Caldo de res + vinagre balsámico',
    'Jugo de uva',
  ],

  // Endulzantes
  'azúcar': [
    'Miel (¾ de la cantidad)',
    'Panela rallada',
    'Stevia (ajustar cantidad)',
  ],
  'miel': [
    'Jarabe de maple',
    'Azúcar morena disuelta',
    'Melaza',
  ],

  // Proteínas
  'pollo': [
    'Pavo',
    'Cerdo (lomo)',
    'Tofu firme (vegetariano)',
  ],
  'carne molida': [
    'Carne de soya texturizada',
    'Lentejas cocidas (vegetariano)',
    'Champiñones picados fino',
  ],
  'huevo': [
    'Linaza molida + agua (1:3) - para hornear',
    'Puré de plátano (para dulces)',
    'Aquafaba (agua de garbanzos)',
  ],
  'tocino': [
    'Jamón serrano',
    'Chorizo en trozos pequeños',
    'Champiñones salteados (vegetariano)',
  ],

  // Vegetales
  'cebolla': [
    'Cebollín/Cebolla de verdeo',
    'Puerro',
    'Chalota',
  ],
  'ajo': [
    'Ajo en polvo (¼ cdta por diente)',
    'Cebollín (parte blanca)',
  ],
  'tomate': [
    'Pasta de tomate diluida',
    'Pimiento rojo asado',
    'Salsa de tomate (ajustar líquidos)',
  ],
  'pimiento': [
    'Apio',
    'Zanahoria (para color)',
  ],
  'espinaca': [
    'Acelga',
    'Kale/Col rizada',
    'Arúgula',
  ],
  'champiñón': [
    'Calabacín en cubos',
    'Berenjena en cubos',
  ],
  'papa': [
    'Yuca',
    'Batata/Camote',
    'Ñame',
  ],
  'batata': [
    'Papa',
    'Calabaza',
    'Zanahoria (para puré)',
  ],

  // Granos y carbohidratos
  'arroz': [
    'Quinoa',
    'Cuscús',
    'Coliflor rallada (bajo en carbs)',
  ],
  'pasta': [
    'Fideos de arroz',
    'Espagueti de calabacín',
    'Quinoa',
  ],
  'pan rallado': [
    'Avena molida',
    'Galletas trituradas',
    'Harina de almendra',
  ],
  'harina': [
    'Harina de almendra (para bajo carb)',
    'Maicena (para espesar)',
    'Harina de avena',
  ],

  // Especias y condimentos
  'cilantro': [
    'Perejil',
    'Culantro/Recao',
    'Albahaca (sabor diferente)',
  ],
  'perejil': [
    'Cilantro',
    'Cebollín',
    'Albahaca',
  ],
  'orégano': [
    'Mejorana',
    'Tomillo',
    'Albahaca seca',
  ],
  'comino': [
    'Curry en polvo',
    'Cilantro molido',
  ],
  'paprika': [
    'Pimentón',
    'Chile ancho en polvo',
    'Cayena (menos cantidad, más picante)',
  ],
  'salsa de soya': [
    'Salsa Worcestershire',
    'Aminos de coco',
    'Caldo concentrado + sal',
  ],
  'mostaza': [
    'Mayonesa + vinagre',
    'Salsa picante + miel',
  ],

  // Caldos y líquidos
  'caldo de pollo': [
    'Caldo de verduras',
    'Agua + cubito de caldo',
    'Caldo de res (sabor más fuerte)',
  ],
  'caldo de res': [
    'Caldo de pollo + salsa de soya',
    'Caldo de verduras + hongos',
  ],

  // Grasas
  'aceite de oliva': [
    'Aceite vegetal',
    'Aceite de aguacate',
    'Mantequilla derretida',
  ],
  'aceite vegetal': [
    'Aceite de canola',
    'Aceite de girasol',
    'Aceite de coco (para altas temperaturas)',
  ],
};

// Función helper para buscar sustituciones
export function findSubstitutions(ingredientName: string): string[] {
  const nameLower = ingredientName.toLowerCase();

  // Buscar coincidencia exacta primero
  if (INGREDIENT_SUBSTITUTIONS[nameLower]) {
    return INGREDIENT_SUBSTITUTIONS[nameLower];
  }

  // Buscar coincidencia parcial
  for (const [key, subs] of Object.entries(INGREDIENT_SUBSTITUTIONS)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return subs;
    }
  }

  return [];
}
