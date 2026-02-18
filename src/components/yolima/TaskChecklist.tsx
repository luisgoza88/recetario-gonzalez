'use client';

import { Check } from 'lucide-react';

interface TaskChecklistProps {
  emoji: string;
  title: string;
  items: string[];
  completedItems: string[];
  onToggle: (item: string) => void;
}

export default function TaskChecklist({
  emoji,
  title,
  items,
  completedItems,
  onToggle,
}: TaskChecklistProps) {
  if (items.length === 0) return null;

  const completedCount = completedItems.length;
  const totalCount = items.length;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <h3 className="text-xl font-bold text-gray-700 uppercase">{title}</h3>
        </div>
        <span className="text-lg font-bold text-gray-500">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const isDone = completedItems.includes(item);

          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`w-full min-h-[52px] rounded-xl px-4 py-3 flex items-center gap-4 text-left
                          transition-all duration-200 ${
                isDone
                  ? 'bg-green-50 border-2 border-green-300'
                  : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${
                  isDone
                    ? 'bg-green-500'
                    : 'border-2 border-gray-400'
                }`}
              >
                {isDone && <Check size={18} strokeWidth={3} className="text-white" />}
              </div>

              {/* Label */}
              <span
                className={`text-lg ${
                  isDone ? 'text-green-700 line-through' : 'text-gray-700'
                }`}
              >
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
