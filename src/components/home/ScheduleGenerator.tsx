'use client';

import { useState } from 'react';
import {
  X, Sparkles, Calendar, Clock, CheckCircle2, AlertTriangle,
  RefreshCw, User, Home, Brain, TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Space, HomeEmployee, TaskTemplate, SpaceType } from '@/types';
import {
  calculateLearnedDuration,
  calculateEmployeeScore,
  suggestOptimalAssignment,
  EmployeeScore
} from '@/lib/home/intelligence';

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
  const [useIntelligence, setUseIntelligence] = useState(true);
  const [employeeScores, setEmployeeScores] = useState<EmployeeScore[]>([]);
  const [learnedTasksCount, setLearnedTasksCount] = useState(0);

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
    minutesAssignments: Map<string, number>, // Changed: now tracks MINUTES not tasks
    taskMinutes: number // New: estimated minutes for this specific task
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

    const dateKey = date.toISOString().split('T')[0];
    const DAILY_WORK_MINUTES = 480; // 8 hours

    if (useIntelligence && availableEmployees.length > 1) {
      // INTELLIGENT BALANCING: Score each employee based on multiple factors
      const scored = availableEmployees.map(emp => {
        const currentMinutes = minutesAssignments.get(`${emp.id}-${dateKey}`) || 0;
        const newMinutes = currentMinutes + taskMinutes;
        const utilizationPercent = (newMinutes / DAILY_WORK_MINUTES) * 100;

        // Get employee performance score
        const empScore = employeeScores.find(s => s.employeeId === emp.id);
        const performanceScore = empScore?.overallScore || 50;

        // Calculate assignment score (higher = better candidate)
        let score = 0;

        // Factor 1: Favor employees with lower current load (up to 50 points)
        // An employee at 0% gets 50 points, at 100% gets 0
        score += Math.max(0, 50 - (utilizationPercent / 2));

        // Factor 2: Favor employees with higher performance (up to 30 points)
        score += (performanceScore / 100) * 30;

        // Factor 3: Penalize if this would overload them (up to -20 points)
        if (utilizationPercent > 100) {
          score -= Math.min(20, (utilizationPercent - 100) / 2);
        }

        return { employee: emp, score, currentMinutes, utilizationPercent };
      });

      // Sort by score (highest first)
      scored.sort((a, b) => b.score - a.score);

      return scored[0].employee;
    } else {
      // SIMPLE BALANCING: Just use minutes (fallback)
      let bestEmployee = availableEmployees[0];
      let minMinutes = minutesAssignments.get(`${bestEmployee.id}-${dateKey}`) || 0;

      for (const emp of availableEmployees) {
        const empMinutes = minutesAssignments.get(`${emp.id}-${dateKey}`) || 0;
        if (empMinutes < minMinutes) {
          bestEmployee = emp;
          minMinutes = empMinutes;
        }
      }

      return bestEmployee;
    }
  };

  const generateSchedule = async () => {
    setGenerating(true);
    const generatedTasks: GeneratedTask[] = [];
    const minutesAssignments = new Map<string, number>(); // Track MINUTES per employee per day

    // Load intelligence data if enabled
    if (useIntelligence) {
      // Load employee scores
      const scores: EmployeeScore[] = [];
      for (const emp of employees) {
        try {
          const score = await calculateEmployeeScore(emp.id);
          if (score) scores.push(score);
        } catch (e) {
          // Ignore errors, use default scores
        }
      }
      setEmployeeScores(scores);
    }

    // Cache for learned durations to avoid repeated queries
    const learnedDurations = new Map<string, number>();
    let learnedCount = 0;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeksToGenerate * 7));

    // Para cada espacio, generar tareas
    for (const space of spaces) {
      const tasks = getTasksForSpace(space);

      for (const taskName of tasks) {
        const frequencyDays = getFrequencyDays(taskName, space.usage_level);

        // Get or calculate task duration
        let estimatedMinutes = 30; // Default
        const durationKey = `${space.id}-${taskName}`;

        if (useIntelligence && !learnedDurations.has(durationKey)) {
          // Try to find existing space_task for this
          const { data: existingTask } = await supabase
            .from('space_tasks')
            .select('id, estimated_minutes')
            .eq('space_id', space.id)
            .ilike('name', taskName)
            .single();

          if (existingTask) {
            try {
              const learned = await calculateLearnedDuration(existingTask.id, space.id);
              if (learned && learned.sampleCount > 0) {
                estimatedMinutes = learned.learnedMinutes;
                learnedCount++;
              } else {
                estimatedMinutes = existingTask.estimated_minutes || 30;
              }
            } catch {
              estimatedMinutes = existingTask.estimated_minutes || 30;
            }
          } else {
            // Estimate based on task type
            if (taskName.toLowerCase().includes('trapear') || taskName.toLowerCase().includes('aspirar')) {
              estimatedMinutes = 40;
            } else if (taskName.toLowerCase().includes('limpiar')) {
              estimatedMinutes = 25;
            } else if (taskName.toLowerCase().includes('organizar')) {
              estimatedMinutes = 35;
            } else {
              estimatedMinutes = 30;
            }
          }
          learnedDurations.set(durationKey, estimatedMinutes);
        } else if (learnedDurations.has(durationKey)) {
          estimatedMinutes = learnedDurations.get(durationKey)!;
        }

        // Calcular fechas para esta tarea
        const currentDate = new Date(startDate);

        // Offset inicial para distribuir tareas (evitar todas el mismo día)
        const spaceIndex = spaces.indexOf(space);
        currentDate.setDate(currentDate.getDate() + (spaceIndex % frequencyDays));

        while (currentDate < endDate) {
          const employee = findBestEmployee(space, currentDate, minutesAssignments, estimatedMinutes);

          if (employee) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const empKey = `${employee.id}-${dateKey}`;
            // Track MINUTES instead of task count
            minutesAssignments.set(empKey, (minutesAssignments.get(empKey) || 0) + estimatedMinutes);
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
            estimatedMinutes
          });

          currentDate.setDate(currentDate.getDate() + frequencyDays);
        }
      }
    }

    setLearnedTasksCount(learnedCount);

    // Ordenar por fecha
    generatedTasks.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    setPreview(generatedTasks);
    setStep('preview');
    setGenerating(false);
  };

  const saveSchedule = async () => {
    setGenerating(true);

    try {
      // 1. Obtener todas las plantillas existentes de una vez
      const { data: existingTemplates } = await supabase
        .from('task_templates')
        .select('id, space_id, name')
        .eq('household_id', householdId);

      const templateMap = new Map<string, string>();

      // Mapear plantillas existentes
      existingTemplates?.forEach(t => {
        templateMap.set(`${t.space_id}-${t.name}`, t.id);
      });

      // 2. Identificar plantillas que necesitan crearse
      const uniqueNewTemplates = new Map<string, {
        household_id: string;
        space_id: string;
        name: string;
        frequency: string;
        estimated_minutes: number;
        priority: string;
        is_active: boolean;
      }>();

      for (const task of preview) {
        const templateKey = `${task.spaceId}-${task.taskName}`;
        if (!templateMap.has(templateKey) && !uniqueNewTemplates.has(templateKey)) {
          uniqueNewTemplates.set(templateKey, {
            household_id: householdId,
            space_id: task.spaceId,
            name: task.taskName,
            frequency: task.frequency === 'Diaria' ? 'diaria' :
                      task.frequency === 'Semanal' ? 'semanal' : 'quincenal',
            estimated_minutes: task.estimatedMinutes,
            priority: 'normal',
            is_active: true
          });
        }
      }

      // 3. Insertar todas las nuevas plantillas de una vez
      if (uniqueNewTemplates.size > 0) {
        const templatesToInsert = Array.from(uniqueNewTemplates.values());
        const { data: newTemplates } = await supabase
          .from('task_templates')
          .insert(templatesToInsert)
          .select('id, space_id, name');

        newTemplates?.forEach(t => {
          templateMap.set(`${t.space_id}-${t.name}`, t.id);
        });
      }

      // 4. Crear scheduled_tasks
      const tasksToInsert = preview.map(task => ({
        household_id: householdId,
        task_template_id: templateMap.get(`${task.spaceId}-${task.taskName}`),
        space_id: task.spaceId,
        employee_id: task.assignedTo,
        scheduled_date: task.scheduledDate,
        status: 'pendiente'
      })).filter(t => t.task_template_id);

      // 5. Insertar en lotes más grandes (100)
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < tasksToInsert.length; i += batchSize) {
        const batch = tasksToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('scheduled_tasks')
          .insert(batch);

        if (!error) {
          inserted += batch.length;
        }

        // Actualizar progreso visual
        setSavedCount(inserted);
      }

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

              {/* Intelligence Toggle */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Brain size={20} className="text-purple-600" />
                    <span className="font-medium">Programación Inteligente</span>
                  </div>
                  <button
                    onClick={() => setUseIntelligence(!useIntelligence)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      useIntelligence ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                      useIntelligence ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                {useIntelligence ? (
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <TrendingUp size={14} />
                      Aprende duración real de tareas
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock size={14} />
                      Balancea carga por MINUTOS
                    </li>
                    <li className="flex items-center gap-2">
                      <User size={14} />
                      Considera rendimiento de empleados
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">
                    Usa tiempos estimados y balance simple por número de tareas
                  </p>
                )}
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

              {/* Intelligence Metrics */}
              {useIntelligence && (learnedTasksCount > 0 || employeeScores.length > 0) && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <Brain size={16} />
                    Datos de Inteligencia Aplicados
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {learnedTasksCount > 0 && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <div className="text-green-600 font-semibold">{learnedTasksCount}</div>
                        <div className="text-gray-600">Duraciones aprendidas</div>
                      </div>
                    )}
                    {employeeScores.length > 0 && (
                      <div className="bg-white/60 rounded-lg p-2">
                        <div className="text-green-600 font-semibold">{employeeScores.length}</div>
                        <div className="text-gray-600">Empleados evaluados</div>
                      </div>
                    )}
                  </div>
                  {employeeScores.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {employeeScores.map(score => (
                        <span
                          key={score.employeeId}
                          className={`text-xs px-2 py-1 rounded-full ${
                            score.overallScore >= 70 ? 'bg-green-100 text-green-700' :
                            score.overallScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}
                        >
                          {score.employeeName}: {score.overallScore}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      {savedCount > 0 ? `${savedCount}/${preview.length}` : 'Guardando...'}
                    </>
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
