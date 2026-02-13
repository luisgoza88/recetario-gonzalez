'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Play, Star, Eye } from 'lucide-react';
import { ScheduledTask } from '@/types';

interface TaskCardProps {
  task: ScheduledTask;
  onToggle: () => void;
  onStart: () => void;
  onInspect: () => void;
  onRate: () => void;
}

export default function TaskCard({ task, onToggle, onStart, onInspect, onRate }: TaskCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isCompleted = task.status === 'completada';
  const isInProgress = task.status === 'en_progreso';

  // Live timer for in-progress tasks
  useEffect(() => {
    if (!isInProgress || !task.started_at) {
      setElapsedTime(0);
      return;
    }

    const startedAt = new Date(task.started_at).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startedAt) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isInProgress, task.started_at]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage vs estimated time
  const estimatedSeconds = (task.task_template?.estimated_minutes || 30) * 60;
  const progressPercent = Math.min(100, (elapsedTime / estimatedSeconds) * 100);

  // Get encouraging message based on progress
  const getEncouragingMessage = () => {
    if (progressPercent < 50) return { emoji: '🚀', text: '¡Buen ritmo!' };
    if (progressPercent < 80) return { emoji: '💪', text: '¡Vas muy bien!' };
    if (progressPercent < 100) return { emoji: '🏁', text: '¡Ya casi!' };
    return { emoji: '⏰', text: '¡Tómate tu tiempo!' };
  };

  // Get achievement for completed task
  const getAchievement = (actualMinutes: number, estimatedMinutes: number) => {
    const ratio = actualMinutes / estimatedMinutes;
    if (ratio <= 0.7) return { emoji: '⚡', text: '¡Súper rápido!', color: 'bg-purple-100 text-purple-700' };
    if (ratio <= 0.9) return { emoji: '🌟', text: '¡Excelente!', color: 'bg-yellow-100 text-yellow-700' };
    if (ratio <= 1.0) return { emoji: '✨', text: '¡Perfecto!', color: 'bg-green-100 text-green-700' };
    if (ratio <= 1.2) return { emoji: '👍', text: '¡Bien hecho!', color: 'bg-blue-100 text-blue-700' };
    return { emoji: '💪', text: '¡Completado!', color: 'bg-gray-100 text-gray-700' };
  };

  const encouragement = getEncouragingMessage();

  return (
    <div className={`p-4 ${isCompleted ? 'bg-green-50' : isInProgress ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-blue-500'
          }`}
        >
          {isCompleted && <CheckCircle2 size={16} />}
        </button>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isCompleted ? 'text-gray-400 line-through' : ''}`}>
            {task.task_template?.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              {task.space?.space_type?.icon}
              {task.space?.custom_name || task.space?.space_type?.name}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              ~{task.task_template?.estimated_minutes} min
            </span>
          </div>

          {/* Gamified Timer - Friendly & Encouraging */}
          {isInProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{encouragement.emoji}</span>
                  <span className="text-lg font-mono font-bold text-indigo-600">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
                <span className="text-xs text-indigo-500 font-medium">
                  {encouragement.text}
                </span>
              </div>
              {/* Friendly progress bar - always encouraging colors */}
              <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Achievement Badge after completion */}
          {isCompleted && task.actual_minutes !== undefined && task.actual_minutes !== null && (
            <div className="mt-2 flex items-center gap-2">
              {(() => {
                const achievement = getAchievement(
                  task.actual_minutes,
                  task.task_template?.estimated_minutes || 30
                );
                return (
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${achievement.color}`}>
                    {achievement.emoji} {achievement.text} • {task.actual_minutes} min
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isCompleted && !isInProgress && (
            <button
              onClick={onStart}
              className="p-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white shadow-sm"
              title="¡Empezar!"
            >
              <Play size={18} />
            </button>
          )}

          {isInProgress && (
            <button
              onClick={onToggle}
              className="p-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl text-white shadow-sm"
              title="¡Listo!"
            >
              <CheckCircle2 size={18} />
            </button>
          )}

          {isCompleted && (
            <>
              <button
                onClick={onRate}
                className="p-2 hover:bg-amber-100 rounded-lg text-amber-500"
                title="Calificar"
              >
                <Star size={18} />
              </button>
              <button
                onClick={onInspect}
                className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                title="Inspeccionar"
              >
                <Eye size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
