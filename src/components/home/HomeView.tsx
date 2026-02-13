'use client';

import { useState } from 'react';
import {
  Home, Calendar, Settings, AlertTriangle,
  User, ChevronRight, Plus, Sparkles, BarChart3, Clock
} from 'lucide-react';
import { useHousehold, useHouseholdData, useToggleTaskStatus, useRefreshHomeData } from '@/lib/hooks/useHomeData';
import { ScheduledTask } from '@/types';
import HomeModals, { type ActiveModal } from './HomeModals';
import HomeTodayTasks from './HomeTodayTasks';
import HomeQuickActions from './HomeQuickActions';
import HomeAnalyticsSummary from './HomeAnalyticsSummary';
import SmartAlerts from './SmartAlerts';
import Button from '@/components/ui/Button';

interface HomeViewProps {
  initialHouseholdId?: string;
}

export default function HomeView({ initialHouseholdId }: HomeViewProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: 'none' });

  const closeModal = () => setActiveModal({ type: 'none' });
  const openModal = (modal: ActiveModal) => setActiveModal(modal);

  // Data fetching via TanStack Query
  const { data: household, isLoading: householdLoading } = useHousehold();
  const { spaces, employees, todayTasks, pendingTasks, isLoading: dataLoading } = useHouseholdData(household?.id);
  const toggleTask = useToggleTaskStatus();
  const refreshData = useRefreshHomeData(household?.id);

  const loading = householdLoading || (!!household?.setup_completed && dataLoading);

  // Derived data
  const interiorSpaces = spaces.filter(s => s.category === 'interior');
  const exteriorSpaces = spaces.filter(s => s.category === 'exterior');
  const completedToday = todayTasks.filter(t => t.status === 'completada').length;
  const totalToday = todayTasks.length;
  const progressPercent = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  const handleToggleTask = (task: ScheduledTask) => {
    toggleTask.mutate({ task });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!household || !household.setup_completed) {
    if (activeModal.type !== 'setup') {
      return (
        <div className="p-4 max-w-lg mx-auto text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Configura tu Hogar
          </h2>
          <p className="text-gray-600 mb-6">
            Aún no has configurado tu hogar. Inicia el asistente para comenzar.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => openModal({ type: 'setup' })}
          >
            Comenzar Configuración
          </Button>
        </div>
      );
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      {household && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-2xl mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home size={24} />
              <h1 className="text-xl font-bold">{household.name}</h1>
            </div>
            <button className="p-2 bg-white/20 rounded-lg">
              <Settings size={20} />
            </button>
          </div>
          {pendingTasks > 0 && (
            <div className="bg-white/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              <span className="text-sm">{pendingTasks} tarea{pendingTasks > 1 ? 's' : ''} pendiente{pendingTasks > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Smart Alerts */}
      {household && (
        <div className="mb-4">
          <SmartAlerts
            householdId={household.id}
            onNavigateToDate={() => openModal({ type: 'weeklyCalendar' })}
          />
        </div>
      )}

      {/* Today's Progress */}
      {totalToday > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Hoy
            </h2>
            <span className="text-sm text-gray-500">
              {completedToday}/{totalToday} completadas
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <HomeTodayTasks
        tasks={todayTasks}
        completedCount={completedToday}
        totalCount={totalToday}
        onToggleTask={handleToggleTask}
        onGenerateSchedule={() => openModal({ type: 'scheduleGenerator' })}
      />

      {/* Weekly Analytics Summary */}
      {household && (
        <div className="mb-4">
          <HomeAnalyticsSummary
            householdId={household.id}
            employees={employees}
            onViewDetails={() => openModal({ type: 'monthlyReport' })}
            compact
          />
        </div>
      )}

      {/* Schedule Dashboard Button */}
      <button
        onClick={() => openModal({ type: 'scheduleDashboard' })}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-4 shadow-sm mb-4 text-left hover:from-indigo-700 hover:to-purple-700 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={20} />
              <span className="font-bold">Horarios del Personal</span>
            </div>
            <p className="text-xs text-indigo-100">Cronograma rotativo de 4 semanas - Yolima y John</p>
          </div>
          <ChevronRight size={24} className="text-white/70" />
        </div>
      </button>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => openModal({ type: 'dailyDashboard' })}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm text-left hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={20} />
            <span className="font-semibold">Dashboard</span>
          </div>
          <p className="text-xs text-blue-100">Vista detallada del día</p>
        </button>
        <button
          onClick={() => openModal({ type: 'weeklyCalendar' })}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-sm text-left hover:from-purple-600 hover:to-purple-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={20} />
            <span className="font-semibold">Calendario</span>
          </div>
          <p className="text-xs text-purple-100">Vista semanal/mensual</p>
        </button>
      </div>

      {/* Secondary Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => openModal({ type: 'scheduleGenerator' })}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-sm text-left hover:from-indigo-600 hover:to-indigo-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} />
            <span className="font-semibold">Programar</span>
          </div>
          <p className="text-xs text-indigo-100">Generar itinerario</p>
        </button>
        <button
          onClick={() => openModal({ type: 'optimizer' })}
          className="bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl p-4 shadow-sm text-left hover:from-violet-600 hover:to-violet-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} />
            <span className="font-semibold">Analizar</span>
          </div>
          <p className="text-xs text-violet-100">Carga de trabajo</p>
        </button>
      </div>

      {/* Quick Access Tools */}
      <HomeQuickActions
        hasTasksToday={todayTasks.length > 0}
        onOpenRoutines={() => openModal({ type: 'quickRoutines' })}
        onOpenCheckIn={() => openModal({ type: 'checkIn' })}
        onOpenSupplies={() => openModal({ type: 'supplies' })}
        onOpenHistory={() => openModal({ type: 'history' })}
        onOpenReports={() => openModal({ type: 'monthlyReport' })}
        onOpenInspection={() => {
          if (todayTasks.length > 0) {
            openModal({ type: 'inspection', task: todayTasks[0] });
          }
        }}
      />

      {/* Quick Stats - Spaces */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => openModal({ type: 'spaces', initialCategory: 'interior' })}
          className="bg-white rounded-xl p-4 shadow-sm text-left hover:bg-blue-50 transition-colors active:scale-95"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home size={18} className="text-blue-600" />
            </div>
            <span className="text-2xl font-bold">{interiorSpaces.length}</span>
          </div>
          <p className="text-sm text-gray-500">Espacios interiores</p>
        </button>
        <button
          onClick={() => openModal({ type: 'spaces', initialCategory: 'exterior' })}
          className="bg-white rounded-xl p-4 shadow-sm text-left hover:bg-green-50 transition-colors active:scale-95"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🌳</span>
            </div>
            <span className="text-2xl font-bold">{exteriorSpaces.length}</span>
          </div>
          <p className="text-sm text-gray-500">Espacios exteriores</p>
        </button>
      </div>

      {/* Employees */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <button
          onClick={() => openModal({ type: 'employees' })}
          className="w-full px-4 py-3 border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold flex items-center gap-2">
            <User size={18} className="text-gray-600" />
            Empleados
            {employees.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {employees.length}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-blue-600" />
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </button>
        {employees.length > 0 && (
          <div className="divide-y">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => openModal({ type: 'employeeDetail', employee: emp })}
                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  emp.zone === 'interior' ? 'bg-blue-100' :
                  emp.zone === 'exterior' ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  <User size={20} className={
                    emp.zone === 'interior' ? 'text-blue-600' :
                    emp.zone === 'exterior' ? 'text-green-600' : 'text-purple-600'
                  } />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-sm text-gray-500">
                    {emp.zone === 'interior' ? '🏠 Interior' :
                     emp.zone === 'exterior' ? '🌳 Exterior' : '🏡 Ambos'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {emp.work_days?.length || 0} días/sem
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {household && (
        <HomeModals
          activeModal={activeModal}
          household={household}
          spaces={spaces}
          employees={employees}
          todayTasks={todayTasks}
          onClose={closeModal}
          onOpenModal={openModal}
          onRefreshData={refreshData}
        />
      )}
    </div>
  );
}
