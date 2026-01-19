'use client';

import { useState } from 'react';
import {
  Sun, Moon, Coffee, UtensilsCrossed, Sparkles,
  CheckCircle2, Circle, Clock, Users, Home,
  ShoppingCart, Plus, AlertCircle, TrendingUp,
  ChefHat, Briefcase, ArrowRight, Lightbulb,
  X, ChevronRight
} from 'lucide-react';
import { ScheduledTask } from '@/types';
import ProactiveAlerts from '@/components/ProactiveAlerts';
import ShareButton from '@/components/ShareButton';
import { formatDayMenuForWhatsApp } from '@/lib/whatsapp-share';
import {
  useTodayDashboard,
  useGreeting,
  getMealLabel,
  EmployeeTaskSummary
} from '@/lib/hooks/useTodayDashboard';

interface TodayDashboardProps {
  onNavigateToRecetario: (tab?: string) => void;
  onNavigateToHogar: () => void;
}

export default function TodayDashboard({
  onNavigateToRecetario,
  onNavigateToHogar,
}: TodayDashboardProps) {
  // Estado local para modales
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeTaskSummary | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);

  // Hooks extraídos para datos
  const {
    todayMenu,
    employeeSummaries,
    pendingSuggestions,
    lowSupplies,
    weeklyStats,
    loading
  } = useTodayDashboard();

  const { greeting, timeOfDay, dayOfWeek, formattedDate } = useGreeting();

  // Íconos basados en hora del día
  const getGreetingIcon = () => {
    if (timeOfDay === 'morning') return <Sun className="text-yellow-500" size={24} />;
    if (timeOfDay === 'afternoon') return <Sun className="text-orange-500" size={24} />;
    return <Moon className="text-indigo-500" size={24} />;
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return <Coffee size={18} className="text-amber-600" />;
      case 'lunch': return <UtensilsCrossed size={18} className="text-green-600" />;
      case 'dinner': return <Moon size={18} className="text-indigo-600" />;
      default: return <UtensilsCrossed size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tu día...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header con saludo */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {getGreetingIcon()}
                <h1 className="text-xl font-bold text-gray-800">
                  {greeting}
                </h1>
              </div>
              <p className="text-gray-500 text-sm mt-1 capitalize">
                {dayOfWeek}, {formattedDate}
              </p>
            </div>
            {(pendingSuggestions > 0 || lowSupplies > 0) && (
              <div className="relative">
                <AlertCircle size={24} className="text-orange-500" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {pendingSuggestions + lowSupplies}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Menú de Hoy */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b">
            <div className="flex items-center gap-2">
              <ChefHat size={20} className="text-green-700" />
              <h2 className="font-semibold text-green-800">Menú de Hoy</h2>
            </div>
            <div className="flex items-center gap-2">
              {todayMenu && (
                <ShareButton
                  message={formatDayMenuForWhatsApp({
                    breakfast: todayMenu.breakfast?.name,
                    lunch: todayMenu.lunch?.name,
                    dinner: todayMenu.dinner?.name || null
                  })}
                  title="Compartir menú"
                  variant="icon"
                  className="text-green-600"
                />
              )}
              <button
                onClick={() => onNavigateToRecetario('calendar')}
                className="text-green-600 text-sm flex items-center gap-1 hover:text-green-700"
              >
                Ver <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="divide-y">
            {/* Desayuno */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getMealIcon('breakfast')}
                <div>
                  <p className="text-xs text-gray-500 uppercase">{getMealLabel('breakfast')}</p>
                  <p className="font-medium text-gray-800">
                    {todayMenu?.breakfast?.name || 'Sin definir'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToRecetario('calendar')}
                className="text-gray-400 hover:text-green-600"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Almuerzo */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getMealIcon('lunch')}
                <div>
                  <p className="text-xs text-gray-500 uppercase">{getMealLabel('lunch')}</p>
                  <p className="font-medium text-gray-800">
                    {todayMenu?.lunch?.name || 'Sin definir'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToRecetario('calendar')}
                className="text-gray-400 hover:text-green-600"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Cena */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getMealIcon('dinner')}
                <div>
                  <p className="text-xs text-gray-500 uppercase">{getMealLabel('dinner')}</p>
                  {todayMenu?.dinner ? (
                    <p className="font-medium text-gray-800">{todayMenu.dinner.name}</p>
                  ) : (
                    <p className="text-gray-400 italic">No hay cena programada</p>
                  )}
                </div>
              </div>
              {!todayMenu?.dinner ? (
                <button
                  onClick={() => onNavigateToRecetario('suggestions')}
                  className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-purple-200"
                >
                  <Sparkles size={14} />
                  Generar
                </button>
              ) : (
                <button
                  onClick={() => onNavigateToRecetario('calendar')}
                  className="text-gray-400 hover:text-green-600"
                >
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Hogar Hoy */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b">
            <div className="flex items-center gap-2">
              <Home size={20} className="text-blue-700" />
              <h2 className="font-semibold text-blue-800">Hogar Hoy</h2>
            </div>
            <button
              onClick={onNavigateToHogar}
              className="text-blue-600 text-sm flex items-center gap-1 hover:text-blue-700"
            >
              Ver todo <ArrowRight size={16} />
            </button>
          </div>

          {employeeSummaries.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No hay empleados configurados</p>
              <button
                onClick={onNavigateToHogar}
                className="mt-2 text-blue-600 text-sm hover:underline"
              >
                Configurar hogar
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {employeeSummaries.map(summary => (
                <button
                  key={summary.employee.id}
                  className="p-4 w-full text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee(summary)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        summary.employee.zone === 'interior' ? 'bg-purple-100 text-purple-700' :
                        summary.employee.zone === 'exterior' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {summary.employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{summary.employee.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{summary.employee.zone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {summary.isCheckedIn ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> Presente
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                          Sin registrar
                        </span>
                      )}
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </div>

                  {summary.totalCount > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${(summary.completedCount / summary.totalCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {summary.completedCount}/{summary.totalCount}
                        </span>
                      </div>

                      {/* Próxima tarea pendiente */}
                      {summary.tasks.filter(t => t.status === 'pendiente').slice(0, 1).map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <Clock size={14} className="text-gray-400" />
                          <span>Próxima: {task.task_template?.name || 'Tarea'}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin tareas hoy</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* IA Proactiva - Alertas Inteligentes */}
        <ProactiveAlerts
          onNavigateToMarket={() => onNavigateToRecetario('market')}
          onNavigateToSuggestions={() => onNavigateToRecetario('suggestions')}
        />

        {/* Acciones Rápidas */}
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">Acciones Rápidas</h3>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => onNavigateToRecetario('market')}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <ShoppingCart size={24} className="text-green-600" />
              <span className="text-xs text-gray-600">Mercado</span>
            </button>
            <button
              onClick={() => onNavigateToRecetario('recipes')}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Plus size={24} className="text-blue-600" />
              <span className="text-xs text-gray-600">Receta</span>
            </button>
            <button
              onClick={() => onNavigateToRecetario('suggestions')}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Lightbulb size={24} className="text-purple-600" />
              <span className="text-xs text-gray-600">Sugerencias</span>
            </button>
            <button
              onClick={onNavigateToHogar}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Briefcase size={24} className="text-orange-600" />
              <span className="text-xs text-gray-600">Tareas</span>
            </button>
          </div>
        </section>

        {/* Resumen Semanal */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
            <TrendingUp size={20} className="text-gray-600" />
            <h2 className="font-semibold text-gray-700">Resumen Semanal</h2>
          </div>

          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {weeklyStats.mealsCompleted}
                <span className="text-gray-400 text-lg">/{weeklyStats.mealsTotal}</span>
              </div>
              <p className="text-xs text-gray-500">Comidas registradas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {weeklyStats.tasksCompleted}
                <span className="text-gray-400 text-lg">/{weeklyStats.tasksTotal}</span>
              </div>
              <p className="text-xs text-gray-500">Tareas completadas</p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal de detalle de tarea */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className={`px-4 py-4 border-b ${
              selectedTask.status === 'completada' ? 'bg-green-50' :
              selectedTask.status === 'en_progreso' ? 'bg-blue-50' :
              'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedTask.status === 'completada' ? (
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-green-600" />
                    </div>
                  ) : selectedTask.status === 'en_progreso' ? (
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                      <Clock size={24} className="text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Circle size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">Detalle de Tarea</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedTask.status === 'completada'
                        ? 'bg-green-200 text-green-700'
                        : selectedTask.status === 'en_progreso'
                        ? 'bg-blue-200 text-blue-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {selectedTask.status === 'completada' ? 'Completada' :
                       selectedTask.status === 'en_progreso' ? 'En progreso' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 rounded-full hover:bg-white/50"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Nombre de la tarea */}
              <div>
                <h4 className="text-xl font-bold text-gray-800">
                  {selectedTask.task_template?.name || 'Tarea'}
                </h4>
                {selectedTask.task_template?.description && (
                  <p className="text-gray-500 mt-1">{selectedTask.task_template.description}</p>
                )}
              </div>

              {/* Información del espacio */}
              {selectedTask.space && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">Espacio</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center text-2xl">
                      {selectedTask.space.space_type?.icon || '🏠'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {selectedTask.space.custom_name || selectedTask.space.space_type?.name || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {selectedTask.space.category || 'interior'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información adicional */}
              <div className="grid grid-cols-2 gap-3">
                {/* Fecha programada */}
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-medium">Fecha</p>
                  <p className="font-semibold text-blue-800">
                    {new Date(selectedTask.scheduled_date + 'T12:00:00').toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                </div>

                {/* Duración estimada */}
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-600 font-medium">Duración est.</p>
                  <p className="font-semibold text-purple-800">
                    {selectedTask.task_template?.estimated_minutes
                      ? `${selectedTask.task_template.estimated_minutes} min`
                      : 'No definida'}
                  </p>
                </div>

                {/* Frecuencia */}
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-amber-600 font-medium">Frecuencia</p>
                  <p className="font-semibold text-amber-800 capitalize">
                    {selectedTask.task_template?.frequency || 'No definida'}
                  </p>
                </div>

                {/* Prioridad */}
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-red-600 font-medium">Prioridad</p>
                  <p className="font-semibold text-red-800 capitalize">
                    {selectedTask.task_template?.priority || 'Normal'}
                  </p>
                </div>
              </div>

              {/* Notas */}
              {selectedTask.notes && (
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-xs text-yellow-600 uppercase font-medium mb-1">Notas</p>
                  <p className="text-gray-700">{selectedTask.notes}</p>
                </div>
              )}

              {/* Información de completado */}
              {selectedTask.status === 'completada' && selectedTask.completed_at && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-600 uppercase font-medium mb-1">Completada</p>
                  <p className="text-green-800 font-medium">
                    {new Date(selectedTask.completed_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedTask(null)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de tareas del empleado */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Header del modal */}
            <div className={`px-4 py-4 border-b flex items-center justify-between ${
              selectedEmployee.employee.zone === 'interior' ? 'bg-purple-50' :
              selectedEmployee.employee.zone === 'exterior' ? 'bg-green-50' :
              'bg-blue-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                  selectedEmployee.employee.zone === 'interior' ? 'bg-purple-200 text-purple-700' :
                  selectedEmployee.employee.zone === 'exterior' ? 'bg-green-200 text-green-700' :
                  'bg-blue-200 text-blue-700'
                }`}>
                  {selectedEmployee.employee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedEmployee.employee.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {selectedEmployee.employee.zone} • {selectedEmployee.isCheckedIn ? 'Presente' : 'Sin registrar'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 rounded-full hover:bg-white/50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Resumen */}
              <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-blue-600">{selectedEmployee.completedCount}</p>
                  <p className="text-xs text-gray-500">Completadas</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedEmployee.totalCount - selectedEmployee.completedCount}
                  </p>
                  <p className="text-xs text-gray-500">Pendientes</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-gray-600">{selectedEmployee.totalCount}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>

              {/* Lista de tareas */}
              <h4 className="font-medium text-gray-700 mb-3">Tareas de Hoy</h4>
              {selectedEmployee.tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No hay tareas programadas para hoy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEmployee.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 hover:shadow-md transition-all ${
                        task.status === 'completada'
                          ? 'bg-green-50 border-green-200'
                          : task.status === 'en_progreso'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {task.status === 'completada' ? (
                        <CheckCircle2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                      ) : task.status === 'en_progreso' ? (
                        <Clock size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle size={20} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${
                          task.status === 'completada' ? 'text-green-800 line-through' : 'text-gray-800'
                        }`}>
                          {task.task_template?.name || 'Tarea'}
                        </p>
                        {task.space && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{task.space.space_type?.icon || '🏠'}</span>
                            {task.space.custom_name || task.space.space_type?.name || 'Espacio'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.status === 'completada'
                            ? 'bg-green-200 text-green-700'
                            : task.status === 'en_progreso'
                            ? 'bg-blue-200 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.status === 'completada' ? 'Hecho' :
                           task.status === 'en_progreso' ? 'En curso' : 'Pendiente'}
                        </span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  onNavigateToHogar();
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Ir a Hogar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
