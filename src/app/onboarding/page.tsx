'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home, Users, UtensilsCrossed, Calendar,
  ChevronRight, ChevronLeft, Check, Sparkles,
  Plus, Trash2, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

// Onboarding steps
type OnboardingStep = 'welcome' | 'household' | 'spaces' | 'employees' | 'menu' | 'complete';

interface SpaceConfig {
  id: string;
  name: string;
  category: 'interior' | 'exterior';
  selected: boolean;
}

interface EmployeeConfig {
  id: string;
  name: string;
  role: string;
  workDays: string[];
}

const DEFAULT_SPACES: SpaceConfig[] = [
  { id: 'sala', name: 'Sala', category: 'interior', selected: true },
  { id: 'comedor', name: 'Comedor', category: 'interior', selected: true },
  { id: 'cocina', name: 'Cocina', category: 'interior', selected: true },
  { id: 'habitacion1', name: 'Habitación Principal', category: 'interior', selected: true },
  { id: 'habitacion2', name: 'Habitación 2', category: 'interior', selected: false },
  { id: 'habitacion3', name: 'Habitación 3', category: 'interior', selected: false },
  { id: 'bano1', name: 'Baño Principal', category: 'interior', selected: true },
  { id: 'bano2', name: 'Baño 2', category: 'interior', selected: false },
  { id: 'estudio', name: 'Estudio/Oficina', category: 'interior', selected: false },
  { id: 'lavanderia', name: 'Lavandería', category: 'interior', selected: true },
  { id: 'jardin', name: 'Jardín', category: 'exterior', selected: false },
  { id: 'terraza', name: 'Terraza', category: 'exterior', selected: false },
  { id: 'garaje', name: 'Garaje', category: 'exterior', selected: false },
  { id: 'patio', name: 'Patio', category: 'exterior', selected: false },
];

const WORK_DAYS = [
  { id: 'lunes', label: 'L' },
  { id: 'martes', label: 'M' },
  { id: 'miercoles', label: 'Mi' },
  { id: 'jueves', label: 'J' },
  { id: 'viernes', label: 'V' },
  { id: 'sabado', label: 'S' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { currentHousehold, refreshMemberships } = useAuth();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);

  // Household config
  const [householdName, setHouseholdName] = useState('');
  const [menuCycleDays, setMenuCycleDays] = useState(12);
  const [defaultPortions, setDefaultPortions] = useState(5);

  // Spaces config
  const [spaces, setSpaces] = useState<SpaceConfig[]>(DEFAULT_SPACES);
  const [customSpace, setCustomSpace] = useState('');

  // Employees config
  const [employees, setEmployees] = useState<EmployeeConfig[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', role: 'Empleada doméstica' });
  const [newEmployeeDays, setNewEmployeeDays] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);

  // Check if already completed onboarding
  useEffect(() => {
    if (currentHousehold?.setup_completed) {
      router.push('/');
    }
  }, [currentHousehold, router]);

  // Initialize with household name if exists
  useEffect(() => {
    if (currentHousehold?.name) {
      setHouseholdName(currentHousehold.name);
    }
  }, [currentHousehold]);

  const steps: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
    { id: 'welcome', label: 'Bienvenida', icon: <Sparkles size={20} /> },
    { id: 'household', label: 'Tu Hogar', icon: <Home size={20} /> },
    { id: 'spaces', label: 'Espacios', icon: <Home size={20} /> },
    { id: 'employees', label: 'Empleados', icon: <Users size={20} /> },
    { id: 'menu', label: 'Menú', icon: <UtensilsCrossed size={20} /> },
    { id: 'complete', label: 'Listo', icon: <Check size={20} /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id);
    }
  };

  const toggleSpace = (spaceId: string) => {
    setSpaces(prev =>
      prev.map(s => s.id === spaceId ? { ...s, selected: !s.selected } : s)
    );
  };

  const addCustomSpace = () => {
    if (!customSpace.trim()) return;
    setSpaces(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customSpace.trim(),
        category: 'interior',
        selected: true
      }
    ]);
    setCustomSpace('');
  };

  const addEmployee = () => {
    if (!newEmployee.name.trim()) return;
    setEmployees(prev => [
      ...prev,
      {
        id: `emp-${Date.now()}`,
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        workDays: newEmployeeDays
      }
    ]);
    setNewEmployee({ name: '', role: 'Empleada doméstica' });
    setNewEmployeeDays(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
  };

  const removeEmployee = (empId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };

  const toggleEmployeeDay = (day: string) => {
    setNewEmployeeDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const completeOnboarding = async () => {
    if (!currentHousehold) return;

    setIsLoading(true);
    try {
      // 1. Update household settings
      await supabase
        .from('households')
        .update({
          name: householdName,
          settings: {
            menu_cycle_days: menuCycleDays,
            default_portions: defaultPortions,
          },
          setup_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentHousehold.id);

      // 2. Create spaces
      const selectedSpaces = spaces.filter(s => s.selected);
      if (selectedSpaces.length > 0) {
        await supabase
          .from('spaces')
          .insert(
            selectedSpaces.map(s => ({
              household_id: currentHousehold.id,
              custom_name: s.name,
              category: s.category,
            }))
          );
      }

      // 3. Create employees
      if (employees.length > 0) {
        await supabase
          .from('home_employees')
          .insert(
            employees.map(e => ({
              household_id: currentHousehold.id,
              name: e.name,
              role: e.role,
              work_days: e.workDays,
            }))
          );
      }

      // Refresh data
      await refreshMemberships();

      // Navigate to home
      setStep('complete');
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              i <= currentStepIndex
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-400 border'
            }`}
          >
            {i < currentStepIndex ? <Check size={16} /> : s.icon}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-20 pb-24">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={48} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              ¡Bienvenido a Recetario!
            </h1>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
              Tu asistente inteligente para organizar el hogar, planificar comidas y gestionar tareas domésticas.
            </p>
            <div className="space-y-3 text-left bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed size={16} className="text-green-600" />
                </div>
                <span className="text-gray-700">Planifica menús semanales con IA</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-blue-600" />
                </div>
                <span className="text-gray-700">Gestiona empleados y tareas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-purple-600" />
                </div>
                <span className="text-gray-700">Lista de compras inteligente</span>
              </div>
            </div>
          </div>
        )}

        {/* Household Step */}
        {step === 'household' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Configura tu hogar</h2>
            <p className="text-gray-600 mb-6">Personaliza tu experiencia</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del hogar
                </label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Ej: Familia González"
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciclo del menú (días)
                </label>
                <div className="flex items-center gap-4">
                  {[7, 12, 14, 21].map(days => (
                    <button
                      key={days}
                      onClick={() => setMenuCycleDays(days)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        menuCycleDays === days
                          ? 'bg-green-500 text-white'
                          : 'bg-white border hover:bg-gray-50'
                      }`}
                    >
                      {days} días
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  El menú se repetirá cada {menuCycleDays} días
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porciones por defecto
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDefaultPortions(Math.max(1, defaultPortions - 1))}
                    className="w-10 h-10 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-2xl font-semibold w-12 text-center">{defaultPortions}</span>
                  <button
                    onClick={() => setDefaultPortions(defaultPortions + 1)}
                    className="w-10 h-10 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cantidad de personas que comen regularmente
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Spaces Step */}
        {step === 'spaces' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Espacios del hogar</h2>
            <p className="text-gray-600 mb-6">Selecciona los espacios a gestionar</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Interior</h3>
                <div className="grid grid-cols-2 gap-2">
                  {spaces.filter(s => s.category === 'interior').map(space => (
                    <button
                      key={space.id}
                      onClick={() => toggleSpace(space.id)}
                      className={`p-3 rounded-xl text-left transition-colors ${
                        space.selected
                          ? 'bg-green-100 border-2 border-green-500 text-green-800'
                          : 'bg-white border hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm">{space.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Exterior</h3>
                <div className="grid grid-cols-2 gap-2">
                  {spaces.filter(s => s.category === 'exterior').map(space => (
                    <button
                      key={space.id}
                      onClick={() => toggleSpace(space.id)}
                      className={`p-3 rounded-xl text-left transition-colors ${
                        space.selected
                          ? 'bg-blue-100 border-2 border-blue-500 text-blue-800'
                          : 'bg-white border hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm">{space.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar espacio personalizado</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSpace}
                    onChange={(e) => setCustomSpace(e.target.value)}
                    placeholder="Nombre del espacio"
                    className="flex-1 px-4 py-2 rounded-xl border focus:ring-2 focus:ring-green-500"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomSpace()}
                  />
                  <button
                    onClick={addCustomSpace}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employees Step */}
        {step === 'employees' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Empleados del hogar</h2>
            <p className="text-gray-600 mb-6">Agrega empleados para asignarles tareas (opcional)</p>

            {/* Employee list */}
            {employees.length > 0 && (
              <div className="space-y-3 mb-6">
                {employees.map(emp => (
                  <div
                    key={emp.id}
                    className="bg-white p-4 rounded-xl border flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{emp.name}</p>
                      <p className="text-sm text-gray-500">{emp.role}</p>
                      <div className="flex gap-1 mt-1">
                        {emp.workDays.map(day => (
                          <span key={day} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            {day.slice(0, 2).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeEmployee(emp.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add employee form */}
            <div className="bg-white p-4 rounded-xl border space-y-4">
              <input
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del empleado"
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500"
              />

              <select
                value={newEmployee.role}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500"
              >
                <option>Empleada doméstica</option>
                <option>Cocinera</option>
                <option>Jardinero</option>
                <option>Niñera</option>
                <option>Otro</option>
              </select>

              <div>
                <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                  <Clock size={14} /> Días de trabajo
                </p>
                <div className="flex gap-2">
                  {WORK_DAYS.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleEmployeeDay(day.id)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        newEmployeeDays.includes(day.id)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={addEmployee}
                disabled={!newEmployee.name.trim()}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Agregar empleado
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Puedes agregar más empleados después en Configuración
            </p>
          </div>
        )}

        {/* Menu Step */}
        {step === 'menu' && (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Configuración del menú</h2>
            <p className="text-gray-600 mb-6">Últimos detalles para tu menú</p>

            <div className="bg-white p-6 rounded-xl border space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UtensilsCrossed size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Tu menú está listo</h3>
                <p className="text-gray-600 mt-2">
                  Comenzarás con un menú de {menuCycleDays} días con recetas variadas.
                  Podrás personalizarlo después.
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Incluido:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 28 recetas preconfiguradas</li>
                  <li>• Lista de compras automática</li>
                  <li>• Sugerencias de IA personalizadas</li>
                  <li>• Seguimiento de inventario</li>
                </ul>
              </div>

              <div className="text-sm text-gray-500 text-center">
                <p>Porciones: <strong>{defaultPortions} personas</strong></p>
                <p>Ciclo: <strong>{menuCycleDays} días</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="py-12 text-center">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Todo listo!</h2>
            <p className="text-gray-600">
              Tu hogar está configurado. Redirigiendo...
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step !== 'complete' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="max-w-lg mx-auto flex gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 px-6 border rounded-xl font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} />
                Atrás
              </button>
            )}

            {step === 'menu' ? (
              <button
                onClick={completeOnboarding}
                disabled={isLoading || !householdName.trim()}
                className="flex-1 py-3 px-6 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Guardando...' : 'Finalizar configuración'}
                <Check size={20} />
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={step === 'household' && !householdName.trim()}
                className="flex-1 py-3 px-6 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
