'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, Clock, User, ChevronLeft, ChevronRight,
  Star, Camera, Play, Pause, MoreVertical, AlertTriangle,
  TrendingUp, Sparkles, Filter, Eye, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ScheduledTask, HomeEmployee, Space } from '@/types';

interface DailyDashboardProps {
  householdId: string;
  employees: HomeEmployee[];
  spaces: Space[];
  onClose: () => void;
  onTaskComplete: () => void;
  onOpenInspection: (task: ScheduledTask) => void;
  onOpenRating: (task: ScheduledTask) => void;
}

interface TasksByEmployee {
  employee: HomeEmployee | null;
  tasks: ScheduledTask[];
  totalMinutes: number;
  completedMinutes: number;
  isCheckedIn: boolean;
  checkInTime?: string;
}

export default function DailyDashboard({
  householdId,
  employees,
  spaces,
  onClose,
  onTaskComplete,
  onOpenInspection,
  onOpenRating
}: DailyDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeCheckins, setEmployeeCheckins] = useState<Record<string, { isCheckedIn: boolean; time?: string }>>({});
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadTasks();
    loadCheckins();
  }, [selectedDate, householdId]);

  const loadTasks = async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('scheduled_tasks')
      .select(`
        *,
        task_template:task_templates(*),
        space:spaces(*, space_type:space_types(*)),
        employee:home_employees(*)
      `)
      .eq('household_id', householdId)
      .eq('scheduled_date', dateStr)
      .order('created_at');

    if (data) setTasks(data);
    setLoading(false);
  };

  const loadCheckins = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('employee_checkins')
      .select('*')
      .eq('household_id', householdId)
      .eq('date', dateStr);

    if (data) {
      const checkins: Record<string, { isCheckedIn: boolean; time?: string }> = {};
      data.forEach(c => {
        checkins[c.employee_id] = {
          isCheckedIn: !c.check_out_time,
          time: c.check_in_time
        };
      });
      setEmployeeCheckins(checkins);
    }
  };

  const toggleTaskStatus = async (task: ScheduledTask) => {
    const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';
    const now = new Date();

    // Calculate actual minutes from started_at if available
    let actualMinutes: number | null = null;
    if (newStatus === 'completada' && task.started_at) {
      const startedAt = new Date(task.started_at);
      actualMinutes = Math.round((now.getTime() - startedAt.getTime()) / (1000 * 60));
    }

    await supabase
      .from('scheduled_tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completada' ? now.toISOString() : null,
        actual_minutes: actualMinutes,
        // Reset started_at if going back to pending
        ...(newStatus === 'pendiente' ? { started_at: null } : {})
      })
      .eq('id', task.id);

    // Si se completa, registrar en historial con tiempo REAL
    if (newStatus === 'completada') {
      await supabase.from('cleaning_history').insert({
        household_id: householdId,
        space_id: task.space_id,
        task_id: task.id,
        task_name: task.task_template?.name,
        employee_id: task.employee_id,
        completed_at: now.toISOString(),
        // Use actual measured time, or fallback to estimate
        actual_minutes: actualMinutes || task.task_template?.estimated_minutes
      });
    }

    loadTasks();
    onTaskComplete();
  };

  const startTask = async (task: ScheduledTask) => {
    await supabase
      .from('scheduled_tasks')
      .update({
        status: 'en_progreso',
        started_at: new Date().toISOString()
      })
      .eq('id', task.id);

    loadTasks();
  };

  // Agrupar tareas por empleado
  const tasksByEmployee: TasksByEmployee[] = employees.map(emp => {
    const empTasks = tasks.filter(t => t.employee_id === emp.id);
    const filtered = filterStatus === 'all'
      ? empTasks
      : empTasks.filter(t => filterStatus === 'completed' ? t.status === 'completada' : t.status !== 'completada');

    return {
      employee: emp,
      tasks: filtered,
      totalMinutes: empTasks.reduce((sum, t) => sum + (t.task_template?.estimated_minutes || 0), 0),
      completedMinutes: empTasks
        .filter(t => t.status === 'completada')
        .reduce((sum, t) => sum + (t.task_template?.estimated_minutes || 0), 0),
      isCheckedIn: employeeCheckins[emp.id]?.isCheckedIn || false,
      checkInTime: employeeCheckins[emp.id]?.time
    };
  });

  // Tareas sin asignar
  const unassignedTasks = tasks.filter(t => !t.employee_id);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completada').length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <span className="font-semibold">Dashboard del Día</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date Navigation */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <p className={`font-semibold capitalize ${isToday ? 'text-blue-600' : ''}`}>
                  {isToday ? '📅 Hoy' : formatDate(selectedDate)}
                </p>
                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Volver a hoy
                  </button>
                )}
              </div>

              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} />
            <span className="font-semibold">Progreso del Día</span>
          </div>
          <span className="text-2xl font-bold">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-3 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-blue-100">
          <span>{completedTasks} completadas</span>
          <span>{totalTasks - completedTasks} pendientes</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Pendientes' },
          { value: 'completed', label: 'Completadas' }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value as typeof filterStatus)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks by Employee */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : tasksByEmployee.length === 0 && unassignedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-600">No hay tareas programadas para este día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasksByEmployee.map(({ employee, tasks: empTasks, totalMinutes, completedMinutes, isCheckedIn, checkInTime }) => {
            if (!employee) return null;
            const isExpanded = expandedEmployee === employee.id || expandedEmployee === null;
            const empProgress = totalMinutes > 0 ? (completedMinutes / totalMinutes) * 100 : 0;

            return (
              <div key={employee.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Employee Header */}
                <button
                  onClick={() => setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    employee.zone === 'interior' ? 'bg-blue-100' :
                    employee.zone === 'exterior' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <User size={24} className={
                      employee.zone === 'interior' ? 'text-blue-600' :
                      employee.zone === 'exterior' ? 'text-green-600' : 'text-purple-600'
                    } />
                  </div>

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{employee.name}</span>
                      {isCheckedIn && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {empTasks.length} tareas • {Math.round(totalMinutes / 60 * 10) / 10}h estimadas
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{Math.round(empProgress)}%</div>
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${empProgress}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Employee Tasks */}
                {isExpanded && empTasks.length > 0 && (
                  <div className="border-t divide-y">
                    {empTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTaskStatus(task)}
                        onStart={() => startTask(task)}
                        onInspect={() => onOpenInspection(task)}
                        onRate={() => onOpenRating(task)}
                      />
                    ))}
                  </div>
                )}

                {isExpanded && empTasks.length === 0 && (
                  <div className="p-4 text-center text-gray-500 border-t">
                    No hay tareas {filterStatus === 'pending' ? 'pendientes' : filterStatus === 'completed' ? 'completadas' : ''} para {employee.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned Tasks */}
          {unassignedTasks.length > 0 && (
            <div className="bg-amber-50 rounded-xl shadow-sm overflow-hidden border border-amber-200">
              <div className="p-4 flex items-center gap-3 border-b border-amber-200">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-amber-600" />
                </div>
                <div>
                  <span className="font-semibold text-amber-800">Sin Asignar</span>
                  <p className="text-sm text-amber-600">{unassignedTasks.length} tareas sin empleado</p>
                </div>
              </div>
              <div className="divide-y divide-amber-200">
                {unassignedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskStatus(task)}
                    onStart={() => startTask(task)}
                    onInspect={() => onOpenInspection(task)}
                    onRate={() => onOpenRating(task)}
                  />
                ))}
              </div>
            </div>
          )}
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

// Task Card Component with Live Timer
interface TaskCardProps {
  task: ScheduledTask;
  onToggle: () => void;
  onStart: () => void;
  onInspect: () => void;
  onRate: () => void;
}

function TaskCard({ task, onToggle, onStart, onInspect, onRate }: TaskCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isCompleted = task.status === 'completada';
  const isInProgress = task.status === 'en_progreso';

  // Live timer for in-progress tasks
  useEffect(() => {
    if (!isInProgress || !task.started_at) {
      setElapsedTime(0);
      return;
    }

    const startedAt = new Date(task.started_at).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startedAt) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isInProgress, task.started_at]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage vs estimated time
  const estimatedSeconds = (task.task_template?.estimated_minutes || 30) * 60;
  const progressPercent = Math.min(100, (elapsedTime / estimatedSeconds) * 100);
  const isOverTime = elapsedTime > estimatedSeconds;

  return (
    <div className={`p-4 ${isCompleted ? 'bg-green-50' : isInProgress ? 'bg-blue-50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-blue-500'
          }`}
        >
          {isCompleted && <CheckCircle2 size={16} />}
        </button>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isCompleted ? 'text-gray-400 line-through' : ''}`}>
            {task.task_template?.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              {task.space?.space_type?.icon}
              {task.space?.custom_name || task.space?.space_type?.name}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              {task.task_template?.estimated_minutes} min
            </span>
          </div>

          {/* Live Timer with Progress Bar */}
          {isInProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isOverTime ? 'bg-red-500' : 'bg-blue-600'}`} />
                  <span className={`text-lg font-mono font-bold ${isOverTime ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatTime(elapsedTime)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  / {task.task_template?.estimated_minutes} min
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isOverTime ? 'bg-red-500' : progressPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              {isOverTime && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Excedido por {formatTime(elapsedTime - estimatedSeconds)}
                </p>
              )}
            </div>
          )}

          {/* Show actual time after completion */}
          {isCompleted && task.actual_minutes !== undefined && task.actual_minutes !== null && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className={`font-medium ${
                task.actual_minutes <= (task.task_template?.estimated_minutes || 30)
                  ? 'text-green-600'
                  : 'text-orange-600'
              }`}>
                Tiempo real: {task.actual_minutes} min
              </span>
              {task.actual_minutes <= (task.task_template?.estimated_minutes || 30) ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Eficiente
                </span>
              ) : (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  +{task.actual_minutes - (task.task_template?.estimated_minutes || 30)} min
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isCompleted && !isInProgress && (
            <button
              onClick={onStart}
              className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
              title="Iniciar tarea"
            >
              <Play size={18} />
            </button>
          )}

          {isInProgress && (
            <button
              onClick={onToggle}
              className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 bg-blue-50"
              title="Completar tarea"
            >
              <Pause size={18} />
            </button>
          )}

          {isCompleted && (
            <>
              <button
                onClick={onRate}
                className="p-2 hover:bg-gray-100 rounded-lg text-amber-500"
                title="Calificar"
              >
                <Star size={18} />
              </button>
              <button
                onClick={onInspect}
                className="p-2 hover:bg-gray-100 rounded-lg text-purple-600"
                title="Inspeccionar"
              >
                <Eye size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
