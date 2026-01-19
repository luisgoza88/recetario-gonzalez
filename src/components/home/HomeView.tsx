'use client';

import { useState, useEffect } from 'react';
import {
  Home, Calendar, CheckCircle2, Clock, AlertTriangle,
  User, Settings, ChevronRight, Plus, Sparkles, BarChart3,
  History, Package, Zap, Eye, FileText, LogIn
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Household, Space, HomeEmployee, ScheduledTask, TaskTemplate } from '@/types';

// Tipo union para consolidar todos los modales en un solo estado
type ActiveModal =
  | { type: 'none' }
  | { type: 'setup' }
  | { type: 'employees' }
  | { type: 'employeeDetail'; employee: HomeEmployee }
  | { type: 'spaces'; initialCategory: 'interior' | 'exterior' }
  | { type: 'scheduleGenerator' }
  | { type: 'optimizer' }
  | { type: 'dailyDashboard' }
  | { type: 'weeklyCalendar' }
  | { type: 'quickRoutines' }
  | { type: 'rating'; task: ScheduledTask }
  | { type: 'checkIn' }
  | { type: 'history' }
  | { type: 'supplies' }
  | { type: 'inspection'; task: ScheduledTask }
  | { type: 'monthlyReport' }
  | { type: 'scheduleDashboard' }
  | { type: 'scheduleEditor' };
import HomeSetupWizard from './HomeSetupWizard';
import EmployeesPanel from './EmployeesPanel';
import EmployeeDetailModal from './EmployeeDetailModal';
import SpacesPanel from './SpacesPanel';
import ScheduleGenerator from './ScheduleGenerator';
import ScheduleOptimizer from './ScheduleOptimizer';
import DailyDashboard from './DailyDashboard';
import WeeklyCalendar from './WeeklyCalendar';
import QuickRoutines from './QuickRoutines';
import CleaningRating from './CleaningRating';
import EmployeeCheckIn from './EmployeeCheckIn';
import CleaningHistory from './CleaningHistory';
import SuppliesInventory from './SuppliesInventory';
import InspectionMode from './InspectionMode';
import MonthlyReport from './MonthlyReport';
import ScheduleDashboard from './ScheduleDashboard';
import ScheduleTemplateEditor from './ScheduleTemplateEditor';
import HomeAnalyticsSummary from './HomeAnalyticsSummary';
import SmartAlerts from './SmartAlerts';
import Button from '@/components/ui/Button';

interface HomeViewProps {
  initialHouseholdId?: string;
}

export default function HomeView({ initialHouseholdId }: HomeViewProps) {
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [employees, setEmployees] = useState<HomeEmployee[]>([]);
  const [todayTasks, setTodayTasks] = useState<ScheduledTask[]>([]);
  const [pendingTasks, setPendingTasks] = useState<number>(0);

  // Estado consolidado para todos los modales (reduce de 17 estados a 1)
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: 'none' });

  // Helpers para cerrar modal y abrir modales específicos
  const closeModal = () => setActiveModal({ type: 'none' });
  const openModal = (modal: ActiveModal) => setActiveModal(modal);

  useEffect(() => {
    loadHousehold();
  }, [initialHouseholdId]);

  const loadHousehold = async () => {
    setLoading(true);

    // Buscar hogar existente
    const { data: households } = await supabase
      .from('households')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (households && households.length > 0) {
      const h = households[0];
      setHousehold(h);

      if (h.setup_completed) {
        await loadHouseholdData(h.id);
      } else {
        openModal({ type: 'setup' });
      }
    } else {
      // No hay hogar, mostrar setup
      openModal({ type: 'setup' });
    }

    setLoading(false);
  };

  const loadHouseholdData = async (householdId: string) => {
    // Cargar espacios
    const { data: spacesData } = await supabase
      .from('spaces')
      .select('*, space_type:space_types(*)')
      .eq('household_id', householdId);

    if (spacesData) setSpaces(spacesData);

    // Cargar empleados
    const { data: employeesData } = await supabase
      .from('home_employees')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true);

    if (employeesData) setEmployees(employeesData);

    // Cargar tareas de hoy
    const today = new Date().toISOString().split('T')[0];
    const { data: tasksData } = await supabase
      .from('scheduled_tasks')
      .select('*, task_template:task_templates(*), space:spaces(*, space_type:space_types(*)), employee:home_employees(*)')
      .eq('household_id', householdId)
      .eq('scheduled_date', today);

    if (tasksData) setTodayTasks(tasksData);

    // Contar tareas pendientes
    const { count } = await supabase
      .from('scheduled_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('status', 'pendiente')
      .lte('scheduled_date', today);

    setPendingTasks(count || 0);
  };

  const handleSetupComplete = (householdId: string) => {
    closeModal();
    loadHousehold();
  };

  const toggleTaskStatus = async (task: ScheduledTask) => {
    const newStatus = task.status === 'completada' ? 'pendiente' : 'completada';

    await supabase
      .from('scheduled_tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completada' ? new Date().toISOString() : null
      })
      .eq('id', task.id);

    // Recargar tareas
    if (household) {
      loadHouseholdData(household.id);
    }
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

  if (activeModal.type === 'setup') {
    return <HomeSetupWizard onComplete={handleSetupComplete} />;
  }

  if (!household) {
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

  const interiorSpaces = spaces.filter(s => s.category === 'interior');
  const exteriorSpaces = spaces.filter(s => s.category === 'exterior');

  const completedToday = todayTasks.filter(t => t.status === 'completada').length;
  const totalToday = todayTasks.length;
  const progressPercent = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      {/* Header */}
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

      {/* Smart Alerts - Intelligence Panel */}
      <div className="mb-4">
        <SmartAlerts
          householdId={household.id}
          onNavigateToDate={(date) => {
            // TODO: Navigate to specific date in calendar
            openModal({ type: 'weeklyCalendar' });
          }}
        />
      </div>

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
      {todayTasks.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            <span className="font-semibold text-blue-800">Tareas de Hoy</span>
          </div>
          <div className="divide-y">
            {todayTasks.map(task => (
              <div
                key={task.id}
                className={`p-4 flex items-center gap-3 ${
                  task.status === 'completada' ? 'bg-green-50' : ''
                }`}
              >
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    task.status === 'completada'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {task.status === 'completada' && <CheckCircle2 size={16} />}
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${task.status === 'completada' ? 'text-gray-400' : ''}`}>
                    {task.task_template?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {task.space?.space_type?.icon} {task.space?.custom_name || task.space?.space_type?.name}
                  </p>
                </div>
                {task.employee && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {task.employee.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-4 text-center">
          <div className="text-4xl mb-2">✨</div>
          <p className="text-gray-600">No hay tareas programadas para hoy</p>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => openModal({ type: 'scheduleGenerator' })}
            className="mt-3"
          >
            Generar programación
          </Button>
        </div>
      )}

      {/* Weekly Analytics Summary */}
      <div className="mb-4">
        <HomeAnalyticsSummary
          householdId={household.id}
          employees={employees}
          onViewDetails={() => openModal({ type: 'monthlyReport' })}
          compact
        />
      </div>

      {/* Schedule Dashboard - Cronograma 4 Semanas */}
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
      <div className="bg-white rounded-xl shadow-sm mb-4 p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Herramientas Rápidas</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => openModal({ type: 'quickRoutines' })}
            className="flex flex-col items-center p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <Zap size={24} className="text-amber-600 mb-1" />
            <span className="text-xs text-amber-700 font-medium">Rutinas</span>
          </button>
          <button
            onClick={() => openModal({ type: 'checkIn' })}
            className="flex flex-col items-center p-3 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
          >
            <LogIn size={24} className="text-teal-600 mb-1" />
            <span className="text-xs text-teal-700 font-medium">Asistencia</span>
          </button>
          <button
            onClick={() => openModal({ type: 'supplies' })}
            className="flex flex-col items-center p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Package size={24} className="text-emerald-600 mb-1" />
            <span className="text-xs text-emerald-700 font-medium">Productos</span>
          </button>
          <button
            onClick={() => openModal({ type: 'history' })}
            className="flex flex-col items-center p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <History size={24} className="text-indigo-600 mb-1" />
            <span className="text-xs text-indigo-700 font-medium">Historial</span>
          </button>
          <button
            onClick={() => openModal({ type: 'monthlyReport' })}
            className="flex flex-col items-center p-3 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors"
          >
            <FileText size={24} className="text-pink-600 mb-1" />
            <span className="text-xs text-pink-700 font-medium">Reportes</span>
          </button>
          <button
            onClick={() => {
              if (todayTasks.length > 0) {
                openModal({ type: 'inspection', task: todayTasks[0] });
              }
            }}
            disabled={todayTasks.length === 0}
            className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
              todayTasks.length > 0
                ? 'bg-purple-50 hover:bg-purple-100'
                : 'bg-gray-50 opacity-50 cursor-not-allowed'
            }`}
          >
            <Eye size={24} className={todayTasks.length > 0 ? 'text-purple-600' : 'text-gray-400'} />
            <span className={`text-xs font-medium ${todayTasks.length > 0 ? 'text-purple-700' : 'text-gray-400'}`}>Inspección</span>
          </button>
        </div>
      </div>

      {/* Quick Stats - Espacios */}
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

      {/* Panels - renderizado condicional basado en activeModal */}
      {activeModal.type === 'employees' && household && (
        <EmployeesPanel
          householdId={household.id}
          employees={employees}
          onClose={closeModal}
          onUpdate={() => loadHouseholdData(household.id)}
        />
      )}

      {activeModal.type === 'employeeDetail' && household && (
        <EmployeeDetailModal
          employee={activeModal.employee}
          householdId={household.id}
          spaces={spaces}
          onClose={closeModal}
          onUpdate={() => loadHouseholdData(household.id)}
          onDelete={() => loadHouseholdData(household.id)}
        />
      )}

      {activeModal.type === 'spaces' && household && (
        <SpacesPanel
          householdId={household.id}
          spaces={spaces}
          initialCategory={activeModal.initialCategory}
          onClose={closeModal}
          onUpdate={() => loadHouseholdData(household.id)}
        />
      )}

      {activeModal.type === 'scheduleGenerator' && household && (
        <ScheduleGenerator
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={closeModal}
          onComplete={() => loadHouseholdData(household.id)}
        />
      )}

      {activeModal.type === 'optimizer' && household && (
        <ScheduleOptimizer
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={closeModal}
          onApplyOptimization={() => loadHouseholdData(household.id)}
        />
      )}

      {activeModal.type === 'dailyDashboard' && household && (
        <DailyDashboard
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={closeModal}
          onTaskComplete={() => loadHouseholdData(household.id)}
          onOpenRating={(task) => openModal({ type: 'rating', task })}
          onOpenInspection={(task) => openModal({ type: 'inspection', task })}
        />
      )}

      {activeModal.type === 'weeklyCalendar' && household && (
        <WeeklyCalendar
          householdId={household.id}
          onClose={closeModal}
        />
      )}

      {activeModal.type === 'quickRoutines' && (
        <QuickRoutines
          onClose={closeModal}
          onStartRoutine={() => {}}
        />
      )}

      {activeModal.type === 'rating' && household && (
        <CleaningRating
          task={activeModal.task}
          onClose={closeModal}
          onSave={() => {
            closeModal();
            loadHouseholdData(household.id);
          }}
        />
      )}

      {activeModal.type === 'checkIn' && household && (
        <EmployeeCheckIn
          householdId={household.id}
          employees={employees}
          onClose={closeModal}
          onUpdate={() => loadHouseholdData(household.id)}
        />
      )}

      {activeModal.type === 'history' && household && (
        <CleaningHistory
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={closeModal}
        />
      )}

      {activeModal.type === 'supplies' && household && (
        <SuppliesInventory
          householdId={household.id}
          onClose={closeModal}
        />
      )}

      {activeModal.type === 'inspection' && household && (
        <InspectionMode
          task={activeModal.task}
          onClose={closeModal}
          onComplete={() => {
            closeModal();
            loadHouseholdData(household.id);
          }}
        />
      )}

      {activeModal.type === 'monthlyReport' && household && (
        <MonthlyReport
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={closeModal}
        />
      )}

      {activeModal.type === 'scheduleDashboard' && household && (
        <ScheduleDashboard
          householdId={household.id}
          employees={employees}
          onClose={closeModal}
          onOpenEditor={() => openModal({ type: 'scheduleEditor' })}
        />
      )}

      {activeModal.type === 'scheduleEditor' && household && (
        <ScheduleTemplateEditor
          householdId={household.id}
          employees={employees}
          onClose={closeModal}
          onSave={() => {
            // Recargar datos después de guardar
          }}
        />
      )}
    </div>
  );
}
