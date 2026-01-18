'use client';

import { useState } from 'react';
import {
  X, Plus, User, Trash2, Edit2, Check, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee } from '@/types';

interface EmployeesPanelProps {
  householdId: string;
  employees: HomeEmployee[];
  onClose: () => void;
  onUpdate: () => void;
}

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface EmployeeForm {
  id?: string;
  name: string;
  zone: 'interior' | 'exterior' | 'ambos';
  schedule: Record<string, DaySchedule>;
}

const DAYS = [
  { key: 'lunes', label: 'Lunes', short: 'Lun' },
  { key: 'martes', label: 'Martes', short: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié' },
  { key: 'jueves', label: 'Jueves', short: 'Jue' },
  { key: 'viernes', label: 'Viernes', short: 'Vie' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb' },
];

const defaultSchedule: Record<string, DaySchedule> = {
  lunes: { enabled: true, startTime: '08:00', endTime: '17:00' },
  martes: { enabled: true, startTime: '08:00', endTime: '17:00' },
  miercoles: { enabled: true, startTime: '08:00', endTime: '17:00' },
  jueves: { enabled: true, startTime: '08:00', endTime: '17:00' },
  viernes: { enabled: true, startTime: '08:00', endTime: '17:00' },
  sabado: { enabled: false, startTime: '08:00', endTime: '12:00' },
};

const emptyForm: EmployeeForm = {
  name: '',
  zone: 'interior',
  schedule: { ...defaultSchedule }
};

// Calcular horas totales por semana
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

// Convertir schedule a work_days y hours_per_day para compatibilidad
const scheduleToLegacy = (schedule: Record<string, DaySchedule>) => {
  const workDays = Object.entries(schedule)
    .filter(([_, s]) => s.enabled)
    .map(([day]) => day);

  const totalHours = calculateWeeklyHours(schedule);
  const hoursPerDay = workDays.length > 0 ? Math.round(totalHours / workDays.length) : 8;

  return { workDays, hoursPerDay };
};

// Convertir datos legacy a schedule
const legacyToSchedule = (workDays: string[], hoursPerDay: number, existingSchedule?: Record<string, DaySchedule>): Record<string, DaySchedule> => {
  // Si ya existe un schedule guardado, usarlo
  if (existingSchedule && Object.keys(existingSchedule).length > 0) {
    return existingSchedule;
  }

  // Si no, crear uno basado en workDays y hoursPerDay
  const schedule: Record<string, DaySchedule> = {};
  const endHour = 8 + hoursPerDay;
  const endTime = `${endHour.toString().padStart(2, '0')}:00`;

  for (const day of DAYS) {
    schedule[day.key] = {
      enabled: workDays.includes(day.key),
      startTime: '08:00',
      endTime: workDays.includes(day.key) ? endTime : '12:00'
    };
  }

  return schedule;
};

export default function EmployeesPanel({
  householdId,
  employees,
  onClose,
  onUpdate
}: EmployeesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const startNew = () => {
    setEditingEmployee({ ...emptyForm, schedule: { ...defaultSchedule } });
    setShowForm(true);
  };

  const startEdit = (emp: HomeEmployee) => {
    const schedule = legacyToSchedule(
      emp.work_days || [],
      emp.hours_per_day || 8,
      emp.schedule as Record<string, DaySchedule> | undefined
    );

    setEditingEmployee({
      id: emp.id,
      name: emp.name,
      zone: emp.zone,
      schedule
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  const toggleDay = (dayKey: string) => {
    if (!editingEmployee) return;
    setEditingEmployee({
      ...editingEmployee,
      schedule: {
        ...editingEmployee.schedule,
        [dayKey]: {
          ...editingEmployee.schedule[dayKey],
          enabled: !editingEmployee.schedule[dayKey].enabled
        }
      }
    });
  };

  const updateDayTime = (dayKey: string, field: 'startTime' | 'endTime', value: string) => {
    if (!editingEmployee) return;
    setEditingEmployee({
      ...editingEmployee,
      schedule: {
        ...editingEmployee.schedule,
        [dayKey]: {
          ...editingEmployee.schedule[dayKey],
          [field]: value
        }
      }
    });
  };

  const saveEmployee = async () => {
    if (!editingEmployee || !editingEmployee.name.trim()) return;

    setSaving(true);
    try {
      const { workDays, hoursPerDay } = scheduleToLegacy(editingEmployee.schedule);

      // Datos básicos (sin schedule por ahora - columna pendiente en DB)
      const data = {
        household_id: householdId,
        name: editingEmployee.name.trim(),
        zone: editingEmployee.zone,
        work_days: workDays,
        hours_per_day: hoursPerDay,
        active: true
      };

      let error;
      if (editingEmployee.id) {
        const result = await supabase
          .from('home_employees')
          .update(data)
          .eq('id', editingEmployee.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('home_employees')
          .insert(data);
        error = result.error;
      }

      if (error) {
        console.error('Error saving employee:', error);
        alert('Error al guardar: ' + error.message);
        return;
      }

      onUpdate();
      cancelForm();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return;

    setDeleting(id);
    try {
      await supabase
        .from('home_employees')
        .update({ active: false })
        .eq('id', id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setDeleting(null);
    }
  };

  const getEmployeeHours = (emp: HomeEmployee): string => {
    if (emp.schedule) {
      const hours = calculateWeeklyHours(emp.schedule as Record<string, DaySchedule>);
      return `${hours}h/sem`;
    }
    return `${(emp.work_days?.length || 0) * (emp.hours_per_day || 8)}h/sem`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User size={20} />
            <span className="font-semibold">Gestionar Empleados</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Employee List */}
          {!showForm && (
            <>
              <div className="space-y-2">
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User size={40} className="mx-auto mb-2 opacity-50" />
                    <p>No hay empleados registrados</p>
                  </div>
                ) : (
                  employees.map(emp => (
                    <div
                      key={emp.id}
                      className="bg-gray-50 rounded-xl p-4 flex items-center gap-3"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        emp.zone === 'interior' ? 'bg-blue-100' :
                        emp.zone === 'exterior' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        <User size={24} className={
                          emp.zone === 'interior' ? 'text-blue-600' :
                          emp.zone === 'exterior' ? 'text-green-600' : 'text-purple-600'
                        } />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{emp.name}</p>
                        <p className="text-sm text-gray-500">
                          {emp.zone === 'interior' ? '🏠 Interior' :
                           emp.zone === 'exterior' ? '🌳 Exterior' : '🏡 Ambos'}
                          {' • '}{emp.work_days?.length || 0} días • {getEmployeeHours(emp)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(emp)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteEmployee(emp.id)}
                          disabled={deleting === emp.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={startNew}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <Plus size={20} />
                Agregar Empleado
              </button>
            </>
          )}

          {/* Employee Form */}
          {showForm && editingEmployee && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                {editingEmployee.id ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  placeholder="Ej: María García"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona de trabajo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'interior', label: '🏠 Interior', color: 'blue' },
                    { value: 'exterior', label: '🌳 Exterior', color: 'green' },
                    { value: 'ambos', label: '🏡 Ambos', color: 'purple' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setEditingEmployee({
                        ...editingEmployee,
                        zone: option.value as 'interior' | 'exterior' | 'ambos'
                      })}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        editingEmployee.zone === option.value
                          ? option.color === 'blue' ? 'bg-blue-600 text-white' :
                            option.color === 'green' ? 'bg-green-600 text-white' :
                            'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule by Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horario de trabajo
                </label>
                <div className="space-y-2">
                  {DAYS.map(day => {
                    const daySchedule = editingEmployee.schedule[day.key];
                    return (
                      <div
                        key={day.key}
                        className={`rounded-xl border-2 transition-colors ${
                          daySchedule.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleDay(day.key)}
                              className="flex items-center gap-2"
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
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Weekly summary */}
                <div className="mt-3 bg-gray-100 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total semanal</span>
                  <span className="font-semibold text-blue-600">
                    {calculateWeeklyHours(editingEmployee.schedule)} horas
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={cancelForm}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEmployee}
                  disabled={saving || !editingEmployee.name.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
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
            </div>
          )}

          {/* Close button when not in form */}
          {!showForm && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
