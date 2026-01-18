import { supabase } from './supabase/client';
import { Recipe, Ingredient } from '@/types';

export interface IngredientStatus {
  name: string;
  required: string;
  available: number;
  needed: number;
  hasEnough: boolean;
  percentAvailable: number;
  matchedItem?: string; // Nombre del item del inventario que coincidió
}

export interface RecipeAvailability {
  recipe: Recipe;
  canMake: boolean;
  availablePercent: number;
  missingIngredients: IngredientStatus[];
  availableIngredients: IngredientStatus[];
}

// Cache para aliases y preparaciones (evitar múltiples queries)
let aliasesCache: Map<string, string> | null = null;
let preparationsCache: Map<string, string[]> | null = null;

// Normalizar nombre de ingrediente para comparación
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/\s+/g, ' ')
    .trim();
}

// Extraer número de una cantidad string
function extractNumber(qty: string): number {
  if (!qty) return 0;
  const match = qty.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Cargar aliases desde la base de datos
async function loadAliases(): Promise<Map<string, string>> {
  if (aliasesCache) return aliasesCache;

  const { data, error } = await supabase
    .from('ingredient_aliases')
    .select('alias, market_item_id');

  aliasesCache = new Map();

  if (error) {
    console.error('[ALIASES-ERROR]', error);
    return aliasesCache;
  }

  if (data) {
    // También cargar nombres de market_items para mapear
    const { data: items } = await supabase
      .from('market_items')
      .select('id, name');

    const itemNames = new Map(items?.map(i => [i.id, i.name]) || []);

    for (const alias of data) {
      const itemName = itemNames.get(alias.market_item_id);
      if (itemName) {
        aliasesCache.set(normalizeIngredient(alias.alias), itemName);
      }
    }
    console.log(`[ALIASES-LOADED] ${aliasesCache.size} aliases loaded`);
  }

  return aliasesCache;
}

// Cargar preparaciones desde la base de datos
async function loadPreparations(): Promise<Map<string, string[]>> {
  if (preparationsCache) return preparationsCache;

  const { data } = await supabase
    .from('preparations')
    .select('name, ingredients');

  preparationsCache = new Map();

  if (data) {
    for (const prep of data) {
      const ingredients = prep.ingredients as string[];
      preparationsCache.set(normalizeIngredient(prep.name), ingredients);
    }
  }

  return preparationsCache;
}

// Separar ingredientes compuestos (ej: "Hogao + Aguacate" → ["Hogao", "Aguacate"])
function splitCompoundIngredient(name: string): string[] {
  if (name.includes('+')) {
    return name.split('+').map(s => s.trim()).filter(s => s.length > 0);
  }
  return [name];
}

// Calcular similitud entre dos strings (distancia de Levenshtein simplificada)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeIngredient(str1);
  const s2 = normalizeIngredient(str2);

  // Si uno contiene al otro, alta similitud
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Comparar palabras
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');

  let matchingWords = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchingWords++;
        break;
      }
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  return matchingWords / maxWords;
}

// Buscar item del inventario que coincida con ingrediente (MEJORADO)
async function findInventoryMatch(
  ingredientName: string,
  inventory: Map<string, { quantity: string; number: number; itemName: string }>
): Promise<{ quantity: string; number: number; itemName: string } | null> {
  const normalizedIngredient = normalizeIngredient(ingredientName);

  // 1. Buscar coincidencia exacta en inventario
  for (const [itemName, data] of inventory.entries()) {
    if (normalizeIngredient(itemName) === normalizedIngredient) {
      console.log(`[MATCH-EXACT] "${ingredientName}" → "${itemName}" (qty: ${data.number})`);
      return data;
    }
  }

  // 2. Buscar en aliases
  const aliases = await loadAliases();
  const aliasMatch = aliases.get(normalizedIngredient);
  if (aliasMatch) {
    console.log(`[ALIAS-FOUND] "${ingredientName}" → alias: "${aliasMatch}"`);
    const data = inventory.get(aliasMatch);
    if (data) {
      console.log(`[MATCH-ALIAS] "${ingredientName}" → "${aliasMatch}" (qty: ${data.number})`);
      return data;
    } else {
      console.log(`[ALIAS-NO-INV] "${ingredientName}" → alias "${aliasMatch}" not in inventory`);
    }
  }

  // 3. Buscar coincidencia parcial (uno contiene al otro)
  for (const [itemName, data] of inventory.entries()) {
    const normalizedItem = normalizeIngredient(itemName);

    if (
      normalizedItem.includes(normalizedIngredient) ||
      normalizedIngredient.includes(normalizedItem)
    ) {
      return data;
    }
  }

  // 4. Fuzzy matching - buscar palabras clave
  const ingredientWords = normalizedIngredient.split(' ');
  for (const [itemName, data] of inventory.entries()) {
    const normalizedItem = normalizeIngredient(itemName);

    // Si la primera palabra clave coincide
    for (const word of ingredientWords) {
      if (word.length >= 4 && normalizedItem.includes(word)) {
        console.log(`[MATCH-FUZZY] "${ingredientName}" → "${itemName}" (word: ${word}, qty: ${data.number})`);
        return data;
      }
    }
  }

  console.log(`[NO-MATCH] "${ingredientName}" - no match found`);
  return null;
}

// Verificar si una preparación se puede hacer con el inventario
async function checkPreparationAvailable(
  prepName: string,
  inventory: Map<string, { quantity: string; number: number; itemName: string }>
): Promise<boolean> {
  const preparations = await loadPreparations();
  const normalizedName = normalizeIngredient(prepName);

  const ingredients = preparations.get(normalizedName);
  if (!ingredients) return false;

  // Verificar que al menos 70% de los ingredientes estén disponibles
  let available = 0;
  for (const ing of ingredients) {
    const match = await findInventoryMatch(ing, inventory);
    if (match && match.number > 0) {
      available++;
    }
  }

  return (available / ingredients.length) >= 0.7;
}

// Cargar inventario actual
export async function loadCurrentInventory(): Promise<Map<string, { quantity: string; number: number; itemName: string }>> {
  const { data: items, error: itemsError } = await supabase
    .from('market_items')
    .select('id, name');

  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('item_id, current_quantity, current_number');

  if (itemsError) console.error('[INVENTORY-ERROR] items:', itemsError);
  if (invError) console.error('[INVENTORY-ERROR] inventory:', invError);

  const inventoryMap = new Map<string, { quantity: string; number: number; itemName: string }>();

  if (items && inventory) {
    const invMap = new Map(inventory.map(i => [i.item_id, i]));

    for (const item of items) {
      const inv = invMap.get(item.id);
      // Ensure number is actually a number
      const numValue = inv?.current_number ? Number(inv.current_number) : 0;
      inventoryMap.set(item.name, {
        quantity: inv?.current_quantity || '0',
        number: numValue,
        itemName: item.name
      });
    }

    // Log items with stock
    const withStock = Array.from(inventoryMap.entries()).filter(([, v]) => v.number > 0);
    console.log(`[INVENTORY-LOADED] ${inventoryMap.size} items, ${withStock.length} with stock`);
  }

  return inventoryMap;
}

// Verificar disponibilidad de ingredientes para una receta (MEJORADO)
export async function checkRecipeIngredients(
  recipe: Recipe,
  inventory: Map<string, { quantity: string; number: number; itemName: string }>
): Promise<RecipeAvailability> {
  const ingredients = recipe.ingredients as Ingredient[];
  const missingIngredients: IngredientStatus[] = [];
  const availableIngredients: IngredientStatus[] = [];

  for (const ing of ingredients) {
    const requiredQty = ing.total || ing.luis || '1';
    const requiredNum = extractNumber(requiredQty);

    // Separar ingredientes compuestos
    const subIngredients = splitCompoundIngredient(ing.name);
    let totalAvailable = 0;
    let matchedItems: string[] = [];

    for (const subIng of subIngredients) {
      // Primero verificar si es una preparación
      const isPrep = await checkPreparationAvailable(subIng, inventory);

      if (isPrep) {
        totalAvailable += 1;
        matchedItems.push(`${subIng} (preparación)`);
      } else {
        // Buscar en inventario
        const inventoryMatch = await findInventoryMatch(subIng, inventory);
        if (inventoryMatch && inventoryMatch.number > 0) {
          totalAvailable += inventoryMatch.number;
          matchedItems.push(inventoryMatch.itemName);
        }
      }
    }

    const hasEnough = totalAvailable > 0 && totalAvailable >= requiredNum * 0.5;
    const percentAvailable = requiredNum > 0 ? Math.min(100, (totalAvailable / requiredNum) * 100) : 100;

    const status: IngredientStatus = {
      name: ing.name,
      required: requiredQty,
      available: totalAvailable,
      needed: Math.max(0, requiredNum - totalAvailable),
      hasEnough,
      percentAvailable,
      matchedItem: matchedItems.length > 0 ? matchedItems.join(', ') : undefined
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
export async function findAlternativeRecipes(
  recipes: Recipe[],
  inventory: Map<string, { quantity: string; number: number; itemName: string }>,
  excludeRecipeId?: string,
  mealType?: 'breakfast' | 'lunch' | 'dinner'
): Promise<RecipeAvailability[]> {
  const alternatives: RecipeAvailability[] = [];

  for (const recipe of recipes) {
    // Excluir la receta actual y filtrar por tipo si se especifica
    if (recipe.id === excludeRecipeId) continue;
    if (mealType && recipe.type !== mealType) continue;

    const availability = await checkRecipeIngredients(recipe, inventory);

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

// Limpiar cache (llamar cuando se actualicen aliases o preparaciones)
export function clearInventoryCache(): void {
  aliasesCache = null;
  preparationsCache = null;
}
