import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Recipe, ScheduledTask, HomeEmployee } from '@/types';

// ============================================
// TIPOS
// ============================================

export interface TodayMenu {
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe | null;
  dayNumber: number;
}

export interface EmployeeTaskSummary {
  employee: HomeEmployee;
  tasks: ScheduledTask[];
  completedCount: number;
  totalCount: number;
  isCheckedIn: boolean;
}

export interface WeeklyStats {
  mealsCompleted: number;
  mealsTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
}

export interface TodayAlerts {
  pendingSuggestions: number;
  lowSupplies: number;
}

// ============================================
// HOOK: useTodayMenu
// ============================================

export function useTodayMenu() {
  const [menu, setMenu] = useState<TodayMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTodayMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      // Calcular el día del ciclo (0-11, excluyendo domingos)
      const startDate = new Date('2025-01-06'); // Inicio del ciclo
      const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Contar domingos entre startDate y today
      let sundays = 0;
      const tempDate = new Date(startDate);
      while (tempDate <= today) {
        if (tempDate.getDay() === 0) sundays++;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const effectiveDays = diffDays - sundays;
      const dayNumber = ((effectiveDays % 12) + 12) % 12;

      // Cargar menú del día
      const { data: menuData, error: menuError } = await supabase
        .from('day_menu')
        .select(`
          *,
          breakfast:recipes!day_menu_breakfast_id_fkey(*),
          lunch:recipes!day_menu_lunch_id_fkey(*),
          dinner:recipes!day_menu_dinner_id_fkey(*)
        `)
        .eq('day_number', dayNumber)
        .single();

      if (menuError) throw menuError;

      if (menuData) {
        setMenu({
          breakfast: menuData.breakfast,
          lunch: menuData.lunch,
          dinner: menuData.dinner,
          dayNumber
        });
      }
    } catch (err) {
      console.error('Error loading menu:', err);
      setError(err instanceof Error ? err : new Error('Error loading menu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayMenu();
  }, [loadTodayMenu]);

  return { menu, loading, error, refresh: loadTodayMenu };
}

// ============================================
// HOOK: useTodayTasks
// ============================================

export function useTodayTasks() {
  const [summaries, setSummaries] = useState<EmployeeTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTodayTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Cargar empleados activos
      const { data: employees, error: empError } = await supabase
        .from('home_employees')
        .select('*')
        .eq('active', true);

      if (empError) throw empError;

      if (!employees || employees.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      // Cargar tareas de hoy
      const { data: tasks, error: tasksError } = await supabase
        .from('scheduled_tasks')
        .select(`
          *,
          space:spaces(*, space_type:space_types(*)),
          task_template:task_templates(*)
        `)
        .eq('scheduled_date', todayStr);

      if (tasksError) throw tasksError;

      // Cargar check-ins de hoy
      const { data: checkins } = await supabase
        .from('employee_checkins')
        .select('*')
        .eq('date', todayStr);

      const checkinMap = new Map(
        (checkins || []).map(c => [c.employee_id, c])
      );

      // Crear resumen por empleado
      const employeeSummaries: EmployeeTaskSummary[] = employees.map(emp => {
        const empTasks = (tasks || []).filter(t => t.employee_id === emp.id);
        const completedTasks = empTasks.filter(t => t.status === 'completada');

        return {
          employee: emp,
          tasks: empTasks,
          completedCount: completedTasks.length,
          totalCount: empTasks.length,
          isCheckedIn: checkinMap.has(emp.id)
        };
      });

      setSummaries(employeeSummaries);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err : new Error('Error loading tasks'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayTasks();
  }, [loadTodayTasks]);

  return { summaries, loading, error, refresh: loadTodayTasks };
}

// ============================================
// HOOK: useTodayAlerts
// ============================================

export function useTodayAlerts() {
  const [alerts, setAlerts] = useState<TodayAlerts>({
    pendingSuggestions: 0,
    lowSupplies: 0
  });
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);

      // Sugerencias pendientes
      const { count: suggestionsCount } = await supabase
        .from('adjustment_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Suministros bajos
      const { count: suppliesCount } = await supabase
        .from('cleaning_supplies')
        .select('*', { count: 'exact', head: true })
        .lt('current_quantity', 'min_quantity');

      setAlerts({
        pendingSuggestions: suggestionsCount || 0,
        lowSupplies: suppliesCount || 0
      });
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return { ...alerts, loading, refresh: loadAlerts };
}

// ============================================
// HOOK: useWeeklyStats
// ============================================

export function useWeeklyStats() {
  const [stats, setStats] = useState<WeeklyStats>({
    mealsCompleted: 0,
    mealsTotal: 0,
    tasksCompleted: 0,
    tasksTotal: 0
  });
  const [loading, setLoading] = useState(true);

  const loadWeeklyStats = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date();
      // Calcular inicio de semana (lunes)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = today.toISOString().split('T')[0];

      // Comidas completadas esta semana
      const { count: mealsCount } = await supabase
        .from('meal_feedback')
        .select('*', { count: 'exact', head: true })
        .gte('date', startStr)
        .lte('date', endStr);

      // Tareas completadas esta semana
      const { data: weekTasks } = await supabase
        .from('scheduled_tasks')
        .select('status')
        .gte('scheduled_date', startStr)
        .lte('scheduled_date', endStr);

      const completedTasks = (weekTasks || []).filter(t => t.status === 'completada').length;

      setStats({
        mealsCompleted: mealsCount || 0,
        mealsTotal: (today.getDay() || 7) * 3, // 3 comidas por día
        tasksCompleted: completedTasks,
        tasksTotal: weekTasks?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeeklyStats();
  }, [loadWeeklyStats]);

  return { ...stats, loading, refresh: loadWeeklyStats };
}

// ============================================
// HOOK COMBINADO: useTodayDashboard
// ============================================

export function useTodayDashboard() {
  const { menu, loading: menuLoading, refresh: refreshMenu } = useTodayMenu();
  const { summaries, loading: tasksLoading, refresh: refreshTasks } = useTodayTasks();
  const { pendingSuggestions, lowSupplies, loading: alertsLoading, refresh: refreshAlerts } = useTodayAlerts();
  const { mealsCompleted, mealsTotal, tasksCompleted, tasksTotal, loading: statsLoading, refresh: refreshStats } = useWeeklyStats();

  const loading = menuLoading || tasksLoading || alertsLoading || statsLoading;

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshMenu(),
      refreshTasks(),
      refreshAlerts(),
      refreshStats()
    ]);
  }, [refreshMenu, refreshTasks, refreshAlerts, refreshStats]);

  return {
    // Menu
    todayMenu: menu,
    // Tasks
    employeeSummaries: summaries,
    // Alerts
    pendingSuggestions,
    lowSupplies,
    // Weekly Stats
    weeklyStats: {
      mealsCompleted,
      mealsTotal,
      tasksCompleted,
      tasksTotal
    },
    // State
    loading,
    // Actions
    refresh
  };
}

// ============================================
// UTILIDADES DE FECHA/HORA
// ============================================

export function useGreeting() {
  const today = new Date();
  const hour = today.getHours();
  const dayOfWeek = today.toLocaleDateString('es-CO', { weekday: 'long' });
  const formattedDate = today.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const timeOfDay: 'morning' | 'afternoon' | 'evening' =
    hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  return {
    greeting,
    timeOfDay,
    dayOfWeek,
    formattedDate,
    hour
  };
}

// ============================================
// UTILIDADES DE COMIDAS
// ============================================

export function getMealLabel(type: string): string {
  switch (type) {
    case 'breakfast': return 'Desayuno';
    case 'lunch': return 'Almuerzo';
    case 'dinner': return 'Cena';
    default: return type;
  }
}

export function getMealType(type: string): 'breakfast' | 'lunch' | 'dinner' {
  if (type === 'breakfast' || type === 'lunch' || type === 'dinner') {
    return type;
  }
  return 'lunch';
}
