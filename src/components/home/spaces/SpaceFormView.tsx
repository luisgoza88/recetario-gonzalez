"use client";

import { useState } from "react";
import {
  Check,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Scan,
} from "lucide-react";
import { SpaceType, SpaceAttributes } from "@/types";
import SpaceTypeSelector from "../SpaceTypeSelector";
import {
  TaskConfig,
  SpaceForm,
  FREQUENCY_OPTIONS,
} from "@/lib/config/spaceConfig";
import Spinner from "@/components/ui/Spinner";

interface SpaceFormViewProps {
  editingSpace: SpaceForm;
  spaceTypes: SpaceType[];
  saving: boolean;
  onUpdateSpace: (space: SpaceForm) => void;
  onUpdateSpaceType: (typeId: string) => void;
  onUpdateAttribute: (
    attr: keyof SpaceAttributes,
    value: boolean | number | string,
  ) => void;
  onToggleTask: (index: number) => void;
  onUpdateTaskFrequency: (
    index: number,
    frequency: TaskConfig["frequency"],
  ) => void;
  onRemoveTask: (index: number) => void;
  onAddCustomTask: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onOpenScanner: () => void;
  getSelectedSpaceType: () => SpaceType | undefined;
}

export default function SpaceFormView({
  editingSpace,
  spaceTypes,
  saving,
  onUpdateSpace,
  onUpdateSpaceType,
  onUpdateAttribute,
  onToggleTask,
  onUpdateTaskFrequency,
  onRemoveTask,
  onAddCustomTask,
  onSave,
  onCancel,
  onOpenScanner,
  getSelectedSpaceType,
}: SpaceFormViewProps) {
  const [showTasks, setShowTasks] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");

  const enabledTasksCount = editingSpace.tasks.filter((t) => t.enabled).length;
  const selectedType = getSelectedSpaceType();

  const handleAddCustomTask = () => {
    if (!newTaskName.trim()) return;
    onAddCustomTask(newTaskName.trim());
    setNewTaskName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {editingSpace.id ? "Editar Espacio" : "Nuevo Espacio"}
        </h3>
        <button
          onClick={onOpenScanner}
          className="px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
        >
          <Scan size={16} />
          Escanear con IA
        </button>
      </div>

      {/* Space Type */}
      <SpaceTypeSelector
        spaceTypes={spaceTypes}
        selectedTypeId={editingSpace.spaceTypeId}
        category={editingSpace.category}
        onSelect={onUpdateSpaceType}
      />

      {/* Custom Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre personalizado (opcional)
        </label>
        <input
          type="text"
          value={editingSpace.customName}
          onChange={(e) =>
            onUpdateSpace({ ...editingSpace, customName: e.target.value })
          }
          placeholder={`Ej: ${selectedType?.name || ""} principal`}
          className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Usage Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nivel de uso
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "alto", label: "🔥 Alto" },
            { value: "medio", label: "⚡ Medio" },
            { value: "bajo", label: "💤 Bajo" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() =>
                onUpdateSpace({
                  ...editingSpace,
                  usageLevel: option.value as "alto" | "medio" | "bajo",
                })
              }
              className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                editingSpace.usageLevel === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Space Attributes - Only for interior spaces that aren't bathrooms */}
      {editingSpace.category === "interior" &&
        !selectedType?.name?.toLowerCase().includes("baño") && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Características adicionales
            </label>
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              {/* Toggle attributes */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "has_bathroom", label: "🚿 Tiene baño", icon: "🚿" },
                  {
                    key: "has_walkin_closet",
                    label: "👔 Walking closet",
                    icon: "👔",
                  },
                  { key: "has_balcony", label: "🌅 Tiene balcón", icon: "🌅" },
                  {
                    key: "has_curtains",
                    label: "🪟 Tiene cortinas",
                    icon: "🪟",
                  },
                  {
                    key: "has_air_conditioning",
                    label: "❄️ Aire acond.",
                    icon: "❄️",
                  },
                ].map((attr) => (
                  <button
                    key={attr.key}
                    onClick={() =>
                      onUpdateAttribute(
                        attr.key as keyof SpaceAttributes,
                        !editingSpace.attributes[
                          attr.key as keyof SpaceAttributes
                        ],
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                      editingSpace.attributes[attr.key as keyof SpaceAttributes]
                        ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                        : "bg-white text-gray-600 border border-gray-200"
                    }`}
                  >
                    <span>{attr.icon}</span>
                    <span className="truncate">
                      {attr.label.split(" ").slice(1).join(" ")}
                    </span>
                  </button>
                ))}
              </div>

              {/* Window count */}
              <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                <span className="text-sm text-gray-600">🪟 Ventanas:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateAttribute(
                        "has_windows",
                        Math.max(0, editingSpace.attributes.has_windows - 1),
                      )
                    }
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-semibold">
                    {editingSpace.attributes.has_windows}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateAttribute(
                        "has_windows",
                        editingSpace.attributes.has_windows + 1,
                      )
                    }
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Floor type */}
              <div className="bg-white rounded-lg p-2">
                <span className="text-sm text-gray-600 block mb-2">
                  Tipo de piso:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: "tile", label: "🪨 Baldosa" },
                    { value: "wood", label: "🪵 Madera" },
                    { value: "carpet", label: "🧶 Alfombra" },
                    { value: "concrete", label: "⬜ Concreto" },
                  ].map((floor) => (
                    <button
                      key={floor.value}
                      onClick={() =>
                        onUpdateAttribute("floor_type", floor.value)
                      }
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        editingSpace.attributes.floor_type === floor.value
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {floor.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area in m² */}
              <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                <span className="text-sm text-gray-600">📐 Área (m²):</span>
                <input
                  type="number"
                  value={editingSpace.areaSqm || ""}
                  onChange={(e) =>
                    onUpdateSpace({
                      ...editingSpace,
                      areaSqm: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ej: 25"
                  className="w-20 px-2 py-1 border rounded text-sm text-center"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              Las características generan tareas adicionales automáticamente
            </p>
          </div>
        )}

      {/* Tasks Section */}
      <div>
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-2"
        >
          <span className="flex items-center gap-2">
            <Clock size={16} />
            Tareas de limpieza ({enabledTasksCount} activas)
          </span>
          {showTasks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showTasks && (
          <div className="border rounded-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto divide-y">
              {editingSpace.tasks.map((task, index) => (
                <div
                  key={index}
                  className={`p-3 ${task.enabled ? "bg-white" : "bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleTask(index)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        task.enabled
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {task.enabled && (
                        <Check size={12} className="text-white" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${!task.enabled && "text-gray-400"}`}
                    >
                      {task.name}
                    </span>
                    {task.isCustom && (
                      <button
                        onClick={() => onRemoveTask(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {task.enabled && (
                    <div className="flex gap-1 mt-2 ml-7">
                      {FREQUENCY_OPTIONS.map((freq) => (
                        <button
                          key={freq.value}
                          onClick={() =>
                            onUpdateTaskFrequency(
                              index,
                              freq.value as TaskConfig["frequency"],
                            )
                          }
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            task.frequency === freq.value
                              ? freq.color === "red"
                                ? "bg-red-100 text-red-700"
                                : freq.color === "blue"
                                  ? "bg-blue-100 text-blue-700"
                                  : freq.color === "green"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-200 text-gray-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom task */}
            <div className="p-3 bg-gray-50 border-t flex gap-2">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Nueva tarea..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomTask()}
              />
              <button
                onClick={handleAddCustomTask}
                disabled={!newTaskName.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !editingSpace.spaceTypeId}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Spinner size="md" color="white" />
          ) : (
            <>
              <Check size={20} />
              Guardar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
