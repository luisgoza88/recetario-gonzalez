/**
 * Sistema de Sustituciones Inteligentes
 * Considera inventario disponible, preferencias y tags dietéticos
 */

import { createClient } from '@supabase/supabase-js';
import { INGREDIENT_SUBSTITUTIONS } from '@/data/substitutions';
import { DietaryTag } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface SmartSubstitution {
  original: string;
  substitute: string;
  isAvailable: boolean;      // Está en inventario
  availableQuantity?: string; // Cantidad disponible
  reason: string;            // Por qué se sugiere
  dietaryCompatible: boolean; // Compatible con restricciones
  usageCount: number;        // Veces que se ha usado esta sustitución
  rating?: number;           // Rating promedio (1-5)
}

export interface SubstitutionResult {
  ingredient: string;
  substitutions: SmartSubstitution[];
  hasAvailableOption: boolean;
}

// Cache del inventario
let inventoryCache: Map<string, { quantity: string; number: number }> | null = null;
let inventoryCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Mapa de sustitutos que NO son compatibles con ciertos tags
const DIETARY_INCOMPATIBLE: Record<DietaryTag, string[]> = {
  'vegetariano': ['pollo', 'carne', 'tocino', 'jamón', 'cerdo', 'res', 'pescado', 'mariscos'],
  'vegano': ['pollo', 'carne', 'tocino', 'jamón', 'cerdo', 'res', 'pescado', 'mariscos', 'huevo', 'leche', 'queso', 'crema', 'mantequilla', 'yogurt', 'miel'],
  'sin-gluten': ['pan', 'harina de trigo', 'pasta', 'galletas', 'pan rallado'],
  'sin-lactosa': ['leche', 'queso', 'crema', 'mantequilla', 'yogurt', 'queso crema'],
  'bajo-carbohidrato': ['azúcar', 'papa', 'arroz', 'pasta', 'pan', 'harina'],
  'alto-proteina': [], // No restringe nada
  'bajo-sodio': ['salsa de soya', 'caldo concentrado', 'tocino', 'jamón'],
  'bajo-azucar': ['azúcar', 'miel', 'jarabe', 'panela'],
  'keto': ['azúcar', 'papa', 'arroz', 'pasta', 'pan', 'harina', 'frijoles', 'maíz'],
  'paleo': ['lácteos', 'granos', 'legumbres', 'azúcar refinada'],
};

/**
 * Cargar inventario actual
 */
async function loadInventory(): Promise<Map<string, { quantity: string; number: number }>> {
  const now = Date.now();

  if (inventoryCache && (now - inventoryCacheTime) < CACHE_TTL) {
    return inventoryCache;
  }

  try {
    const { data } = await supabase
      .from('market_items')
      .select(`
        id,
        name,
        quantity,
        inventory:inventory(current_quantity, current_number)
      `);

    inventoryCache = new Map();

    if (data) {
      for (const item of data) {
        const inv = item.inventory as { current_quantity: string; current_number: number }[] | null;
        if (inv && inv.length > 0 && inv[0].current_number > 0) {
          inventoryCache.set(
            item.name.toLowerCase(),
            { quantity: inv[0].current_quantity, number: inv[0].current_number }
          );
        }
      }
    }

    inventoryCacheTime = now;
    return inventoryCache;
  } catch (error) {
    console.error('Error loading inventory for substitutions:', error);
    return new Map();
  }
}

/**
 * Cargar historial de uso de sustituciones
 */
async function loadSubstitutionHistory(): Promise<Map<string, { count: number; rating: number }>> {
  try {
    const { data } = await supabase
      .from('substitution_history')
      .select('original, substitute, rating');

    const history = new Map<string, { count: number; totalRating: number }>();

    if (data) {
      for (const record of data) {
        const key = `${record.original}|${record.substitute}`;
        const existing = history.get(key) || { count: 0, totalRating: 0 };
        history.set(key, {
          count: existing.count + 1,
          totalRating: existing.totalRating + (record.rating || 3)
        });
      }
    }

    // Convertir a rating promedio
    const result = new Map<string, { count: number; rating: number }>();
    for (const [key, value] of history) {
      result.set(key, {
        count: value.count,
        rating: value.count > 0 ? value.totalRating / value.count : 0
      });
    }

    return result;
  } catch (error) {
    // La tabla puede no existir aún, lo cual está bien
    return new Map();
  }
}

/**
 * Verificar si un sustituto es compatible con los tags dietéticos
 */
function isDietaryCompatible(substitute: string, dietaryTags: DietaryTag[]): boolean {
  if (!dietaryTags || dietaryTags.length === 0) return true;

  const subLower = substitute.toLowerCase();

  for (const tag of dietaryTags) {
    const incompatible = DIETARY_INCOMPATIBLE[tag] || [];
    for (const item of incompatible) {
      if (subLower.includes(item)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Buscar sustituciones inteligentes para un ingrediente
 */
export async function findSmartSubstitutions(
  ingredientName: string,
  dietaryTags: DietaryTag[] = []
): Promise<SubstitutionResult> {
  const nameLower = ingredientName.toLowerCase();

  // Cargar datos en paralelo
  const [inventory, history] = await Promise.all([
    loadInventory(),
    loadSubstitutionHistory()
  ]);

  // Buscar sustituciones base
  let baseSubstitutions: string[] = [];

  // Coincidencia exacta
  if (INGREDIENT_SUBSTITUTIONS[nameLower]) {
    baseSubstitutions = INGREDIENT_SUBSTITUTIONS[nameLower];
  } else {
    // Coincidencia parcial
    for (const [key, subs] of Object.entries(INGREDIENT_SUBSTITUTIONS)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        baseSubstitutions = subs;
        break;
      }
    }
  }

  // Enriquecer con información inteligente
  const smartSubs: SmartSubstitution[] = baseSubstitutions.map(sub => {
    // Extraer el nombre base del sustituto (sin paréntesis)
    const subName = sub.split('(')[0].trim().toLowerCase();

    // Verificar disponibilidad en inventario
    let isAvailable = false;
    let availableQuantity: string | undefined;

    for (const [invName, invData] of inventory) {
      if (invName.includes(subName) || subName.includes(invName)) {
        isAvailable = true;
        availableQuantity = invData.quantity;
        break;
      }
    }

    // Verificar compatibilidad dietética
    const dietaryCompatible = isDietaryCompatible(sub, dietaryTags);

    // Obtener historial de uso
    const historyKey = `${nameLower}|${sub.toLowerCase()}`;
    const usageData = history.get(historyKey) || { count: 0, rating: 0 };

    // Generar razón de sugerencia
    let reason = 'Sustituto estándar';
    if (isAvailable && dietaryCompatible) {
      reason = '✓ Disponible en tu despensa';
    } else if (isAvailable && !dietaryCompatible) {
      reason = '⚠ Disponible pero no compatible con tu dieta';
    } else if (!isAvailable && dietaryCompatible) {
      reason = 'Compatible con tu dieta';
    } else {
      reason = '⚠ No compatible con restricciones dietéticas';
    }

    if (usageData.count > 0) {
      reason += ` • Usado ${usageData.count}x`;
    }

    return {
      original: ingredientName,
      substitute: sub,
      isAvailable,
      availableQuantity,
      reason,
      dietaryCompatible,
      usageCount: usageData.count,
      rating: usageData.rating > 0 ? usageData.rating : undefined
    };
  });

  // Ordenar: disponibles primero, luego por rating y uso
  smartSubs.sort((a, b) => {
    // Disponibles y compatibles primero
    if (a.isAvailable && a.dietaryCompatible && !(b.isAvailable && b.dietaryCompatible)) return -1;
    if (b.isAvailable && b.dietaryCompatible && !(a.isAvailable && a.dietaryCompatible)) return 1;

    // Luego disponibles (aunque no compatibles)
    if (a.isAvailable && !b.isAvailable) return -1;
    if (b.isAvailable && !a.isAvailable) return 1;

    // Luego compatibles
    if (a.dietaryCompatible && !b.dietaryCompatible) return -1;
    if (b.dietaryCompatible && !a.dietaryCompatible) return 1;

    // Finalmente por rating y uso
    const aScore = (a.rating || 0) * 10 + a.usageCount;
    const bScore = (b.rating || 0) * 10 + b.usageCount;
    return bScore - aScore;
  });

  return {
    ingredient: ingredientName,
    substitutions: smartSubs,
    hasAvailableOption: smartSubs.some(s => s.isAvailable && s.dietaryCompatible)
  };
}

/**
 * Buscar sustituciones para múltiples ingredientes
 */
export async function findSmartSubstitutionsForMany(
  ingredients: string[],
  dietaryTags: DietaryTag[] = []
): Promise<SubstitutionResult[]> {
  const results = await Promise.all(
    ingredients.map(ing => findSmartSubstitutions(ing, dietaryTags))
  );

  // Filtrar solo los que tienen sustituciones
  return results.filter(r => r.substitutions.length > 0);
}

/**
 * Registrar uso de una sustitución (para aprendizaje)
 */
export async function recordSubstitutionUse(
  original: string,
  substitute: string,
  rating?: number
): Promise<void> {
  try {
    await supabase.from('substitution_history').insert({
      original: original.toLowerCase(),
      substitute: substitute.toLowerCase(),
      rating: rating || 3,
      used_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error recording substitution use:', error);
  }
}

/**
 * Limpiar cache de inventario
 */
export function clearSubstitutionCache(): void {
  inventoryCache = null;
  inventoryCacheTime = 0;
}

/**
 * Obtener sugerencias de sustitución considerando inventario completo
 * Útil para planificación de compras
 */
export async function suggestShoppingBasedOnSubstitutions(
  missingIngredients: string[],
  dietaryTags: DietaryTag[] = []
): Promise<{ canSubstitute: string[]; needToBuy: string[] }> {
  const canSubstitute: string[] = [];
  const needToBuy: string[] = [];

  for (const ingredient of missingIngredients) {
    const result = await findSmartSubstitutions(ingredient, dietaryTags);

    if (result.hasAvailableOption) {
      canSubstitute.push(ingredient);
    } else {
      needToBuy.push(ingredient);
    }
  }

  return { canSubstitute, needToBuy };
}
