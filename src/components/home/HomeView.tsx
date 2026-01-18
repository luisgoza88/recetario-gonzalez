'use client';

import { useState, useEffect } from 'react';
import {
  Home, Calendar, CheckCircle2, Clock, AlertTriangle,
  User, Settings, ChevronRight, Plus, Sparkles, BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Household, Space, HomeEmployee, ScheduledTask, TaskTemplate } from '@/types';
import HomeSetupWizard from './HomeSetupWizard';
import EmployeesPanel from './EmployeesPanel';
import SpacesPanel from './SpacesPanel';
import ScheduleGenerator from './ScheduleGenerator';
import ScheduleOptimizer from './ScheduleOptimizer';

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
  const [showSetup, setShowSetup] = useState(false);
  const [showEmployeesPanel, setShowEmployeesPanel] = useState(false);
  const [showSpacesPanel, setShowSpacesPanel] = useState(false);
  const [showScheduleGenerator, setShowScheduleGenerator] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);

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
        setShowSetup(true);
      }
    } else {
      // No hay hogar, mostrar setup
      setShowSetup(true);
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
    setShowSetup(false);
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

  if (showSetup) {
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
        <button
          onClick={() => setShowSetup(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
        >
          Comenzar Configuración
        </button>
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
          <button
            onClick={() => setShowScheduleGenerator(true)}
            className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 mx-auto hover:bg-purple-700"
          >
            <Plus size={16} />
            Generar programación
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setShowScheduleGenerator(true)}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-sm text-left hover:from-purple-600 hover:to-purple-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} />
            <span className="font-semibold">Programar</span>
          </div>
          <p className="text-xs text-purple-100">Generar itinerario</p>
        </button>
        <button
          onClick={() => setShowOptimizer(true)}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-sm text-left hover:from-indigo-600 hover:to-indigo-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} />
            <span className="font-semibold">Analizar</span>
          </div>
          <p className="text-xs text-indigo-100">Ver carga de trabajo</p>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home size={18} className="text-blue-600" />
            </div>
            <span className="text-2xl font-bold">{interiorSpaces.length}</span>
          </div>
          <p className="text-sm text-gray-500">Espacios interiores</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🌳</span>
            </div>
            <span className="text-2xl font-bold">{exteriorSpaces.length}</span>
          </div>
          <p className="text-sm text-gray-500">Espacios exteriores</p>
        </div>
      </div>

      {/* Employees */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <button
          onClick={() => setShowEmployeesPanel(true)}
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
              <div key={emp.id} className="p-4 flex items-center gap-3">
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
                <span className="text-xs text-gray-400">
                  {emp.work_days?.length || 0} días/sem
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spaces Overview */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSpacesPanel(true)}
          className="w-full px-4 py-3 border-b flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold flex items-center gap-2">
            Espacios del Hogar
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {spaces.length}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-blue-600" />
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </button>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {spaces.slice(0, 8).map(space => (
              <div
                key={space.id}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                  space.category === 'interior' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                }`}
              >
                <span>{space.space_type?.icon}</span>
                <span>{space.custom_name || space.space_type?.name}</span>
              </div>
            ))}
            {spaces.length > 8 && (
              <div className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-600">
                +{spaces.length - 8} más
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panels */}
      {showEmployeesPanel && household && (
        <EmployeesPanel
          householdId={household.id}
          employees={employees}
          onClose={() => setShowEmployeesPanel(false)}
          onUpdate={() => loadHouseholdData(household.id)}
        />
      )}

      {showSpacesPanel && household && (
        <SpacesPanel
          householdId={household.id}
          spaces={spaces}
          onClose={() => setShowSpacesPanel(false)}
          onUpdate={() => loadHouseholdData(household.id)}
        />
      )}

      {showScheduleGenerator && household && (
        <ScheduleGenerator
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={() => setShowScheduleGenerator(false)}
          onComplete={() => loadHouseholdData(household.id)}
        />
      )}

      {showOptimizer && household && (
        <ScheduleOptimizer
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={() => setShowOptimizer(false)}
          onApplyOptimization={() => loadHouseholdData(household.id)}
        />
      )}
    </div>
  );
}
