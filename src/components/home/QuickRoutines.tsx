'use client';

import { useState } from 'react';
import {
  X, Play, Clock, CheckCircle2, Zap, Home, Sparkles,
  PartyPopper, Moon, Users, Baby, Utensils, Timer
} from 'lucide-react';

interface QuickRoutinesProps {
  onClose: () => void;
  onStartRoutine: (routine: Routine) => void;
}

interface RoutineTask {
  id: string;
  name: string;
  space: string;
  minutes: number;
  completed: boolean;
}

interface Routine {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  totalMinutes: number;
  tasks: RoutineTask[];
}

const QUICK_ROUTINES: Routine[] = [
  {
    id: 'unexpected-visit',
    name: 'Visita Inesperada',
    description: 'Limpieza rápida para recibir visitas',
    icon: <Users size={24} />,
    color: 'from-blue-500 to-blue-600',
    totalMinutes: 15,
    tasks: [
      { id: '1', name: 'Organizar sala', space: 'Sala', minutes: 3, completed: false },
      { id: '2', name: 'Limpiar baño social', space: 'Baño', minutes: 5, completed: false },
      { id: '3', name: 'Organizar cojines', space: 'Sala', minutes: 2, completed: false },
      { id: '4', name: 'Vaciar papeleras visibles', space: 'General', minutes: 2, completed: false },
      { id: '5', name: 'Aromatizar', space: 'General', minutes: 3, completed: false },
    ]
  },
  {
    id: 'before-sleep',
    name: 'Antes de Dormir',
    description: 'Preparar la casa para la noche',
    icon: <Moon size={24} />,
    color: 'from-indigo-500 to-indigo-600',
    totalMinutes: 10,
    tasks: [
      { id: '1', name: 'Recoger platos de la sala', space: 'Sala', minutes: 2, completed: false },
      { id: '2', name: 'Limpiar mesón cocina', space: 'Cocina', minutes: 3, completed: false },
      { id: '3', name: 'Verificar puertas/ventanas', space: 'General', minutes: 2, completed: false },
      { id: '4', name: 'Apagar luces innecesarias', space: 'General', minutes: 1, completed: false },
      { id: '5', name: 'Preparar cafetera', space: 'Cocina', minutes: 2, completed: false },
    ]
  },
  {
    id: 'post-party',
    name: 'Post-Fiesta',
    description: 'Limpieza después de una reunión',
    icon: <PartyPopper size={24} />,
    color: 'from-pink-500 to-pink-600',
    totalMinutes: 45,
    tasks: [
      { id: '1', name: 'Recoger vasos y platos', space: 'General', minutes: 10, completed: false },
      { id: '2', name: 'Barrer área social', space: 'Sala', minutes: 8, completed: false },
      { id: '3', name: 'Limpiar derrames', space: 'General', minutes: 5, completed: false },
      { id: '4', name: 'Sacar basura', space: 'General', minutes: 5, completed: false },
      { id: '5', name: 'Lavar platos', space: 'Cocina', minutes: 12, completed: false },
      { id: '6', name: 'Limpiar baños', space: 'Baño', minutes: 5, completed: false },
    ]
  },
  {
    id: 'baby-arrival',
    name: 'Llegó el Bebé',
    description: 'Preparar espacio para bebé/niño',
    icon: <Baby size={24} />,
    color: 'from-green-500 to-green-600',
    totalMinutes: 20,
    tasks: [
      { id: '1', name: 'Desinfectar superficies bajas', space: 'Sala', minutes: 5, completed: false },
      { id: '2', name: 'Recoger objetos pequeños', space: 'General', minutes: 5, completed: false },
      { id: '3', name: 'Asegurar cables', space: 'General', minutes: 3, completed: false },
      { id: '4', name: 'Preparar área de juegos', space: 'Sala', minutes: 4, completed: false },
      { id: '5', name: 'Verificar esquinas peligrosas', space: 'General', minutes: 3, completed: false },
    ]
  },
  {
    id: 'post-cooking',
    name: 'Post-Cocina',
    description: 'Limpieza después de cocinar',
    icon: <Utensils size={24} />,
    color: 'from-orange-500 to-orange-600',
    totalMinutes: 15,
    tasks: [
      { id: '1', name: 'Lavar ollas y sartenes', space: 'Cocina', minutes: 5, completed: false },
      { id: '2', name: 'Limpiar estufa', space: 'Cocina', minutes: 3, completed: false },
      { id: '3', name: 'Limpiar mesones', space: 'Cocina', minutes: 2, completed: false },
      { id: '4', name: 'Barrer cocina', space: 'Cocina', minutes: 3, completed: false },
      { id: '5', name: 'Sacar basura orgánica', space: 'Cocina', minutes: 2, completed: false },
    ]
  },
  {
    id: 'quick-refresh',
    name: 'Refresh Express',
    description: 'Refresco rápido de toda la casa',
    icon: <Zap size={24} />,
    color: 'from-yellow-500 to-yellow-600',
    totalMinutes: 20,
    tasks: [
      { id: '1', name: 'Abrir ventanas (ventilar)', space: 'General', minutes: 2, completed: false },
      { id: '2', name: 'Tender camas', space: 'Habitaciones', minutes: 5, completed: false },
      { id: '3', name: 'Barrer áreas principales', space: 'General', minutes: 8, completed: false },
      { id: '4', name: 'Vaciar papeleras', space: 'General', minutes: 3, completed: false },
      { id: '5', name: 'Aromatizar espacios', space: 'General', minutes: 2, completed: false },
    ]
  }
];

export default function QuickRoutines({ onClose, onStartRoutine }: QuickRoutinesProps) {
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [routineTasks, setRoutineTasks] = useState<RoutineTask[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const startRoutine = (routine: Routine) => {
    setActiveRoutine(routine);
    setRoutineTasks(routine.tasks.map(t => ({ ...t, completed: false })));
    setElapsedTime(0);
    setIsRunning(true);
    onStartRoutine(routine);
  };

  const toggleTask = (taskId: string) => {
    setRoutineTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    );
  };

  const completedTasks = routineTasks.filter(t => t.completed).length;
  const progressPercent = routineTasks.length > 0 ? (completedTasks / routineTasks.length) * 100 : 0;
  const allCompleted = completedTasks === routineTasks.length && routineTasks.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap size={20} />
            <span className="font-semibold">
              {activeRoutine ? activeRoutine.name : 'Rutinas Rápidas'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!activeRoutine ? (
            // Routine Selection
            <div className="space-y-3">
              <p className="text-gray-600 text-sm mb-4">
                Selecciona una rutina para situaciones comunes:
              </p>

              {QUICK_ROUTINES.map(routine => (
                <button
                  key={routine.id}
                  onClick={() => setSelectedRoutine(
                    selectedRoutine?.id === routine.id ? null : routine
                  )}
                  className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                    selectedRoutine?.id === routine.id
                      ? 'ring-2 ring-purple-500'
                      : ''
                  }`}
                >
                  <div className={`bg-gradient-to-r ${routine.color} p-4 text-white`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        {routine.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{routine.name}</h3>
                        <p className="text-sm text-white/80">{routine.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{routine.totalMinutes}</div>
                        <div className="text-xs text-white/80">minutos</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Tasks Preview */}
                  {selectedRoutine?.id === routine.id && (
                    <div className="bg-gray-50 p-4 border-t">
                      <div className="space-y-2 mb-4">
                        {routine.tasks.map(task => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="flex-1">{task.name}</span>
                            <span className="text-gray-400">{task.minutes}m</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRoutine(routine);
                        }}
                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700"
                      >
                        <Play size={18} />
                        Iniciar Rutina
                      </button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            // Active Routine
            <div>
              {/* Progress */}
              <div className={`bg-gradient-to-r ${activeRoutine.color} rounded-xl p-4 text-white mb-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer size={18} />
                    <span className="font-medium">Progreso</span>
                  </div>
                  <span className="text-2xl font-bold">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-white/80">
                  <span>{completedTasks}/{routineTasks.length} tareas</span>
                  <span>~{activeRoutine.totalMinutes} min total</span>
                </div>
              </div>

              {/* Completion Message */}
              {allCompleted && (
                <div className="bg-green-100 border border-green-300 rounded-xl p-4 mb-4 text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-green-800 font-semibold">¡Rutina Completada!</h3>
                  <p className="text-green-600 text-sm">Excelente trabajo</p>
                </div>
              )}

              {/* Tasks Checklist */}
              <div className="space-y-2">
                {routineTasks.map((task, index) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                      task.completed
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {task.completed ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${task.completed ? 'text-gray-400 line-through' : ''}`}>
                        {task.name}
                      </p>
                      <p className="text-sm text-gray-500">{task.space}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock size={14} />
                      <span className="text-sm">{task.minutes}m</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeRoutine && (
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActiveRoutine(null);
                  setRoutineTasks([]);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={onClose}
                disabled={!allCompleted}
                className={`flex-1 py-3 rounded-xl font-semibold ${
                  allCompleted
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {allCompleted ? 'Finalizar' : `${routineTasks.length - completedTasks} pendientes`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
