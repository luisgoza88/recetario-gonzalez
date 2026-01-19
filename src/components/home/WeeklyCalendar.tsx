'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, CheckCircle2,
  Clock, User, Plus, X, Circle, Edit3, CalendarDays
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ScheduledTask, HomeEmployee, Space, TaskStatus } from '@/types';

interface WeeklyCalendarProps {
  householdId: string;
  onClose: () => void;
  onEditTask?: (task: ScheduledTask) => void;
}

interface DayData {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  tasks: ScheduledTask[];
  completedCount: number;
  totalCount: number;
}

// Helper para formatear fecha en timezone local (evita problemas con UTC)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WeeklyCalendar({
  householdId,
  onClose,
  onEditTask
}: WeeklyCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (householdId) {
      loadTasks();
    }
  }, [currentDate, viewMode, householdId]);

  const loadTasks = async () => {
    setLoading(true);

    const { startDate, endDate } = getDateRange();

    try {
      // NOTA: Usar !scheduled_tasks_employee_id_fkey para desambiguar la relación
      // ya que hay 2 FKs a home_employees (employee_id y completed_by)
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select(`
          *,
          task_template:task_templates(*),
          space:spaces(*, space_type:space_types(*)),
          employee:home_employees!scheduled_tasks_employee_id_fkey(*)
        `)
        .eq('household_id', householdId)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date');

      if (error) {
        console.error('Error loading tasks:', error);
      } else if (data) {
        setTasks(data);
      }
    } catch (err) {
      console.error('Unexpected error in loadTasks:', err);
    }

    setLoading(false);
  };

  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay()); // Domingo
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // Sábado
      return {
        startDate: formatLocalDate(start),
        endDate: formatLocalDate(end)
      };
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return {
        startDate: formatLocalDate(start),
        endDate: formatLocalDate(end)
      };
    }
  };

  const getWeekDays = (): DayData[] => {
    const days: DayData[] = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = formatLocalDate(date);
      const dayTasks = tasks.filter(t => t.scheduled_date === dateStr);

      days.push({
        date,
        isToday: date.toDateString() === new Date().toDateString(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        tasks: dayTasks,
        completedCount: dayTasks.filter(t => t.status === 'completada').length,
        totalCount: dayTasks.length
      });
    }

    return days;
  };

  const getMonthDays = (): DayData[][] => {
    const weeks: DayData[][] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Start from the Sunday of the first week
    const start = new Date(firstDay);
    start.setDate(start.getDate() - start.getDay());

    let currentWeek: DayData[] = [];

    for (let d = new Date(start); d <= lastDay || currentWeek.length < 7; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const dateStr = formatLocalDate(date);
      const dayTasks = tasks.filter(t => t.scheduled_date === dateStr);

      currentWeek.push({
        date,
        isToday: date.toDateString() === new Date().toDateString(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        tasks: dayTasks,
        completedCount: dayTasks.filter(t => t.status === 'completada').length,
        totalCount: dayTasks.length
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return weeks;
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleTaskStatus = async (task: ScheduledTask) => {
    setUpdatingTaskId(task.id);
    const newStatus: ScheduledTask['status'] = task.status === 'completada' ? 'pendiente' : 'completada';

    try {
      await supabase
        .from('scheduled_tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completada' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      // Actualizar tareas localmente
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));

      // Actualizar selectedDay si está seleccionado
      if (selectedDay) {
        const updatedTasks: ScheduledTask[] = selectedDay.tasks.map(t =>
          t.id === task.id ? { ...t, status: newStatus } : t
        );
        setSelectedDay({
          ...selectedDay,
          tasks: updatedTasks,
          completedCount: updatedTasks.filter(t => t.status === 'completada').length
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDaySelect = (day: DayData) => {
    // Si ya está seleccionado el mismo día, deseleccionar
    if (selectedDay && selectedDay.date.toDateString() === day.date.toDateString()) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  // Función para obtener las tareas del día seleccionado en tiempo real
  const getSelectedDayTasks = () => {
    if (!selectedDay) return [];
    const dateStr = formatLocalDate(selectedDay.date);
    return tasks.filter(t => t.scheduled_date === dateStr);
  };

  // Contar tareas del día seleccionado
  const selectedDayTasks = getSelectedDayTasks();
  const selectedDayCompletedCount = selectedDayTasks.filter(t => t.status === 'completada').length;

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <span className="font-semibold">Calendario</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Navigation Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold capitalize text-lg">{formatMonthYear(currentDate)}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="text-sm text-purple-600 hover:underline"
                >
                  Hoy
                </button>
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => navigateDate(1)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-white shadow-sm' : ''
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'month' ? 'bg-white shadow-sm' : ''
                }`}
              >
                Mes
              </button>
            </div>
          </div>

      {/* Calendar Grid */}
      <div className="p-2">
        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <p className="text-sm text-gray-500 mt-2">Cargando tareas...</p>
          </div>
        )}

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-1">
            {getWeekDays().map((day, i) => (
              <DayCell
                key={i}
                day={day}
                onClick={() => handleDaySelect(day)}
                isSelected={selectedDay?.date.toDateString() === day.date.toDateString()}
              />
            ))}
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="space-y-1">
            {getMonthDays().map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => (
                  <DayCell
                    key={di}
                    day={day}
                    onClick={() => handleDaySelect(day)}
                    isSelected={selectedDay?.date.toDateString() === day.date.toDateString()}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Completadas
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Pendientes
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Atrasadas
        </span>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="border-t bg-gray-50">
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div>
              <h3 className="font-semibold text-gray-800 capitalize">
                {selectedDay.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedDayTasks.length > 0
                  ? `${selectedDayCompletedCount}/${selectedDayTasks.length} tareas completadas`
                  : 'Sin tareas programadas'}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            {selectedDayTasks.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedDayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border ${
                      task.status === 'completada'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        disabled={updatingTaskId === task.id}
                        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          task.status === 'completada'
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        } ${updatingTaskId === task.id ? 'opacity-50' : ''}`}
                      >
                        {task.status === 'completada' && <CheckCircle2 size={14} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.status === 'completada' ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                          {task.task_template?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{task.space?.space_type?.icon} {task.space?.custom_name || task.space?.space_type?.name}</span>
                          {task.employee && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {task.employee.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {onEditTask && (
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CalendarDays size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No hay tareas para este día</p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedDay.date > new Date()
                    ? 'Puedes programar tareas desde el generador'
                    : 'Este día ya pasó'}
                </p>
              </div>
            )}
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

// Day Cell Component
interface DayCellProps {
  day: DayData;
  onClick: () => void;
  isSelected?: boolean;
}

function DayCell({ day, onClick, isSelected }: DayCellProps) {
  const hasOverdue = day.date < new Date() && day.completedCount < day.totalCount && !day.isToday;
  const allCompleted = day.totalCount > 0 && day.completedCount === day.totalCount;
  const hasPending = day.totalCount - day.completedCount > 0;

  return (
    <button
      onClick={onClick}
      className={`
        min-h-[52px] p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center
        ${isSelected ? 'border-purple-500 bg-purple-100 ring-2 ring-purple-200' : ''}
        ${!isSelected && day.isToday ? 'border-blue-500 bg-blue-50' : ''}
        ${!isSelected && !day.isToday ? 'border-transparent hover:bg-gray-100' : ''}
        ${!day.isCurrentMonth && 'opacity-40'}
        ${!isSelected && hasOverdue ? 'bg-amber-50' : ''}
        ${!isSelected && allCompleted ? 'bg-green-50' : ''}
      `}
    >
      {/* Date Number */}
      <div className={`text-base font-semibold ${
        isSelected ? 'text-purple-700' : day.isToday ? 'text-blue-600' : 'text-gray-700'
      }`}>
        {day.date.getDate()}
      </div>

      {/* Task Indicator - simple dots */}
      {day.totalCount > 0 && (
        <div className="flex items-center gap-0.5 mt-1">
          {allCompleted ? (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          ) : hasOverdue ? (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          ) : hasPending ? (
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          ) : null}
          <span className="text-[10px] text-gray-500 ml-0.5">{day.totalCount}</span>
        </div>
      )}
    </button>
  );
}
