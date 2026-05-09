/**
 * SQL Escape Utilities
 *
 * Helpers para sanitizar inputs antes de usarlos en queries SQL/ILIKE.
 * Previene scraping de datos via wildcard injection.
 */

/**
 * Escapa caracteres especiales de ILIKE para Postgres: \, %, _
 * Usar siempre que el input del usuario se pase a un `.ilike()` de Supabase.
 *
 * @example
 * .ilike("name", `%${escapeIlike(userInput)}%`)
 */
export function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}
