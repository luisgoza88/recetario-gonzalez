import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ScheduledTask } from "@/types";

// ============================================
// QUERY KEYS
// ============================================
export const dailyDashboardKeys = {
  tasks: (householdId: string, date: string) =>
    ["dailyTasks", householdId, date] as const,
  checkins: (householdId: string, date: string) =>
    ["dailyCheckins", householdId, date] as const,
};

// ============================================
// FETCH FUNCTIONS
// ============================================
async function fetchDailyTasks(householdId: string, date: string) {
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
    .eq("scheduled_date", date)
    .order("created_at");

  if (error) throw error;
  return data as ScheduledTask[];
}

async function fetchDailyCheckins(householdId: string, date: string) {
  const { data, error } = await supabase
    .from("employee_checkins")
    .select("*")
    .eq("household_id", householdId)
    .eq("date", date);

  if (error) throw error;

  const checkins: Record<string, { isCheckedIn: boolean; time?: string }> = {};
  if (data) {
    data.forEach(
      (c: {
        employee_id: string;
        check_out_time: string | null;
        check_in_time: string;
      }) => {
        checkins[c.employee_id] = {
          isCheckedIn: !c.check_out_time,
          time: c.check_in_time,
        };
      },
    );
  }

  return checkins;
}

// ============================================
// HOOKS - QUERIES
// ============================================

/**
 * Hook para obtener las tareas programadas de un dia especifico
 */
export function useDailyTasks(householdId: string, date: string) {
  return useQuery({
    queryKey: dailyDashboardKeys.tasks(householdId, date),
    queryFn: () => fetchDailyTasks(householdId, date),
    enabled: !!householdId && !!date,
  });
}

/**
 * Hook para obtener los check-ins de empleados de un dia especifico
 */
export function useDailyCheckins(householdId: string, date: string) {
  return useQuery({
    queryKey: dailyDashboardKeys.checkins(householdId, date),
    queryFn: () => fetchDailyCheckins(householdId, date),
    enabled: !!householdId && !!date,
  });
}

// ============================================
// HOOKS - MUTATIONS
// ============================================

/**
 * Hook para alternar el estado de una tarea entre 'completada' y 'pendiente'.
 * Calcula actual_minutes desde started_at si se completa, e inserta en cleaning_history.
 */
export function useToggleDailyTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      task,
      householdId,
    }: {
      task: ScheduledTask;
      householdId: string;
    }) => {
      const newStatus =
        task.status === "completada" ? "pendiente" : "completada";
      const now = new Date();

      // Calculate actual minutes from started_at if available
      let actualMinutes: number | null = null;
      if (newStatus === "completada" && task.started_at) {
        const startedAt = new Date(task.started_at);
        actualMinutes = Math.round(
          (now.getTime() - startedAt.getTime()) / (1000 * 60),
        );
      }

      const { error: updateError } = await supabase
        .from("scheduled_tasks")
        .update({
          status: newStatus,
          completed_at: newStatus === "completada" ? now.toISOString() : null,
          actual_minutes: actualMinutes,
          // Reset started_at if going back to pending
          ...(newStatus === "pendiente" ? { started_at: null } : {}),
        })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Si se completa, registrar en historial con tiempo REAL
      if (newStatus === "completada") {
        const { error: historyError } = await supabase
          .from("cleaning_history")
          .insert({
            household_id: householdId,
            space_id: task.space_id,
            task_id: task.id,
            task_name: task.task_template?.name,
            employee_id: task.employee_id,
            completed_at: now.toISOString(),
            // Use actual measured time, or fallback to estimate
            actual_minutes:
              actualMinutes || task.task_template?.estimated_minutes,
          });

        if (historyError) throw historyError;
      }

      return { task, newStatus, householdId };
    },
    onSuccess: (_, { task, householdId }) => {
      // Invalidate all daily task queries for this household
      // We use a partial match so any date key gets refreshed
      queryClient.invalidateQueries({
        queryKey: ["dailyTasks", householdId],
      });
    },
  });
}

/**
 * Hook para iniciar una tarea (status → 'en_progreso', started_at = now)
 */
export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      task,
      householdId,
    }: {
      task: ScheduledTask;
      householdId: string;
    }) => {
      const { error } = await supabase
        .from("scheduled_tasks")
        .update({
          status: "en_progreso",
          started_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (error) throw error;
      return { task, householdId };
    },
    onSuccess: (_, { householdId }) => {
      queryClient.invalidateQueries({
        queryKey: ["dailyTasks", householdId],
      });
    },
  });
}
