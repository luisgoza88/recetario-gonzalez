-- Migration: Unificar funciones duplicadas de updated_at
-- Fecha: 2026-03-04
-- Problema: 5 funciones distintas hacen exactamente lo mismo (NEW.updated_at = NOW(); RETURN NEW;)
-- Solucion: Usar update_updated_at_column() como unica funcion y re-apuntar todos los triggers.

-- Asegurar que la funcion canonica existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-apuntar trigger de employee_space_assignments
DROP TRIGGER IF EXISTS employee_space_assignments_updated_at ON employee_space_assignments;
CREATE TRIGGER employee_space_assignments_updated_at
    BEFORE UPDATE ON employee_space_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-apuntar trigger de learned_task_durations
DROP TRIGGER IF EXISTS learned_task_durations_updated_at ON learned_task_durations;
CREATE TRIGGER learned_task_durations_updated_at
    BEFORE UPDATE ON learned_task_durations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-apuntar trigger de employee_performance_scores
DROP TRIGGER IF EXISTS employee_performance_scores_updated_at ON employee_performance_scores;
CREATE TRIGGER employee_performance_scores_updated_at
    BEFORE UPDATE ON employee_performance_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-apuntar trigger de ai_action_queue
DROP TRIGGER IF EXISTS trigger_ai_action_queue_updated_at ON ai_action_queue;
CREATE TRIGGER trigger_ai_action_queue_updated_at
    BEFORE UPDATE ON ai_action_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-apuntar trigger de household_ai_trust
DROP TRIGGER IF EXISTS trigger_household_ai_trust_updated_at ON household_ai_trust;
CREATE TRIGGER trigger_household_ai_trust_updated_at
    BEFORE UPDATE ON household_ai_trust
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Eliminar funciones duplicadas (ya no se usan)
DROP FUNCTION IF EXISTS update_employee_space_updated_at();
DROP FUNCTION IF EXISTS update_learned_durations_updated_at();
DROP FUNCTION IF EXISTS update_employee_scores_updated_at();
DROP FUNCTION IF EXISTS update_ai_tables_updated_at();
