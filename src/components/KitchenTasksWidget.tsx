'use client';

import { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  Snowflake,
  Flame,
  Droplets,
  Scissors,
  ShoppingCart,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { KitchenTask, getPrepSummary, completeKitchenTask } from '@/lib/menu-tasks-integration';

interface KitchenTasksWidgetProps {
  compact?: boolean;
  onUpdate?: () => void;
}

const TASK_ICONS: Record<KitchenTask['type'], React.ReactNode> = {
  prep: <Scissors size={16} className="text-blue-600" />,
  defrost: <Snowflake size={16} className="text-cyan-600" />,
  marinate: <Droplets size={16} className="text-purple-600" />,
  cook: <Flame size={16} className="text-orange-600" />,
  buy: <ShoppingCart size={16} className="text-green-600" />,
  clean: <ChefHat size={16} className="text-gray-600" />
};

const TASK_TYPE_LABELS: Record<KitchenTask['type'], string> = {
  prep: 'Preparar',
  defrost: 'Descongelar',
  marinate: 'Marinar',
  cook: 'Cocinar',
  buy: 'Comprar',
  clean: 'Limpiar'
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena'
};

const PRIORITY_COLORS: Record<KitchenTask['priority'], string> = {
  alta: 'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  baja: 'bg-gray-100 text-gray-600 border-gray-200'
};

export default function KitchenTasksWidget({ compact = false, onUpdate }: KitchenTasksWidgetProps) {
  const [summary, setSummary] = useState<{
    totalTasks: number;
    urgentTasks: number;
    todayTasks: KitchenTask[];
    tomorrowTasks: KitchenTask[];
    nextMealTasks: KitchenTask[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await getPrepSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading kitchen tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (task: KitchenTask) => {
    if (!task.id) return;

    setCompletedIds(prev => new Set([...prev, task.id!]));

    try {
      await completeKitchenTask(task.id);
      onUpdate?.();
    } catch (error) {
      console.error('Error completing task:', error);
      setCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(task.id!);
        return next;
      });
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!summary || summary.totalTasks === 0) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ChefHat size={20} className="text-orange-600" />
          <span className="font-medium text-orange-800">Tareas de Cocina</span>
        </div>
        <p className="text-sm text-orange-700">No hay tareas de preparación pendientes.</p>
        <button
          onClick={loadTasks}
          className="mt-3 flex items-center gap-2 text-sm text-orange-600 hover:text-orange-800"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>
    );
  }

  // Vista compacta
  if (compact) {
    return (
      <div
        className={`rounded-xl p-3 cursor-pointer transition-all ${
          summary.urgentTasks > 0
            ? 'bg-red-50 border border-red-200'
            : 'bg-orange-50 border border-orange-200'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat size={16} className={summary.urgentTasks > 0 ? 'text-red-600' : 'text-orange-600'} />
            <span className="text-sm font-medium">
              {summary.nextMealTasks.length} tareas para próxima comida
            </span>
          </div>
          <div className="flex items-center gap-2">
            {summary.urgentTasks > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-800 flex items-center gap-1">
                <AlertTriangle size={12} />
                {summary.urgentTasks} urgentes
              </span>
            )}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {summary.nextMealTasks.map((task, i) => (
              <TaskItem
                key={i}
                task={task}
                onComplete={handleComplete}
                isCompleted={completedIds.has(task.id || '')}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vista completa
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${
        summary.urgentTasks > 0 ? 'bg-red-600' : 'bg-orange-600'
      } text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat size={20} />
            <span className="font-semibold">Tareas de Cocina</span>
          </div>
          <button
            onClick={loadTasks}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3 bg-gray-50 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">{summary.todayTasks.length}</div>
          <div className="text-xs text-gray-500">Hoy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">{summary.tomorrowTasks.length}</div>
          <div className="text-xs text-gray-500">Mañana</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${summary.urgentTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.urgentTasks}
          </div>
          <div className="text-xs text-gray-500">Urgentes</div>
        </div>
      </div>

      {/* Urgent Tasks Alert */}
      {summary.urgentTasks > 0 && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={16} />
            <span className="font-medium">
              {summary.urgentTasks} {summary.urgentTasks === 1 ? 'tarea requiere' : 'tareas requieren'} atención en las próximas 2 horas
            </span>
          </div>
        </div>
      )}

      {/* Next Meal Tasks */}
      {summary.nextMealTasks.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={14} />
            Próxima comida
          </h3>
          <div className="space-y-2">
            {summary.nextMealTasks.map((task, i) => (
              <TaskItem
                key={i}
                task={task}
                onComplete={handleComplete}
                isCompleted={completedIds.has(task.id || '')}
                showMeal
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      {summary.todayTasks.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Hoy</h3>
          <div className="space-y-2">
            {summary.todayTasks
              .filter(t => !summary.nextMealTasks.some(nm => nm.title === t.title && nm.scheduled_time === t.scheduled_time))
              .map((task, i) => (
                <TaskItem
                  key={i}
                  task={task}
                  onComplete={handleComplete}
                  isCompleted={completedIds.has(task.id || '')}
                  showMeal
                />
              ))}
          </div>
        </div>
      )}

      {/* Tomorrow's Tasks */}
      {summary.tomorrowTasks.length > 0 && (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Mañana</h3>
          <div className="space-y-2">
            {summary.tomorrowTasks.slice(0, 3).map((task, i) => (
              <TaskItem
                key={i}
                task={task}
                onComplete={handleComplete}
                isCompleted={completedIds.has(task.id || '')}
                showMeal
              />
            ))}
            {summary.tomorrowTasks.length > 3 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                +{summary.tomorrowTasks.length - 3} tareas más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: KitchenTask;
  onComplete: (task: KitchenTask) => void;
  isCompleted: boolean;
  showMeal?: boolean;
}

function TaskItem({ task, onComplete, isCompleted, showMeal = false }: TaskItemProps) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
      isCompleted
        ? 'bg-green-50 border-green-200 opacity-60'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <button
        onClick={() => onComplete(task)}
        disabled={isCompleted}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-500'
        }`}
      >
        {isCompleted && <Check size={14} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {TASK_ICONS[task.type]}
          <span className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
            {task.title}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 mb-1">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {task.scheduled_time && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock size={10} />
              {task.scheduled_time.slice(0, 5)}
            </span>
          )}

          {showMeal && task.meal_type && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {MEAL_LABELS[task.meal_type]}
            </span>
          )}

          <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>

          {task.estimated_minutes && (
            <span className="text-xs text-gray-500">
              ~{task.estimated_minutes} min
            </span>
          )}
        </div>

        {task.recipe_name && (
          <p className="text-xs text-gray-400 mt-1">
            Para: {task.recipe_name}
          </p>
        )}
      </div>
    </div>
  );
}
