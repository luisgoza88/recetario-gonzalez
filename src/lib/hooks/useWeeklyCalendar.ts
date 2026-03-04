import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ScheduledTask } from "@/types";

// ============================================
// QUERY KEYS
// ============================================
export const weeklyCalendarKeys = {
  tasks: (householdId: string, startDate: string, endDate: string) =>
    ["weeklyCalendarTasks", householdId, startDate, endDate] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================
async function fetchCalendarTasks(
  householdId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from("scheduled_tasks")
    .select(
      `
      *,
      task_template:task_templates(*),
      space:spaces(*, space_type:space_types(*)),
      employee:home_employees!scheduled_tasks_employee_id_fkey(*)
    `,
    )
    .eq("household_id", householdId)
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_date");

  if (error) throw error;
  return data as ScheduledTask[];
}

// ============================================
// HOOKS - QUERIES
// ============================================

/**
 * Hook para obtener las tareas de un rango de fechas (semana o mes)
 */
export function useCalendarTasks(
  householdId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: weeklyCalendarKeys.tasks(householdId, startDate, endDate),
    queryFn: () => fetchCalendarTasks(householdId, startDate, endDate),
    enabled: !!householdId && !!startDate && !!endDate,
  });
}

// ============================================
// HOOKS - MUTATIONS
// ============================================

/**
 * Hook para alternar el estado de una tarea en el calendario
 */
export function useToggleCalendarTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ task }: { task: ScheduledTask }) => {
      const newStatus =
        task.status === "completada" ? "pendiente" : "completada";

      const { error } = await supabase
        .from("scheduled_tasks")
        .update({
          status: newStatus,
          completed_at:
            newStatus === "completada" ? new Date().toISOString() : null,
        })
        .eq("id", task.id);

      if (error) throw error;
      return { task, newStatus };
    },
    onSuccess: (_, { task }) => {
      // Invalidate all weekly calendar queries for this household
      queryClient.invalidateQueries({
        queryKey: ["weeklyCalendarTasks", task.household_id],
      });
    },
  });
}
