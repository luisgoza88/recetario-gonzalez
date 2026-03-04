"use client";

import { Check } from "lucide-react";

export interface MealCardMeal {
  name: string;
  prepTime?: string;
  totalTime?: string;
  thermomix?: boolean;
  steps?: string[];
}

interface MealCardProps {
  emoji: string;
  label: string;
  meal: MealCardMeal | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onViewRecipe: () => void;
  onStartThermomix?: () => void;
}

export default function MealCard({
  emoji,
  label,
  meal,
  isCompleted,
  onToggleComplete,
  onViewRecipe,
  onStartThermomix,
}: MealCardProps) {
  if (!meal) {
    return (
      <div className="bg-gray-50 rounded-2xl p-5 border-2 border-dashed border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{emoji}</span>
          <h3 className="text-xl font-bold text-gray-400 uppercase">{label}</h3>
        </div>
        <p className="text-lg text-gray-400 italic ml-12">
          No hay comida programada
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 border-2 transition-all duration-300 ${
        isCompleted
          ? "bg-green-50 border-green-300 shadow-sm"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{emoji}</span>
        <h3 className="text-xl font-bold text-gray-700 uppercase">{label}</h3>
      </div>

      {/* Meal name */}
      <h4
        className={`text-xl font-semibold mb-2 ml-1 ${
          isCompleted ? "text-green-700 line-through" : "text-gray-800"
        }`}
      >
        {meal.name}
      </h4>

      {/* Time & method */}
      <div className="flex items-center gap-4 mb-4 ml-1">
        {(meal.totalTime || meal.prepTime) && (
          <span className="text-lg text-gray-500">
            ⏱️ {meal.totalTime || meal.prepTime}
          </span>
        )}
        {meal.thermomix && (
          <span className="text-lg text-gray-500">🤖 Thermomix</span>
        )}
        {!meal.thermomix && (
          <span className="text-lg text-gray-500">👩‍🍳 Manual</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={onViewRecipe}
          className="flex-1 min-h-[56px] bg-blue-100 text-blue-700 rounded-xl text-lg font-semibold 
                     hover:bg-blue-200 active:bg-blue-300 transition-colors flex items-center justify-center gap-2"
        >
          📖 Ver Receta
        </button>
        {meal.thermomix && onStartThermomix && (
          <button
            onClick={onStartThermomix}
            className="flex-1 min-h-[56px] bg-purple-100 text-purple-700 rounded-xl text-lg font-semibold 
                       hover:bg-purple-200 active:bg-purple-300 transition-colors flex items-center justify-center gap-2"
          >
            🤖 Iniciar TM6
          </button>
        )}
      </div>

      {/* Completion toggle */}
      <button
        onClick={onToggleComplete}
        className={`w-full min-h-[56px] rounded-xl text-lg font-semibold transition-all duration-300
                    flex items-center justify-center gap-3 ${
                      isCompleted
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-300"
                    }`}
      >
        {isCompleted ? (
          <>
            <Check size={24} strokeWidth={3} />
            ¡Listo! ✅
          </>
        ) : (
          <>
            <div className="w-6 h-6 border-2 border-gray-400 rounded-md" />
            Marcar como Listo
          </>
        )}
      </button>
    </div>
  );
}
