/**
 * Utilidades compartidas para la aplicación
 */

/**
 * Combina clases de Tailwind de forma segura
 * Similar a clsx/classnames pero más simple
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Unidades comunes para productos del mercado
 */
export const COMMON_UNITS = [
  'kg', 'g', 'lb', 'unid', 'bolsa', 'paquete',
  'botella', 'lata', 'tarro', 'litro', 'ml', 'manojo', 'racimo'
] as const;

export type CommonUnit = typeof COMMON_UNITS[number];

/**
 * Formatea una fecha en español
 */
export function formatDateES(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formatea una fecha corta en español
 */
export function formatDateShortES(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Debounce helper
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Capitaliza la primera letra
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
