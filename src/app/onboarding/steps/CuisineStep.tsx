"use client";

import { Check } from "lucide-react";
import { CUISINE_TEMPLATES } from "../constants";

interface CuisineStepProps {
  selectedCuisine: string;
  setSelectedCuisine: (cuisine: string) => void;
}

export function CuisineStep({
  selectedCuisine,
  setSelectedCuisine,
}: CuisineStepProps) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Estilo de cocina
      </h2>
      <p className="text-gray-600 mb-6">¿Qué tipo de cocina prefieres?</p>

      <div className="space-y-3">
        {CUISINE_TEMPLATES.map((cuisine) => (
          <button
            key={cuisine.id}
            onClick={() => setSelectedCuisine(cuisine.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              selectedCuisine === cuisine.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{cuisine.flag}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{cuisine.name}</h3>
                <p className="text-sm text-gray-500">{cuisine.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cuisine.popular.map((dish) => (
                    <span
                      key={dish}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                    >
                      {dish}
                    </span>
                  ))}
                </div>
              </div>
              {selectedCuisine === cuisine.id && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Podrás agregar recetas de cualquier estilo después
      </p>
    </div>
  );
}
