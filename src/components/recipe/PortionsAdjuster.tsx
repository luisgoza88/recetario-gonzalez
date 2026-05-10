"use client";

import { Minus, Plus } from "lucide-react";

interface PortionsAdjusterProps {
  basePortions: number;
  currentPortions: number;
  onChange: (newPortions: number) => void;
  min?: number;
  max?: number;
}

export function PortionsAdjuster({
  basePortions,
  currentPortions,
  onChange,
  min = 1,
  max = 20,
}: PortionsAdjusterProps) {
  const decrement = () => {
    if (currentPortions > min) onChange(currentPortions - 1);
  };

  const increment = () => {
    if (currentPortions < max) onChange(currentPortions + 1);
  };

  const isDifferentFromBase = currentPortions !== basePortions;

  return (
    <div className="mb-4 p-3 bg-purple-50 rounded-xl">
      <div className="flex items-center justify-between">
        <button
          onClick={decrement}
          disabled={currentPortions <= min}
          aria-label="Reducir porciones"
          className="w-9 h-9 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={16} />
        </button>

        <div className="text-center">
          <span className="text-base font-semibold text-purple-800">
            {currentPortions} {currentPortions === 1 ? "persona" : "personas"}
          </span>
          {isDifferentFromBase && (
            <p className="text-[11px] text-purple-500 mt-0.5">
              Receta original: {basePortions} porciones
            </p>
          )}
        </div>

        <button
          onClick={increment}
          disabled={currentPortions >= max}
          aria-label="Aumentar porciones"
          className="w-9 h-9 rounded-full bg-white border border-purple-200 flex items-center justify-center text-purple-600 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
