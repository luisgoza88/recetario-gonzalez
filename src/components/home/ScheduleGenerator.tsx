'use client';

import { useState } from 'react';
import {
  X, Sparkles, Calendar, Clock, CheckCircle2, AlertTriangle,
  RefreshCw, User, Home
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Space, HomeEmployee, TaskTemplate, SpaceType } from '@/types';

interface ScheduleGeneratorProps {
  householdId: string;
  spaces: Space[];
  employees: HomeEmployee[];
  onClose: () => void;
  onComplete: () => void;
}

interface GeneratedTask {
  spaceId: string;
  spaceName: string;
  spaceIcon: string;
  taskName: string;
  frequency: string;
  assignedTo: string | null;
  assignedName: string | null;
  scheduledDate: string;
  estimatedMinutes: number;
}

// Tareas predeterminadas por tipo de espacio
const DEFAULT_TASKS: Record<string, string[]> = {
  // Interior
  'sala': ['Barrer/Aspirar', 'Trapear', 'Limpiar muebles', 'Limpiar ventanas'],
  'cocina': ['Limpiar mesones', 'Lavar platos', 'Limpiar electrodomésticos', 'Barrer/Trapear', 'Sacar basura'],
  'habitacion': ['Tender cama', 'Barrer/Aspirar', 'Trapear', 'Limpiar polvo', 'Organizar'],
  'bano': ['Limpiar sanitario', 'Limpiar lavamanos', 'Limpiar ducha', 'Trapear', 'Cambiar toallas'],
  'comedor': ['Limpiar mesa', 'Barrer', 'Trapear'],
  'estudio': ['Organizar escritorio', 'Barrer/Aspirar', 'Limpiar polvo'],
  'lavanderia': ['Lavar ropa', 'Secar ropa', 'Planchar', 'Organizar'],
  // Exterior
  'jardin': ['Regar plantas', 'Podar', 'Recoger hojas', 'Fertilizar'],
  'piscina': ['Verificar químicos', 'Limpiar filtros', 'Aspirar fondo', 'Limpiar bordes'],
  'terraza': ['Barrer', 'Limpiar muebles', 'Regar plantas'],
  'garaje': ['Barrer', 'Organizar', 'Limpiar'],
  'patio': ['Barrer', 'Regar plantas', 'Recoger basura']
};

// Frecuencias por nivel de uso
const FREQUENCY_BY_USAGE = {
  alto: { daily: ['Lavar platos', 'Tender cama', 'Sacar basura', 'Regar plantas'], weekly: 2, biweekly: 0 },
  medio: { daily: [], weekly: 1, biweekly: 1 },
  bajo: { daily: [], weekly: 0, biweekly: 2 }
};

export default function ScheduleGenerator({
  householdId,
  spaces,
  employees,
  onClose,
  onComplete
}: ScheduleGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedTask[]>([]);
  const [weeksToGenerate, setWeeksToGenerate] = useState(2);
  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config');
  const [savedCount, setSavedCount] = useState(0);

  const getTasksForSpace = (space: Space): string[] => {
    const typeName = space.space_type?.name?.toLowerCase() || '';

    // Buscar tareas predeterminadas por nombre del tipo
    for (const [key, tasks] of Object.entries(DEFAULT_TASKS)) {
      if (typeName.includes(key)) {
        return tasks;
      }
    }

    // Tareas genéricas si no hay match
    return space.category === 'interior'
      ? ['Barrer/Aspirar', 'Trapear', 'Limpiar polvo']
      : ['Barrer', 'Limpiar', 'Organizar'];
  };

  const getFrequencyDays = (task: string, usageLevel: string): number => {
    const usage = FREQUENCY_BY_USAGE[usageLevel as keyof typeof FREQUENCY_BY_USAGE];

    // Tareas diarias
    if (usage.daily.some(t => task.toLowerCase().includes(t.toLowerCase()))) {
      return 1;
    }

    // Según nivel de uso
    if (usageLevel === 'alto') return 3; // Cada 3 días
    if (usageLevel === 'medio') return 7; // Semanal
    return 14; // Quincenal
  };

  const findBestEmployee = (
    space: Space,
    date: Date,
    taskAssignments: Map<string, number>
  ): HomeEmployee | null => {
    // Filtrar empleados por zona compatible
    const compatibleEmployees = employees.filter(emp => {
      if (emp.zone === 'ambos') return true;
      return emp.zone === space.category;
    });

    if (compatibleEmployees.length === 0) return null;

    // Obtener día de la semana
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[date.getDay()];

    // Filtrar por día de trabajo
    const availableEmployees = compatibleEmployees.filter(emp =>
      emp.work_days?.includes(dayName)
    );

    if (availableEmployees.length === 0) return null;

    // Seleccionar el que tenga menos tareas asignadas ese día
    const dateKey = date.toISOString().split('T')[0];
    let bestEmployee = availableEmployees[0];
    let minTasks = taskAssignments.get(`${bestEmployee.id}-${dateKey}`) || 0;

    for (const emp of availableEmployees) {
      const empTasks = taskAssignments.get(`${emp.id}-${dateKey}`) || 0;
      if (empTasks < minTasks) {
        bestEmployee = emp;
        minTasks = empTasks;
      }
    }

    return bestEmployee;
  };

  const generateSchedule = async () => {
    setGenerating(true);
    const generatedTasks: GeneratedTask[] = [];
    const taskAssignments = new Map<string, number>();

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeksToGenerate * 7));

    // Para cada espacio, generar tareas
    for (const space of spaces) {
      const tasks = getTasksForSpace(space);

      for (const taskName of tasks) {
        const frequencyDays = getFrequencyDays(taskName, space.usage_level);

        // Calcular fechas para esta tarea
        let currentDate = new Date(startDate);

        // Offset inicial para distribuir tareas (evitar todas el mismo día)
        const spaceIndex = spaces.indexOf(space);
        currentDate.setDate(currentDate.getDate() + (spaceIndex % frequencyDays));

        while (currentDate < endDate) {
          const employee = findBestEmployee(space, currentDate, taskAssignments);

          if (employee) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const empKey = `${employee.id}-${dateKey}`;
            taskAssignments.set(empKey, (taskAssignments.get(empKey) || 0) + 1);
          }

          generatedTasks.push({
            spaceId: space.id,
            spaceName: space.custom_name || space.space_type?.name || 'Espacio',
            spaceIcon: space.space_type?.icon || '🏠',
            taskName,
            frequency: frequencyDays === 1 ? 'Diaria' :
                       frequencyDays <= 3 ? 'Cada 3 días' :
                       frequencyDays <= 7 ? 'Semanal' : 'Quincenal',
            assignedTo: employee?.id || null,
            assignedName: employee?.name || null,
            scheduledDate: currentDate.toISOString().split('T')[0],
            estimatedMinutes: 15 + Math.floor(Math.random() * 30)
          });

          currentDate.setDate(currentDate.getDate() + frequencyDays);
        }
      }
    }

    // Ordenar por fecha
    generatedTasks.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    setPreview(generatedTasks);
    setStep('preview');
    setGenerating(false);
  };

  const saveSchedule = async () => {
    setGenerating(true);

    try {
      // Primero crear/actualizar task_templates
      const templateMap = new Map<string, string>();

      for (const task of preview) {
        const templateKey = `${task.spaceId}-${task.taskName}`;

        if (!templateMap.has(templateKey)) {
          // Verificar si ya existe
          const { data: existing } = await supabase
            .from('task_templates')
            .select('id')
            .eq('space_id', task.spaceId)
            .eq('name', task.taskName)
            .single();

          if (existing) {
            templateMap.set(templateKey, existing.id);
          } else {
            // Crear nueva plantilla
            const { data: newTemplate } = await supabase
              .from('task_templates')
              .insert({
                household_id: householdId,
                space_id: task.spaceId,
                name: task.taskName,
                frequency: task.frequency === 'Diaria' ? 'diaria' :
                          task.frequency === 'Semanal' ? 'semanal' : 'quincenal',
                estimated_minutes: task.estimatedMinutes,
                priority: 'normal',
                is_active: true
              })
              .select('id')
              .single();

            if (newTemplate) {
              templateMap.set(templateKey, newTemplate.id);
            }
          }
        }
      }

      // Luego crear scheduled_tasks
      const tasksToInsert = preview.map(task => ({
        household_id: householdId,
        task_template_id: templateMap.get(`${task.spaceId}-${task.taskName}`),
        space_id: task.spaceId,
        employee_id: task.assignedTo,
        scheduled_date: task.scheduledDate,
        status: 'pendiente'
      })).filter(t => t.task_template_id);

      // Insertar en lotes de 50
      const batchSize = 50;
      let inserted = 0;

      for (let i = 0; i < tasksToInsert.length; i += batchSize) {
        const batch = tasksToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('scheduled_tasks')
          .insert(batch);

        if (!error) {
          inserted += batch.length;
        }
      }

      setSavedCount(inserted);
      setStep('done');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error al guardar la programación');
    } finally {
      setGenerating(false);
    }
  };

  // Agrupar tareas por fecha para preview
  const tasksByDate = preview.reduce((acc, task) => {
    if (!acc[task.scheduledDate]) {
      acc[task.scheduledDate] = [];
    }
    acc[task.scheduledDate].push(task);
    return acc;
  }, {} as Record<string, GeneratedTask[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <span className="font-semibold">Generar Programación</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Config Step */}
          {step === 'config' && (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={32} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">Programación Inteligente</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generaremos un calendario de limpieza basado en tus espacios y empleados
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Home size={16} />
                    Espacios
                  </span>
                  <span className="font-semibold">{spaces.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <User size={16} />
                    Empleados
                  </span>
                  <span className="font-semibold">{employees.length}</span>
                </div>
              </div>

              {/* Weeks to generate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semanas a programar
                </label>
                <div className="flex gap-2">
                  {[1, 2, 4].map(weeks => (
                    <button
                      key={weeks}
                      onClick={() => setWeeksToGenerate(weeks)}
                      className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                        weeksToGenerate === weeks
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {weeks} semana{weeks > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800">
                <p className="font-medium mb-1">La programación considera:</p>
                <ul className="list-disc list-inside space-y-1 text-purple-700">
                  <li>Nivel de uso de cada espacio</li>
                  <li>Zona de trabajo de cada empleado</li>
                  <li>Días laborales de cada empleado</li>
                  <li>Distribución equitativa de tareas</li>
                </ul>
              </div>

              {employees.length === 0 && (
                <div className="bg-yellow-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Sin empleados</p>
                    <p className="text-sm text-yellow-700">
                      Agrega empleados para asignar tareas automáticamente
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={generateSchedule}
                disabled={generating || spaces.length === 0}
                className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generar Programación
                  </>
                )}
              </button>
            </>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Vista Previa</h3>
                <span className="text-sm text-gray-500">
                  {preview.length} tareas en {Object.keys(tasksByDate).length} días
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {Object.entries(tasksByDate).slice(0, 14).map(([date, tasks]) => (
                  <div key={date} className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 font-medium text-sm flex items-center gap-2">
                      <Calendar size={14} />
                      {formatDate(date)}
                      <span className="text-gray-500 ml-auto">{tasks.length} tareas</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {tasks.slice(0, 5).map((task, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm py-1 px-2">
                          <span>{task.spaceIcon}</span>
                          <span className="flex-1 truncate">{task.taskName}</span>
                          {task.assignedName && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {task.assignedName}
                            </span>
                          )}
                        </div>
                      ))}
                      {tasks.length > 5 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{tasks.length - 5} más
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(tasksByDate).length > 14 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    +{Object.keys(tasksByDate).length - 14} días más
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('config')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                >
                  Volver
                </button>
                <button
                  onClick={saveSchedule}
                  disabled={generating}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Done Step */}
          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                ¡Programación Creada!
              </h3>
              <p className="text-gray-600 mb-6">
                Se crearon {savedCount} tareas programadas
              </p>
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold"
              >
                Ver Calendario
              </button>
            </div>
          )}

          {step !== 'done' && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
