---
name: rls-security-patterns
description: "RLS (Row-Level Security) en Supabase: anti-patrones que causan recursion infinita o fugas a anon, helpers SECURITY DEFINER seguros (is_household_member, has_household_role), auditoria con anon key. CRITICO antes de tocar cualquier policy."
globs:
  - "supabase/migrations/**/*.sql"
  - "src/**/*RLS*"
  - "src/lib/services/household-service.ts"
---

# RLS Security Patterns para recetario-app

Lecciones críticas aprendidas resolviendo 2 vulnerabilidades reales en producción.
**LEER ANTES de crear o modificar cualquier policy de RLS.**

---

## ⚠️ Anti-patron 1: RECURSION INFINITA en policies que se referencian a si mismas

### El bug

Una policy en `household_memberships` que hace `SELECT FROM household_memberships`
dentro de su `USING` clause genera **recursion infinita en cada query**, devolviendo
500 con error literal `infinite recursion detected in policy for relation`.

### ❌ MAL — causaba el bug (encontrado en producción)

```sql
-- household_memberships.memberships_select_policy
USING (
  household_id IN (
    SELECT household_memberships_1.household_id
    FROM household_memberships household_memberships_1
    WHERE household_memberships_1.user_id = auth.uid()
  )
)
```

Cuando PostgREST intenta evaluar la policy para retornar filas de
`household_memberships`, dispara la subquery a `household_memberships`, que
re-evalua la misma policy → loop infinito.

### ✅ BIEN — usar helper SECURITY DEFINER

```sql
-- Helper se ejecuta como su owner (postgres), saltea las RLS
CREATE OR REPLACE FUNCTION is_household_member(p_household_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid()
      AND household_id = p_household_id
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Policy usa el helper, NO recursa
CREATE POLICY "memberships_select_household" ON household_memberships FOR SELECT
  USING (is_household_member(household_id));
```

### Tablas afectadas en recetario-app (ya arregladas)

- `household_memberships` (root cause de la cascada)
- `user_profiles` — referenciaba memberships en su SELECT policy
- `ai_action_queue` — referenciaba memberships en su SELECT policy

### Como detectar el patron

```bash
# Buscar policies sospechosas en SQL
grep -rE "FROM (household_memberships|users)" supabase/migrations/*.sql | grep -i "USING"

# Verificar via SQL en runtime
SELECT polname, pg_get_expr(polqual, polrelid)
FROM pg_policy
WHERE pg_get_expr(polqual, polrelid) LIKE '%' || tablename || '%'
  AND polrelid = ('public.' || tablename)::regclass;
```

---

## 🚨 Anti-patron 2: ESCAPE `auth.uid() IS NULL` que permite acceso anonimo

### El bug

Policies legacy en `households`, `users`, `households` con un OR que permitia
acceso cuando `auth.uid()` era null. **Resultado: visitor anonimo veia datos
del primer hogar de la DB.**

### ❌ MAL — vulnerabilidad CRITICA

```sql
-- households_select_policy (LEGACY - ELIMINADA)
USING (
  (auth.uid() IS NULL) OR user_has_household_access(id)
  --  ^^^^^^^^^^^^^^^^^ permite acceso sin sesion
)
```

Combinado con codigo cliente que hacia `SELECT * FROM households LIMIT 1`
sin verificar auth, cualquier visitor cargaba "Mi Hogar" en su pantalla.

### ✅ BIEN — sin escape, solo miembros autenticados

```sql
CREATE POLICY "household_members_select_households" ON households FOR SELECT
  USING (is_household_member(id));
```

### Tablas afectadas en recetario-app (ya arregladas)

| Tabla        | Policy vieja eliminada                                 |
| ------------ | ------------------------------------------------------ |
| `households` | `households_select_policy`, `households_update_policy` |
| `users`      | `users_select_policy`, `users_update_policy`           |

### Como detectar el patron

```sql
-- Encuentra TODAS las policies con escape anonimo
SELECT
  c.relname AS table_name,
  p.polname,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_expr(p.polqual, p.polrelid) LIKE '%auth.uid() IS NULL%';
```

Si esta query devuelve filas → vulnerabilidad. DROP esas policies.

---

## ✅ Helpers SECURITY DEFINER que existen en recetario-app

Usar SIEMPRE estos en policies, NUNCA escribir subqueries directas a `household_memberships`.

### `is_household_member(uuid) -> boolean`

```sql
-- Retorna true si auth.uid() es miembro activo del household
USING (is_household_member(household_id))
```

### `has_household_role(uuid, text[]) -> boolean`

```sql
-- Retorna true si auth.uid() es miembro CON uno de los roles dados
USING (has_household_role(household_id, ARRAY['admin']))
USING (has_household_role(household_id, ARRAY['admin', 'familia']))
```

### `user_has_household_access(uuid) -> boolean`

```sql
-- Alias mas viejo, equivalente a is_household_member
-- (preferir is_household_member en codigo nuevo)
```

---

## Patron canonico para tabla nueva con household_id

```sql
CREATE TABLE public.mi_tabla (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  -- ... resto de columnas
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mi_tabla_household ON public.mi_tabla(household_id);

ALTER TABLE public.mi_tabla ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier miembro del household
CREATE POLICY "mi_tabla_select_members" ON public.mi_tabla FOR SELECT
  USING (is_household_member(household_id));

-- Insert: cualquier miembro
CREATE POLICY "mi_tabla_insert_members" ON public.mi_tabla FOR INSERT
  WITH CHECK (is_household_member(household_id));

-- Update: cualquier miembro
CREATE POLICY "mi_tabla_update_members" ON public.mi_tabla FOR UPDATE
  USING (is_household_member(household_id));

-- Delete: solo admins
CREATE POLICY "mi_tabla_delete_admins" ON public.mi_tabla FOR DELETE
  USING (has_household_role(household_id, ARRAY['admin']));
```

---

## Auditoria con anon key (verificacion final OBLIGATORIA)

Antes de considerar segura una tabla, verificar que la anon key NO devuelve filas:

```bash
ANON="<anon-key-from-supabase-settings>"
URL="https://snyelpbcfbzaxadrtxpa.supabase.co/rest/v1"

# Cada tabla con household_id DEBE devolver [] sin sesion
for TABLE in households users user_profiles household_memberships \
             cleaning_supplies employee_checkins inspection_reports \
             quick_routine_logs ai_action_queue household_ai_trust; do
  echo -n "$TABLE: "
  curl -s "$URL/$TABLE?select=*&limit=1" \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
  echo
done
```

Si alguna tabla devuelve datos en vez de `[]` → **fuga de datos**, drop policies.

Hay un slash command que automatiza esto: `/user:audit-rls-leaks`

---

## Checklist antes de mergear migration con RLS

- [ ] Cada policy usa `is_household_member()` o `has_household_role()` — NO subquery directa a `household_memberships`
- [ ] Ninguna policy tiene `auth.uid() IS NULL` en el USING
- [ ] Si dropeo una policy vieja, verifique que las nuevas la cubren
- [ ] Probe via curl con anon key que la tabla devuelve `[]`
- [ ] No hay policy duplicada legacy + nueva (ambas se ejecutan, la mas restrictiva NO gana — la mas permisiva si)

---

## Referencias

- Supabase docs: https://supabase.com/docs/guides/auth/row-level-security
- Migrations relevantes en repo:
  - `drop_recursive_rls_policies` (drop policies recursivas)
  - `harden_rls_drop_anon_escape_policies` (drop policies con escape anon)
  - `create_employee_checkins_inspection_routine_tables` (ejemplo canonico)
