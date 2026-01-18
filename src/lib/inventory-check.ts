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
  if (aliasesCache) {
    console.log(`[ALIASES-CACHE-HIT] Using cached ${aliasesCache.size} aliases`);
    return aliasesCache;
  }

  const { data, error } = await supabase
    .from('ingredient_aliases')
    .select('alias, market_item_id');

  aliasesCache = new Map();

  if (error) {
    console.error('[ALIASES-ERROR]', error);
    return aliasesCache;
  }

  if (data) {
    console.log(`[ALIASES-RAW] Found ${data.length} alias records in DB`);

    // También cargar nombres de market_items para mapear
    const { data: items, error: itemsError } = await supabase
      .from('market_items')
      .select('id, name');

    if (itemsError) {
      console.error('[ALIASES-ERROR] Failed to load market_items:', itemsError);
      return aliasesCache;
    }

    if (!items || items.length === 0) {
      console.error('[ALIASES-ERROR] No market_items returned from query');
      return aliasesCache;
    }

    const itemNames = new Map(items.map(i => [i.id, i.name]));
    console.log(`[MARKET-ITEMS] Loaded ${itemNames.size} market items`);

    for (const alias of data) {
      const itemName = itemNames.get(alias.market_item_id);
      if (itemName) {
        const normalizedAlias = normalizeIngredient(alias.alias);
        aliasesCache.set(normalizedAlias, itemName);
        // Log some sample aliases for debugging
        if (alias.alias.toLowerCase().includes('bistec') || alias.alias.toLowerCase().includes('queso')) {
          console.log(`[ALIAS-MAPPED] "${alias.alias}" (normalized: "${normalizedAlias}") → "${itemName}" (market_item_id: ${alias.market_item_id})`);
        }
      } else {
        console.log(`[ALIAS-ORPHAN] alias "${alias.alias}" has market_item_id "${alias.market_item_id}" but no matching item found`);
      }
    }
    console.log(`[ALIASES-LOADED] ${aliasesCache.size} aliases loaded into cache`);

    // Debug: print first few alias entries
    const aliasEntries = Array.from(aliasesCache.entries()).slice(0, 10);
    console.log(`[ALIASES-SAMPLE] First 10 entries: ${aliasEntries.map(([k, v]) => `"${k}" → "${v}"`).join(' | ')}`);
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
      // Debug: show all inventory keys to find the issue
      const inventoryKeys = Array.from(inventory.keys());
      console.log(`[ALIAS-NO-INV] "${ingredientName}" → alias "${aliasMatch}" not found in inventory`);
      console.log(`[ALIAS-NO-INV] aliasMatch length: ${aliasMatch.length}, charCodes: ${[...aliasMatch].slice(0, 30).map(c => c.charCodeAt(0)).join(',')}`);

      // Try to find exact key match issue
      const exactMatch = inventoryKeys.find(k => k === aliasMatch);
      console.log(`[ALIAS-NO-INV] Exact key match: ${exactMatch ? 'YES' : 'NO'}`);

      // Show similar keys
      const similarKeys = inventoryKeys.filter(k =>
        k.toLowerCase().includes('bistec') || k.toLowerCase().includes('queso')
      );
      console.log(`[ALIAS-NO-INV] Similar inventory keys: ${similarKeys.join(' | ')}`);
    }
  } else {
    console.log(`[NO-ALIAS] "${ingredientName}" (normalized: "${normalizedIngredient}") has no alias`);
    // Show all alias keys for debugging
    const allAliasKeys = Array.from(aliases.keys()).filter(k =>
      k.includes('bistec') || k.includes('queso')
    );
    console.log(`[NO-ALIAS] Available alias keys with bistec/queso: ${allAliasKeys.join(' | ')}`);
  }

  // 3. Buscar coincidencia parcial (uno contiene al otro)
  console.log(`[STEP-3] Checking partial matches for "${normalizedIngredient}"`);
  for (const [itemName, data] of inventory.entries()) {
    const normalizedItem = normalizeIngredient(itemName);

    if (
      normalizedItem.includes(normalizedIngredient) ||
      normalizedIngredient.includes(normalizedItem)
    ) {
      console.log(`[MATCH-PARTIAL] "${ingredientName}" → "${itemName}" (qty: ${data.number})`);
      return data;
    }
  }
  console.log(`[STEP-3] No partial match found`);

  // 4. Fuzzy matching - buscar palabras clave
  console.log(`[STEP-4] Checking fuzzy matches for words: ${normalizedIngredient.split(' ').join(', ')}`);
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

  console.log(`[NO-MATCH] "${ingredientName}" - no match found after all 4 steps`);
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

    // Log items with stock - specifically ones related to our problem
    const withStock = Array.from(inventoryMap.entries()).filter(([, v]) => v.number > 0);
    console.log(`[INVENTORY-LOADED] ${inventoryMap.size} items total, ${withStock.length} with stock`);

    // Log specific items we're having trouble with
    const debugItems = ['Bistec de res (punta anca)', 'Queso costeño', 'Queso cuajada', 'Queso mozzarella'];
    for (const debugItem of debugItems) {
      const data = inventoryMap.get(debugItem);
      if (data) {
        console.log(`[INVENTORY-DEBUG] "${debugItem}" → qty: ${data.number}`);
      } else {
        // Try to find similar keys
        const similar = Array.from(inventoryMap.keys()).filter(k =>
          k.toLowerCase().includes('bistec') || k.toLowerCase().includes('queso')
        );
        console.log(`[INVENTORY-DEBUG] "${debugItem}" NOT FOUND. Similar keys: ${similar.slice(0, 5).join(', ')}`);
      }
    }
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

  console.log(`[CHECK-RECIPE] Checking recipe: ${recipe.name}`);

  for (const ing of ingredients) {
    const requiredQty = ing.total || ing.luis || '1';
    const requiredNum = extractNumber(requiredQty);

    console.log(`[INGREDIENT-CHECK] "${ing.name}" requires "${requiredQty}" (parsed: ${requiredNum})`);

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
        console.log(`[PREP-FOUND] "${subIng}" is available as preparation`);
      } else {
        // Buscar en inventario
        const inventoryMatch = await findInventoryMatch(subIng, inventory);
        if (inventoryMatch) {
          console.log(`[INV-MATCH] "${subIng}" found → ${inventoryMatch.itemName} (number: ${inventoryMatch.number}, qty: ${inventoryMatch.quantity})`);
          if (inventoryMatch.number > 0) {
            totalAvailable += inventoryMatch.number;
            matchedItems.push(inventoryMatch.itemName);
          } else {
            console.log(`[INV-ZERO] "${subIng}" matched but has 0 stock`);
          }
        } else {
          console.log(`[INV-NO-MATCH] "${subIng}" not found in inventory`);
        }
      }
    }

    // FIXED: Simplified availability check
    // The old logic failed because units are inconsistent:
    // - Inventory has current_number like 5 (meaning "5 kg" or "5 units")
    // - Recipe requests like "280g" which extracts to 280
    // This caused 5 >= 140 = false, even though we clearly have enough beef!
    //
    // NEW LOGIC: If we found the ingredient and it has stock > 0, it's available
    // The actual quantity check is not meaningful with mixed units
    const hasEnough = totalAvailable > 0;
    console.log(`[HAS-ENOUGH] "${ing.name}": totalAvailable=${totalAvailable}, hasEnough=${hasEnough} (simplified check)`);
    // Simplified percent: 100% if we have stock, 0% if not
    const percentAvailable = hasEnough ? 100 : 0;

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
