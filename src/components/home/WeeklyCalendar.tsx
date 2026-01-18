'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, CheckCircle2,
  Clock, User, Plus, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ScheduledTask, HomeEmployee, Space } from '@/types';

interface WeeklyCalendarProps {
  householdId: string;
  onClose: () => void;
}

interface DayData {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  tasks: ScheduledTask[];
  completedCount: number;
  totalCount: number;
}

export default function WeeklyCalendar({
  householdId,
  onClose
}: WeeklyCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [currentDate, viewMode, householdId]);

  const loadTasks = async () => {
    setLoading(true);

    const { startDate, endDate } = getDateRange();

    const { data } = await supabase
      .from('scheduled_tasks')
      .select(`
        *,
        task_template:task_templates(*),
        space:spaces(*, space_type:space_types(*)),
        employee:home_employees(*)
      `)
      .eq('household_id', householdId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date');

    if (data) setTasks(data);
    setLoading(false);
  };

  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay()); // Domingo
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // Sábado
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
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
      const dateStr = date.toISOString().split('T')[0];
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
      const dateStr = date.toISOString().split('T')[0];
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
                onClick={() => setSelectedDay(day)}
                detailed
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
                    onClick={() => setSelectedDay(day)}
                    compact
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
      {selectedDay && selectedDay.tasks.length > 0 && (
        <div className="border-t p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {selectedDay.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedDay.tasks.map((task, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg text-sm ${
                  task.status === 'completada'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                <div className="font-medium">{task.task_template?.name}</div>
                <div className="text-xs opacity-75">
                  {task.space?.space_type?.icon} {task.space?.custom_name || task.space?.space_type?.name}
                </div>
              </div>
            ))}
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
  detailed?: boolean;
  compact?: boolean;
}

function DayCell({ day, onClick, detailed, compact }: DayCellProps) {
  const hasOverdue = day.date < new Date() && day.completedCount < day.totalCount && !day.isToday;
  const allCompleted = day.totalCount > 0 && day.completedCount === day.totalCount;

  return (
    <button
      onClick={onClick}
      className={`
        ${detailed ? 'min-h-[100px]' : 'min-h-[60px]'}
        p-2 rounded-lg border transition-all
        ${day.isToday ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'}
        ${!day.isCurrentMonth && 'opacity-40'}
        ${hasOverdue ? 'bg-amber-50' : ''}
        ${allCompleted ? 'bg-green-50' : ''}
      `}
    >
      {/* Date Number */}
      <div className={`text-sm font-semibold mb-1 ${
        day.isToday ? 'text-blue-600' : ''
      }`}>
        {day.date.getDate()}
      </div>

      {/* Task Summary */}
      {day.totalCount > 0 && (
        <div className="space-y-1">
          {detailed ? (
            // Detailed view - show task pills
            <div className="space-y-1">
              {day.tasks.slice(0, 3).map((task, i) => (
                <div
                  key={i}
                  className={`text-xs px-1.5 py-0.5 rounded truncate ${
                    task.status === 'completada'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {task.task_template?.name}
                </div>
              ))}
              {day.tasks.length > 3 && (
                <div className="text-xs text-gray-400">
                  +{day.tasks.length - 3} más
                </div>
              )}
            </div>
          ) : (
            // Compact view - just show dots/count
            <div className="flex items-center justify-center gap-1">
              {day.completedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              )}
              {day.totalCount - day.completedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
              <span className="text-xs text-gray-500">{day.totalCount}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
