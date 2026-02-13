'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Trash2, Clock, User, Save, Calendar, Pencil, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { HomeEmployee, TaskFrequency, TaskPriority } from '@/types';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TemplateRecord {
  id: string;
  name: string;
  description: string | null;
  frequency: TaskFrequency;
  frequency_days: number | null;
  estimated_minutes: number;
  priority: TaskPriority;
  category: string | null;
  assigned_employee_id: string | null;
  is_active: boolean;
  employee?: { id: string; name: string } | null;
}

interface ScheduleTemplateEditorProps {
  householdId: string;
  employees: HomeEmployee[];
  onClose: () => void;
  onSave: () => void;
}

interface TemplateFormState {
  name: string;
  description: string;
  frequency: TaskFrequency;
  frequency_days: string;
  estimated_minutes: number;
  priority: TaskPriority;
  category: string;
  assigned_employee_id: string;
  is_active: boolean;
}

const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  personalizada: 'Personalizada',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: 'Alta',
  normal: 'Normal',
  baja: 'Baja',
};

const EMPTY_FORM: TemplateFormState = {
  name: '',
  description: '',
  frequency: 'semanal',
  frequency_days: '',
  estimated_minutes: 30,
  priority: 'normal',
  category: 'limpieza',
  assigned_employee_id: '',
  is_active: true,
};

export default function ScheduleTemplateEditor({
  householdId,
  employees,
  onClose,
  onSave
}: ScheduleTemplateEditorProps) {
  const toast = useToast();
  useEscapeKey(onClose);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<'all' | string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TemplateRecord | null>(null);
  const [taskForm, setTaskForm] = useState<TemplateFormState>(EMPTY_FORM);

  const loadCategories = useCallback(async () => {
    const { data: existingCats } = await supabase
      .from('task_categories')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('sort_order');

    if (existingCats && existingCats.length > 0) {
      setCategories(existingCats);
      return;
    }

    await supabase.rpc('create_default_categories', { p_household_id: householdId });

    const { data: newCats } = await supabase
      .from('task_categories')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('sort_order');

    if (newCats) setCategories(newCats);
  }, [householdId]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('task_templates')
      .select('id, name, description, frequency, frequency_days, estimated_minutes, priority, category, assigned_employee_id, is_active, employee:home_employees(id, name)')
      .eq('household_id', householdId)
      .order('is_active', { ascending: false })
      .order('name');

    if (error) {
      toast.error('No se pudieron cargar las plantillas');
      setLoading(false);
      return;
    }

    setTemplates((data || []) as unknown as TemplateRecord[]);
    setLoading(false);
  }, [householdId, toast]);

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, [loadCategories, loadTemplates]);

  const filteredTemplates = templates.filter(template => {
    if (!showInactive && !template.is_active) return false;
    if (selectedEmployee !== 'all' && template.assigned_employee_id !== selectedEmployee) return false;
    return true;
  });

  const openCreate = () => {
    setEditingTask(null);
    setTaskForm({
      ...EMPTY_FORM,
      category: categories[0]?.name.toLowerCase() || 'limpieza',
      assigned_employee_id: selectedEmployee !== 'all' ? selectedEmployee : '',
    });
    setShowTaskForm(true);
  };

  const openEdit = (template: TemplateRecord) => {
    setEditingTask(template);
    setTaskForm({
      name: template.name,
      description: template.description || '',
      frequency: template.frequency,
      frequency_days: template.frequency_days ? String(template.frequency_days) : '',
      estimated_minutes: template.estimated_minutes || 30,
      priority: template.priority,
      category: template.category || categories[0]?.name.toLowerCase() || 'limpieza',
      assigned_employee_id: template.assigned_employee_id || '',
      is_active: template.is_active,
    });
    setShowTaskForm(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.name.trim()) {
      toast.warning('El nombre de la tarea es obligatorio');
      return;
    }

    const parsedFrequencyDays = Number.parseInt(taskForm.frequency_days || '0', 10);
    if (taskForm.frequency === 'personalizada' && (!parsedFrequencyDays || parsedFrequencyDays <= 0)) {
      toast.warning('Para frecuencia personalizada debes indicar dias > 0');
      return;
    }

    setSaving(true);

    const payload = {
      name: taskForm.name.trim(),
      description: taskForm.description.trim() || null,
      frequency: taskForm.frequency,
      frequency_days: taskForm.frequency === 'personalizada' ? parsedFrequencyDays : null,
      estimated_minutes: Math.max(5, Number(taskForm.estimated_minutes) || 30),
      priority: taskForm.priority,
      category: taskForm.category || null,
      assigned_employee_id: taskForm.assigned_employee_id || null,
      is_active: taskForm.is_active,
    };

    let error: { message?: string } | null = null;

    if (editingTask?.id) {
      const result = await supabase
        .from('task_templates')
        .update(payload)
        .eq('id', editingTask.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('task_templates')
        .insert({ household_id: householdId, ...payload });
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error(error.message || 'No se pudo guardar la plantilla');
      return;
    }

    toast.success(editingTask ? 'Plantilla actualizada' : 'Plantilla creada');
    setShowTaskForm(false);
    setEditingTask(null);
    setTaskForm(EMPTY_FORM);
    await loadTemplates();
    onSave();
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm('Eliminar esta plantilla?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('No se pudo eliminar la plantilla');
      return;
    }

    toast.success('Plantilla eliminada');
    await loadTemplates();
    onSave();
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={24} />
              Editor de Plantillas
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedEmployee('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedEmployee === 'all' ? 'bg-white text-indigo-700' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              Todos
            </button>
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployee(emp.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  selectedEmployee === emp.id ? 'bg-white text-indigo-700' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <User size={14} className="inline mr-1" />
                {emp.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b bg-gray-50 p-3 flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Mostrar inactivas
          </label>

          <button
            onClick={openCreate}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-1 hover:bg-indigo-700"
          >
            <Plus size={18} />
            Nueva plantilla
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No hay plantillas con estos filtros</p>
              <button
                onClick={openCreate}
                className="mt-4 text-indigo-600 font-medium hover:underline"
              >
                + Crear primera plantilla
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((task) => {
                const employeeName = task.employee?.name || 'Sin asignar';
                return (
                  <div
                    key={task.id}
                    className="bg-white border rounded-xl p-3 flex items-start gap-3 hover:shadow-sm transition-shadow"
                  >
                    <div className={`mt-0.5 ${task.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle2 size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">{task.name}</span>
                        {!task.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Inactiva
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {FREQUENCY_LABELS[task.frequency]}
                          {task.frequency === 'personalizada' && task.frequency_days
                            ? ` (${task.frequency_days} dias)`
                            : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <Clock size={11} className="inline mr-1" />
                          {task.estimated_minutes} min
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {task.category || 'general'}
                        </span>
                        <span className="text-gray-500">{employeeName}</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(task)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
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
        </div>

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
              Guardar y salir
            </button>
          </div>
        </div>
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {editingTask ? 'Editar plantilla' : 'Nueva plantilla'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la tarea *
                </label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={e => setTaskForm({ ...taskForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej: Limpiar cocina"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado asignado
                </label>
                <select
                  value={taskForm.assigned_employee_id}
                  onChange={e => setTaskForm({ ...taskForm, assigned_employee_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin asignar</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frecuencia
                  </label>
                  <select
                    value={taskForm.frequency}
                    onChange={e => setTaskForm({ ...taskForm, frequency: e.target.value as TaskFrequency })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {taskForm.frequency === 'personalizada' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cada cuantos dias
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={taskForm.frequency_days}
                    onChange={e => setTaskForm({ ...taskForm, frequency_days: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej: 3"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duracion (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={taskForm.estimated_minutes}
                    onChange={e => setTaskForm({ ...taskForm, estimated_minutes: Number(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={taskForm.category}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion (opcional)
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Instrucciones adicionales..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskForm.is_active}
                  onChange={e => setTaskForm({ ...taskForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm">Plantilla activa</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTaskForm(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTask}
                disabled={saving || !taskForm.name.trim()}
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
