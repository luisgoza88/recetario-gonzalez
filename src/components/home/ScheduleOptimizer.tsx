'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X, Sparkles, AlertTriangle, CheckCircle2, Clock, User,
  Calendar, TrendingUp, AlertCircle, ChevronDown, ChevronUp,
  Lightbulb, RefreshCw, BarChart3, Home
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  Space, HomeEmployee, TaskTemplate, DaySchedule,
  WorkloadAnalysis, ScheduleIssue, CoverageReport
} from '@/types';

interface ScheduleOptimizerProps {
  householdId: string;
  spaces: Space[];
  employees: HomeEmployee[];
  onClose: () => void;
  onApplyOptimization?: () => void;
}

const DAY_NAMES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DAY_LABELS: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb'
};

// Convertir frecuencia a veces por semana
const FREQUENCY_TO_WEEKLY: Record<string, number> = {
  diaria: 6, // 6 días (excluir domingo)
  semanal: 1,
  quincenal: 0.5,
  mensual: 0.25
};

export default function ScheduleOptimizer({
  householdId,
  spaces,
  employees,
  onClose,
  onApplyOptimization
}: ScheduleOptimizerProps) {
  const [loading, setLoading] = useState(true);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'issues' | 'coverage'>('analysis');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [householdId]);

  const loadData = async () => {
    setLoading(true);

    // Cargar todas las plantillas de tareas
    const { data: templates } = await supabase
      .from('task_templates')
      .select('*, space:spaces(*, space_type:space_types(*))')
      .eq('household_id', householdId)
      .eq('is_active', true);

    if (templates) setTaskTemplates(templates);
    setLoading(false);
  };

  // Calcular disponibilidad de empleados por día
  const employeeAvailability = useMemo(() => {
    const availability: Record<string, Record<string, number>> = {};

    for (const emp of employees) {
      availability[emp.id] = {};

      for (const day of DAY_NAMES) {
        let availableMinutes = 0;

        if (emp.schedule) {
          const daySchedule = emp.schedule[day];
          if (daySchedule?.enabled) {
            const [startH, startM] = daySchedule.startTime.split(':').map(Number);
            const [endH, endM] = daySchedule.endTime.split(':').map(Number);
            availableMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          }
        } else if (emp.work_days?.includes(day)) {
          // Fallback al sistema antiguo
          availableMinutes = (emp.hours_per_day || 8) * 60;
          if (day === 'sabado') availableMinutes = Math.min(availableMinutes, 4 * 60);
        }

        availability[emp.id][day] = Math.max(0, availableMinutes);
      }
    }

    return availability;
  }, [employees]);

  // Calcular carga de trabajo total por frecuencia
  const weeklyWorkload = useMemo(() => {
    let totalWeeklyMinutes = 0;

    for (const template of taskTemplates) {
      const weeklyMultiplier = FREQUENCY_TO_WEEKLY[template.frequency] || 1;
      totalWeeklyMinutes += template.estimated_minutes * weeklyMultiplier;
    }

    return totalWeeklyMinutes;
  }, [taskTemplates]);

  // Calcular tiempo total disponible por semana
  const weeklyAvailability = useMemo(() => {
    let totalMinutes = 0;

    for (const empId of Object.keys(employeeAvailability)) {
      for (const day of DAY_NAMES) {
        totalMinutes += employeeAvailability[empId][day] || 0;
      }
    }

    return totalMinutes;
  }, [employeeAvailability]);

  // Calcular carga por día y empleado
  const dailyWorkload = useMemo(() => {
    const workload: Record<string, WorkloadAnalysis[]> = {};

    for (const day of DAY_NAMES) {
      workload[day] = [];

      for (const emp of employees) {
        const availableMinutes = employeeAvailability[emp.id]?.[day] || 0;
        if (availableMinutes === 0) continue;

        // Filtrar tareas por zona del empleado
        const compatibleSpaces = spaces.filter(s => {
          if (emp.zone === 'ambos') return true;
          return emp.zone === s.category;
        });

        const compatibleSpaceIds = new Set(compatibleSpaces.map(s => s.id));

        // Calcular tareas para este día
        let dayMinutes = 0;
        const tasks: WorkloadAnalysis['tasks'] = [];

        for (const template of taskTemplates) {
          if (!compatibleSpaceIds.has(template.space_id)) continue;

          const space = spaces.find(s => s.id === template.space_id);

          // Distribuir tareas según frecuencia
          const weeklyMultiplier = FREQUENCY_TO_WEEKLY[template.frequency] || 1;
          const tasksPerWeek = weeklyMultiplier;

          // Simplificación: distribuir equitativamente entre días de trabajo
          const workDays = emp.work_days?.length || 6;
          const taskFraction = tasksPerWeek / workDays;

          const minutesForDay = template.estimated_minutes * taskFraction;
          dayMinutes += minutesForDay;

          if (taskFraction > 0) {
            tasks.push({
              taskName: template.name,
              spaceName: space?.custom_name || space?.space_type?.name || 'Espacio',
              minutes: Math.round(minutesForDay)
            });
          }
        }

        const utilizationPercent = availableMinutes > 0
          ? Math.round((dayMinutes / availableMinutes) * 100)
          : 0;

        workload[day].push({
          employeeId: emp.id,
          employeeName: emp.name,
          day,
          totalMinutes: Math.round(dayMinutes),
          availableMinutes,
          taskCount: tasks.length,
          utilizationPercent,
          isOverloaded: utilizationPercent > 100,
          tasks: tasks.sort((a, b) => b.minutes - a.minutes).slice(0, 10)
        });
      }
    }

    return workload;
  }, [taskTemplates, spaces, employees, employeeAvailability]);

  // Identificar problemas
  const issues = useMemo((): ScheduleIssue[] => {
    const problems: ScheduleIssue[] = [];

    // 1. Verificar sobrecarga global
    if (weeklyWorkload > weeklyAvailability) {
      const excess = weeklyWorkload - weeklyAvailability;
      const excessHours = Math.round(excess / 60 * 10) / 10;
      problems.push({
        type: 'overload',
        severity: 'high',
        description: `Las tareas semanales exceden el tiempo disponible por ${excessHours} horas`,
        suggestion: 'Considera contratar más personal, reducir frecuencias, o eliminar algunas tareas'
      });
    }

    // 2. Verificar días sobrecargados por empleado
    for (const day of DAY_NAMES) {
      for (const analysis of dailyWorkload[day]) {
        if (analysis.utilizationPercent > 110) {
          problems.push({
            type: 'overload',
            severity: analysis.utilizationPercent > 130 ? 'high' : 'medium',
            description: `${analysis.employeeName} está sobrecargado el ${DAY_LABELS[day]} (${analysis.utilizationPercent}%)`,
            affectedDay: day,
            affectedEmployee: analysis.employeeName,
            suggestion: `Redistribuir ${Math.round((analysis.totalMinutes - analysis.availableMinutes))} minutos a otro día u empleado`
          });
        }
      }
    }

    // 3. Verificar espacios sin cobertura
    const coveredSpaceIds = new Set(taskTemplates.map(t => t.space_id));
    for (const space of spaces) {
      if (!coveredSpaceIds.has(space.id)) {
        problems.push({
          type: 'uncovered_space',
          severity: 'medium',
          description: `"${space.custom_name || space.space_type?.name}" no tiene tareas asignadas`,
          affectedSpace: space.custom_name || space.space_type?.name,
          suggestion: 'Agrega tareas de limpieza para este espacio'
        });
      }
    }

    // 4. Verificar distribución ineficiente
    const employeeUtilizations: number[] = [];
    for (const emp of employees) {
      let totalUsed = 0;
      let totalAvailable = 0;
      for (const day of DAY_NAMES) {
        const analysis = dailyWorkload[day]?.find(a => a.employeeId === emp.id);
        if (analysis) {
          totalUsed += analysis.totalMinutes;
          totalAvailable += analysis.availableMinutes;
        }
      }
      if (totalAvailable > 0) {
        employeeUtilizations.push(totalUsed / totalAvailable);
      }
    }

    if (employeeUtilizations.length > 1) {
      const maxUtil = Math.max(...employeeUtilizations);
      const minUtil = Math.min(...employeeUtilizations);
      if (maxUtil - minUtil > 0.3) {
        problems.push({
          type: 'inefficient_distribution',
          severity: 'low',
          description: 'La carga de trabajo no está distribuida equitativamente entre empleados',
          suggestion: 'Reasigna algunas tareas para balancear mejor la carga'
        });
      }
    }

    return problems.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [weeklyWorkload, weeklyAvailability, dailyWorkload, taskTemplates, spaces, employees]);

  // Generar reporte de cobertura
  const coverageReport = useMemo((): CoverageReport => {
    const coveredSpaceIds = new Set(taskTemplates.map(t => t.space_id));

    return {
      totalSpaces: spaces.length,
      coveredSpaces: coveredSpaceIds.size,
      uncoveredSpaces: spaces.filter(s => !coveredSpaceIds.has(s.id)),
      totalTasks: taskTemplates.length,
      scheduledTasks: taskTemplates.length, // Simplificación
      unscheduledTasks: [],
      weeklyWorkload: DAY_NAMES.map(day => ({
        day,
        totalMinutes: dailyWorkload[day]?.reduce((sum, a) => sum + a.totalMinutes, 0) || 0,
        employeeWorkloads: dailyWorkload[day] || []
      }))
    };
  }, [spaces, taskTemplates, dailyWorkload]);

  const utilizationPercent = weeklyAvailability > 0
    ? Math.round((weeklyWorkload / weeklyAvailability) * 100)
    : 0;

  const getUtilizationColor = (percent: number) => {
    if (percent <= 70) return 'text-green-600 bg-green-100';
    if (percent <= 90) return 'text-blue-600 bg-blue-100';
    if (percent <= 100) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <RefreshCw size={40} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Analizando programación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-6 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-t-2xl">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <span className="font-semibold">Análisis Inteligente</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{spaces.length}</div>
              <div className="text-xs opacity-80">Espacios</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{taskTemplates.length}</div>
              <div className="text-xs opacity-80">Tareas</div>
            </div>
            <div className="bg-white/20 rounded-lg p-2 text-center">
              <div className="text-xl font-bold">{employees.length}</div>
              <div className="text-xs opacity-80">Empleados</div>
            </div>
          </div>
        </div>

        {/* Indicador de utilización */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Capacidad Semanal</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getUtilizationColor(utilizationPercent)}`}>
              {utilizationPercent}%
            </span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                utilizationPercent <= 100 ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Tareas: {Math.round(weeklyWorkload / 60)}h/sem</span>
            <span>Disponible: {Math.round(weeklyAvailability / 60)}h/sem</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'analysis', label: 'Análisis', icon: BarChart3 },
            { id: 'issues', label: `Alertas (${issues.length})`, icon: AlertTriangle },
            { id: 'coverage', label: 'Cobertura', icon: CheckCircle2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {/* Tab: Análisis */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={18} />
                Carga por Día
              </h3>

              {DAY_NAMES.map(day => {
                const dayAnalysis = dailyWorkload[day] || [];
                const totalDayMinutes = dayAnalysis.reduce((sum, a) => sum + a.totalMinutes, 0);
                const totalDayAvailable = dayAnalysis.reduce((sum, a) => sum + a.availableMinutes, 0);
                const dayPercent = totalDayAvailable > 0
                  ? Math.round((totalDayMinutes / totalDayAvailable) * 100)
                  : 0;
                const isExpanded = expandedDay === day;

                return (
                  <div key={day} className="bg-gray-50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : day)}
                      className="w-full p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-700 w-12">{DAY_LABELS[day]}</span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${dayPercent > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(dayPercent, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${dayPercent > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                          {dayPercent}%
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {dayAnalysis.map(analysis => (
                          <div
                            key={analysis.employeeId}
                            className={`bg-white rounded-lg p-3 ${
                              analysis.isOverloaded ? 'border-2 border-red-200' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User size={16} className="text-gray-500" />
                                <span className="font-medium">{analysis.employeeName}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                analysis.isOverloaded
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {Math.round(analysis.totalMinutes / 60 * 10) / 10}h / {Math.round(analysis.availableMinutes / 60 * 10) / 10}h
                              </span>
                            </div>
                            {analysis.tasks.length > 0 && (
                              <div className="text-xs text-gray-500 space-y-1">
                                {analysis.tasks.slice(0, 5).map((task, i) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="truncate">{task.spaceName}: {task.taskName}</span>
                                    <span className="text-gray-400">{task.minutes}min</span>
                                  </div>
                                ))}
                                {analysis.tasks.length > 5 && (
                                  <div className="text-gray-400">+{analysis.tasks.length - 5} más...</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: Issues */}
          {activeTab === 'issues' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                  <h3 className="font-semibold text-green-800">¡Todo en orden!</h3>
                  <p className="text-sm text-gray-600">No se detectaron problemas en la programación</p>
                </div>
              ) : (
                issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 ${
                      issue.severity === 'high' ? 'bg-red-50 border-l-4 border-red-500' :
                      issue.severity === 'medium' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                      'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {issue.severity === 'high' ? (
                        <AlertCircle size={20} className="text-red-600 mt-0.5" />
                      ) : issue.severity === 'medium' ? (
                        <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                      ) : (
                        <Lightbulb size={20} className="text-blue-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${
                          issue.severity === 'high' ? 'text-red-800' :
                          issue.severity === 'medium' ? 'text-yellow-800' :
                          'text-blue-800'
                        }`}>
                          {issue.description}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          💡 {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Coverage */}
          {activeTab === 'coverage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {coverageReport.coveredSpaces}/{coverageReport.totalSpaces}
                  </div>
                  <div className="text-sm text-green-700">Espacios cubiertos</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {coverageReport.totalTasks}
                  </div>
                  <div className="text-sm text-blue-700">Tareas programadas</div>
                </div>
              </div>

              {coverageReport.uncoveredSpaces.length > 0 && (
                <div className="bg-yellow-50 rounded-xl p-4">
                  <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Espacios sin tareas
                  </h4>
                  <div className="space-y-2">
                    {coverageReport.uncoveredSpaces.map(space => (
                      <div key={space.id} className="flex items-center gap-2 text-sm">
                        <span>{space.space_type?.icon}</span>
                        <span className="text-yellow-700">
                          {space.custom_name || space.space_type?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Home size={16} />
                  Espacios por categoría
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-blue-600">
                      {spaces.filter(s => s.category === 'interior').length}
                    </div>
                    <div className="text-xs text-blue-700">🏠 Interior</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-green-600">
                      {spaces.filter(s => s.category === 'exterior').length}
                    </div>
                    <div className="text-xs text-green-700">🌳 Exterior</div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
