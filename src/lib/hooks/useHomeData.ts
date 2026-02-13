import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Household, Space, HomeEmployee, ScheduledTask } from '@/types';

// ============================================
// QUERY KEYS
// ============================================
export const homeQueryKeys = {
  household: (id?: string) => ['household', id] as const,
  spaces: (householdId: string) => ['spaces', householdId] as const,
  employees: (householdId: string) => ['employees', householdId] as const,
  todayTasks: (householdId: string) => ['todayTasks', householdId] as const,
  pendingTasks: (householdId: string) => ['pendingTasks', householdId] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================
async function fetchHousehold() {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data && data.length > 0 ? data[0] : null) as Household | null;
}

async function fetchSpaces(householdId: string) {
  const { data, error } = await supabase
    .from('spaces')
    .select('*, space_type:space_types(*)')
    .eq('household_id', householdId);

  if (error) throw error;
  return data as Space[];
}

async function fetchEmployees(householdId: string) {
  const { data, error } = await supabase
    .from('home_employees')
    .select('*')
    .eq('household_id', householdId)
    .eq('active', true);

  if (error) throw error;
  return data as HomeEmployee[];
}

async function fetchTodayTasks(householdId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*, task_template:task_templates(*), space:spaces(*, space_type:space_types(*)), employee:home_employees!scheduled_tasks_employee_id_fkey(*)')
    .eq('household_id', householdId)
    .eq('scheduled_date', today);

  if (error) throw error;
  return data as ScheduledTask[];
}

async function fetchPendingTasksCount(householdId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('scheduled_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .eq('status', 'pendiente')
    .lte('scheduled_date', today);

  if (error) throw error;
  return count || 0;
}

// ============================================
// HOOKS - QUERIES
// ============================================

/**
 * Hook para obtener el hogar del usuario
 */
export function useHousehold() {
  return useQuery({
    queryKey: homeQueryKeys.household(),
    queryFn: fetchHousehold,
  });
}

/**
 * Hook combinado para obtener todos los datos del hogar
 */
export function useHouseholdData(householdId: string | undefined) {
  const spacesQuery = useQuery({
    queryKey: homeQueryKeys.spaces(householdId!),
    queryFn: () => fetchSpaces(householdId!),
    enabled: !!householdId,
  });

  const employeesQuery = useQuery({
    queryKey: homeQueryKeys.employees(householdId!),
    queryFn: () => fetchEmployees(householdId!),
    enabled: !!householdId,
  });

  const todayTasksQuery = useQuery({
    queryKey: homeQueryKeys.todayTasks(householdId!),
    queryFn: () => fetchTodayTasks(householdId!),
    enabled: !!householdId,
  });

  const pendingTasksQuery = useQuery({
    queryKey: homeQueryKeys.pendingTasks(householdId!),
    queryFn: () => fetchPendingTasksCount(householdId!),
    enabled: !!householdId,
  });

  return {
    spaces: spacesQuery.data ?? [],
    employees: employeesQuery.data ?? [],
    todayTasks: todayTasksQuery.data ?? [],
    pendingTasks: pendingTasksQuery.data ?? 0,
    isLoading:
      spacesQuery.isLoading ||
      employeesQuery.isLoading ||
      todayTasksQuery.isLoading ||
      pendingTasksQuery.isLoading,
  };
}

// ============================================
// HOOKS - MUTATIONS
// ============================================

/**
 * Hook para alternar el estado de una tarea programada
 */
export function useToggleTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ task }: { task: ScheduledTask }) => {
      const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';

      const { error } = await supabase
        .from('scheduled_tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completada' ? new Date().toISOString() : null,
        })
        .eq('id', task.id);

      if (error) throw error;
      return { task, newStatus };
    },
    onSuccess: (_, { task }) => {
      queryClient.invalidateQueries({ queryKey: homeQueryKeys.todayTasks(task.household_id) });
      queryClient.invalidateQueries({ queryKey: homeQueryKeys.pendingTasks(task.household_id) });
    },
  });
}

/**
 * Hook para refrescar todos los datos del hogar
 */
export function useRefreshHomeData(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return () => {
    if (!householdId) return;
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.household() });
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.spaces(householdId) });
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.employees(householdId) });
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.todayTasks(householdId) });
    queryClient.invalidateQueries({ queryKey: homeQueryKeys.pendingTasks(householdId) });
  };
}
