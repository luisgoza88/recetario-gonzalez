'use client';

import { useState } from 'react';
import { Clock, CheckCircle2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { ScheduledTask } from '@/types';
import Button from '@/components/ui/Button';

interface HomeTodayTasksProps {
  tasks: ScheduledTask[];
  completedCount: number;
  totalCount: number;
  onToggleTask: (task: ScheduledTask) => void;
  onGenerateSchedule: () => void;
}

export default function HomeTodayTasks({
  tasks,
  completedCount,
  totalCount,
  onToggleTask,
  onGenerateSchedule,
}: HomeTodayTasksProps) {
  const [tasksExpanded, setTasksExpanded] = useState(false);

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm mb-4 text-center">
        <div className="text-4xl mb-2">✨</div>
        <p className="text-gray-600">No hay tareas programadas para hoy</p>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={onGenerateSchedule}
          className="mt-3"
        >
          Generar programación
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
      <button
        onClick={() => setTasksExpanded(!tasksExpanded)}
        className="w-full bg-blue-50 px-4 py-3 border-b flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-600" />
          <span className="font-semibold text-blue-800">Tareas de Hoy</span>
          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
            {completedCount}/{totalCount}
          </span>
        </div>
        {tasksExpanded ? (
          <ChevronUp size={20} className="text-blue-600" />
        ) : (
          <ChevronDown size={20} className="text-blue-600" />
        )}
      </button>
      {tasksExpanded && (
        <div className="divide-y max-h-80 overflow-y-auto">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`p-4 flex items-center gap-3 ${
                task.status === 'completada' ? 'bg-green-50' : ''
              }`}
            >
              <button
                onClick={() => onToggleTask(task)}
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
      )}
    </div>
  );
}
