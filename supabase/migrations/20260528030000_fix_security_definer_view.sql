-- =====================================================
-- Fix: vista today_tasks_summary con SECURITY DEFINER
-- =====================================================
-- La vista corría con privilegios del creador (SECURITY DEFINER por defecto),
-- saltando la RLS del usuario que consulta. Como agrega daily_task_instances
-- por household_id sin filtro, exponía el resumen de TODOS los hogares.
-- security_invoker=true hace que la vista respete la RLS del caller.
-- (La vista no se usa en código activo; se cierra la exposición igualmente.)
-- =====================================================
ALTER VIEW public.today_tasks_summary SET (security_invoker = true);
