/**
 * Sistema de conversión y normalización de unidades
 * Para matching inteligente de ingredientes
 */

// Tipos de unidades soportadas
export type UnitType = 'weight' | 'volume' | 'count' | 'unknown';

export interface ParsedQuantity {
  value: number;
  unit: string;
  unitType: UnitType;
  originalString: string;
}

export interface NormalizedQuantity {
  value: number;           // Valor normalizado (gramos, ml, o unidades)
  baseUnit: string;        // 'g', 'ml', 'unid'
  unitType: UnitType;
  originalValue: number;
  originalUnit: string;
}

// Factores de conversión a unidades base
const WEIGHT_TO_GRAMS: Record<string, number> = {
  'kg': 1000,
  'kilo': 1000,
  'kilos': 1000,
  'kilogramo': 1000,
  'kilogramos': 1000,
  'g': 1,
  'gr': 1,
  'gramo': 1,
  'gramos': 1,
  'lb': 453.592,
  'libra': 453.592,
  'libras': 453.592,
  'oz': 28.3495,
  'onza': 28.3495,
  'onzas': 28.3495,
};

const VOLUME_TO_ML: Record<string, number> = {
  'l': 1000,
  'lt': 1000,
  'litro': 1000,
  'litros': 1000,
  'ml': 1,
  'mililitro': 1,
  'mililitros': 1,
  'taza': 240,
  'tazas': 240,
  'cup': 240,
  'cups': 240,
  'cda': 15,
  'cucharada': 15,
  'cucharadas': 15,
  'cdta': 5,
  'cucharadita': 5,
  'cucharaditas': 5,
  'tbsp': 15,
  'tsp': 5,
};

const COUNT_UNITS: string[] = [
  'unid', 'unidad', 'unidades',
  'pza', 'pieza', 'piezas',
  'rebanada', 'rebanadas',
  'rodaja', 'rodajas',
  'diente', 'dientes',
  'rama', 'ramas',
  'hoja', 'hojas',
  'manojo', 'manojos',
  'racimo', 'racimos',
  'lata', 'latas',
  'bolsa', 'bolsas',
  'paquete', 'paquetes',
  'botella', 'botellas',
  'tarro', 'tarros',
  'sobre', 'sobres',
  'porcion', 'porciones', 'porción',
  'filete', 'filetes',
  'loncha', 'lonchas',
  'tajada', 'tajadas',
];

/**
 * Parsear una cantidad string a sus componentes
 * Ejemplos: "2.5 kg" -> { value: 2.5, unit: "kg", ... }
 *           "280g" -> { value: 280, unit: "g", ... }
 *           "3 unid grandes" -> { value: 3, unit: "unid", ... }
 */
export function parseQuantity(quantityStr: string): ParsedQuantity {
  if (!quantityStr || typeof quantityStr !== 'string') {
    return {
      value: 0,
      unit: '',
      unitType: 'unknown',
      originalString: quantityStr || ''
    };
  }

  const original = quantityStr.trim();
  const normalized = original.toLowerCase();

  // Extraer número (soporta decimales con . o ,)
  const numberMatch = normalized.match(/[\d]+[.,]?[\d]*/);
  const value = numberMatch
    ? parseFloat(numberMatch[0].replace(',', '.'))
    : 1; // Default a 1 si no hay número

  // Extraer unidad (todo después del número, primera palabra)
  const afterNumber = normalized.replace(/[\d]+[.,]?[\d]*\s*/, '').trim();
  const unitMatch = afterNumber.match(/^[\wáéíóúñ]+/i);
  const unit = unitMatch ? unitMatch[0] : '';

  // Determinar tipo de unidad
  let unitType: UnitType = 'unknown';

  if (WEIGHT_TO_GRAMS[unit]) {
    unitType = 'weight';
  } else if (VOLUME_TO_ML[unit]) {
    unitType = 'volume';
  } else if (COUNT_UNITS.includes(unit) || !unit) {
    unitType = 'count';
  }

  return {
    value,
    unit,
    unitType,
    originalString: original
  };
}

/**
 * Normalizar cantidad a unidad base
 * Peso -> gramos, Volumen -> ml, Conteo -> unidades
 */
export function normalizeQuantity(quantityStr: string): NormalizedQuantity {
  const parsed = parseQuantity(quantityStr);

  let normalizedValue = parsed.value;
  let baseUnit = 'unid';

  if (parsed.unitType === 'weight') {
    const factor = WEIGHT_TO_GRAMS[parsed.unit] || 1;
    normalizedValue = parsed.value * factor;
    baseUnit = 'g';
  } else if (parsed.unitType === 'volume') {
    const factor = VOLUME_TO_ML[parsed.unit] || 1;
    normalizedValue = parsed.value * factor;
    baseUnit = 'ml';
  } else {
    // Count o unknown - mantener como unidades
    normalizedValue = parsed.value;
    baseUnit = 'unid';
  }

  return {
    value: normalizedValue,
    baseUnit,
    unitType: parsed.unitType,
    originalValue: parsed.value,
    originalUnit: parsed.unit
  };
}

/**
 * Comparar dos cantidades y determinar si hay suficiente
 * Returns: { hasEnough, percentAvailable, availableNormalized, requiredNormalized }
 */
export interface QuantityComparison {
  hasEnough: boolean;
  percentAvailable: number;
  availableNormalized: number;
  requiredNormalized: number;
  compatible: boolean;  // Si las unidades son comparables
  message?: string;
}

export function compareQuantities(
  availableStr: string,
  requiredStr: string,
  threshold: number = 0.8  // 80% por defecto es "suficiente"
): QuantityComparison {
  const available = normalizeQuantity(availableStr);
  const required = normalizeQuantity(requiredStr);

  // Si ambos son del mismo tipo, podemos comparar directamente
  if (available.unitType === required.unitType ||
      available.unitType === 'unknown' ||
      required.unitType === 'unknown') {

    // Caso especial: si el requerido es 0, siempre hay suficiente
    if (required.value === 0) {
      return {
        hasEnough: true,
        percentAvailable: 100,
        availableNormalized: available.value,
        requiredNormalized: 0,
        compatible: true
      };
    }

    const percent = (available.value / required.value) * 100;
    const hasEnough = percent >= (threshold * 100);

    return {
      hasEnough,
      percentAvailable: Math.min(100, Math.round(percent)),
      availableNormalized: available.value,
      requiredNormalized: required.value,
      compatible: true
    };
  }

  // Unidades incompatibles - no podemos comparar con certeza
  // Pero si hay cantidad disponible > 0, asumimos que probablemente hay suficiente
  return {
    hasEnough: available.value > 0,
    percentAvailable: available.value > 0 ? 100 : 0,
    availableNormalized: available.value,
    requiredNormalized: required.value,
    compatible: false,
    message: `Unidades incompatibles: ${available.baseUnit} vs ${required.baseUnit}`
  };
}

/**
 * Formatear cantidad para mostrar al usuario
 */
export function formatQuantity(value: number, unit: string): string {
  // Redondear a 2 decimales máximo
  const rounded = Math.round(value * 100) / 100;

  // Si es entero, no mostrar decimales
  const displayValue = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);

  return unit ? `${displayValue} ${unit}` : displayValue;
}

/**
 * Convertir cantidad de una unidad a otra (si es posible)
 */
export function convertQuantity(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const fromLower = fromUnit.toLowerCase();
  const toLower = toUnit.toLowerCase();

  // Mismo tipo de unidad
  if (fromLower === toLower) return value;

  // Peso a peso
  if (WEIGHT_TO_GRAMS[fromLower] && WEIGHT_TO_GRAMS[toLower]) {
    const grams = value * WEIGHT_TO_GRAMS[fromLower];
    return grams / WEIGHT_TO_GRAMS[toLower];
  }

  // Volumen a volumen
  if (VOLUME_TO_ML[fromLower] && VOLUME_TO_ML[toLower]) {
    const ml = value * VOLUME_TO_ML[fromLower];
    return ml / VOLUME_TO_ML[toLower];
  }

  // No se puede convertir
  return null;
}

/**
 * Estimar si una cantidad de inventario es "baja" basada en consumo típico
 * @param current - Cantidad actual
 * @param typical - Cantidad típica de compra/uso
 * @param lowThreshold - Porcentaje considerado bajo (default 20%)
 */
export function isLowStock(
  currentStr: string,
  typicalStr: string,
  lowThreshold: number = 0.2
): boolean {
  const comparison = compareQuantities(currentStr, typicalStr, lowThreshold);
  return !comparison.hasEnough;
}

/**
 * Calcular cuánto falta para llegar a una cantidad objetivo
 */
export function calculateNeeded(
  currentStr: string,
  targetStr: string
): { needed: number; unit: string } | null {
  const current = normalizeQuantity(currentStr);
  const target = normalizeQuantity(targetStr);

  if (current.unitType !== target.unitType &&
      current.unitType !== 'unknown' &&
      target.unitType !== 'unknown') {
    return null; // Incompatible
  }

  const needed = Math.max(0, target.value - current.value);
  return {
    needed,
    unit: target.baseUnit
  };
}

// Exportar constantes para uso externo si es necesario
export const SUPPORTED_WEIGHT_UNITS = Object.keys(WEIGHT_TO_GRAMS);
export const SUPPORTED_VOLUME_UNITS = Object.keys(VOLUME_TO_ML);
export const SUPPORTED_COUNT_UNITS = COUNT_UNITS;
