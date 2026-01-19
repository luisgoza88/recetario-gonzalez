-- =====================================================
-- SUPABASE OPTIMIZATION INDEXES
-- Recetario App - Enero 2025
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard -> SQL Editor
-- 2. Copiar y ejecutar este script
-- 3. Los índices se crean solo si no existen (IF NOT EXISTS)
-- =====================================================

-- =====================================================
-- TABLAS CORE: RECETAS Y MENÚ
-- =====================================================

-- day_menu: Consultas muy frecuentes por día del ciclo
CREATE INDEX IF NOT EXISTS idx_day_menu_day_number
ON day_menu(day_number);

-- recipes: Búsquedas por nombre e ID
CREATE INDEX IF NOT EXISTS idx_recipes_name
ON recipes(name);

-- completed_days: Filtros por fecha y estado
CREATE INDEX IF NOT EXISTS idx_completed_days_date
ON completed_days(date);

CREATE INDEX IF NOT EXISTS idx_completed_days_date_completed
ON completed_days(date, completed);

-- =====================================================
-- INVENTARIO Y MERCADO
-- =====================================================

-- inventory: Consultas frecuentes por item_id y stock
CREATE INDEX IF NOT EXISTS idx_inventory_item_id
ON inventory(item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_current_number
ON inventory(current_number);

-- Índice compuesto para filtrar items sin stock
CREATE INDEX IF NOT EXISTS idx_inventory_item_stock
ON inventory(item_id, current_number);

-- market_items: Ordenamiento frecuente por order_index
CREATE INDEX IF NOT EXISTS idx_market_items_order_index
ON market_items(order_index);

CREATE INDEX IF NOT EXISTS idx_market_items_category
ON market_items(category);

CREATE INDEX IF NOT EXISTS idx_market_items_category_id
ON market_items(category_id);

-- market_checklist: Filtros por estado y item
CREATE INDEX IF NOT EXISTS idx_market_checklist_item_id
ON market_checklist(item_id);

CREATE INDEX IF NOT EXISTS idx_market_checklist_checked
ON market_checklist(checked);

-- Índice compuesto para items no marcados
CREATE INDEX IF NOT EXISTS idx_market_checklist_item_checked
ON market_checklist(item_id, checked);

-- =====================================================
-- FEEDBACK Y SUGERENCIAS
-- =====================================================

-- meal_feedback: Consultas por receta y ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_meal_feedback_recipe_id
ON meal_feedback(recipe_id);

CREATE INDEX IF NOT EXISTS idx_meal_feedback_created_at
ON meal_feedback(created_at DESC);

-- Índice compuesto para historial de recetas
CREATE INDEX IF NOT EXISTS idx_meal_feedback_recipe_date
ON meal_feedback(recipe_id, created_at DESC);

-- adjustment_suggestions: Filtros muy frecuentes por status
CREATE INDEX IF NOT EXISTS idx_adjustment_suggestions_status
ON adjustment_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_adjustment_suggestions_recipe_id
ON adjustment_suggestions(recipe_id);

-- Índice compuesto para sugerencias pendientes por receta
CREATE INDEX IF NOT EXISTS idx_adjustment_suggestions_recipe_status
ON adjustment_suggestions(recipe_id, status);

-- Índice para ordenar por feedback_count (sugerencias populares)
CREATE INDEX IF NOT EXISTS idx_adjustment_suggestions_pending_feedback
ON adjustment_suggestions(status, feedback_count DESC)
WHERE status = 'pending';

-- =====================================================
-- GESTIÓN DEL HOGAR
-- =====================================================

-- scheduled_tasks: La tabla más consultada en home management
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_household_id
ON scheduled_tasks(household_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled_date
ON scheduled_tasks(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_employee_id
ON scheduled_tasks(employee_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status
ON scheduled_tasks(status);

-- Índice compuesto para dashboard diario (más frecuente)
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_household_date
ON scheduled_tasks(household_id, scheduled_date);

-- Índice compuesto para tareas pendientes por household
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_household_status
ON scheduled_tasks(household_id, status);

-- daily_task_instances: Consultas por fecha y empleado
CREATE INDEX IF NOT EXISTS idx_daily_task_instances_date
ON daily_task_instances(date);

CREATE INDEX IF NOT EXISTS idx_daily_task_instances_employee_id
ON daily_task_instances(employee_id);

CREATE INDEX IF NOT EXISTS idx_daily_task_instances_status
ON daily_task_instances(status);

-- Índice compuesto para tareas por fecha y empleado
CREATE INDEX IF NOT EXISTS idx_daily_task_instances_date_employee
ON daily_task_instances(date, employee_id);

-- Índice compuesto para tareas del día con orden
CREATE INDEX IF NOT EXISTS idx_daily_task_instances_date_time
ON daily_task_instances(date, time_start);

-- home_employees: Filtros por household y estado activo
CREATE INDEX IF NOT EXISTS idx_home_employees_household_id
ON home_employees(household_id);

CREATE INDEX IF NOT EXISTS idx_home_employees_active
ON home_employees(active);

CREATE INDEX IF NOT EXISTS idx_home_employees_is_active
ON home_employees(is_active);

-- Índice compuesto para empleados activos por household
CREATE INDEX IF NOT EXISTS idx_home_employees_household_active
ON home_employees(household_id, active);

-- spaces: Filtros por household
CREATE INDEX IF NOT EXISTS idx_spaces_household_id
ON spaces(household_id);

-- task_templates: Filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_task_templates_household_id
ON task_templates(household_id);

CREATE INDEX IF NOT EXISTS idx_task_templates_space_id
ON task_templates(space_id);

CREATE INDEX IF NOT EXISTS idx_task_templates_is_active
ON task_templates(is_active);

-- Índice compuesto para templates activos
CREATE INDEX IF NOT EXISTS idx_task_templates_household_active
ON task_templates(household_id, is_active);

-- schedule_templates: Filtros y ordenamiento
CREATE INDEX IF NOT EXISTS idx_schedule_templates_household_id
ON schedule_templates(household_id);

-- Índice compuesto para ordenamiento por día/semana
CREATE INDEX IF NOT EXISTS idx_schedule_templates_order
ON schedule_templates(household_id, week_number, day_of_week, order_index);

-- employee_checkins: Filtros por household y fecha
CREATE INDEX IF NOT EXISTS idx_employee_checkins_household_id
ON employee_checkins(household_id);

CREATE INDEX IF NOT EXISTS idx_employee_checkins_date
ON employee_checkins(date);

-- Índice compuesto para checkins del día
CREATE INDEX IF NOT EXISTS idx_employee_checkins_household_date
ON employee_checkins(household_id, date);

-- cleaning_supplies: Filtros y ordenamiento
CREATE INDEX IF NOT EXISTS idx_cleaning_supplies_household_id
ON cleaning_supplies(household_id);

CREATE INDEX IF NOT EXISTS idx_cleaning_supplies_category
ON cleaning_supplies(category);

-- cleaning_history: Filtros y ordenamiento
CREATE INDEX IF NOT EXISTS idx_cleaning_history_household_id
ON cleaning_history(household_id);

CREATE INDEX IF NOT EXISTS idx_cleaning_history_space_id
ON cleaning_history(space_id);

CREATE INDEX IF NOT EXISTS idx_cleaning_history_completed_at
ON cleaning_history(completed_at DESC);

-- employee_space_assignments: Filtros por empleado
CREATE INDEX IF NOT EXISTS idx_employee_space_assignments_employee_id
ON employee_space_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_space_assignments_space_id
ON employee_space_assignments(space_id);

-- =====================================================
-- IA Y CONVERSACIONES
-- =====================================================

-- ai_conversations: Filtros por sesión y orden
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id
ON ai_conversations(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at
ON ai_conversations(created_at);

-- Índice compuesto para historial de sesión
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_date
ON ai_conversations(session_id, created_at);

-- ai_context: Filtros por sesión
CREATE INDEX IF NOT EXISTS idx_ai_context_session_id
ON ai_context(session_id);

-- =====================================================
-- PRESUPUESTO Y COMPRAS
-- =====================================================

-- budgets: Filtros por tipo y período
CREATE INDEX IF NOT EXISTS idx_budgets_period_type
ON budgets(period_type);

CREATE INDEX IF NOT EXISTS idx_budgets_period_start
ON budgets(period_start);

-- Índice compuesto para búsqueda de presupuesto
CREATE INDEX IF NOT EXISTS idx_budgets_type_start
ON budgets(period_type, period_start);

-- purchases: Filtros por budget y orden
CREATE INDEX IF NOT EXISTS idx_purchases_budget_id
ON purchases(budget_id);

CREATE INDEX IF NOT EXISTS idx_purchases_purchased_at
ON purchases(purchased_at DESC);

-- price_history: Para tracking de precios
CREATE INDEX IF NOT EXISTS idx_price_history_item_id
ON price_history(item_id);

-- =====================================================
-- ALIAS E INGREDIENTES
-- =====================================================

-- ingredient_aliases: Optimizar búsquedas de alias
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_market_item_id
ON ingredient_aliases(market_item_id);

-- Índice para búsqueda por alias (texto)
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_alias
ON ingredient_aliases(alias);

-- ingredient_categories: Ordenamiento
CREATE INDEX IF NOT EXISTS idx_ingredient_categories_sort_order
ON ingredient_categories(sort_order);

-- =====================================================
-- SUSTITUCIONES
-- =====================================================

-- substitution_history: Para aprendizaje de sustituciones
CREATE INDEX IF NOT EXISTS idx_substitution_history_original
ON substitution_history(original);

CREATE INDEX IF NOT EXISTS idx_substitution_history_substitute
ON substitution_history(substitute);

-- =====================================================
-- REPORTES E INSPECCIONES
-- =====================================================

-- inspection_reports: Filtros por household y fecha
CREATE INDEX IF NOT EXISTS idx_inspection_reports_household_id
ON inspection_reports(household_id);

-- cleaning_ratings: Filtros por household
CREATE INDEX IF NOT EXISTS idx_cleaning_ratings_household_id
ON cleaning_ratings(household_id);

-- =====================================================
-- CATEGORÍAS DE TAREAS
-- =====================================================

-- task_categories: Filtros y ordenamiento
CREATE INDEX IF NOT EXISTS idx_task_categories_household_id
ON task_categories(household_id);

CREATE INDEX IF NOT EXISTS idx_task_categories_active
ON task_categories(active);

-- Índice compuesto para categorías activas
CREATE INDEX IF NOT EXISTS idx_task_categories_household_active
ON task_categories(household_id, active, sort_order);

-- =====================================================
-- HOUSEHOLDS
-- =====================================================

-- households: Ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_households_created_at
ON households(created_at DESC);

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================
-- Ejecuta esto para ver todos los índices creados:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

