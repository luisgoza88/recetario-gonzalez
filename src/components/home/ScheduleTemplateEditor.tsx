'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, Copy, ChevronLeft, ChevronRight,
  Clock, User, Save, Star, GripVertical, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee } from '@/types';

interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ScheduleTemplate {
  id?: string;
  employee_id: string;
  week_number: number;
  day_of_week: number;
  time_start: string;
  time_end: string;
  task_name: string;
  task_description?: string;
  is_special: boolean;
  category: string;
  category_id?: string;
  order_index: number;
}

interface ScheduleTemplateEditorProps {
  householdId: string;
  employees: HomeEmployee[];
  onClose: () => void;
  onSave: () => void;
}

const DAYS = [
  { num: 1, name: 'Lunes', short: 'Lun' },
  { num: 2, name: 'Martes', short: 'Mar' },
  { num: 3, name: 'Miércoles', short: 'Mié' },
  { num: 4, name: 'Jueves', short: 'Jue' },
  { num: 5, name: 'Viernes', short: 'Vie' },
  { num: 6, name: 'Sábado', short: 'Sáb' },
  { num: 0, name: 'Domingo', short: 'Dom' },
];

const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function ScheduleTemplateEditor({
  householdId,
  employees,
  onClose,
  onSave
}: ScheduleTemplateEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTemplate | null>(null);

  // Form state
  const [taskForm, setTaskForm] = useState<Partial<ScheduleTemplate>>({
    task_name: '',
    time_start: '08:00',
    time_end: '09:00',
    category: 'limpieza',
    is_special: false,
    task_description: ''
  });

  const loadCategories = useCallback(async () => {
    // Primero verificar si el hogar tiene categorías
    const { data: existingCats } = await supabase
      .from('task_categories')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('sort_order');

    if (existingCats && existingCats.length > 0) {
      setCategories(existingCats);
    } else {
      // Crear categorías default para este hogar
      await supabase.rpc('create_default_categories', { p_household_id: householdId });

      // Recargar
      const { data: newCats } = await supabase
        .from('task_categories')
        .select('*')
        .eq('household_id', householdId)
        .eq('active', true)
        .order('sort_order');

      if (newCats) setCategories(newCats);
    }
  }, [householdId]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase
      .from('schedule_templates')
      .select('*')
      .eq('household_id', householdId)
      .order('week_number')
      .order('day_of_week')
      .order('order_index')
      .order('time_start');

    if (data) setTemplates(data);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    loadCategories();
    loadTemplates();
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0].id);
    }
  }, [loadCategories, loadTemplates, employees, selectedEmployee]);

  const filteredTemplates = templates.filter(t =>
    t.week_number === selectedWeek &&
    t.day_of_week === selectedDay &&
    (!selectedEmployee || t.employee_id === selectedEmployee)
  );

  const handleAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      task_name: '',
      time_start: '08:00',
      time_end: '09:00',
      category: categories[0]?.name.toLowerCase() || 'limpieza',
      is_special: false,
      task_description: ''
    });
    setShowTaskForm(true);
  };

  const handleEditTask = (task: ScheduleTemplate) => {
    setEditingTask(task);
    setTaskForm({
      task_name: task.task_name,
      time_start: task.time_start,
      time_end: task.time_end,
      category: task.category,
      is_special: task.is_special,
      task_description: task.task_description || ''
    });
    setShowTaskForm(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.task_name || !selectedEmployee) return;

    setSaving(true);

    const category = categories.find(c =>
      c.name.toLowerCase() === taskForm.category?.toLowerCase()
    );

    const templateData = {
      household_id: householdId,
      employee_id: selectedEmployee,
      week_number: selectedWeek,
      day_of_week: selectedDay,
      time_start: taskForm.time_start,
      time_end: taskForm.time_end,
      task_name: taskForm.task_name,
      task_description: taskForm.task_description || null,
      is_special: taskForm.is_special || false,
      category: taskForm.category,
      category_id: category?.id || null,
      order_index: editingTask?.order_index || filteredTemplates.length
    };

    if (editingTask?.id) {
      await supabase
        .from('schedule_templates')
        .update(templateData)
        .eq('id', editingTask.id);
    } else {
      await supabase
        .from('schedule_templates')
        .insert(templateData);
    }

    setSaving(false);
    setShowTaskForm(false);
    loadTemplates();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;

    await supabase
      .from('schedule_templates')
      .delete()
      .eq('id', taskId);

    loadTemplates();
  };

  const handleCopyDay = async (toWeek: number, toDay: number) => {
    if (!selectedEmployee) return;

    const tasksToCopy = filteredTemplates;
    if (tasksToCopy.length === 0) {
      alert('No hay tareas para copiar');
      return;
    }

    setSaving(true);

    for (const task of tasksToCopy) {
      await supabase
        .from('schedule_templates')
        .insert({
          ...task,
          id: undefined,
          week_number: toWeek,
          day_of_week: toDay
        });
    }

    setSaving(false);
    loadTemplates();
    alert(`${tasksToCopy.length} tareas copiadas a Semana ${toWeek}, ${DAYS.find(d => d.num === toDay)?.name}`);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={24} />
              Editor de Horarios
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Employee Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployee(emp.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedEmployee === emp.id
                    ? 'bg-white text-indigo-700'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <User size={16} className="inline mr-1" />
                {emp.name}
              </button>
            ))}
          </div>
        </div>

        {/* Week & Day Selector */}
        <div className="border-b bg-gray-50 p-3">
          {/* Week selector */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
              disabled={selectedWeek === 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-indigo-700 min-w-[120px] text-center">
              Semana {selectedWeek} de 4
            </span>
            <button
              onClick={() => setSelectedWeek(w => Math.min(4, w + 1))}
              disabled={selectedWeek === 4}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day selector */}
          <div className="flex gap-1 overflow-x-auto">
            {DAYS.map(day => {
              const dayTasks = templates.filter(t =>
                t.week_number === selectedWeek &&
                t.day_of_week === day.num &&
                (!selectedEmployee || t.employee_id === selectedEmployee)
              );
              return (
                <button
                  key={day.num}
                  onClick={() => setSelectedDay(day.num)}
                  className={`flex-1 min-w-[48px] py-2 px-1 rounded-lg text-center transition-all ${
                    selectedDay === day.num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-indigo-50'
                  }`}
                >
                  <div className="text-xs font-medium">{day.short}</div>
                  {dayTasks.length > 0 && (
                    <div className={`text-[10px] mt-0.5 ${
                      selectedDay === day.num ? 'text-indigo-200' : 'text-gray-400'
                    }`}>
                      {dayTasks.length} tareas
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <>
              {/* Day Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {DAYS.find(d => d.num === selectedDay)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedEmployeeData?.name} - Semana {selectedWeek}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const nextWeek = selectedWeek < 4 ? selectedWeek + 1 : 1;
                      handleCopyDay(nextWeek, selectedDay);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    title="Copiar a siguiente semana"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1 hover:bg-indigo-700"
                  >
                    <Plus size={18} />
                    Agregar
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No hay tareas para este día</p>
                  <button
                    onClick={handleAddTask}
                    className="mt-4 text-indigo-600 font-medium hover:underline"
                  >
                    + Agregar primera tarea
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((task) => {
                    const category = categories.find(c =>
                      c.name.toLowerCase() === task.category?.toLowerCase()
                    );
                    const colorClass = COLOR_MAP[category?.color || 'gray'] || COLOR_MAP.gray;

                    return (
                      <div
                        key={task.id}
                        className="bg-white border rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="text-gray-300 cursor-grab">
                          <GripVertical size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{task.task_name}</span>
                            {task.is_special && (
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${colorClass}`}>
                              {category?.icon} {category?.name || task.category}
                            </span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(task.time_start)} - {formatTime(task.time_end)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => task.id && handleDeleteTask(task.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Guardar y Salir
            </button>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
            </h3>

            <div className="space-y-4">
              {/* Task Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la tarea *
                </label>
                <input
                  type="text"
                  value={taskForm.task_name || ''}
                  onChange={e => setTaskForm({ ...taskForm, task_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej: Barrer y trapear sala"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora inicio
                  </label>
                  <input
                    type="time"
                    value={taskForm.time_start || '08:00'}
                    onChange={e => setTaskForm({ ...taskForm, time_start: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora fin
                  </label>
                  <input
                    type="time"
                    value={taskForm.time_end || '09:00'}
                    onChange={e => setTaskForm({ ...taskForm, time_end: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={taskForm.category || ''}
                  onChange={e => setTaskForm({ ...taskForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name.toLowerCase()}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={taskForm.task_description || ''}
                  onChange={e => setTaskForm({ ...taskForm, task_description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Instrucciones adicionales..."
                />
              </div>

              {/* Special */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskForm.is_special || false}
                  onChange={e => setTaskForm({ ...taskForm, is_special: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <Star size={16} className="text-amber-500" />
                <span className="text-sm">Marcar como tarea especial</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTaskForm(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTask}
                disabled={saving || !taskForm.task_name}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
