'use client';

import { useState, useEffect } from 'react';
import {
  Home, ChevronRight, ChevronLeft, Check, Plus, Minus,
  User, MapPin, Sparkles, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SpaceType, Household, HomeEmployee } from '@/types';

interface HomeSetupWizardProps {
  onComplete: (householdId: string) => void;
  existingHouseholdId?: string;
}

type WizardStep = 'welcome' | 'interior' | 'exterior' | 'employees' | 'summary';

interface SelectedSpace {
  spaceTypeId: string;
  spaceType: SpaceType;
  quantity: number;
  usageLevel: 'alto' | 'medio' | 'bajo';
  customName?: string;
}

interface EmployeeInput {
  name: string;
  zone: 'interior' | 'exterior' | 'ambos';
  workDays: string[];
}

const STEPS: { key: WizardStep; label: string; icon: string }[] = [
  { key: 'welcome', label: 'Bienvenida', icon: '👋' },
  { key: 'interior', label: 'Interior', icon: '🏠' },
  { key: 'exterior', label: 'Exterior', icon: '🌳' },
  { key: 'employees', label: 'Empleados', icon: '👥' },
  { key: 'summary', label: 'Resumen', icon: '✅' },
];

const DAYS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
];

export default function HomeSetupWizard({ onComplete, existingHouseholdId }: HomeSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form data
  const [householdName, setHouseholdName] = useState('Mi Hogar');
  const [ownerName, setOwnerName] = useState('');
  const [selectedInterior, setSelectedInterior] = useState<SelectedSpace[]>([]);
  const [selectedExterior, setSelectedExterior] = useState<SelectedSpace[]>([]);
  const [employees, setEmployees] = useState<EmployeeInput[]>([
    { name: '', zone: 'interior', workDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] }
  ]);

  useEffect(() => {
    loadSpaceTypes();
  }, []);

  const loadSpaceTypes = async () => {
    const { data } = await supabase
      .from('space_types')
      .select('*')
      .order('sort_order');

    if (data) {
      setSpaceTypes(data.map(st => ({
        ...st,
        default_tasks: typeof st.default_tasks === 'string'
          ? JSON.parse(st.default_tasks)
          : st.default_tasks || []
      })));
    }
    setLoading(false);
  };

  const interiorTypes = spaceTypes.filter(st => st.category === 'interior');
  const exteriorTypes = spaceTypes.filter(st => st.category === 'exterior');

  const toggleSpace = (
    spaceType: SpaceType,
    selected: SelectedSpace[],
    setSelected: React.Dispatch<React.SetStateAction<SelectedSpace[]>>
  ) => {
    const existing = selected.find(s => s.spaceTypeId === spaceType.id);
    if (existing) {
      setSelected(selected.filter(s => s.spaceTypeId !== spaceType.id));
    } else {
      setSelected([...selected, {
        spaceTypeId: spaceType.id,
        spaceType,
        quantity: 1,
        usageLevel: 'medio'
      }]);
    }
  };

  const updateSpaceQuantity = (
    spaceTypeId: string,
    delta: number,
    selected: SelectedSpace[],
    setSelected: React.Dispatch<React.SetStateAction<SelectedSpace[]>>
  ) => {
    setSelected(selected.map(s => {
      if (s.spaceTypeId === spaceTypeId) {
        return { ...s, quantity: Math.max(1, s.quantity + delta) };
      }
      return s;
    }));
  };

  const updateSpaceUsage = (
    spaceTypeId: string,
    usageLevel: 'alto' | 'medio' | 'bajo',
    selected: SelectedSpace[],
    setSelected: React.Dispatch<React.SetStateAction<SelectedSpace[]>>
  ) => {
    setSelected(selected.map(s => {
      if (s.spaceTypeId === spaceTypeId) {
        return { ...s, usageLevel };
      }
      return s;
    }));
  };

  const addEmployee = () => {
    setEmployees([...employees, {
      name: '',
      zone: employees.length === 0 ? 'interior' : 'exterior',
      workDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
    }]);
  };

  const removeEmployee = (index: number) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((_, i) => i !== index));
    }
  };

  const updateEmployee = (index: number, field: keyof EmployeeInput, value: unknown) => {
    setEmployees(employees.map((emp, i) => {
      if (i === index) {
        return { ...emp, [field]: value };
      }
      return emp;
    }));
  };

  const toggleEmployeeDay = (index: number, day: string) => {
    const emp = employees[index];
    const newDays = emp.workDays.includes(day)
      ? emp.workDays.filter(d => d !== day)
      : [...emp.workDays, day];
    updateEmployee(index, 'workDays', newDays);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'welcome':
        return householdName.trim().length > 0;
      case 'interior':
        return selectedInterior.length > 0;
      case 'exterior':
        return true; // Exterior es opcional
      case 'employees':
        return employees.some(e => e.name.trim().length > 0);
      default:
        return true;
    }
  };

  const goNext = () => {
    const stepIndex = STEPS.findIndex(s => s.key === currentStep);
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].key);
    }
  };

  const goBack = () => {
    const stepIndex = STEPS.findIndex(s => s.key === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key);
    }
  };

  const saveAndFinish = async () => {
    setSaving(true);
    try {
      // 1. Crear el hogar
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: householdName,
          owner_name: ownerName || null,
          setup_completed: true
        })
        .select()
        .single();

      if (householdError || !household) throw householdError;

      // 2. Crear espacios
      const allSpaces = [...selectedInterior, ...selectedExterior];
      const spacesToInsert = allSpaces.flatMap(s => {
        const spaces = [];
        for (let i = 0; i < s.quantity; i++) {
          spaces.push({
            household_id: household.id,
            space_type_id: s.spaceTypeId,
            custom_name: s.quantity > 1 ? `${s.spaceType.name} ${i + 1}` : null,
            category: s.spaceType.category,
            usage_level: s.usageLevel
          });
        }
        return spaces;
      });

      if (spacesToInsert.length > 0) {
        const { error: spacesError } = await supabase
          .from('spaces')
          .insert(spacesToInsert);
        if (spacesError) throw spacesError;
      }

      // 3. Crear empleados
      const validEmployees = employees.filter(e => e.name.trim().length > 0);
      if (validEmployees.length > 0) {
        const employeesToInsert = validEmployees.map(e => ({
          household_id: household.id,
          name: e.name,
          zone: e.zone,
          work_days: e.workDays
        }));

        const { error: employeesError } = await supabase
          .from('home_employees')
          .insert(employeesToInsert);
        if (employeesError) throw employeesError;
      }

      // 4. Generar tareas automáticas basadas en espacios
      await generateDefaultTasks(household.id);

      onComplete(household.id);
    } catch (error) {
      console.error('Error saving household:', error);
      alert('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const generateDefaultTasks = async (householdId: string) => {
    // Obtener espacios creados
    const { data: spaces } = await supabase
      .from('spaces')
      .select('*, space_type:space_types(*)')
      .eq('household_id', householdId);

    if (!spaces) return;

    const tasksToInsert: Array<{
      household_id: string;
      space_id: string;
      name: string;
      frequency: string;
      estimated_minutes: number;
    }> = [];

    for (const space of spaces) {
      const spaceType = space.space_type as SpaceType;
      if (!spaceType?.default_tasks) continue;

      const tasks = typeof spaceType.default_tasks === 'string'
        ? JSON.parse(spaceType.default_tasks)
        : spaceType.default_tasks;

      // Determinar frecuencia basada en uso
      const frequencyMap = {
        alto: 'semanal',
        medio: 'quincenal',
        bajo: 'mensual'
      };
      const baseFrequency = frequencyMap[space.usage_level as keyof typeof frequencyMap] || 'semanal';

      for (const taskName of tasks) {
        tasksToInsert.push({
          household_id: householdId,
          space_id: space.id,
          name: taskName,
          frequency: baseFrequency,
          estimated_minutes: 20
        });
      }
    }

    if (tasksToInsert.length > 0) {
      await supabase.from('task_templates').insert(tasksToInsert);
    }
  };

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Progress Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-blue-800 flex items-center gap-2">
              <Home size={24} />
              Configurar Hogar
            </h1>
            <span className="text-sm text-gray-500">
              Paso {stepIndex + 1} de {STEPS.length}
            </span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🏡</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Configura tu Hogar
              </h2>
              <p className="text-gray-600">
                Vamos a crear el perfil de tu hogar para organizar las tareas de limpieza
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del hogar
                </label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Ej: Casa González, Mi Apartamento..."
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu nombre (opcional)
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ej: María González"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Interior Spaces Step */}
        {currentStep === 'interior' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Espacios Interiores
              </h2>
              <p className="text-gray-600 text-sm">
                Selecciona las áreas de tu hogar
              </p>
            </div>

            <div className="grid gap-3">
              {interiorTypes.map(spaceType => {
                const selected = selectedInterior.find(s => s.spaceTypeId === spaceType.id);
                return (
                  <div
                    key={spaceType.id}
                    className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${
                      selected ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleSpace(spaceType, selectedInterior, setSelectedInterior)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span className="text-2xl">{spaceType.icon}</span>
                        <span className="font-medium">{spaceType.name}</span>
                      </button>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateSpaceQuantity(spaceType.id, -1, selectedInterior, setSelectedInterior)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold">{selected.quantity}</span>
                          <button
                            onClick={() => updateSpaceQuantity(spaceType.id, 1, selectedInterior, setSelectedInterior)}
                            className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-lg"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {selected && (
                      <div className="mt-3 pt-3 border-t">
                        <label className="text-xs text-gray-500 mb-1 block">Nivel de uso:</label>
                        <div className="flex gap-2">
                          {(['alto', 'medio', 'bajo'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => updateSpaceUsage(spaceType.id, level, selectedInterior, setSelectedInterior)}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selected.usageLevel === level
                                  ? level === 'alto' ? 'bg-red-100 text-red-700' :
                                    level === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exterior Spaces Step */}
        {currentStep === 'exterior' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Espacios Exteriores
              </h2>
              <p className="text-gray-600 text-sm">
                Selecciona las áreas exteriores (opcional)
              </p>
            </div>

            <div className="grid gap-3">
              {exteriorTypes.map(spaceType => {
                const selected = selectedExterior.find(s => s.spaceTypeId === spaceType.id);
                return (
                  <div
                    key={spaceType.id}
                    className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${
                      selected ? 'border-green-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleSpace(spaceType, selectedExterior, setSelectedExterior)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span className="text-2xl">{spaceType.icon}</span>
                        <span className="font-medium">{spaceType.name}</span>
                      </button>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateSpaceQuantity(spaceType.id, -1, selectedExterior, setSelectedExterior)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-8 text-center font-semibold">{selected.quantity}</span>
                          <button
                            onClick={() => updateSpaceQuantity(spaceType.id, 1, selectedExterior, setSelectedExterior)}
                            className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-lg"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedExterior.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-xl text-center text-gray-500 text-sm">
                Si no tienes áreas exteriores, puedes continuar
              </div>
            )}
          </div>
        )}

        {/* Employees Step */}
        {currentStep === 'employees' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Empleados del Hogar
              </h2>
              <p className="text-gray-600 text-sm">
                Agrega a las personas que ayudan con las tareas
              </p>
            </div>

            <div className="space-y-4">
              {employees.map((emp, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User size={20} className="text-blue-600" />
                      <span className="font-medium">Empleado {index + 1}</span>
                    </div>
                    {employees.length > 1 && (
                      <button
                        onClick={() => removeEmployee(index)}
                        className="text-red-500 p-1"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={emp.name}
                    onChange={(e) => updateEmployee(index, 'name', e.target.value)}
                    placeholder="Nombre del empleado"
                    className="w-full px-4 py-3 border rounded-xl mb-3"
                  />

                  <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Zona de trabajo:</label>
                    <div className="flex gap-2">
                      {(['interior', 'exterior', 'ambos'] as const).map(zone => (
                        <button
                          key={zone}
                          onClick={() => updateEmployee(index, 'zone', zone)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            emp.zone === zone
                              ? zone === 'interior' ? 'bg-blue-100 text-blue-700' :
                                zone === 'exterior' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {zone === 'interior' ? '🏠 Interior' :
                           zone === 'exterior' ? '🌳 Exterior' : '🏡 Ambos'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Días de trabajo:</label>
                    <div className="flex gap-1">
                      {DAYS.map(day => (
                        <button
                          key={day.key}
                          onClick={() => toggleEmployeeDay(index, day.key)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            emp.workDays.includes(day.key)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addEmployee}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600"
              >
                <Plus size={20} />
                Agregar otro empleado
              </button>
            </div>
          </div>
        )}

        {/* Summary Step */}
        {currentStep === 'summary' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-gray-800">
                Resumen de Configuración
              </h2>
              <p className="text-gray-600 text-sm">
                Revisa que todo esté correcto
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Home size={18} /> {householdName}
              </h3>
              {ownerName && (
                <p className="text-sm text-gray-600">Propietario: {ownerName}</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">🏠 Espacios Interiores</h3>
              <div className="space-y-2">
                {selectedInterior.map(s => (
                  <div key={s.spaceTypeId} className="flex justify-between text-sm">
                    <span>{s.spaceType.icon} {s.spaceType.name} {s.quantity > 1 ? `(${s.quantity})` : ''}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      s.usageLevel === 'alto' ? 'bg-red-100 text-red-700' :
                      s.usageLevel === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {s.usageLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedExterior.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">🌳 Espacios Exteriores</h3>
                <div className="space-y-2">
                  {selectedExterior.map(s => (
                    <div key={s.spaceTypeId} className="text-sm">
                      {s.spaceType.icon} {s.spaceType.name} {s.quantity > 1 ? `(${s.quantity})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">👥 Empleados</h3>
              <div className="space-y-2">
                {employees.filter(e => e.name.trim()).map((e, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{e.name}</span>
                    <span className="text-gray-500">
                      {e.zone === 'interior' ? '🏠' : e.zone === 'exterior' ? '🌳' : '🏡'}
                      {' '}{e.workDays.length} días/semana
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="text-blue-600 mt-1" size={20} />
                <div>
                  <h4 className="font-medium text-blue-800">Se generarán automáticamente</h4>
                  <p className="text-sm text-blue-600">
                    Tareas de limpieza para cada espacio según su nivel de uso
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {currentStep !== 'welcome' && (
            <button
              onClick={goBack}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <ChevronLeft size={20} />
              Atrás
            </button>
          )}
          {currentStep !== 'summary' ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={saveAndFinish}
              disabled={saving}
              className="flex-1 py-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Finalizar Configuración
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
