'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle2, Play, Pause,
  ChevronRight, User, Star, X, ChevronDown, ChevronUp,
  RefreshCw, Settings2, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee } from '@/types';

interface ScheduleTask {
  id: string;
  date: string;
  template_id: string;
  employee_id: string;
  task_name: string;
  time_start: string;
  time_end: string;
  category: string;
  is_special: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface EmployeeProgress {
  employee: HomeEmployee;
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  cocina: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🍳' },
  limpieza: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🧹' },
  lavanderia: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👕' },
  perros: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🐕' },
  piscina: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '🏊' },
  jardin: { bg: 'bg-green-100', text: 'text-green-700', icon: '🌿' },
  administracion: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📋' },
  mantenimiento: { bg: 'bg-slate-100', text: 'text-slate-700', icon: '🔧' },
};

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
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cycleWeek, setCycleWeek] = useState<number>(1);
  const [hasTemplates, setHasTemplates] = useState<boolean>(false);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('task_categories')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('sort_order');

    if (data) setCategories(data);
  }, [householdId]);

  const loadDailyTasks = useCallback(async () => {
    setLoading(true);

    // Obtener la semana del ciclo
    const { data: weekData } = await supabase
      .rpc('get_cycle_week', { target_date: selectedDate });

    if (weekData) setCycleWeek(weekData);

    // Verificar si hay plantillas para este hogar
    const { count: templateCount } = await supabase
      .from('schedule_templates')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId);

    setHasTemplates((templateCount || 0) > 0);

    // Cargar tareas para los empleados del hogar
    const progress: EmployeeProgress[] = [];

    for (const emp of employees) {
      const { data: tasks } = await supabase
        .from('daily_task_instances')
        .select('*')
        .eq('date', selectedDate)
        .eq('employee_id', emp.id)
        .eq('household_id', householdId)
        .order('time_start');

      const tasksList = tasks || [];
      const completed = tasksList.filter(t => t.status === 'completed').length;
      const inProgress = tasksList.filter(t => t.status === 'in_progress').length;
      const pending = tasksList.filter(t => t.status === 'pending').length;
      const total = tasksList.length;

      progress.push({
        employee: emp,
        tasks: tasksList,
        completed,
        inProgress,
        pending,
        total,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    }

    setEmployeeProgress(progress);
    setLoading(false);
  }, [selectedDate, householdId, employees]);

  const generateDailyTasks = async () => {
    setGenerating(true);

    const { data, error } = await supabase
      .rpc('generate_daily_tasks', {
        target_date: selectedDate,
        p_household_id: householdId
      });

    if (error) {
      console.error('Error generating tasks:', error);
    } else {
      console.log(`Generated ${data} tasks`);
    }

    setGenerating(false);
    loadDailyTasks();
  };

  const updateTaskStatus = async (taskId: string, newStatus: ScheduleTask['status']) => {
    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'in_progress') {
      updates.started_at = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    await supabase
      .from('daily_task_instances')
      .update(updates)
      .eq('id', taskId);

    loadDailyTasks();
  };

  useEffect(() => {
    loadDailyTasks();
    loadCategories();
  }, [loadDailyTasks, loadCategories]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const totalTasks = employeeProgress.reduce((sum, ep) => sum + ep.total, 0);
  const totalCompleted = employeeProgress.reduce((sum, ep) => sum + ep.completed, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={24} />
              Horarios del Día
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-white/20 rounded-xl p-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ChevronDown size={20} className="rotate-90" />
            </button>
            <div className="text-center">
              <div className="font-semibold capitalize">{formatDate(selectedDate)}</div>
              <div className="text-xs text-indigo-200">Semana {cycleWeek} del ciclo</div>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ChevronUp size={20} className="rotate-90" />
            </button>
          </div>
        </div>

        {/* Content */}
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
                Configura los horarios del personal
              </h3>
              <p className="text-gray-500 mb-6 px-4">
                Aún no has creado plantillas de horarios. Crea el cronograma semanal para tus empleados.
              </p>
              {onOpenEditor && (
                <button
                  onClick={onOpenEditor}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto hover:bg-indigo-700"
                >
                  <Plus size={20} />
                  Crear Horarios
                </button>
              )}
            </div>
          ) : totalTasks === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No hay tareas para este día
              </h3>
              <p className="text-gray-500 mb-4">
                Genera las tareas desde las plantillas del cronograma
              </p>
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={generateDailyTasks}
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
                      Generar tareas del día
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
              {/* Summary */}
              <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-indigo-800">
                    Progreso Total
                  </span>
                  <span className="text-sm text-indigo-600">
                    {totalCompleted}/{totalTasks} tareas
                  </span>
                </div>
                <div className="h-3 bg-indigo-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Employee Cards */}
              {employeeProgress.map((ep) => (
                <div key={ep.employee.id} className="bg-white border rounded-xl mb-3 overflow-hidden">
                  {/* Employee Header */}
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
                      {/* Mini progress bar */}
                      <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            ep.progressPercent >= 100 ? 'bg-green-500' :
                            ep.progressPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
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

                  {/* Tasks List */}
                  {expandedEmployee === ep.employee.id && (
                    <div className="border-t divide-y">
                      {ep.tasks.map((task) => {
                        const category = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.limpieza;
                        return (
                          <div
                            key={task.id}
                            className={`p-3 flex items-center gap-3 ${
                              task.status === 'completed' ? 'bg-green-50' :
                              task.status === 'in_progress' ? 'bg-blue-50' : ''
                            }`}
                          >
                            {/* Status Button */}
                            <button
                              onClick={() => {
                                if (task.status === 'pending') {
                                  updateTaskStatus(task.id, 'in_progress');
                                } else if (task.status === 'in_progress') {
                                  updateTaskStatus(task.id, 'completed');
                                } else if (task.status === 'completed') {
                                  updateTaskStatus(task.id, 'pending');
                                }
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                task.status === 'completed'
                                  ? 'bg-green-500 text-white' :
                                task.status === 'in_progress'
                                  ? 'bg-blue-500 text-white' :
                                  'border-2 border-gray-300 text-gray-400 hover:border-blue-500'
                              }`}
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle2 size={18} />
                              ) : task.status === 'in_progress' ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={14} className="ml-0.5" />
                              )}
                            </button>

                            {/* Task Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${
                                  task.status === 'completed' ? 'text-gray-400 line-through' : ''
                                }`}>
                                  {task.task_name}
                                </span>
                                {task.is_special && (
                                  <Star size={14} className="text-amber-500 fill-amber-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${category.bg} ${category.text}`}>
                                  {category.icon} {task.category}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatTime(task.time_start)} - {formatTime(task.time_end)}
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

              {/* Regenerate Button */}
              <button
                onClick={generateDailyTasks}
                disabled={generating}
                className="w-full mt-4 py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} className={generating ? 'animate-spin' : ''} />
                Regenerar tareas (sobreescribe existentes)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
