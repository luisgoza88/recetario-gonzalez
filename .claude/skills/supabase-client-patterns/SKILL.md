---
name: supabase-client-patterns
description: "Supabase clients en recetario-app: cuando usar createBrowserClient (cookies) vs createClient (localStorage) vs createServerClient. Singleton pattern para evitar Multiple GoTrueClient warnings y race conditions de auth. .single() vs .maybeSingle() decision tree. Trim defensivo en env vars."
globs:
  - "src/lib/supabase/**"
  - "src/contexts/AuthContext.tsx"
  - "src/lib/**/*-service.ts"
  - "src/lib/**/*-learning.ts"
  - "src/lib/menu-tasks-integration.ts"
---

# Supabase Client Patterns

Lecciones de bugs reales encontrados en producción.

---

## 🎯 Decision tree: que cliente usar?

```
¿Donde se ejecuta tu codigo?
│
├── Browser (componente React, hook, lib client)
│   └── ✅ Importar singleton: import { supabase } from "@/lib/supabase/client"
│       (createBrowserClient con cookies — comparte sesion con middleware)
│
├── Server Component (app/page.tsx, layout.tsx) o API route normal
│   └── ✅ await createAuthenticatedClient() de "@/lib/supabase/server"
│       (createServerClient con cookies — respeta RLS del usuario)
│
├── API route privilegiada (cron, webhooks server-only, ops admin)
│   └── ✅ createServiceRoleClient() de "@/lib/supabase/server"
│       (service role key — BYPASEA RLS, usar con MUCHO cuidado)
│
└── Pagina publica server-rendered (ej: /r/[slug])
    └── ✅ createClient(URL, ANON_KEY) directo
        (acceso anonimo limitado por RLS)
```

---

## ⚠️ Anti-patron 1: Multiple GoTrueClient instances

### El bug

Crear `createClient()` propio en cada lib del lado cliente genera 2+
instancias de GoTrueClient leyendo el mismo `localStorage` key. Causa:

- Warning: "Multiple GoTrueClient instances detected"
- Race condition: el cliente "secundario" no usa cookies, no tiene JWT
- Resultado: queries fallan con 401/406 cuando deberian funcionar

### ❌ MAL — encontrado en 4 archivos en producción

```typescript
// src/lib/menu-tasks-integration.ts (BUG)
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey); // ← crea 2da instancia
```

### ✅ BIEN — importar singleton

```typescript
// src/lib/menu-tasks-integration.ts (FIX)
import { supabase } from "@/lib/supabase/client"; // ← singleton compartido
```

### Cómo auditar

```bash
# Encontrar archivos del cliente que crean su propio cliente
grep -rn "from \"@supabase/supabase-js\"" src \
  --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v "lib/supabase/" \
  | grep -v "app/api/" \
  | grep -v "__tests__"
```

Si encuentra resultados en lib del cliente → cambiar a singleton.

---

## ⚠️ Anti-patron 2: `.single()` vs `.maybeSingle()`

### El bug

`.single()` retorna error 406 (Not Acceptable) con `PGRST116: "0 rows"`
cuando no hay filas. Esto aparece como error en consola del browser
incluso cuando es comportamiento esperado (ej: tabla aun vacia).

### Decision tree

```
¿Esperas EXACTAMENTE 1 fila siempre?
│
├── SI (ej: WHERE id = '<uuid_garantizado>')
│   └── ✅ .single() — fallar es legitimo (data corrupta)
│
└── NO (puede haber 0 o 1 fila)
    └── ✅ .maybeSingle() — devuelve null sin error si 0 rows
```

### ❌ MAL — encontrado en budget-service.ts (BUG)

```typescript
// Si no hay presupuesto creado aun, esto era 406 en consola
const { data, error } = await supabase
  .from("budgets")
  .select("*")
  .eq("period_type", "weekly")
  .single(); // ← lanza 406 con 0 rows
```

### ✅ BIEN

```typescript
const { data } = await supabase
  .from("budgets")
  .select("*")
  .eq("period_type", "weekly")
  .maybeSingle(); // ← devuelve null limpio

if (!data) return null; // sin error
```

### Tambien aplicado a (ya arreglado)

- `AuthContext.loadUserProfile` — perfil podria no existir aun
- `AICommandCenter.fetchData` — trust record podria no existir
- `budget-service.getCurrentBudget` — presupuesto podria no existir

### Donde mantener `.single()`

```typescript
// OK — esperamos exactamente 1 fila por PK
const { data } = await supabase
  .from("recipes")
  .select("*")
  .eq("id", recipeId) // PK garantizada
  .single();
```

---

## ⚠️ Anti-patron 3: env vars con trailing newline

### El bug

Vercel UI a veces guarda el value de una env var con `\n` al final si
copiaste desde otro sitio con linebreak. El cliente realtime de Supabase
URL-encoda eso como `%0A`, generando:

```
WebSocket connection to 'wss://.../realtime/v1/websocket?apikey=eyJ...AK7Q%0A&vsn=1.0.0' failed
                                                                       ^^^ JWT invalido
```

### ✅ Fix defensivo

```typescript
// src/lib/supabase/client.ts
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
```

---

## ⚠️ Anti-patron 4: usar `createClient` (localStorage) en cliente nuevo

### El bug

Si el cliente del browser usa `createClient` de `@supabase/supabase-js`
(default localStorage), el middleware del server (que lee cookies via
`createServerClient` de `@supabase/ssr`) **no encuentra la sesion** y
devuelve 401 en TODOS los endpoints autenticados.

### ✅ Regla

**En el browser, SIEMPRE usar `createBrowserClient` de `@supabase/ssr`**
(guarda en cookies que el middleware puede leer).

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"; // ✅
// NO: import { createClient } from "@supabase/supabase-js"; ❌
```

---

## Estructura de los 3 helpers en recetario-app

### `src/lib/supabase/client.ts` (browser)

```typescript
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
).trim();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
```

### `src/lib/supabase/server.ts` (server)

```typescript
// Para Server Components y API routes con sesion del usuario
export async function createAuthenticatedClient() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON_KEY, { cookies: { ... } });
}

// Para operaciones privilegiadas (bypass RLS)
export function createServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
```

### `src/middleware.ts` (edge)

```typescript
const supabase = createServerClient(URL, ANON_KEY, {
  cookies: {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      /* set en request y response */
    },
  },
});
const {
  data: { user },
} = await supabase.auth.getUser(); // mas seguro que getSession
```

---

## Checklist antes de crear archivo nuevo que querya Supabase

- [ ] Si es del lado cliente: importo `supabase` de `@/lib/supabase/client` (singleton)
- [ ] Si es API route con sesion: uso `createAuthenticatedClient()`
- [ ] Si es API route privilegiada: uso `createServiceRoleClient()` y verifico la env var existe
- [ ] Uso `.maybeSingle()` salvo que sea PK garantizada
- [ ] No creo `createClient()` propio en codigo del browser
