// Subcategorías de proteínas con iconos específicos
export const PROTEIN_SUBCATEGORIES = {
  red_meat: {
    id: 'red_meat',
    name: 'Carnes Rojas',
    icon: '🥩',
    keywords: ['res', 'carne', 'lomo', 'costilla', 'molida', 'cerdo', 'chuleta', 'tocino', 'tocineta', 'bacon', 'cordero', 'ternera', 'filete', 'bistec', 'bife', 'steak']
  },
  poultry: {
    id: 'poultry',
    name: 'Aves',
    icon: '🍗',
    keywords: ['pollo', 'pechuga', 'muslo', 'ala', 'pavo', 'gallina']
  },
  fish: {
    id: 'fish',
    name: 'Pescados',
    icon: '🐟',
    keywords: ['pescado', 'salmón', 'salmon', 'tilapia', 'trucha', 'atún', 'atun', 'bagre', 'corvina', 'róbalo', 'robalo', 'mojarra', 'bacalao', 'sardina']
  },
  seafood: {
    id: 'seafood',
    name: 'Mariscos',
    icon: '🦐',
    keywords: ['camarón', 'camaron', 'camarones', 'langosta', 'langostino', 'pulpo', 'calamar', 'mejillón', 'mejillon', 'almeja', 'ostión', 'ostion', 'cangrejo', 'marisco']
  },
  cold_cuts: {
    id: 'cold_cuts',
    name: 'Embutidos',
    icon: '🥓',
    keywords: ['jamón', 'jamon', 'salchicha', 'chorizo', 'mortadela', 'salami', 'pepperoni', 'embutido']
  },
  eggs: {
    id: 'eggs',
    name: 'Huevos',
    icon: '🥚',
    keywords: ['huevo', 'huevos']
  }
};

/**
 * Obtiene el icono de proteína basado en el nombre del producto
 * @param productName - Nombre del producto
 * @returns Emoji correspondiente a la subcategoría de proteína
 */
export function getProteinIcon(productName: string): string {
  const nameLower = productName.toLowerCase();

  for (const [, subcategory] of Object.entries(PROTEIN_SUBCATEGORIES)) {
    if (subcategory.keywords.some(keyword => nameLower.includes(keyword))) {
      return subcategory.icon;
    }
  }

  // Default para proteínas no identificadas
  return '🥩';
}

/**
 * Determina si una categoría es de proteínas
 * @param categoryId - ID de la categoría
 * @param categoryName - Nombre de la categoría (fallback)
 * @returns true si es una categoría de proteínas
 */
export function isProteinCategory(categoryId?: string, categoryName?: string): boolean {
  if (categoryId === 'proteins') return true;
  if (categoryName?.toLowerCase().includes('proteína')) return true;
  if (categoryName?.toLowerCase().includes('protein')) return true;
  return false;
}

/**
 * Obtiene el icono correcto para un item, usando subcategorías para proteínas
 * @param itemName - Nombre del item
 * @param categoryId - ID de la categoría
 * @param categoryName - Nombre de la categoría
 * @param defaultIcon - Icono por defecto de la categoría
 * @returns Emoji correcto para el item
 */
export function getItemIcon(
  itemName: string,
  categoryId?: string,
  categoryName?: string,
  defaultIcon?: string
): string {
  // Si es proteína, usar subcategoría
  if (isProteinCategory(categoryId, categoryName)) {
    return getProteinIcon(itemName);
  }

  // Si no, usar el icono default
  return defaultIcon || '📦';
}
