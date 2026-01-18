'use client';

import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2, Clock, TrendingUp, User } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee } from '@/types';

interface WeekStats {
  tasksCompleted: number;
  totalTasks: number;
  hoursWorked: number;
  completionRate: number;
  topEmployee?: {
    name: string;
    completed: number;
  };
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

interface HomeAnalyticsSummaryProps {
  householdId: string;
  employees: HomeEmployee[];
  onViewDetails?: () => void;
  compact?: boolean;
}

export default function HomeAnalyticsSummary({
  householdId,
  employees,
  onViewDetails,
  compact = false
}: HomeAnalyticsSummaryProps) {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeekStats();
  }, [householdId]);

  const loadWeekStats = async () => {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Inicio de semana (domingo)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Fin de semana (sábado)

      // También cargar semana anterior para comparación
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

      // Tareas de esta semana
      const { data: thisWeekTasks } = await supabase
        .from('scheduled_tasks')
        .select('*, employee_id')
        .eq('household_id', householdId)
        .gte('scheduled_date', weekStart.toISOString().split('T')[0])
        .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

      // Tareas de semana anterior
      const { data: lastWeekTasks } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('household_id', householdId)
        .gte('scheduled_date', prevWeekStart.toISOString().split('T')[0])
        .lte('scheduled_date', prevWeekEnd.toISOString().split('T')[0]);

      // Check-ins de esta semana
      const { data: checkins } = await supabase
        .from('employee_checkins')
        .select('*')
        .eq('household_id', householdId)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      // Calcular estadísticas
      const thisWeekCompleted = thisWeekTasks?.filter(t => t.status === 'completada').length || 0;
      const thisWeekTotal = thisWeekTasks?.length || 0;
      const lastWeekCompleted = lastWeekTasks?.filter(t => t.status === 'completada').length || 0;
      const lastWeekTotal = lastWeekTasks?.length || 0;

      const thisWeekRate = thisWeekTotal > 0 ? (thisWeekCompleted / thisWeekTotal) * 100 : 0;
      const lastWeekRate = lastWeekTotal > 0 ? (lastWeekCompleted / lastWeekTotal) * 100 : 0;

      // Calcular tendencia
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;
      if (lastWeekRate > 0) {
        trendPercent = thisWeekRate - lastWeekRate;
        if (trendPercent > 5) trend = 'up';
        else if (trendPercent < -5) trend = 'down';
      }

      // Encontrar empleado con más tareas completadas esta semana
      const empCompleted: Record<string, number> = {};
      thisWeekTasks?.forEach(t => {
        if (t.status === 'completada' && t.employee_id) {
          empCompleted[t.employee_id] = (empCompleted[t.employee_id] || 0) + 1;
        }
      });
      const topEmpEntry = Object.entries(empCompleted).sort((a, b) => b[1] - a[1])[0];
      const topEmployee = topEmpEntry
        ? employees.find(e => e.id === topEmpEntry[0])
        : null;

      // Horas trabajadas
      const hoursWorked = checkins?.reduce((sum, c) => sum + (c.total_hours || 0), 0) || 0;

      setStats({
        tasksCompleted: thisWeekCompleted,
        totalTasks: thisWeekTotal,
        hoursWorked,
        completionRate: thisWeekRate,
        topEmployee: topEmployee ? { name: topEmployee.name, completed: topEmpEntry![1] } : undefined,
        trend,
        trendPercent: Math.abs(trendPercent)
      });
    } catch (error) {
      console.error('Error loading week stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  if (compact) {
    return (
      <button
        onClick={onViewDetails}
        className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 text-left hover:from-indigo-100 hover:to-purple-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Esta semana</p>
              <p className="font-semibold text-gray-800">
                {stats.tasksCompleted}/{stats.totalTasks} tareas
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${
              stats.completionRate >= 80 ? 'text-green-600' :
              stats.completionRate >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {stats.completionRate.toFixed(0)}%
            </div>
            {stats.trend !== 'stable' && (
              <p className={`text-xs flex items-center justify-end gap-1 ${
                stats.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp size={12} className={stats.trend === 'down' ? 'rotate-180' : ''} />
                {stats.trendPercent.toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} />
            <span className="font-semibold">Resumen Semanal</span>
          </div>
          {stats.trend !== 'stable' && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              stats.trend === 'up' ? 'bg-green-500/30' : 'bg-red-500/30'
            }`}>
              {stats.trend === 'up' ? '+' : '-'}{stats.trendPercent.toFixed(0)}% vs semana anterior
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div className="text-xl font-bold text-gray-800">{stats.tasksCompleted}</div>
            <p className="text-xs text-gray-500">Completadas</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div className="text-xl font-bold text-gray-800">{stats.hoursWorked.toFixed(0)}h</div>
            <p className="text-xs text-gray-500">Trabajadas</p>
          </div>
          <div className="text-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${
              stats.completionRate >= 80 ? 'bg-green-100' :
              stats.completionRate >= 50 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <TrendingUp size={20} className={
                stats.completionRate >= 80 ? 'text-green-600' :
                stats.completionRate >= 50 ? 'text-amber-600' : 'text-red-600'
              } />
            </div>
            <div className="text-xl font-bold text-gray-800">{stats.completionRate.toFixed(0)}%</div>
            <p className="text-xs text-gray-500">Cumplimiento</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progreso semanal</span>
            <span className="font-medium">{stats.tasksCompleted}/{stats.totalTasks}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.completionRate >= 80 ? 'bg-green-500' :
                stats.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Top Employee */}
        {stats.topEmployee && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-blue-600">Destacado esta semana</p>
              <p className="font-semibold text-gray-800">{stats.topEmployee.name}</p>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {stats.topEmployee.completed} tareas
            </span>
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full mt-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Ver reporte completo
          </button>
        )}
      </div>
    </div>
  );
}
