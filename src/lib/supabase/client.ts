import { createBrowserClient } from "@supabase/ssr";
import { createHouseholdFetch } from "./household-fetch";
import { createClient } from "@supabase/supabase-js";

// .trim() defensivo: si la env var en Vercel se pegó con un \n al final,
// el realtime websocket termina con apikey=...AK7Q%0A&vsn=1.0.0 y la
// conexión falla (JWT inválido). Trim previene eso.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();

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
    ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: createHouseholdFetch(() =>
            typeof window === "undefined"
              ? null
              : localStorage.getItem("currentHouseholdId"),
          ),
        },
      })
    : createClient("https://placeholder.supabase.co", "placeholder");

// Para uso en el servidor (helper, server.ts tiene la implementación canónica)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
