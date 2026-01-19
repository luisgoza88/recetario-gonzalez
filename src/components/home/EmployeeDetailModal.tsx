'use client';

import { useState, useEffect } from 'react';
import {
  X, User, Edit2, Check, Clock, Home, MapPin, Plus, Trash2,
  Calendar, CheckCircle2, ChevronRight, Save, ArrowLeft,
  Building, TreeDeciduous, Settings, Star, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee, Space, ScheduledTask } from '@/types';

interface EmployeeDetailModalProps {
  employee: HomeEmployee;
  householdId: string;
  spaces: Space[];
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface EmployeeSpaceAssignment {
  id: string;
  employee_id: string;
  space_id: string;
  is_primary: boolean;
  can_substitute: boolean;
  space?: Space;
}

type TabType = 'info' | 'spaces' | 'tasks' | 'schedule';

const DAYS = [
  { key: 'lunes', label: 'Lunes', short: 'L' },
  { key: 'martes', label: 'Martes', short: 'M' },
  { key: 'miercoles', label: 'Miércoles', short: 'X' },
  { key: 'jueves', label: 'Jueves', short: 'J' },
  { key: 'viernes', label: 'Viernes', short: 'V' },
  { key: 'sabado', label: 'Sábado', short: 'S' },
];

const defaultSchedule: Record<string, DaySchedule> = {
  lunes: { enabled: true, startTime: '08:00', endTime: '17:00' },
  martes: { enabled: true, startTime: '08:00', endTime: '17:00' },
  miercoles: { enabled: true, startTime: '08:00', endTime: '17:00' },
  jueves: { enabled: true, startTime: '08:00', endTime: '17:00' },
  viernes: { enabled: true, startTime: '08:00', endTime: '17:00' },
  sabado: { enabled: false, startTime: '08:00', endTime: '12:00' },
};

const calculateWeeklyHours = (schedule: Record<string, DaySchedule>): number => {
  let total = 0;
  for (const day of Object.values(schedule)) {
    if (day.enabled) {
      const start = day.startTime.split(':').map(Number);
      const end = day.endTime.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      total += (endMinutes - startMinutes) / 60;
    }
  }
  return Math.round(total * 10) / 10;
};

export default function EmployeeDetailModal({
  employee,
  householdId,
  spaces,
  onClose,
  onUpdate,
  onDelete
}: EmployeeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState(employee.name);
  const [zone, setZone] = useState<'interior' | 'exterior' | 'ambos'>(employee.zone);
  const [phone, setPhone] = useState(employee.phone || '');
  const [notes, setNotes] = useState(employee.notes || '');
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
    (employee.schedule as Record<string, DaySchedule>) || defaultSchedule
  );

  // Space assignments
  const [spaceAssignments, setSpaceAssignments] = useState<EmployeeSpaceAssignment[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [showAddSpace, setShowAddSpace] = useState(false);

  // Tasks
  const [recentTasks, setRecentTasks] = useState<ScheduledTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    loadSpaceAssignments();
    loadRecentTasks();
  }, [employee.id]);

  const loadSpaceAssignments = async () => {
    setLoadingSpaces(true);
    try {
      const { data } = await supabase
        .from('employee_space_assignments')
        .select('*, space:spaces(*, space_type:space_types(*))')
        .eq('employee_id', employee.id);

      if (data) {
        setSpaceAssignments(data);
      }
    } catch (error) {
      console.error('Error loading space assignments:', error);
      // If table doesn't exist, just set empty array
      setSpaceAssignments([]);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const loadRecentTasks = async () => {
    setLoadingTasks(true);
    try {
      const { data } = await supabase
        .from('scheduled_tasks')
        .select('*, task_template:task_templates(*), space:spaces(*, space_type:space_types(*))')
        .eq('employee_id', employee.id)
        .order('scheduled_date', { ascending: false })
        .limit(10);

      if (data) {
        setRecentTasks(data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const saveEmployee = async () => {
    setSaving(true);
    try {
      const workDays = Object.entries(schedule)
        .filter(([_, s]) => s.enabled)
        .map(([day]) => day);

      const totalHours = calculateWeeklyHours(schedule);
      const hoursPerDay = workDays.length > 0 ? Math.round(totalHours / workDays.length) : 8;

      const { error } = await supabase
        .from('home_employees')
        .update({
          name: name.trim(),
          zone,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          work_days: workDays,
          hours_per_day: hoursPerDay
        })
        .eq('id', employee.id);

      if (error) throw error;

      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const addSpaceAssignment = async (spaceId: string, isPrimary: boolean = false) => {
    try {
      // First try to create the table if it doesn't exist
      const { error } = await supabase
        .from('employee_space_assignments')
        .insert({
          employee_id: employee.id,
          space_id: spaceId,
          is_primary: isPrimary,
          can_substitute: true
        });

      if (error) throw error;

      setShowAddSpace(false);
      loadSpaceAssignments();
    } catch (error) {
      console.error('Error adding space assignment:', error);
      // If table doesn't exist, show helpful message
      alert('Necesitas crear la tabla employee_space_assignments primero');
    }
  };

  const removeSpaceAssignment = async (assignmentId: string) => {
    if (!confirm('¿Quitar este espacio asignado?')) return;

    try {
      await supabase
        .from('employee_space_assignments')
        .delete()
        .eq('id', assignmentId);

      loadSpaceAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const togglePrimarySpace = async (assignmentId: string, currentValue: boolean) => {
    try {
      await supabase
        .from('employee_space_assignments')
        .update({ is_primary: !currentValue })
        .eq('id', assignmentId);

      loadSpaceAssignments();
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const toggleDay = (dayKey: string) => {
    setSchedule({
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        enabled: !schedule[dayKey].enabled
      }
    });
  };

  const updateDayTime = (dayKey: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule({
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        [field]: value
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar a ${employee.name}? Esta acción no se puede deshacer.`)) return;

    try {
      await supabase
        .from('home_employees')
        .update({ active: false })
        .eq('id', employee.id);

      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  // Get spaces not yet assigned
  const availableSpaces = spaces.filter(
    s => !spaceAssignments.some(a => a.space_id === s.id)
  );

  const interiorSpaces = availableSpaces.filter(s => s.category === 'interior');
  const exteriorSpaces = availableSpaces.filter(s => s.category === 'exterior');

  const getZoneColor = (z: string) => {
    switch (z) {
      case 'interior': return 'bg-blue-500';
      case 'exterior': return 'bg-green-500';
      default: return 'bg-purple-500';
    }
  };

  const getZoneIcon = (z: string) => {
    switch (z) {
      case 'interior': return <Building size={16} />;
      case 'exterior': return <TreeDeciduous size={16} />;
      default: return <Home size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-6 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header with employee info */}
        <div className={`${getZoneColor(zone)} text-white p-4 rounded-t-2xl`}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  <Edit2 size={18} />
                </button>
              ) : (
                <button
                  onClick={saveEmployee}
                  disabled={saving}
                  className="p-2 hover:bg-white/20 rounded-lg"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <Save size={18} />
                  )}
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-500/50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User size={32} />
            </div>
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/20 text-white placeholder-white/60 px-3 py-2 rounded-lg text-lg font-bold"
                  placeholder="Nombre del empleado"
                />
              ) : (
                <h2 className="text-xl font-bold">{name}</h2>
              )}
              <div className="flex items-center gap-2 mt-1 text-white/80">
                {getZoneIcon(zone)}
                <span className="text-sm capitalize">{zone}</span>
                <span className="text-white/50">•</span>
                <Clock size={14} />
                <span className="text-sm">{calculateWeeklyHours(schedule)}h/sem</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'info', label: 'Info', icon: <User size={16} /> },
            { id: 'spaces', label: 'Espacios', icon: <MapPin size={16} /> },
            { id: 'tasks', label: 'Tareas', icon: <CheckCircle2 size={16} /> },
            { id: 'schedule', label: 'Horario', icon: <Calendar size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Zone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona de trabajo principal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'interior', label: '🏠 Interior', color: 'blue' },
                    { value: 'exterior', label: '🌳 Exterior', color: 'green' },
                    { value: 'ambos', label: '🏡 Ambos', color: 'purple' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => editing && setZone(option.value as typeof zone)}
                      disabled={!editing}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        zone === option.value
                          ? option.color === 'blue' ? 'bg-blue-600 text-white' :
                            option.color === 'green' ? 'bg-green-600 text-white' :
                            'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      } ${!editing ? 'cursor-default' : 'hover:opacity-90'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Nota: Puedes asignar espacios de cualquier zona en la pestaña "Espacios"
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 300 123 4567"
                  />
                ) : (
                  <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700">
                    {phone || 'Sin teléfono registrado'}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                {editing ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="Información adicional sobre el empleado..."
                  />
                ) : (
                  <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-700 min-h-[60px]">
                    {notes || 'Sin notas'}
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{spaceAssignments.length}</p>
                  <p className="text-xs text-blue-700">Espacios</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {recentTasks.filter(t => t.status === 'completada').length}
                  </p>
                  <p className="text-xs text-green-700">Completadas</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Object.values(schedule).filter(s => s.enabled).length}
                  </p>
                  <p className="text-xs text-purple-700">Días/sem</p>
                </div>
              </div>
            </div>
          )}

          {/* SPACES TAB */}
          {activeTab === 'spaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Espacios asignados</h3>
                <button
                  onClick={() => setShowAddSpace(true)}
                  className="text-blue-600 text-sm font-medium flex items-center gap-1"
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>

              {loadingSpaces ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  Cargando...
                </div>
              ) : spaceAssignments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <MapPin size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500 mb-3">Sin espacios asignados</p>
                  <button
                    onClick={() => setShowAddSpace(true)}
                    className="text-blue-600 font-medium text-sm"
                  >
                    + Asignar primer espacio
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {spaceAssignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                        assignment.space?.category === 'interior'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        assignment.space?.category === 'interior'
                          ? 'bg-blue-100'
                          : 'bg-green-100'
                      }`}>
                        <span className="text-lg">
                          {assignment.space?.space_type?.icon || '📍'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {assignment.space?.custom_name || assignment.space?.space_type?.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={assignment.space?.category === 'interior' ? 'text-blue-600' : 'text-green-600'}>
                            {assignment.space?.category === 'interior' ? '🏠 Interior' : '🌳 Exterior'}
                          </span>
                          {assignment.is_primary && (
                            <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                              ⭐ Principal
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePrimarySpace(assignment.id, assignment.is_primary)}
                          className={`p-2 rounded-lg ${
                            assignment.is_primary
                              ? 'text-yellow-600 bg-yellow-100'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={assignment.is_primary ? 'Quitar como principal' : 'Marcar como principal'}
                        >
                          <Star size={16} fill={assignment.is_primary ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => removeSpaceAssignment(assignment.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Space Modal */}
              {showAddSpace && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold">Asignar espacio</h3>
                      <button onClick={() => setShowAddSpace(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                      {/* Interior Spaces */}
                      {interiorSpaces.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                            <Building size={16} />
                            Interiores
                          </h4>
                          <div className="space-y-2">
                            {interiorSpaces.map(space => (
                              <button
                                key={space.id}
                                onClick={() => addSpaceAssignment(space.id)}
                                className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-3 text-left transition-colors"
                              >
                                <span className="text-xl">{space.space_type?.icon}</span>
                                <span className="font-medium">{space.custom_name || space.space_type?.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exterior Spaces */}
                      {exteriorSpaces.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                            <TreeDeciduous size={16} />
                            Exteriores
                          </h4>
                          <div className="space-y-2">
                            {exteriorSpaces.map(space => (
                              <button
                                key={space.id}
                                onClick={() => addSpaceAssignment(space.id)}
                                className="w-full p-3 bg-green-50 hover:bg-green-100 rounded-xl flex items-center gap-3 text-left transition-colors"
                              >
                                <span className="text-xl">{space.space_type?.icon}</span>
                                <span className="font-medium">{space.custom_name || space.space_type?.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {interiorSpaces.length === 0 && exteriorSpaces.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <AlertCircle size={32} className="mx-auto mb-2" />
                          <p>Todos los espacios ya están asignados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Tareas recientes</h3>

              {loadingTasks ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  Cargando...
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Sin tareas registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 ${
                        task.status === 'completada'
                          ? 'bg-green-50 border-green-200'
                          : task.status === 'pendiente'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        task.status === 'completada'
                          ? 'bg-green-500 text-white'
                          : task.status === 'pendiente'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-300 text-white'
                      }`}>
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {task.task_template?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {task.space?.space_type?.icon} {task.space?.custom_name || task.space?.space_type?.name}
                          <span className="text-gray-300 mx-1">•</span>
                          {new Date(task.scheduled_date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Horario semanal</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-blue-600 text-sm font-medium"
                  >
                    Editar
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {DAYS.map(day => {
                  const daySchedule = schedule[day.key] || { enabled: false, startTime: '08:00', endTime: '17:00' };
                  return (
                    <div
                      key={day.key}
                      className={`rounded-xl border-2 transition-colors ${
                        daySchedule.enabled
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => editing && toggleDay(day.key)}
                            disabled={!editing}
                            className={`flex items-center gap-2 ${!editing ? 'cursor-default' : ''}`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              daySchedule.enabled
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {daySchedule.enabled && <Check size={12} className="text-white" />}
                            </div>
                            <span className={`font-medium ${daySchedule.enabled ? 'text-blue-800' : 'text-gray-500'}`}>
                              {day.label}
                            </span>
                          </button>

                          {daySchedule.enabled && (
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-blue-600" />
                              {editing ? (
                                <>
                                  <input
                                    type="time"
                                    value={daySchedule.startTime}
                                    onChange={(e) => updateDayTime(day.key, 'startTime', e.target.value)}
                                    className="px-2 py-1 border rounded-lg text-sm w-24 bg-white"
                                  />
                                  <span className="text-gray-400">-</span>
                                  <input
                                    type="time"
                                    value={daySchedule.endTime}
                                    onChange={(e) => updateDayTime(day.key, 'endTime', e.target.value)}
                                    className="px-2 py-1 border rounded-lg text-sm w-24 bg-white"
                                  />
                                </>
                              ) : (
                                <span className="text-sm text-blue-700">
                                  {daySchedule.startTime} - {daySchedule.endTime}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly summary */}
              <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-between">
                <span className="text-gray-600">Total semanal</span>
                <span className="font-bold text-blue-600 text-lg">
                  {calculateWeeklyHours(schedule)} horas
                </span>
              </div>

              {editing && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSchedule((employee.schedule as Record<string, DaySchedule>) || defaultSchedule);
                      setEditing(false);
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveEmployee}
                    disabled={saving}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <Check size={20} />
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Close Button */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
