'use client';

import { useState, useEffect } from 'react';
import {
  X, BarChart3, TrendingUp, TrendingDown, Star,
  Calendar, User, Clock, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee, Space } from '@/types';

interface MonthlyReportProps {
  householdId: string;
  employees: HomeEmployee[];
  spaces: Space[];
  onClose: () => void;
}

interface MonthStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalHours: number;
  avgRating: number;
  issuesFound: number;
  topEmployee?: { name: string; completed: number };
  mostCleanedSpace?: { name: string; count: number };
  leastCleanedSpace?: { name: string; count: number };
}

interface EmployeeStats {
  id: string;
  name: string;
  tasksCompleted: number;
  hoursWorked: number;
  avgRating: number;
  issuesReported: number;
}

interface SpaceStats {
  id: string;
  name: string;
  icon: string;
  cleaningCount: number;
  avgRating: number;
  lastCleaned?: string;
}

export default function MonthlyReport({
  householdId,
  employees,
  spaces,
  onClose
}: MonthlyReportProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [spaceStats, setSpaceStats] = useState<SpaceStats[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'spaces'>('overview');

  useEffect(() => {
    loadReport();
  }, [currentMonth, householdId]);

  const getMonthRange = () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const loadReport = async () => {
    setLoading(true);
    const { startDate, endDate } = getMonthRange();

    // Load tasks for the month
    const { data: tasks } = await supabase
      .from('scheduled_tasks')
      .select('*, task_template:task_templates(*)')
      .eq('household_id', householdId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);

    // Load checkins for the month
    const { data: checkins } = await supabase
      .from('employee_checkins')
      .select('*')
      .eq('household_id', householdId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Load ratings for the month
    const { data: ratings } = await supabase
      .from('cleaning_ratings')
      .select('*')
      .eq('household_id', householdId)
      .gte('rated_at', startDate)
      .lte('rated_at', endDate + 'T23:59:59');

    // Load cleaning history
    const { data: history } = await supabase
      .from('cleaning_history')
      .select('*')
      .eq('household_id', householdId)
      .gte('completed_at', startDate)
      .lte('completed_at', endDate + 'T23:59:59');

    // Load inspections
    const { data: inspections } = await supabase
      .from('inspection_reports')
      .select('*')
      .eq('household_id', householdId)
      .gte('inspected_at', startDate)
      .lte('inspected_at', endDate + 'T23:59:59');

    // Calculate stats
    if (tasks) {
      const completed = tasks.filter(t => t.status === 'completada');
      const ratingValues = ratings?.map(r => r.rating).filter(Boolean) || [];
      const avgRating = ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : 0;

      const totalHours = checkins?.reduce((sum, c) => sum + (c.total_hours || 0), 0) || 0;
      const totalIssues = inspections?.reduce((sum, i) => sum + (i.issues_found || 0), 0) || 0;

      // Top employee
      const empCompleted: Record<string, number> = {};
      completed.forEach(t => {
        if (t.employee_id) {
          empCompleted[t.employee_id] = (empCompleted[t.employee_id] || 0) + 1;
        }
      });
      const topEmpId = Object.entries(empCompleted).sort((a, b) => b[1] - a[1])[0];
      const topEmp = topEmpId ? employees.find(e => e.id === topEmpId[0]) : null;

      // Most/least cleaned spaces
      const spaceCount: Record<string, number> = {};
      (history || []).forEach(h => {
        spaceCount[h.space_id] = (spaceCount[h.space_id] || 0) + 1;
      });
      const sortedSpaces = Object.entries(spaceCount).sort((a, b) => b[1] - a[1]);
      const mostCleanedId = sortedSpaces[0];
      const leastCleanedId = sortedSpaces[sortedSpaces.length - 1];
      const mostCleaned = mostCleanedId ? spaces.find(s => s.id === mostCleanedId[0]) : null;
      const leastCleaned = leastCleanedId && sortedSpaces.length > 1
        ? spaces.find(s => s.id === leastCleanedId[0])
        : null;

      setMonthStats({
        totalTasks: tasks.length,
        completedTasks: completed.length,
        completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
        totalHours,
        avgRating,
        issuesFound: totalIssues,
        topEmployee: topEmp ? { name: topEmp.name, completed: topEmpId[1] } : undefined,
        mostCleanedSpace: mostCleaned
          ? { name: mostCleaned.custom_name || mostCleaned.space_type?.name || '', count: mostCleanedId[1] }
          : undefined,
        leastCleanedSpace: leastCleaned
          ? { name: leastCleaned.custom_name || leastCleaned.space_type?.name || '', count: leastCleanedId[1] }
          : undefined
      });

      // Employee stats
      const empStats: EmployeeStats[] = employees.map(emp => {
        const empTasks = completed.filter(t => t.employee_id === emp.id);
        const empCheckins = checkins?.filter(c => c.employee_id === emp.id) || [];
        const empRatings = ratings?.filter(r => r.employee_id === emp.id) || [];
        const empInspections = inspections?.filter(i => i.employee_id === emp.id) || [];

        return {
          id: emp.id,
          name: emp.name,
          tasksCompleted: empTasks.length,
          hoursWorked: empCheckins.reduce((sum, c) => sum + (c.total_hours || 0), 0),
          avgRating: empRatings.length > 0
            ? empRatings.reduce((sum, r) => sum + r.rating, 0) / empRatings.length
            : 0,
          issuesReported: empInspections.reduce((sum, i) => sum + (i.issues_found || 0), 0)
        };
      });
      setEmployeeStats(empStats.sort((a, b) => b.tasksCompleted - a.tasksCompleted));

      // Space stats
      const sStats: SpaceStats[] = spaces.map(space => {
        const spaceHistory = history?.filter(h => h.space_id === space.id) || [];
        const spaceRatings = ratings?.filter(r => r.space_id === space.id) || [];
        const lastClean = spaceHistory.sort((a, b) =>
          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        )[0];

        return {
          id: space.id,
          name: space.custom_name || space.space_type?.name || '',
          icon: space.space_type?.icon || '🏠',
          cleaningCount: spaceHistory.length,
          avgRating: spaceRatings.length > 0
            ? spaceRatings.reduce((sum, r) => sum + r.rating, 0) / spaceRatings.length
            : 0,
          lastCleaned: lastClean?.completed_at
        };
      });
      setSpaceStats(sStats.sort((a, b) => b.cleaningCount - a.cleaningCount));
    }

    setLoading(false);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} />
            <span className="font-semibold">Reporte Mensual</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="p-4 border-b flex items-center justify-between">
          <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold capitalize">{formatMonth(currentMonth)}</h2>
          <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'overview', label: 'Resumen' },
            { id: 'employees', label: 'Empleados' },
            { id: 'spaces', label: 'Espacios' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : activeTab === 'overview' && monthStats ? (
            <div className="space-y-4">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{monthStats.completedTasks}</div>
                  <p className="text-sm text-blue-600">Tareas completadas</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{monthStats.completionRate.toFixed(0)}%</div>
                  <p className="text-sm text-green-600">Tasa de cumplimiento</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-amber-700 flex items-center justify-center gap-1">
                    {monthStats.avgRating.toFixed(1)}
                    <Star size={20} className="fill-amber-400 text-amber-400" />
                  </div>
                  <p className="text-sm text-amber-600">Calificación promedio</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-700">{monthStats.totalHours.toFixed(0)}h</div>
                  <p className="text-sm text-purple-600">Horas trabajadas</p>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-3">
                {monthStats.topEmployee && (
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-blue-100">Empleado destacado</p>
                        <p className="font-semibold">{monthStats.topEmployee.name}</p>
                        <p className="text-sm text-blue-200">{monthStats.topEmployee.completed} tareas completadas</p>
                      </div>
                    </div>
                  </div>
                )}

                {monthStats.mostCleanedSpace && (
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                    <TrendingUp size={24} className="text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500">Espacio más atendido</p>
                      <p className="font-medium">{monthStats.mostCleanedSpace.name}</p>
                      <p className="text-sm text-gray-400">{monthStats.mostCleanedSpace.count} limpiezas</p>
                    </div>
                  </div>
                )}

                {monthStats.leastCleanedSpace && (
                  <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
                    <TrendingDown size={24} className="text-amber-600" />
                    <div>
                      <p className="text-sm text-amber-600">Necesita más atención</p>
                      <p className="font-medium">{monthStats.leastCleanedSpace.name}</p>
                      <p className="text-sm text-amber-500">{monthStats.leastCleanedSpace.count} limpiezas</p>
                    </div>
                  </div>
                )}

                {monthStats.issuesFound > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle size={24} className="text-red-600" />
                    <div>
                      <p className="text-sm text-red-600">Problemas detectados</p>
                      <p className="font-medium">{monthStats.issuesFound} issues en inspecciones</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'employees' ? (
            <div className="space-y-3">
              {employeeStats.map(emp => (
                <div key={emp.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{emp.name}</h3>
                    {emp.avgRating > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star size={14} className="fill-amber-400" />
                        {emp.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold text-blue-600">{emp.tasksCompleted}</div>
                      <div className="text-gray-500">Tareas</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">{emp.hoursWorked.toFixed(1)}h</div>
                      <div className="text-gray-500">Horas</div>
                    </div>
                    <div>
                      <div className="font-bold text-red-600">{emp.issuesReported}</div>
                      <div className="text-gray-500">Issues</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'spaces' ? (
            <div className="space-y-3">
              {spaceStats.map(space => (
                <div key={space.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{space.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold">{space.name}</h3>
                      <p className="text-sm text-gray-500">
                        {space.cleaningCount} limpiezas este mes
                      </p>
                    </div>
                    {space.avgRating > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star size={14} className="fill-amber-400" />
                        {space.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
