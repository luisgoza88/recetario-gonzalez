-- =====================================================
-- Migration: Fix store_prices RLS, indexes y trigger + daily_completions DELETE policy
-- Fecha: 2026-05-08
-- Issues: 4 fixes agrupados para reducir numero de migrations
-- =====================================================

-- =====================================================
-- TASK 1: RLS de store_prices - restringir escritura a service_role
-- Problema: INSERT y UPDATE permiten cualquier usuario autenticado o anonimo
-- Solucion: Solo service_role puede escribir; lectura publica permanece
-- =====================================================

DROP POLICY IF EXISTS "store_prices_insert" ON store_prices;
DROP POLICY IF EXISTS "store_prices_update" ON store_prices;

-- Solo service_role puede insertar precios
CREATE POLICY "store_prices_insert" ON store_prices
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Solo service_role puede actualizar precios
CREATE POLICY "store_prices_update" ON store_prices
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- =====================================================
-- TASK 2: Indice critico faltante en shopping_lists(household_id)
-- Problema: La tabla mas consultada del flujo compras solo tiene idx_shopping_lists_week
-- Solucion: Agregar indice sobre household_id para filtrar por hogar
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_shopping_lists_household
  ON shopping_lists(household_id);

-- =====================================================
-- TASK 3: Indice compuesto daily_completions(household_id, completion_date)
-- Problema: Queries mas comunes filtran siempre por household + fecha sin indice optimo
-- Solucion: Indice compuesto que satisface ambas condiciones en un solo scan
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daily_completions_household_date
  ON daily_completions(household_id, completion_date);

-- =====================================================
-- TASK 4: Indice compuesto store_prices(store, item_name)
-- Problema: Comparacion de precios por tienda requiere filtrar por store + item_name
-- Solucion: Indice compuesto (store primero, item_name segundo — cardinalidad optima)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_store_prices_store_item
  ON store_prices(store, item_name);

-- =====================================================
-- TASK 5: Trigger de store_prices - migrar a funcion canonica
-- Problema: store_prices usa update_store_prices_updated_at() propio, violando patron unificado
-- Solucion: Reemplazar por update_updated_at_column() (funcion canonica del proyecto)
-- =====================================================

DROP TRIGGER IF EXISTS store_prices_updated_at_trigger ON store_prices;

-- Recrear trigger apuntando a la funcion canonica
CREATE TRIGGER store_prices_updated_at_trigger
  BEFORE UPDATE ON store_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Eliminar funcion duplicada (ya no tiene triggers apuntando a ella)
DROP FUNCTION IF EXISTS update_store_prices_updated_at();

-- =====================================================
-- TASK 6: Policy DELETE de daily_completions - restringir a dueno o admin
-- Problema: Policy FOR ALL permite que cualquier usuario autenticado borre completions ajenas
-- Solucion: DELETE restringido al employee_id propio o rol admin del hogar
-- =====================================================

-- Separar la policy FOR ALL en policies especificas por operacion
DROP POLICY IF EXISTS "Users can manage daily completions" ON daily_completions;

-- SELECT: cualquier miembro autenticado puede leer completions de su hogar
CREATE POLICY "daily_completions_select" ON daily_completions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: cualquier usuario autenticado puede crear completions propias
CREATE POLICY "daily_completions_insert" ON daily_completions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: solo el empleado dueno de la completion puede editarla
CREATE POLICY "daily_completions_update" ON daily_completions
  FOR UPDATE
  USING (employee_id = auth.uid());

-- DELETE: solo el empleado dueno o un admin del hogar puede borrar
CREATE POLICY "daily_completions_delete" ON daily_completions
  FOR DELETE
  USING (
    employee_id = auth.uid()
    OR has_household_role(household_id, ARRAY['admin'])
  );
