'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle2, Play, Pause,
  ChevronRight, User, X, ChevronDown, ChevronUp,
  RefreshCw, Settings2, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { HomeEmployee, TaskFrequency } from '@/types';

type ScheduleStatus = 'pendiente' | 'en_progreso' | 'completada' | 'omitida';

interface TaskTemplateInfo {
  id: string;
  name: string;
  category?: string | null;
  estimated_minutes?: number | null;
  priority?: string | null;
}

interface ScheduleTask {
  id: string;
  employee_id: string | null;
  status: ScheduleStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  task_template: TaskTemplateInfo | null;
}

interface EmployeeCard {
  id: string;
  name: string;
  zone: 'interior' | 'exterior' | 'ambos';
}

interface EmployeeProgress {
  employee: EmployeeCard;
  tasks: ScheduleTask[];
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
  progressPercent: number;
}

interface ScheduleDashboardProps {
  householdId: string;
  employees: HomeEmployee[];
  onClose: () => void;
  onOpenEditor?: () => void;
}

interface TaskTemplateSeed {
  id: string;
  space_id: string | null;
  assigned_employee_id: string | null;
  frequency: TaskFrequency;
  frequency_days: number | null;
  created_at: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  cocina: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🍳' },
  limpieza: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🧹' },
  lavanderia: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👕' },
  perros: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🐕' },
  piscina: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '🏊' },
  jardin: { bg: 'bg-green-100', text: 'text-green-700', icon: '🌿' },
  administracion: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📋' },
  mantenimiento: { bg: 'bg-slate-100', text: 'text-slate-700', icon: '🔧' },
  general: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📌' },
};

function parseDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function diffInMonths(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function shouldScheduleTemplate(template: TaskTemplateSeed, targetDate: Date): boolean {
  const anchor = template.created_at
    ? new Date(template.created_at)
    : targetDate;

  const anchorDate = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const daysSinceAnchor = diffInDays(anchorDate, target);

  if (daysSinceAnchor < 0) {
    return false;
  }

  if (template.frequency_days && template.frequency_days > 0) {
    return daysSinceAnchor % template.frequency_days === 0;
  }

  switch (template.frequency) {
    case 'diaria':
      return true;
    case 'semanal':
      return daysSinceAnchor % 7 === 0;
    case 'quincenal':
      return daysSinceAnchor % 14 === 0;
    case 'mensual':
      return target.getDate() === anchorDate.getDate();
    case 'trimestral':
      return target.getDate() === anchorDate.getDate() && diffInMonths(anchorDate, target) % 3 === 0;
    case 'personalizada':
      return false;
    default:
      return false;
  }
}

function getNextStatus(status: ScheduleStatus): ScheduleStatus {
  if (status === 'pendiente' || status === 'omitida') return 'en_progreso';
  if (status === 'en_progreso') return 'completada';
  return 'pendiente';
}

export default function ScheduleDashboard({
  householdId,
  employees,
  onClose,
  onOpenEditor
}: ScheduleDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [employeeProgress, setEmployeeProgress] = useState<EmployeeProgress[]>([]);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hasTemplates, setHasTemplates] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const loadDailyTasks = useCallback(async () => {
    setLoading(true);

    const [{ count: templateCount }, { data: tasksData }] = await Promise.all([
      supabase
        .from('task_templates')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('is_active', true),
      supabase
        .from('scheduled_tasks')
        .select('id, employee_id, status, started_at, completed_at, notes, task_template:task_templates(id, name, category, estimated_minutes, priority)')
        .eq('household_id', householdId)
        .eq('scheduled_date', selectedDate)
        .order('created_at'),
    ]);

    setHasTemplates((templateCount || 0) > 0);

    const tasks = (tasksData || []) as unknown as ScheduleTask[];

    const cards: EmployeeCard[] = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      zone: emp.zone,
    }));

    const hasUnassigned = tasks.some(task => !task.employee_id);
    if (hasUnassigned) {
      cards.push({ id: '__unassigned__', name: 'Sin asignar', zone: 'ambos' });
    }

    const progress = cards.map(card => {
      const tasksList = tasks.filter(task =>
        card.id === '__unassigned__' ? !task.employee_id : task.employee_id === card.id
      );

      const completed = tasksList.filter(t => t.status === 'completada').length;
      const inProgress = tasksList.filter(t => t.status === 'en_progreso').length;
      const pending = tasksList.filter(t => t.status === 'pendiente' || t.status === 'omitida').length;
      const total = tasksList.length;

      return {
        employee: card,
        tasks: tasksList,
        completed,
        inProgress,
        pending,
        total,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }).filter(ep => ep.total > 0);

    setEmployeeProgress(progress);
    setLoading(false);
  }, [selectedDate, householdId, employees]);

  const generateDailyTasks = async () => {
    setGenerating(true);
    setGenerationError(null);

    try {
      const targetDate = parseDateOnly(selectedDate);

      const { data: templates, error: templatesError } = await supabase
        .from('task_templates')
        .select('id, space_id, assigned_employee_id, frequency, frequency_days, created_at')
        .eq('household_id', householdId)
        .eq('is_active', true);

      if (templatesError) {
        throw templatesError;
      }

      const activeTemplates = (templates || []) as unknown as TaskTemplateSeed[];
      const applicableTemplates = activeTemplates.filter(template => shouldScheduleTemplate(template, targetDate));

      await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('household_id', householdId)
        .eq('scheduled_date', selectedDate);

      if (applicableTemplates.length > 0) {
        const rows = applicableTemplates.map(template => ({
          household_id: householdId,
          task_template_id: template.id,
          space_id: template.space_id,
          employee_id: template.assigned_employee_id,
          scheduled_date: selectedDate,
          status: 'pendiente' as const,
        }));

        const { error: insertError } = await supabase
          .from('scheduled_tasks')
          .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      await loadDailyTasks();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron generar tareas';
      setGenerationError(message);
    } finally {
      setGenerating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, currentStatus: ScheduleStatus) => {
    const newStatus = getNextStatus(currentStatus);
    const updates: {
      status: ScheduleStatus;
      started_at?: string | null;
      completed_at?: string | null;
    } = { status: newStatus };

    if (newStatus === 'en_progreso') {
      updates.started_at = new Date().toISOString();
      updates.completed_at = null;
    } else if (newStatus === 'completada') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.started_at = null;
      updates.completed_at = null;
    }

    await supabase
      .from('scheduled_tasks')
      .update(updates)
      .eq('id', taskId);

    await loadDailyTasks();
  };

  useEffect(() => {
    loadDailyTasks();
  }, [loadDailyTasks]);

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const changeDate = (days: number) => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const totalTasks = employeeProgress.reduce((sum, ep) => sum + ep.total, 0);
  const totalCompleted = employeeProgress.reduce((sum, ep) => sum + ep.completed, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={24} />
              Horarios del Dia
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-white/20 rounded-xl p-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ChevronDown size={20} className="rotate-90" />
            </button>
            <div className="text-center">
              <div className="font-semibold capitalize">{formatDate(selectedDate)}</div>
              <div className="text-xs text-indigo-200">Programacion diaria</div>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ChevronUp size={20} className="rotate-90" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
              <p className="text-gray-500">Cargando horarios...</p>
            </div>
          ) : !hasTemplates ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Configura las plantillas de tareas
              </h3>
              <p className="text-gray-500 mb-6 px-4">
                Aun no hay plantillas activas para este hogar.
              </p>
              {onOpenEditor && (
                <button
                  onClick={onOpenEditor}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto hover:bg-indigo-700"
                >
                  <Plus size={20} />
                  Crear Plantillas
                </button>
              )}
            </div>
          ) : totalTasks === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No hay tareas para este dia
              </h3>
              <p className="text-gray-500 mb-4">
                Genera tareas desde las plantillas activas
              </p>
              {generationError && (
                <p className="text-sm text-red-600 mb-4 px-4">{generationError}</p>
              )}
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={() => setShowGenerateConfirm(true)}
                  disabled={generating}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      Generar tareas del dia
                    </>
                  )}
                </button>
                {onOpenEditor && (
                  <button
                    onClick={onOpenEditor}
                    className="text-indigo-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-50"
                  >
                    <Settings2 size={18} />
                    Editar plantillas
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-indigo-800">
                    Progreso total
                  </span>
                  <span className="text-sm text-indigo-600">
                    {totalCompleted}/{totalTasks} tareas
                  </span>
                </div>
                <div className="h-3 bg-indigo-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    role="progressbar"
                    aria-valuenow={totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progreso total de tareas"
                    style={{ width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {employeeProgress.map((ep) => (
                <div key={ep.employee.id} className="bg-white border rounded-xl mb-3 overflow-hidden">
                  <button
                    onClick={() => setExpandedEmployee(
                      expandedEmployee === ep.employee.id ? null : ep.employee.id
                    )}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      ep.employee.zone === 'interior' ? 'bg-blue-100' :
                      ep.employee.zone === 'exterior' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      <User size={24} className={
                        ep.employee.zone === 'interior' ? 'text-blue-600' :
                        ep.employee.zone === 'exterior' ? 'text-green-600' : 'text-purple-600'
                      } />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{ep.employee.name}</div>
                      <div className="text-sm text-gray-500">
                        {ep.completed}/{ep.total} completadas ({ep.progressPercent}%)
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            ep.progressPercent >= 100 ? 'bg-green-500' :
                            ep.progressPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          role="progressbar"
                          aria-valuenow={ep.progressPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progreso de ${ep.employee.name}`}
                          style={{ width: `${ep.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`text-gray-400 transition-transform ${
                        expandedEmployee === ep.employee.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {expandedEmployee === ep.employee.id && (
                    <div className="border-t divide-y">
                      {ep.tasks.map((task) => {
                        const template = task.task_template;
                        const categoryName = (template?.category || 'general').toLowerCase();
                        const category = CATEGORY_COLORS[categoryName] || CATEGORY_COLORS.general;
                        return (
                          <div
                            key={task.id}
                            className={`p-3 flex items-center gap-3 ${
                              task.status === 'completada' ? 'bg-green-50' :
                              task.status === 'en_progreso' ? 'bg-blue-50' : ''
                            }`}
                          >
                            <button
                              onClick={() => updateTaskStatus(task.id, task.status)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                task.status === 'completada'
                                  ? 'bg-green-500 text-white' :
                                task.status === 'en_progreso'
                                  ? 'bg-blue-500 text-white' :
                                  'border-2 border-gray-300 text-gray-400 hover:border-blue-500'
                              }`}
                            >
                              {task.status === 'completada' ? (
                                <CheckCircle2 size={18} />
                              ) : task.status === 'en_progreso' ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={14} className="ml-0.5" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <span className={`font-medium ${
                                task.status === 'completada' ? 'text-gray-400 line-through' : ''
                              }`}>
                                {template?.name || 'Tarea'}
                              </span>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${category.bg} ${category.text}`}>
                                  {category.icon} {template?.category || 'general'}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={12} />
                                  {template?.estimated_minutes || 0} min
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {generationError && (
                <p className="text-sm text-red-600 mb-2">{generationError}</p>
              )}

              <button
                onClick={() => setShowGenerateConfirm(true)}
                disabled={generating}
                className="w-full mt-4 py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                Regenerar tareas (sobrescribe existentes)
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showGenerateConfirm}
        onConfirm={() => {
          setShowGenerateConfirm(false);
          generateDailyTasks();
        }}
        onCancel={() => setShowGenerateConfirm(false)}
        title="Regenerar tareas"
        message="Esto reemplazará las tareas ya programadas para esta fecha. ¿Deseas continuar?"
        confirmText="Continuar"
        variant="warning"
      />
    </div>
  );
}
