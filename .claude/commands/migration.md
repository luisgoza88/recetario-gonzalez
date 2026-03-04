# Crear Nueva Migracion Supabase

## Parametros

- $DESCRIPTION: Descripcion de la migracion (ej: add_recipe_tags)

## Instrucciones

1. **Leer el skill** `recetario-data-model` para entender el schema actual.

2. **Generar timestamp**: Usar formato `YYYYMMDDHHMMSS`

3. **Crear archivo**: `supabase/migrations/{timestamp}_{$DESCRIPTION}.sql`

4. **Template de migracion**:

```sql
-- Migration: $DESCRIPTION
-- Date: {fecha actual}

-- 1. Crear tabla(s)
CREATE TABLE IF NOT EXISTS {tabla} (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES household_memberships(household_id),
  -- columnas...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE {tabla} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON {tabla}
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "members_insert" ON {tabla}
  FOR INSERT WITH CHECK (is_household_member(household_id));

CREATE POLICY "admin_delete" ON {tabla}
  FOR DELETE USING (has_household_role(household_id, 'admin'));

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_{tabla}_household ON {tabla}(household_id);

-- 4. Trigger updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON {tabla}
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

5. **Actualizar tipos** en `src/types/index.ts` si hay tablas nuevas

6. **Verificar**:
   - [ ] Naming convention: `YYYYMMDDHHMMSS_descriptive.sql`
   - [ ] RLS habilitado con household pattern
   - [ ] Indices para FK y WHERE comunes
   - [ ] Trigger updated_at
   - [ ] Tipos TypeScript actualizados
   - [ ] No modifica migraciones existentes
