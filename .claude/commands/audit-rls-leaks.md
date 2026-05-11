---
description: "Auditoria de fugas RLS: verifica que NINGUNA tabla sensible devuelva datos a la anon key. Detecta el antipatron auth.uid() IS NULL y otras vulnerabilidades comunes."
---

# /user:audit-rls-leaks

Audita la seguridad de RLS en la DB de Supabase ejecutando queries reales con
la anon key contra todas las tablas sensibles. Si alguna devuelve filas
**sin sesion autenticada**, hay una vulnerabilidad.

## Cuando usarlo

- Antes de un deploy a produccion despues de tocar policies
- Despues de aplicar una nueva migration con RLS
- Como parte de auditoria de seguridad regular
- Cuando se reporta un bug de "veo datos que no deberia"

## Que hace

1. Obtiene la anon key del proyecto via MCP
2. Para cada tabla sensible, hace `GET /rest/v1/<tabla>?select=*&limit=1` con la anon key
3. Reporta:
   - ✅ Tabla devuelve `[]` → segura
   - ❌ Tabla devuelve filas → **VULNERABILIDAD CRITICA**
4. Si encuentra fugas, muestra las policies sospechosas con `auth.uid() IS NULL`

## Tablas que audita por defecto

- `households`
- `users`
- `user_profiles`
- `household_memberships`
- `household_ai_trust`
- `recipes`
- `meal_feedback`
- `inventory`
- `cleaning_supplies`
- `employee_checkins`
- `inspection_reports`
- `quick_routine_logs`
- `ai_action_queue`
- `ai_audit_log`
- `budgets`
- `purchase_patterns`
- `shopping_list_assignments`
- `subscriptions`
- `recipe_favorites`
- `push_subscriptions`

## Implementacion

```bash
#!/bin/bash
set -e

PROJECT_ID="snyelpbcfbzaxadrtxpa"
URL="https://${PROJECT_ID}.supabase.co/rest/v1"

# Obtener anon key via MCP de Supabase
# (mcp__fd25883d-...__get_publishable_keys con project_id)
ANON_KEY="<obtenida-por-mcp>"

TABLES=(
  households users user_profiles household_memberships household_ai_trust
  recipes meal_feedback inventory cleaning_supplies employee_checkins
  inspection_reports quick_routine_logs ai_action_queue ai_audit_log
  budgets purchase_patterns shopping_list_assignments subscriptions
  recipe_favorites push_subscriptions
)

LEAKS=0
echo "=== RLS Leak Audit ==="
echo

for TABLE in "${TABLES[@]}"; do
  RESPONSE=$(curl -s "$URL/$TABLE?select=*&limit=1" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY")

  if [ "$RESPONSE" = "[]" ]; then
    echo "✅ $TABLE: secure (no anon access)"
  elif echo "$RESPONSE" | grep -q "code"; then
    # Es un error, esta protegida
    echo "✅ $TABLE: secure (returns error)"
  else
    echo "❌ $TABLE: LEAKING DATA TO ANON"
    echo "   Response: $(echo "$RESPONSE" | head -c 200)"
    LEAKS=$((LEAKS + 1))
  fi
done

echo
if [ $LEAKS -gt 0 ]; then
  echo "🚨 $LEAKS table(s) leaking data. Run this SQL to find the bad policies:"
  cat <<'EOF'
SELECT
  c.relname AS table_name,
  p.polname,
  pg_get_expr(p.polqual, p.polrelid) AS using_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_expr(p.polqual, p.polrelid) LIKE '%auth.uid() IS NULL%';
EOF
else
  echo "✅ All tables secure. No anon leaks detected."
fi
```

## Output esperado (sin fugas)

```
=== RLS Leak Audit ===

✅ households: secure (no anon access)
✅ users: secure (no anon access)
✅ user_profiles: secure (no anon access)
✅ household_memberships: secure (no anon access)
... etc ...

✅ All tables secure. No anon leaks detected.
```

## Output con vulnerabilidad

```
✅ households: secure
❌ users: LEAKING DATA TO ANON
   Response: [{"id":"123",...}]

🚨 1 table(s) leaking data. Run this SQL to find the bad policies:
SELECT c.relname, p.polname, pg_get_expr(p.polqual, p.polrelid)
FROM pg_policy p ...
WHERE pg_get_expr(p.polqual, p.polrelid) LIKE '%auth.uid() IS NULL%';
```

## Que hacer si encuentra fugas

1. Identificar las policies vulnerables con la SQL del output
2. DROP las policies con `auth.uid() IS NULL` en el USING
3. Asegurarse de que existe una policy "buena" usando `is_household_member()` o equivalente
4. Re-correr este audit hasta que muestre todo verde
5. Ver tambien: skill `rls-security-patterns` para los patrones correctos

## Relacionado

- Skill: `rls-security-patterns`
- Agent: `recetario-security`
- Migration de referencia: `harden_rls_drop_anon_escape_policies`
