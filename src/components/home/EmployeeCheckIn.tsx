'use client';

import { useState, useEffect } from 'react';
import {
  X, LogIn, LogOut, Clock, User, Calendar,
  CheckCircle2, MapPin, Timer
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { HomeEmployee } from '@/types';

interface EmployeeCheckInProps {
  householdId: string;
  employees: HomeEmployee[];
  onClose: () => void;
  onUpdate: () => void;
}

interface CheckInRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string;
  check_out_time?: string;
  total_hours?: number;
  notes?: string;
}

export default function EmployeeCheckIn({
  householdId,
  employees,
  onClose,
  onUpdate
}: EmployeeCheckInProps) {
  const [todayRecords, setTodayRecords] = useState<CheckInRecord[]>([]);
  const [weekRecords, setWeekRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  useEffect(() => {
    loadRecords();
  }, [householdId]);

  const loadRecords = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Registros de hoy
    const { data: todayData } = await supabase
      .from('employee_checkins')
      .select('*')
      .eq('household_id', householdId)
      .eq('date', today);

    if (todayData) setTodayRecords(todayData);

    // Registros de la semana
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: weekData } = await supabase
      .from('employee_checkins')
      .select('*')
      .eq('household_id', householdId)
      .gte('date', weekStartStr)
      .order('date', { ascending: false });

    if (weekData) setWeekRecords(weekData);

    setLoading(false);
  };

  const checkIn = async (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    await supabase.from('employee_checkins').insert({
      household_id: householdId,
      employee_id: employeeId,
      date: today,
      check_in_time: now
    });

    loadRecords();
    onUpdate();
  };

  const checkOut = async (recordId: string, checkInTime: string) => {
    const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // Calcular horas trabajadas
    const [inH, inM] = checkInTime.split(':').map(Number);
    const [outH, outM] = now.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    await supabase
      .from('employee_checkins')
      .update({
        check_out_time: now,
        total_hours: totalHours
      })
      .eq('id', recordId);

    loadRecords();
    onUpdate();
  };

  const getEmployeeRecord = (employeeId: string) => {
    return todayRecords.find(r => r.employee_id === employeeId);
  };

  const getWeeklyHours = (employeeId: string) => {
    return weekRecords
      .filter(r => r.employee_id === employeeId && r.total_hours)
      .reduce((sum, r) => sum + (r.total_hours || 0), 0);
  };

  const formatTime = (time: string) => {
    return time;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock size={20} />
            <span className="font-semibold">Control de Asistencia</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'today'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setActiveTab('week')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'week'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Esta Semana
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto" />
            </div>
          ) : activeTab === 'today' ? (
            // Today's Check-ins
            <div className="space-y-3">
              {employees.map(emp => {
                const record = getEmployeeRecord(emp.id);
                const isCheckedIn = record && !record.check_out_time;
                const isCheckedOut = record && record.check_out_time;

                return (
                  <div
                    key={emp.id}
                    className={`rounded-xl p-4 border-2 ${
                      isCheckedIn
                        ? 'border-green-300 bg-green-50'
                        : isCheckedOut
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{emp.name}</h3>
                          {isCheckedIn && (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              Activo
                            </span>
                          )}
                        </div>
                        {record && (
                          <p className="text-sm text-gray-500">
                            Entrada: {formatTime(record.check_in_time)}
                            {record.check_out_time && ` • Salida: ${formatTime(record.check_out_time)}`}
                            {record.total_hours && ` • ${record.total_hours}h`}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      {!record ? (
                        <button
                          onClick={() => checkIn(emp.id)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-teal-700"
                        >
                          <LogIn size={18} />
                          Entrada
                        </button>
                      ) : isCheckedIn ? (
                        <button
                          onClick={() => checkOut(record.id, record.check_in_time)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-red-600"
                        >
                          <LogOut size={18} />
                          Salida
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <CheckCircle2 size={16} />
                          Completado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Weekly Summary
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-teal-700">
                    {weekRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0).toFixed(1)}h
                  </div>
                  <p className="text-sm text-teal-600">Total horas</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-700">
                    {weekRecords.length}
                  </div>
                  <p className="text-sm text-blue-600">Jornadas</p>
                </div>
              </div>

              {/* Per Employee */}
              <h4 className="font-semibold text-gray-700 mt-4">Por Empleado</h4>
              <div className="space-y-2">
                {employees.map(emp => {
                  const weeklyHours = getWeeklyHours(emp.id);
                  const expectedHours = (emp.work_days?.length || 0) * emp.hours_per_day;
                  const progress = expectedHours > 0 ? (weeklyHours / expectedHours) * 100 : 0;

                  return (
                    <div key={emp.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            emp.zone === 'interior' ? 'bg-blue-100' :
                            emp.zone === 'exterior' ? 'bg-green-100' : 'bg-purple-100'
                          }`}>
                            <User size={16} className={
                              emp.zone === 'interior' ? 'text-blue-600' :
                              emp.zone === 'exterior' ? 'text-green-600' : 'text-purple-600'
                            } />
                          </div>
                          <span className="font-medium">{emp.name}</span>
                        </div>
                        <span className="text-lg font-bold text-teal-600">
                          {weeklyHours.toFixed(1)}h
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {weeklyHours.toFixed(1)} / {expectedHours}h esperadas
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Daily Breakdown */}
              <h4 className="font-semibold text-gray-700 mt-4">Detalle por Día</h4>
              <div className="space-y-2">
                {weekRecords.map(record => {
                  const emp = employees.find(e => e.id === record.employee_id);
                  return (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{emp?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {record.check_in_time} - {record.check_out_time || '...'}
                        </p>
                        {record.total_hours && (
                          <p className="text-xs text-teal-600 font-medium">{record.total_hours}h</p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
