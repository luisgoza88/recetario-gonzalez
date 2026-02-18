'use client';

interface DayProgressProps {
  /** 0 to 100 */
  percent: number;
  label?: string;
}

export default function DayProgress({ percent, label }: DayProgressProps) {
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));

  const getColor = () => {
    if (clampedPercent >= 100) return 'bg-green-500';
    if (clampedPercent >= 60) return 'bg-blue-500';
    if (clampedPercent >= 30) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getEmoji = () => {
    if (clampedPercent >= 100) return '🎉';
    if (clampedPercent >= 75) return '💪';
    if (clampedPercent >= 50) return '👍';
    if (clampedPercent >= 25) return '🏃‍♀️';
    return '☀️';
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-gray-800">
          {getEmoji()} {label || 'Progreso del Día'}
        </span>
        <span className="text-2xl font-bold text-gray-700">
          {clampedPercent}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getColor()}`}
          style={{ width: `${clampedPercent}%` }}
          role="progressbar"
          aria-valuenow={clampedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso: ${clampedPercent}%`}
        />
      </div>
      {clampedPercent >= 100 && (
        <p className="text-center text-green-600 font-semibold mt-3 text-lg">
          ¡Todo completado! 🎊
        </p>
      )}
    </div>
  );
}
