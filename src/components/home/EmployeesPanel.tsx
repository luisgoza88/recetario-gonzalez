'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, User, Trash2, Edit2, Check, ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee } from '@/types';

interface EmployeesPanelProps {
  householdId: string;
  employees: HomeEmployee[];
  onClose: () => void;
  onUpdate: () => void;
}

const DAYS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
];

interface EmployeeForm {
  id?: string;
  name: string;
  zone: 'interior' | 'exterior' | 'ambos';
  workDays: string[];
  hoursPerDay: number;
}

const emptyForm: EmployeeForm = {
  name: '',
  zone: 'interior',
  workDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  hoursPerDay: 8
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
    setEditingEmployee({ ...emptyForm });
    setShowForm(true);
  };

  const startEdit = (emp: HomeEmployee) => {
    setEditingEmployee({
      id: emp.id,
      name: emp.name,
      zone: emp.zone,
      workDays: emp.work_days || [],
      hoursPerDay: emp.hours_per_day || 8
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  const toggleDay = (day: string) => {
    if (!editingEmployee) return;
    const days = editingEmployee.workDays.includes(day)
      ? editingEmployee.workDays.filter(d => d !== day)
      : [...editingEmployee.workDays, day];
    setEditingEmployee({ ...editingEmployee, workDays: days });
  };

  const saveEmployee = async () => {
    if (!editingEmployee || !editingEmployee.name.trim()) return;

    setSaving(true);
    try {
      const data = {
        household_id: householdId,
        name: editingEmployee.name.trim(),
        zone: editingEmployee.zone,
        work_days: editingEmployee.workDays,
        hours_per_day: editingEmployee.hoursPerDay,
        active: true
      };

      if (editingEmployee.id) {
        await supabase
          .from('home_employees')
          .update(data)
          .eq('id', editingEmployee.id);
      } else {
        await supabase
          .from('home_employees')
          .insert(data);
      }

      onUpdate();
      cancelForm();
    } catch (error) {
      console.error('Error saving employee:', error);
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
                          {' • '}{emp.work_days?.length || 0} días/sem
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

              {/* Work Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días de trabajo
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day.key}
                      onClick={() => toggleDay(day.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editingEmployee.workDays.includes(day.key)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours per day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horas por día
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={editingEmployee.hoursPerDay}
                  onChange={(e) => setEditingEmployee({
                    ...editingEmployee,
                    hoursPerDay: parseInt(e.target.value) || 8
                  })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
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
