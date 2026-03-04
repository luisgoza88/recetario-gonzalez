---
name: recetario-data-model
description: "Mapa de 40+ tablas, relaciones, RLS household pattern, RPCs, triggers, indices, tipos TypeScript."
globs:
  - "supabase/migrations/**"
  - "src/types/**"
  - "src/lib/supabase/**"
---

# Recetario Data Model

## Supabase Project

- **ID**: `snyelpbcfbzaxadrtxpa`
- **URL**: `https://snyelpbcfbzaxadrtxpa.supabase.co`

## Tablas por Categoria

### Recetas & Menu

| Tabla                | Columnas Clave                                                  | Descripcion              |
| -------------------- | --------------------------------------------------------------- | ------------------------ |
| `recipes`            | id, name, ingredients (JSONB), household_id                     | Recetas con ingredientes |
| `day_menu`           | id, day_number, breakfast_id, lunch_id, dinner_id, household_id | Menu rotativo 12 dias    |
| `ingredient_aliases` | id, recipe_name, market_name                                    | 51+ sinonimos            |
| `preparations`       | id, name, ingredients (JSONB)                                   | 17 preparaciones caseras |
| `generated_menus`    | id, menu_data, household_id                                     | Menus generados por IA   |
| `recipe_categories`  | id, name, slug                                                  | Categorias de recetas    |

### Mercado & Inventario

| Tabla              | Columnas Clave                                              |
| ------------------ | ----------------------------------------------------------- |
| `market_items`     | id, name, category, unit, household_id                      |
| `inventory`        | id, item_id (FK market_items), current_number, household_id |
| `market_checklist` | id, item_id, checked, household_id                          |
| `shopping_lists`   | id, items (JSONB), household_id                             |

### Presupuesto

| Tabla           | Columnas Clave                             |
| --------------- | ------------------------------------------ |
| `budgets`       | id, amount, period, household_id           |
| `purchases`     | id, item_name, amount, store, household_id |
| `price_history` | id, item_name, price, store, household_id  |

### Hogar

| Tabla                        | Columnas Clave                                     |
| ---------------------------- | -------------------------------------------------- |
| `spaces`                     | id, name, type, area, household_id                 |
| `space_types`                | id, name, category (interior/exterior)             |
| `home_employees`             | id, name, zones, schedule, household_id            |
| `task_templates`             | id, name, frequency, space_id, household_id        |
| `scheduled_tasks`            | id, template_id, assigned_to, status, household_id |
| `daily_completions`          | id, employee_id, date, household_id                |
| `intelligence_cache`         | id, key, value, household_id                       |
| `employee_space_assignments` | id, employee_id, space_id                          |

### Multi-Tenant & Auth

| Tabla                   | Columnas Clave                               |
| ----------------------- | -------------------------------------------- |
| `user_profiles`         | id (FK auth.users), display_name, avatar_url |
| `household_memberships` | id, user_id, household_id, role              |
| `household_invitations` | id, household_id, code, role, used           |

### AI

| Tabla                  | Columnas Clave                                                   |
| ---------------------- | ---------------------------------------------------------------- |
| `ai_audit_log`         | id, household_id, function_name, args, previous_state, new_state |
| `ai_action_queue`      | id, household_id, actions, status                                |
| `household_ai_trust`   | household_id, trust_level (1-5)                                  |
| `ai_function_registry` | id, name, risk_level, description                                |
| `ai_conversations`     | id, household_id, messages                                       |
| `ai_context`           | id, household_id, key, value                                     |

### Feedback

| Tabla                    | Columnas Clave                                 |
| ------------------------ | ---------------------------------------------- |
| `meal_feedback`          | id, recipe_name, rating, comment, household_id |
| `adjustment_suggestions` | id, recipe_id, suggestion, applied             |

### Rate Limiting

| Tabla         | Columnas Clave               |
| ------------- | ---------------------------- |
| `rate_limits` | id, key, count, window_start |

## RLS Pattern (Household-based)

```sql
-- Helper functions
CREATE OR REPLACE FUNCTION is_household_member(h_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid() AND household_id = h_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_household_role(h_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM household_memberships
    WHERE user_id = auth.uid() AND household_id = h_id AND role = required_role
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy pattern
CREATE POLICY "members_select" ON recipes
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "admin_delete" ON recipes
  FOR DELETE USING (has_household_role(household_id, 'admin'));
```

## RPCs Importantes (20+)

- `create_invitation(household_id, role, created_by)` → codigo 8 chars
- `use_invitation_code(code, user_id)` → crear membresia
- `get_my_memberships(user_id)` → hogares del usuario
- `check_user_permission(user_id, household_id, permission)` → boolean
- `create_ai_audit_log(...)` → audit entry
- `complete_ai_audit_log(audit_id, result)` → completar
- `rollback_ai_action(audit_id)` → revertir
- `create_ai_proposal(...)` → propuesta pendiente
- `decide_ai_proposal(proposal_id, decision)` → aprobar/rechazar

## Indices Criticos (`supabase-indexes.sql`)

65+ indices definidos. Los mas importantes:

- `idx_recipes_household` ON recipes(household_id)
- `idx_inventory_item_household` ON inventory(item_id, household_id)
- `idx_scheduled_tasks_date_employee` ON scheduled_tasks(date, assigned_to)
- `idx_ai_audit_household_date` ON ai_audit_log(household_id, created_at)

## Clientes Supabase

| Tipo         | Archivo                      | Key            | Uso                       |
| ------------ | ---------------------------- | -------------- | ------------------------- |
| Browser      | `src/lib/supabase/client.ts` | anon           | Componentes client-side   |
| Server Auth  | inline en API routes         | anon + cookies | API routes con auth       |
| Service Role | inline en API routes         | service_role   | Operaciones privilegiadas |
