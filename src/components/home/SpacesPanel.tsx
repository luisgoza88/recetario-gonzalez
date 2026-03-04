"use client";

import { useState } from "react";
import { X, Home, Trees } from "lucide-react";
import { Space, SpaceType, SpaceAttributes } from "@/types";
import {
  SpaceForm,
  DEFAULT_ATTRIBUTES,
  getDefaultTasksForType,
  TaskConfig,
} from "@/lib/config/spaceConfig";
import {
  useSpaceTypes,
  useSaveSpace,
  useDeleteSpace,
} from "@/lib/hooks/useSpacesData";
import { supabase } from "@/lib/supabase/client";
import RoomScanner from "./RoomScanner";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SpaceListView from "./spaces/SpaceListView";
import SpaceFormView from "./spaces/SpaceFormView";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface SpacesPanelProps {
  householdId: string;
  spaces: Space[];
  initialCategory?: "interior" | "exterior";
  onClose: () => void;
  onUpdate: () => void;
}

export default function SpacesPanel({
  householdId,
  spaces,
  initialCategory = "interior",
  onClose,
  onUpdate,
}: SpacesPanelProps) {
  const toast = useToast();
  useEscapeKey(onClose);
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<SpaceForm | null>(null);
  const [activeCategory, setActiveCategory] = useState<"interior" | "exterior">(
    initialCategory,
  );
  const [showScanner, setShowScanner] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteSpaceId, setConfirmDeleteSpaceId] = useState<
    string | null
  >(null);

  // TanStack Query
  const { data: spaceTypes = [] } = useSpaceTypes();
  const saveSpaceMutation = useSaveSpace();
  const deleteSpaceMutation = useDeleteSpace();

  const interiorSpaces = spaces.filter((s) => s.category === "interior");
  const exteriorSpaces = spaces.filter((s) => s.category === "exterior");
  const interiorTypes = spaceTypes.filter((st) => st.category === "interior");
  const exteriorTypes = spaceTypes.filter((st) => st.category === "exterior");

  const startNew = (category: "interior" | "exterior") => {
    const types = category === "interior" ? interiorTypes : exteriorTypes;
    const selectedType = types[0];
    const defaultAttrs = { ...DEFAULT_ATTRIBUTES };
    const defaultTasks = selectedType
      ? getDefaultTasksForType(selectedType.name, defaultAttrs)
      : [];

    setEditingSpace({
      spaceTypeId: selectedType?.id || "",
      customName: "",
      category,
      usageLevel: "medio",
      areaSqm: 0,
      attributes: defaultAttrs,
      tasks: defaultTasks,
    });
    setShowForm(true);
  };

  const startEdit = async (space: Space) => {
    // Load existing tasks
    const { data } = await supabase
      .from("task_templates")
      .select("*")
      .eq("space_id", space.id);

    const existingTasks: TaskConfig[] =
      data && data.length > 0
        ? data.map((t) => ({
            id: t.id,
            name: t.name,
            frequency: t.frequency as TaskConfig["frequency"],
            enabled: t.is_active,
            estimatedMinutes: t.estimated_minutes,
            isCustom: false,
          }))
        : [];

    const existingAttrs = space.attributes || { ...DEFAULT_ATTRIBUTES };
    const tasks =
      existingTasks.length > 0
        ? existingTasks
        : getDefaultTasksForType(space.space_type?.name || "", existingAttrs);

    setEditingSpace({
      id: space.id,
      spaceTypeId: space.space_type_id || "",
      customName: space.custom_name || "",
      category: space.category,
      usageLevel: space.usage_level,
      areaSqm: space.area_sqm || 0,
      attributes: existingAttrs,
      tasks,
    });
    setActiveCategory(space.category);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingSpace(null);
    setShowForm(false);
  };

  const updateSpaceType = (typeId: string) => {
    if (!editingSpace) return;
    const selectedType = spaceTypes.find((st) => st.id === typeId);
    const newTasks = selectedType
      ? getDefaultTasksForType(selectedType.name, editingSpace.attributes)
      : [];
    setEditingSpace({ ...editingSpace, spaceTypeId: typeId, tasks: newTasks });
  };

  const updateAttribute = (
    attr: keyof SpaceAttributes,
    value: boolean | number | string,
  ) => {
    if (!editingSpace) return;
    const newAttrs = { ...editingSpace.attributes, [attr]: value };
    const selectedType = spaceTypes.find(
      (st) => st.id === editingSpace.spaceTypeId,
    );
    const newTasks = selectedType
      ? getDefaultTasksForType(selectedType.name, newAttrs)
      : editingSpace.tasks;
    setEditingSpace({ ...editingSpace, attributes: newAttrs, tasks: newTasks });
  };

  const toggleTask = (index: number) => {
    if (!editingSpace) return;
    const tasks = [...editingSpace.tasks];
    tasks[index] = { ...tasks[index], enabled: !tasks[index].enabled };
    setEditingSpace({ ...editingSpace, tasks });
  };

  const updateTaskFrequency = (
    index: number,
    frequency: TaskConfig["frequency"],
  ) => {
    if (!editingSpace) return;
    const tasks = [...editingSpace.tasks];
    tasks[index] = { ...tasks[index], frequency };
    setEditingSpace({ ...editingSpace, tasks });
  };

  const removeTask = (index: number) => {
    if (!editingSpace) return;
    const tasks = editingSpace.tasks.filter((_, i) => i !== index);
    setEditingSpace({ ...editingSpace, tasks });
  };

  const addCustomTask = (name: string) => {
    if (!editingSpace) return;
    const tasks = [
      ...editingSpace.tasks,
      {
        name,
        frequency: "semanal" as const,
        enabled: true,
        estimatedMinutes: 15,
        isCustom: true,
      },
    ];
    setEditingSpace({ ...editingSpace, tasks });
  };

  const saveSpace = async () => {
    if (!editingSpace) return;
    try {
      await saveSpaceMutation.mutateAsync({ householdId, space: editingSpace });
      onUpdate();
      cancelForm();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Error desconocido";
      console.error("Error saving space:", errorMessage, error);
      toast.error(`Error al guardar el espacio: ${errorMessage}`);
    }
  };

  const deleteSpace = async (id: string) => {
    setDeleting(id);
    try {
      await deleteSpaceMutation.mutateAsync({ spaceId: id });
      onUpdate();
    } catch (error) {
      console.error("Error deleting space:", error);
    } finally {
      setDeleting(null);
    }
  };

  const getSelectedSpaceType = () => {
    return spaceTypes.find((st) => st.id === editingSpace?.spaceTypeId);
  };

  // Handle AI scan result
  interface RoomAnalysis {
    roomType: string;
    roomTypeId: string;
    estimatedArea: number;
    attributes: SpaceAttributes;
    furniture: string[];
    surfaces: string[];
    cleaningZones?: {
      zone: string;
      complexity: "simple" | "moderada" | "compleja";
      items: string[];
    }[];
    suggestedTasks: {
      name: string;
      frequency: "diaria" | "semanal" | "quincenal" | "mensual";
      estimatedMinutes: number;
      reason: string;
      priority?: "alta" | "media" | "baja";
    }[];
    usageLevel: "alto" | "medio" | "bajo";
    description: string;
    specialConsiderations?: string[];
    confidence: number;
  }

  const handleScanComplete = (analysis: RoomAnalysis) => {
    setShowScanner(false);

    const matchedType = spaceTypes.find(
      (st) =>
        st.name.toLowerCase().includes(analysis.roomTypeId.toLowerCase()) ||
        analysis.roomTypeId.toLowerCase().includes(st.name.toLowerCase()),
    );

    const category = [
      "jardin",
      "piscina",
      "terraza",
      "garaje",
      "patio",
    ].includes(analysis.roomTypeId)
      ? "exterior"
      : "interior";

    const aiTasks: TaskConfig[] = analysis.suggestedTasks.map((task) => ({
      name: task.name,
      frequency: task.frequency,
      enabled: true,
      estimatedMinutes: task.estimatedMinutes,
      isCustom: false,
    }));

    const baseTasks = matchedType
      ? getDefaultTasksForType(matchedType.name, analysis.attributes)
      : [];

    const existingNames = new Set(baseTasks.map((t) => t.name.toLowerCase()));
    const uniqueAiTasks = aiTasks.filter(
      (t) => !existingNames.has(t.name.toLowerCase()),
    );
    const combinedTasks = [
      ...baseTasks,
      ...uniqueAiTasks.map((t) => ({ ...t, isCustom: true })),
    ];

    setEditingSpace({
      spaceTypeId: matchedType?.id || "",
      customName:
        analysis.roomType !== matchedType?.name ? analysis.roomType : "",
      category,
      usageLevel: analysis.usageLevel,
      areaSqm: analysis.estimatedArea,
      attributes: analysis.attributes,
      tasks: combinedTasks,
    });

    setActiveCategory(category);
    setShowForm(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div
          className={`text-white p-4 rounded-t-2xl flex justify-between items-center ${
            activeCategory === "interior"
              ? "bg-gradient-to-r from-blue-600 to-blue-700"
              : "bg-gradient-to-r from-green-600 to-green-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {activeCategory === "interior" ? (
              <Home size={20} />
            ) : (
              <Trees size={20} />
            )}
            <span className="font-semibold">
              Espacios{" "}
              {activeCategory === "interior" ? "Interiores" : "Exteriores"}
            </span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {activeCategory === "interior"
                ? interiorSpaces.length
                : exteriorSpaces.length}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!showForm && (
            <SpaceListView
              activeCategory={activeCategory}
              onChangeCategory={setActiveCategory}
              interiorSpaces={interiorSpaces}
              exteriorSpaces={exteriorSpaces}
              onEdit={startEdit}
              onDelete={(id) => setConfirmDeleteSpaceId(id)}
              onAddNew={startNew}
              onClose={onClose}
              deletingId={deleting}
            />
          )}

          {showForm && editingSpace && (
            <SpaceFormView
              editingSpace={editingSpace}
              spaceTypes={spaceTypes}
              saving={saveSpaceMutation.isPending}
              onUpdateSpace={setEditingSpace}
              onUpdateSpaceType={updateSpaceType}
              onUpdateAttribute={updateAttribute}
              onToggleTask={toggleTask}
              onUpdateTaskFrequency={updateTaskFrequency}
              onRemoveTask={removeTask}
              onAddCustomTask={addCustomTask}
              onSave={saveSpace}
              onCancel={cancelForm}
              onOpenScanner={() => setShowScanner(true)}
              getSelectedSpaceType={getSelectedSpaceType}
            />
          )}
        </div>
      </div>

      {/* Room Scanner */}
      {showScanner && (
        <RoomScanner
          onClose={() => setShowScanner(false)}
          onAnalysisComplete={handleScanComplete}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteSpaceId}
        onConfirm={() => {
          if (confirmDeleteSpaceId) deleteSpace(confirmDeleteSpaceId);
          setConfirmDeleteSpaceId(null);
        }}
        onCancel={() => setConfirmDeleteSpaceId(null)}
        title="Eliminar espacio"
        message="¿Eliminar este espacio y todas sus tareas?"
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
