import { supabase } from './supabase/client';
import { Recipe, Ingredient, MarketItem } from '@/types';

export interface IngredientStatus {
  name: string;
  required: string;
  available: number;
  needed: number;
  hasEnough: boolean;
  percentAvailable: number;
}

export interface RecipeAvailability {
  recipe: Recipe;
  canMake: boolean;
  availablePercent: number;
  missingIngredients: IngredientStatus[];
  availableIngredients: IngredientStatus[];
}

// Normalizar nombre de ingrediente para comparación
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extraer número de una cantidad string
function extractNumber(qty: string): number {
  if (!qty) return 0;
  const match = qty.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Buscar item del inventario que coincida con ingrediente
function findInventoryMatch(
  ingredientName: string,
  inventory: Map<string, { quantity: string; number: number; itemName: string }>
): { quantity: string; number: number; itemName: string } | null {
  const normalizedIngredient = normalizeIngredient(ingredientName);

  for (const [itemName, data] of inventory.entries()) {
    const normalizedItem = normalizeIngredient(itemName);

    // Coincidencia exacta o parcial
    if (
      normalizedItem.includes(normalizedIngredient) ||
      normalizedIngredient.includes(normalizedItem) ||
      normalizedItem === normalizedIngredient
    ) {
      return data;
    }
  }

  return null;
}

// Cargar inventario actual
export async function loadCurrentInventory(): Promise<Map<string, { quantity: string; number: number; itemName: string }>> {
  const { data: items } = await supabase
    .from('market_items')
    .select('id, name');

  const { data: inventory } = await supabase
    .from('inventory')
    .select('item_id, current_quantity, current_number');

  const inventoryMap = new Map<string, { quantity: string; number: number; itemName: string }>();

  if (items && inventory) {
    const invMap = new Map(inventory.map(i => [i.item_id, i]));

    for (const item of items) {
      const inv = invMap.get(item.id);
      inventoryMap.set(item.name, {
        quantity: inv?.current_quantity || '0',
        number: inv?.current_number || 0,
        itemName: item.name
      });
    }
  }

  return inventoryMap;
}

// Verificar disponibilidad de ingredientes para una receta
export function checkRecipeIngredients(
  recipe: Recipe,
  inventory: Map<string, { quantity: string; number: number; itemName: string }>
): RecipeAvailability {
  const ingredients = recipe.ingredients as Ingredient[];
  const missingIngredients: IngredientStatus[] = [];
  const availableIngredients: IngredientStatus[] = [];

  for (const ing of ingredients) {
    const requiredQty = ing.total || ing.luis || '1';
    const requiredNum = extractNumber(requiredQty);

    const inventoryMatch = findInventoryMatch(ing.name, inventory);
    const availableNum = inventoryMatch?.number || 0;

    const hasEnough = availableNum >= requiredNum * 0.5; // Al menos 50%
    const percentAvailable = requiredNum > 0 ? Math.min(100, (availableNum / requiredNum) * 100) : 100;

    const status: IngredientStatus = {
      name: ing.name,
      required: requiredQty,
      available: availableNum,
      needed: Math.max(0, requiredNum - availableNum),
      hasEnough,
      percentAvailable
    };

    if (hasEnough) {
      availableIngredients.push(status);
    } else {
      missingIngredients.push(status);
    }
  }

  const totalIngredients = ingredients.length;
  const availableCount = availableIngredients.length;
  const availablePercent = totalIngredients > 0 ? (availableCount / totalIngredients) * 100 : 0;

  return {
    recipe,
    canMake: missingIngredients.length === 0,
    availablePercent,
    missingIngredients,
    availableIngredients
  };
}

// Encontrar recetas alternativas que se pueden hacer con el inventario actual
export function findAlternativeRecipes(
  recipes: Recipe[],
  inventory: Map<string, { quantity: string; number: number; itemName: string }>,
  excludeRecipeId?: string,
  mealType?: 'breakfast' | 'lunch' | 'dinner'
): RecipeAvailability[] {
  const alternatives: RecipeAvailability[] = [];

  for (const recipe of recipes) {
    // Excluir la receta actual y filtrar por tipo si se especifica
    if (recipe.id === excludeRecipeId) continue;
    if (mealType && recipe.type !== mealType) continue;

    const availability = checkRecipeIngredients(recipe, inventory);

    // Solo incluir si se puede hacer (o casi - 80%+)
    if (availability.availablePercent >= 80) {
      alternatives.push(availability);
    }
  }

  // Ordenar por disponibilidad (más completas primero)
  return alternatives.sort((a, b) => b.availablePercent - a.availablePercent);
}

// Obtener lista de ingredientes disponibles para generar recetas con IA
export function getAvailableIngredientsList(
  inventory: Map<string, { quantity: string; number: number; itemName: string }>
): string[] {
  const available: string[] = [];

  for (const [name, data] of inventory.entries()) {
    if (data.number > 0) {
      available.push(`${name} (${data.quantity})`);
    }
  }

  return available;
}
