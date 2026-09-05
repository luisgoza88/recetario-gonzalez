import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHouseholdFetch } from "./household-fetch";
import type { Database } from "@/types/database.types";

/**
 * Creates a Supabase client that inherits the authenticated user's session
 * from cookies. All queries respect RLS policies.
 *
 * Use this in API routes and server components for user-scoped operations.
 */
export async function createAuthenticatedClient(householdId?: string) {
  const cookieStore = await cookies();
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(householdId
        ? { global: { fetch: createHouseholdFetch(() => householdId) } }
        : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore errors in read-only contexts (e.g., Server Components)
          }
        },
      },
    },
  );
}

/**
 * Creates a Supabase client with the service role key.
 * This bypasses ALL RLS policies.
 */
export function createServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/**
 * Backward-compatible alias for storage operations.
 */
export function createStorageAdminClient() {
  return createServiceRoleClient();
}

/** Select one active household; never silently combine multiple memberships. */
export async function resolveActiveHouseholdId() {
  const cookieStore = await cookies();
  const requestedId = cookieStore.get("currentHouseholdId")?.value;
  const db = await createAuthenticatedClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Authentication required");
  let query = db
    .from("household_memberships")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (requestedId) query = query.eq("household_id", requestedId);
  const { data, error } = await query.limit(2);
  if (error || data?.length !== 1 || !data[0].household_id)
    throw new Error("Selecciona un hogar válido");
  return data[0].household_id;
}

export async function createHouseholdClient() {
  return createAuthenticatedClient(await resolveActiveHouseholdId());
}
