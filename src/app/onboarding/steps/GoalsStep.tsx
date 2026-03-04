"use client";

import { Check } from "lucide-react";
import { GOAL_OPTIONS } from "../constants";

interface GoalsStepProps {
  selectedGoals: string[];
  toggleGoal: (id: string) => void;
}

export function GoalsStep({ selectedGoals, toggleGoal }: GoalsStepProps) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Qué quieres lograr?
      </h2>
      <p className="text-gray-600 mb-6">Selecciona todos los que apliquen</p>

      <div className="space-y-3">
        {GOAL_OPTIONS.map((goal) => (
          <button
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selectedGoals.includes(goal.id)
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedGoals.includes(goal.id)
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {goal.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{goal.name}</h3>
                <p className="text-sm text-gray-500">{goal.description}</p>
              </div>
              {selectedGoals.includes(goal.id) && (
                <Check size={20} className="text-green-500" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
