/**
 * Porciones por miembro del hogar.
 *
 * Reemplaza el modelo hardcodeado `{ luis, mariana }` que asumía dos personas
 * con nombre propio. Ahora una receta guarda un mapa `miembro → cantidad`, y
 * la app resuelve las etiquetas desde el perfil del hogar.
 *
 * COMPATIBILIDAD: los datos existentes (recetas en Supabase y los catálogos
 * estáticos `expanded-recipes.ts` / `regional-colombian-recipes.ts`) traen las
 * claves literales "luis" y "mariana". Como `{ luis, mariana }` ya es un
 * `Record<string, string>` válido, esos datos siguen leyéndose sin migración:
 * lo único que cambia es que la UI ya no asume esos dos nombres.
 */

import type { Ingredient, PersonPortions } from "@/types";

/**
 * Una porción lista para pintar: la clave con la que está guardada, la
 * etiqueta visible y la cantidad.
 */
export interface ResolvedPortion {
  /** Clave de almacenamiento (ej. "luis", o el nombre del miembro). */
  key: string;
  /** Etiqueta para mostrar (ej. "Luis"). */
  label: string;
  /** Cantidad tal cual está guardada (ej. "280g", "2 tazas"). */
  amount: string;
}

/** Borrador editable de un miembro y su consumo habitual. */
export interface PortionMemberDraft {
  name: string;
  portions: number;
}

/** Nombre inicial usado al ampliar un hogar que aún no configuró miembros. */
export function defaultPortionMemberName(index: number): string {
  if (index === 0) return "Luis";
  if (index === 1) return "Mariana";
  return `Miembro ${index + 1}`;
}

/**
 * Ajusta una lista editable al tamaño del hogar conservando los miembros
 * existentes y agregando borradores estables al final.
 */
export function resizePortionMembers(
  members: PortionMemberDraft[],
  size: number,
): PortionMemberDraft[] {
  return Array.from({ length: size }, (_, index) =>
    members[index]
      ? { ...members[index] }
      : { name: defaultPortionMemberName(index), portions: 1 },
  );
}

/**
 * Claves legacy del hogar original. Se usan SOLO para que las recetas viejas
 * muestren un nombre bonito en vez de "luis" en minúscula. No se usan para
 * decidir nada de lógica.
 */
const LEGACY_LABELS: Record<string, string> = {
  luis: "Luis",
  mariana: "Mariana",
};

/** Convierte una clave de almacenamiento en etiqueta visible. */
export function portionLabel(
  key: string,
  portionsConfig?: Record<string, number>,
): string {
  // Si el hogar tiene un miembro registrado con esa clave, gana su nombre.
  if (portionsConfig) {
    const match = Object.keys(portionsConfig).find(
      (member) => member.toLowerCase() === key.toLowerCase(),
    );
    if (match) return match;
  }
  if (LEGACY_LABELS[key]) return LEGACY_LABELS[key];
  // Fallback: capitalizar la clave.
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Normaliza el mapa de porciones de un ingrediente, aceptando tanto el modelo
 * nuevo (`per_person`) como el legacy (`luis`/`mariana` en la raíz).
 */
export function ingredientPortions(ingredient: Ingredient): PersonPortions {
  if (ingredient.per_person && Object.keys(ingredient.per_person).length > 0) {
    return ingredient.per_person;
  }
  const legacy: PersonPortions = {};
  if (ingredient.luis) legacy.luis = ingredient.luis;
  if (ingredient.mariana) legacy.mariana = ingredient.mariana;
  return legacy;
}

/**
 * Devuelve las porciones de un ingrediente listas para pintar, en orden
 * estable (el del perfil del hogar si existe; alfabético si no).
 */
export function resolveIngredientPortions(
  ingredient: Ingredient,
  portionsConfig?: Record<string, number>,
): ResolvedPortion[] {
  return resolvePortions(ingredientPortions(ingredient), portionsConfig);
}

/** Igual que `resolveIngredientPortions` pero para un mapa suelto. */
export function resolvePortions(
  portions: PersonPortions | undefined,
  portionsConfig?: Record<string, number>,
): ResolvedPortion[] {
  if (!portions) return [];

  const entries = Object.entries(portions).filter(
    ([, amount]) => typeof amount === "string" && amount.trim().length > 0,
  );

  // Orden estable: primero los miembros en el orden del perfil del hogar,
  // luego el resto alfabéticamente. Sin esto, el orden de las columnas
  // cambiaría entre recetas según cómo se serializó el JSON.
  const configOrder = portionsConfig ? Object.keys(portionsConfig) : [];
  const rank = (key: string) => {
    const idx = configOrder.findIndex(
      (member) => member.toLowerCase() === key.toLowerCase(),
    );
    return idx === -1 ? configOrder.length : idx;
  };

  entries.sort(([a], [b]) => {
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.localeCompare(b, "es");
  });

  return entries.map(([key, amount]) => ({
    key,
    label: portionLabel(key, portionsConfig),
    amount,
  }));
}

/**
 * Miembros del hogar para los que hay que pedir cantidad al crear/editar una
 * receta. Sale del perfil del hogar; si está vacío, cae a las claves legacy
 * para no romper la edición de recetas existentes.
 */
export function portionMemberKeys(
  portionsConfig?: Record<string, number>,
): string[] {
  const configured = portionsConfig ? Object.keys(portionsConfig) : [];
  if (configured.length > 0) return configured;
  return ["luis", "mariana"];
}

/** Crea un ingrediente vacío con una entrada por cada miembro del hogar. */
export function emptyIngredient(
  portionsConfig?: Record<string, number>,
): Ingredient {
  const per_person: PersonPortions = {};
  for (const key of portionMemberKeys(portionsConfig)) {
    per_person[key] = "";
  }
  return { name: "", total: "", per_person };
}

/**
 * Una cantidad representativa del ingrediente, para cuando solo se necesita
 * "cuánto" sin desglosar por persona (listas de compras, matching de
 * inventario, vista pública compartida).
 *
 * Prioriza el total del hogar; si no hay, toma la primera porción disponible.
 */
export function representativeQuantity(
  ingredient: Ingredient,
  fallback = "",
): string {
  if (ingredient.total?.trim()) return ingredient.total;
  const first = Object.values(ingredientPortions(ingredient)).find((v) =>
    v?.trim(),
  );
  return first ?? fallback;
}

/**
 * Suma textual de porciones para mostrar "el total" cuando la receta no lo
 * trae explícito. Devuelve null si las cantidades no son numéricas
 * comparables (ej. "al gusto"), en cuyo caso la UI debe omitir el total.
 */
export function sumPortions(portions: PersonPortions | undefined): string | null {
  const values = Object.values(portions ?? {});
  if (values.length === 0) return null;

  let total = 0;
  let unit = "";
  for (const raw of values) {
    const match = raw?.trim().match(/^([\d.,]+)\s*(.*)$/);
    if (!match) return null;
    const num = parseFloat(match[1].replace(",", "."));
    if (Number.isNaN(num)) return null;
    const thisUnit = match[2].trim();
    if (unit && thisUnit && thisUnit !== unit) return null;
    if (thisUnit) unit = thisUnit;
    total += num;
  }

  const rounded = Math.round(total * 100) / 100;
  return unit ? `${rounded} ${unit}` : String(rounded);
}
