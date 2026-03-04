"use client";

import { Home, Leaf, Plus } from "lucide-react";
import type { SpaceConfig } from "../types";

interface SpacesStepProps {
  spaces: SpaceConfig[];
  customSpace: string;
  setCustomSpace: (space: string) => void;
  toggleSpace: (spaceId: string) => void;
  addCustomSpace: () => void;
}

export function SpacesStep({
  spaces,
  customSpace,
  setCustomSpace,
  toggleSpace,
  addCustomSpace,
}: SpacesStepProps) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Espacios del hogar
      </h2>
      <p className="text-gray-600 mb-6">
        Selecciona los espacios para gestionar
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Home size={16} /> Interior
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {spaces
              .filter((s) => s.category === "interior")
              .map((space) => (
                <button
                  key={space.id}
                  onClick={() => toggleSpace(space.id)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    space.selected
                      ? "bg-green-100 border-2 border-green-500 text-green-800"
                      : "bg-white border-2 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">{space.name}</span>
                </button>
              ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Leaf size={16} /> Exterior
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {spaces
              .filter((s) => s.category === "exterior")
              .map((space) => (
                <button
                  key={space.id}
                  onClick={() => toggleSpace(space.id)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    space.selected
                      ? "bg-blue-100 border-2 border-blue-500 text-blue-800"
                      : "bg-white border-2 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-sm font-medium">{space.name}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customSpace}
            onChange={(e) => setCustomSpace(e.target.value)}
            placeholder="Agregar espacio personalizado..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500"
            onKeyDown={(e) => e.key === "Enter" && addCustomSpace()}
          />
          <button
            onClick={addCustomSpace}
            disabled={!customSpace.trim()}
            className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
