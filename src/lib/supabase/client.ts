import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Cliente Supabase del browser.
 *
 * IMPORTANTE: Usa `createBrowserClient` de `@supabase/ssr` (NO `createClient`
 * de `@supabase/supabase-js`) porque guarda la sesión en COOKIES en lugar
 * de localStorage. Esto es crítico para que el middleware del servidor
 * (que lee cookies via `createServerClient`) pueda validar la sesión y
 * setear el header `x-user-id` para los endpoints protegidos.
 *
 * Sin esto: cliente guarda sesión en localStorage, server no encuentra
 * cookie, todos los endpoints autenticados (chat IA, generate-recipe, etc.)
 * retornan 401 Unauthorized.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createClient("https://placeholder.supabase.co", "placeholder");

// Para uso en el servidor (helper, server.ts tiene la implementación canónica)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
