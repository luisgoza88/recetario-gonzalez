'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Home, Trash2, Edit2, Check, Trees, Clock,
  ChevronDown, ChevronUp, Scan, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Space, SpaceType, TaskTemplate, SpaceAttributes } from '@/types';
import RoomScanner from './RoomScanner';

interface SpacesPanelProps {
  householdId: string;
  spaces: Space[];
  initialCategory?: 'interior' | 'exterior';
  onClose: () => void;
  onUpdate: () => void;
}

interface TaskConfig {
  id?: string;
  name: string;
  frequency: 'diaria' | 'semanal' | 'quincenal' | 'mensual';
  enabled: boolean;
  estimatedMinutes: number;
  isCustom?: boolean;
  requiresAttribute?: keyof SpaceAttributes; // La tarea solo aparece si el atributo está activo
}

interface SpaceForm {
  id?: string;
  spaceTypeId: string;
  customName: string;
  category: 'interior' | 'exterior';
  usageLevel: 'alto' | 'medio' | 'bajo';
  areaSqm: number;
  attributes: SpaceAttributes;
  tasks: TaskConfig[];
}

const DEFAULT_ATTRIBUTES: SpaceAttributes = {
  has_bathroom: false,
  has_walkin_closet: false,
  has_balcony: false,
  has_windows: 2,
  floor_type: 'tile',
  has_curtains: true,
  has_air_conditioning: false,
};

// Tareas adicionales basadas en atributos
const ATTRIBUTE_TASKS: Record<keyof SpaceAttributes, TaskConfig[]> = {
  has_bathroom: [
    { name: 'Limpiar sanitario', frequency: 'diaria', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_bathroom' },
    { name: 'Limpiar lavamanos', frequency: 'diaria', enabled: true, estimatedMinutes: 5, requiresAttribute: 'has_bathroom' },
    { name: 'Limpiar ducha/bañera', frequency: 'semanal', enabled: true, estimatedMinutes: 15, requiresAttribute: 'has_bathroom' },
    { name: 'Limpiar espejo baño', frequency: 'semanal', enabled: true, estimatedMinutes: 5, requiresAttribute: 'has_bathroom' },
    { name: 'Desinfección baño', frequency: 'quincenal', enabled: true, estimatedMinutes: 20, requiresAttribute: 'has_bathroom' },
  ],
  has_walkin_closet: [
    { name: 'Organizar walking closet', frequency: 'mensual', enabled: true, estimatedMinutes: 45, requiresAttribute: 'has_walkin_closet' },
    { name: 'Barrer walking closet', frequency: 'semanal', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_walkin_closet' },
    { name: 'Limpiar estantes closet', frequency: 'quincenal', enabled: true, estimatedMinutes: 20, requiresAttribute: 'has_walkin_closet' },
  ],
  has_balcony: [
    { name: 'Barrer balcón', frequency: 'semanal', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_balcony' },
    { name: 'Limpiar baranda balcón', frequency: 'quincenal', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_balcony' },
    { name: 'Lavar piso balcón', frequency: 'quincenal', enabled: true, estimatedMinutes: 15, requiresAttribute: 'has_balcony' },
  ],
  has_windows: [], // Las tareas de ventanas se calculan dinámicamente
  floor_type: [], // Se usa para calcular tiempo de limpieza
  has_curtains: [
    { name: 'Limpiar cortinas', frequency: 'mensual', enabled: true, estimatedMinutes: 20, requiresAttribute: 'has_curtains' },
    { name: 'Aspirar cortinas', frequency: 'quincenal', enabled: false, estimatedMinutes: 15, requiresAttribute: 'has_curtains' },
  ],
  has_air_conditioning: [
    { name: 'Limpiar filtros A/C', frequency: 'quincenal', enabled: true, estimatedMinutes: 15, requiresAttribute: 'has_air_conditioning' },
    { name: 'Limpiar rejillas A/C', frequency: 'mensual', enabled: true, estimatedMinutes: 10, requiresAttribute: 'has_air_conditioning' },
  ],
};

// Tareas predeterminadas por tipo de espacio
const DEFAULT_TASKS: Record<string, TaskConfig[]> = {
  'sala': [
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar vidrios/ventanas', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar marcos y puertas', frequency: 'mensual', enabled: true, estimatedMinutes: 15 },
    { name: 'Aspirar sofás', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
  ],
  'cocina': [
    { name: 'Limpiar mesones', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Barrer/Trapear', frequency: 'diaria', enabled: true, estimatedMinutes: 15 },
    { name: 'Lavar platos', frequency: 'diaria', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar estufa', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar campana extractora', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar nevera por fuera', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar nevera por dentro', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar horno/microondas', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar gabinetes por fuera', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Organizar alacena', frequency: 'mensual', enabled: true, estimatedMinutes: 45 },
    { name: 'Desinfectar superficies', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar fregadero profundo', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
  ],
  'habitacion': [
    { name: 'Tender cama', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Cambiar sábanas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar closet', frequency: 'mensual', enabled: true, estimatedMinutes: 40 },
    { name: 'Limpiar debajo de cama', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
    { name: 'Voltear colchón', frequency: 'mensual', enabled: false, estimatedMinutes: 10 },
    { name: 'Limpiar lámparas', frequency: 'mensual', enabled: true, estimatedMinutes: 10 },
  ],
  'baño': [
    { name: 'Limpiar sanitario', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar lavamanos', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar espejo', frequency: 'semanal', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar ducha/bañera', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Cambiar toallas', frequency: 'semanal', enabled: true, estimatedMinutes: 5 },
    { name: 'Desinfección profunda', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar rejillas desagüe', frequency: 'quincenal', enabled: true, estimatedMinutes: 10 },
    { name: 'Organizar gabinete baño', frequency: 'mensual', enabled: true, estimatedMinutes: 20 },
  ],
  'comedor': [
    { name: 'Limpiar mesa', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar sillas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar aparador/vitrina', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
  ],
  'estudio': [
    { name: 'Organizar escritorio', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar equipos electrónicos', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar documentos', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar estantería/libros', frequency: 'mensual', enabled: true, estimatedMinutes: 25 },
  ],
  'lavanderia': [
    { name: 'Lavar ropa blanca', frequency: 'semanal', enabled: true, estimatedMinutes: 60 },
    { name: 'Lavar ropa de color', frequency: 'semanal', enabled: true, estimatedMinutes: 60 },
    { name: 'Lavar ropa delicada', frequency: 'semanal', enabled: false, estimatedMinutes: 45 },
    { name: 'Planchar', frequency: 'semanal', enabled: true, estimatedMinutes: 90 },
    { name: 'Limpiar lavadora', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar secadora/filtros', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar productos', frequency: 'mensual', enabled: true, estimatedMinutes: 20 },
    { name: 'Lavar sábanas', frequency: 'semanal', enabled: true, estimatedMinutes: 45 },
    { name: 'Lavar toallas', frequency: 'semanal', enabled: true, estimatedMinutes: 30 },
  ],
  'jardin': [
    { name: 'Regar plantas/césped', frequency: 'diaria', enabled: true, estimatedMinutes: 25 },
    { name: 'Podar plantas', frequency: 'semanal', enabled: true, estimatedMinutes: 30 },
    { name: 'Recoger hojas', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Cortar césped', frequency: 'quincenal', enabled: true, estimatedMinutes: 60 },
    { name: 'Fertilizar', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Fumigar', frequency: 'mensual', enabled: false, estimatedMinutes: 45 },
    { name: 'Deshierbar', frequency: 'quincenal', enabled: true, estimatedMinutes: 40 },
    { name: 'Limpiar caminos/senderos', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
  ],
  'piscina': [
    { name: 'Verificar químicos', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar superficie', frequency: 'diaria', enabled: true, estimatedMinutes: 15 },
    { name: 'Aspirar fondo', frequency: 'semanal', enabled: true, estimatedMinutes: 45 },
    { name: 'Limpiar filtros', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar bordes/azulejos', frequency: 'semanal', enabled: true, estimatedMinutes: 25 },
    { name: 'Mantenimiento bomba', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar zona deck', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Revisar nivel de agua', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
  ],
  'terraza': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar muebles exterior', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Regar plantas', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Lavar piso a presión', frequency: 'quincenal', enabled: true, estimatedMinutes: 35 },
    { name: 'Limpiar barandas', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
  ],
  'garaje': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar herramientas', frequency: 'mensual', enabled: true, estimatedMinutes: 40 },
    { name: 'Limpiar manchas aceite', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Revisar iluminación', frequency: 'mensual', enabled: false, estimatedMinutes: 15 },
    { name: 'Limpiar puertas garaje', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
  ],
  'patio': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Recoger basura/hojas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Lavar piso', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar desagües', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
    { name: 'Regar plantas', frequency: 'diaria', enabled: false, estimatedMinutes: 10 },
  ],
};

const FREQUENCIES = [
  { value: 'diaria', label: 'Diaria', color: 'red' },
  { value: 'semanal', label: 'Semanal', color: 'blue' },
  { value: 'quincenal', label: 'Quincenal', color: 'green' },
  { value: 'mensual', label: 'Mensual', color: 'gray' },
];

export default function SpacesPanel({
  householdId,
  spaces,
  initialCategory = 'interior',
  onClose,
  onUpdate
}: SpacesPanelProps) {
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<SpaceForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'interior' | 'exterior'>(initialCategory);
  const [showTasks, setShowTasks] = useState(true);
  const [newTaskName, setNewTaskName] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    loadSpaceTypes();
  }, []);

  const loadSpaceTypes = async () => {
    const { data } = await supabase
      .from('space_types')
      .select('*')
      .order('sort_order');
    if (data) setSpaceTypes(data);
  };

  const loadSpaceTasks = async (spaceId: string): Promise<TaskConfig[]> => {
    const { data } = await supabase
      .from('task_templates')
      .select('*')
      .eq('space_id', spaceId);

    if (data && data.length > 0) {
      return data.map(t => ({
        id: t.id,
        name: t.name,
        frequency: t.frequency as TaskConfig['frequency'],
        enabled: t.is_active,
        estimatedMinutes: t.estimated_minutes,
        isCustom: false
      }));
    }

    return [];
  };

  const getDefaultTasksForType = (typeName: string, attributes?: SpaceAttributes): TaskConfig[] => {
    const normalizedName = typeName.toLowerCase();
    let baseTasks: TaskConfig[] = [];

    for (const [key, tasks] of Object.entries(DEFAULT_TASKS)) {
      if (normalizedName.includes(key)) {
        baseTasks = tasks.map(t => ({ ...t }));
        break;
      }
    }

    // Tareas genéricas si no hay match
    if (baseTasks.length === 0) {
      baseTasks = [
        { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
        { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
        { name: 'Limpiar polvo', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
      ];
    }

    // Agregar tareas basadas en atributos
    if (attributes) {
      // Solo agregar tareas de atributos si NO es un baño (los baños ya tienen sus propias tareas)
      if (!normalizedName.includes('baño') && !normalizedName.includes('bano')) {
        for (const [attrKey, attrTasks] of Object.entries(ATTRIBUTE_TASKS)) {
          const attrValue = attributes[attrKey as keyof SpaceAttributes];
          if (attrValue && typeof attrValue === 'boolean' && attrTasks.length > 0) {
            baseTasks = [...baseTasks, ...attrTasks.map(t => ({ ...t }))];
          }
        }

        // Tareas de ventanas basadas en cantidad
        if (attributes.has_windows > 0) {
          const windowMinutes = attributes.has_windows * 8; // ~8 min por ventana
          baseTasks.push({
            name: `Limpiar ventanas (${attributes.has_windows})`,
            frequency: 'quincenal',
            enabled: true,
            estimatedMinutes: windowMinutes
          });
        }
      }
    }

    return baseTasks;
  };

  const interiorSpaces = spaces.filter(s => s.category === 'interior');
  const exteriorSpaces = spaces.filter(s => s.category === 'exterior');
  const interiorTypes = spaceTypes.filter(st => st.category === 'interior');
  const exteriorTypes = spaceTypes.filter(st => st.category === 'exterior');

  const startNew = async (category: 'interior' | 'exterior') => {
    const types = category === 'interior' ? interiorTypes : exteriorTypes;
    const selectedType = types[0];
    const defaultAttrs = { ...DEFAULT_ATTRIBUTES };
    const defaultTasks = selectedType ? getDefaultTasksForType(selectedType.name, defaultAttrs) : [];

    setEditingSpace({
      spaceTypeId: selectedType?.id || '',
      customName: '',
      category,
      usageLevel: 'medio',
      areaSqm: 0,
      attributes: defaultAttrs,
      tasks: defaultTasks
    });
    setShowForm(true);
  };

  const startEdit = async (space: Space) => {
    // Cargar tareas existentes del espacio
    const existingTasks = await loadSpaceTasks(space.id);

    // Cargar atributos existentes o usar default
    const existingAttrs = space.attributes || { ...DEFAULT_ATTRIBUTES };

    // Si no hay tareas, usar las predeterminadas con atributos
    const tasks = existingTasks.length > 0
      ? existingTasks
      : getDefaultTasksForType(space.space_type?.name || '', existingAttrs);

    setEditingSpace({
      id: space.id,
      spaceTypeId: space.space_type_id || '',
      customName: space.custom_name || '',
      category: space.category,
      usageLevel: space.usage_level,
      areaSqm: space.area_sqm || 0,
      attributes: existingAttrs,
      tasks
    });
    setActiveCategory(space.category);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingSpace(null);
    setShowForm(false);
    setNewTaskName('');
  };

  const updateSpaceType = (typeId: string) => {
    if (!editingSpace) return;

    const selectedType = spaceTypes.find(st => st.id === typeId);
    const newTasks = selectedType
      ? getDefaultTasksForType(selectedType.name, editingSpace.attributes)
      : [];

    setEditingSpace({
      ...editingSpace,
      spaceTypeId: typeId,
      tasks: newTasks
    });
  };

  const updateAttribute = (attr: keyof SpaceAttributes, value: boolean | number | string) => {
    if (!editingSpace) return;

    const newAttrs = { ...editingSpace.attributes, [attr]: value };
    const selectedType = spaceTypes.find(st => st.id === editingSpace.spaceTypeId);

    // Regenerar tareas con los nuevos atributos
    const newTasks = selectedType
      ? getDefaultTasksForType(selectedType.name, newAttrs)
      : editingSpace.tasks;

    setEditingSpace({
      ...editingSpace,
      attributes: newAttrs,
      tasks: newTasks
    });
  };

  // Manejar resultado del escaneo con IA
  interface RoomAnalysis {
    roomType: string;
    roomTypeId: string;
    estimatedArea: number;
    attributes: SpaceAttributes;
    furniture: string[];
    surfaces: string[];
    cleaningZones?: {
      zone: string;
      complexity: 'simple' | 'moderada' | 'compleja';
      items: string[];
    }[];
    suggestedTasks: {
      name: string;
      frequency: 'diaria' | 'semanal' | 'quincenal' | 'mensual';
      estimatedMinutes: number;
      reason: string;
      priority?: 'alta' | 'media' | 'baja';
    }[];
    usageLevel: 'alto' | 'medio' | 'bajo';
    description: string;
    specialConsiderations?: string[];
    confidence: number;
  }

  const handleScanComplete = (analysis: RoomAnalysis) => {
    setShowScanner(false);

    // Buscar el tipo de espacio que coincida
    const matchedType = spaceTypes.find(st =>
      st.name.toLowerCase().includes(analysis.roomTypeId.toLowerCase()) ||
      analysis.roomTypeId.toLowerCase().includes(st.name.toLowerCase())
    );

    // Determinar categoría basada en el tipo
    const category = ['jardin', 'piscina', 'terraza', 'garaje', 'patio'].includes(analysis.roomTypeId)
      ? 'exterior'
      : 'interior';

    // Convertir las tareas sugeridas por la IA al formato de TaskConfig
    const aiTasks: TaskConfig[] = analysis.suggestedTasks.map(task => ({
      name: task.name,
      frequency: task.frequency,
      enabled: true,
      estimatedMinutes: task.estimatedMinutes,
      isCustom: false
    }));

    // Obtener tareas base del tipo + tareas de IA (evitar duplicados)
    const baseTasks = matchedType
      ? getDefaultTasksForType(matchedType.name, analysis.attributes)
      : [];

    // Combinar tareas evitando duplicados por nombre
    const existingNames = new Set(baseTasks.map(t => t.name.toLowerCase()));
    const uniqueAiTasks = aiTasks.filter(t => !existingNames.has(t.name.toLowerCase()));
    const combinedTasks = [...baseTasks, ...uniqueAiTasks.map(t => ({ ...t, isCustom: true }))];

    // Pre-poblar el formulario con los datos del análisis
    setEditingSpace({
      spaceTypeId: matchedType?.id || '',
      customName: analysis.roomType !== matchedType?.name ? analysis.roomType : '',
      category,
      usageLevel: analysis.usageLevel,
      areaSqm: analysis.estimatedArea,
      attributes: analysis.attributes,
      tasks: combinedTasks
    });

    setActiveCategory(category);
    setShowForm(true);
  };

  const toggleTask = (index: number) => {
    if (!editingSpace) return;
    const tasks = [...editingSpace.tasks];
    tasks[index] = { ...tasks[index], enabled: !tasks[index].enabled };
    setEditingSpace({ ...editingSpace, tasks });
  };

  const updateTaskFrequency = (index: number, frequency: TaskConfig['frequency']) => {
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

  const addCustomTask = () => {
    if (!editingSpace || !newTaskName.trim()) return;
    const tasks = [...editingSpace.tasks, {
      name: newTaskName.trim(),
      frequency: 'semanal' as const,
      enabled: true,
      estimatedMinutes: 15,
      isCustom: true
    }];
    setEditingSpace({ ...editingSpace, tasks });
    setNewTaskName('');
  };

  const saveSpace = async () => {
    if (!editingSpace || !editingSpace.spaceTypeId) return;

    setSaving(true);
    try {
      const spaceData = {
        household_id: householdId,
        space_type_id: editingSpace.spaceTypeId,
        custom_name: editingSpace.customName.trim() || null,
        category: editingSpace.category,
        usage_level: editingSpace.usageLevel,
        area_sqm: editingSpace.areaSqm > 0 ? editingSpace.areaSqm : null,
        attributes: editingSpace.attributes,
        has_bathroom: editingSpace.attributes.has_bathroom
      };

      let spaceId = editingSpace.id;

      if (editingSpace.id) {
        const { error } = await supabase
          .from('spaces')
          .update(spaceData)
          .eq('id', editingSpace.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('spaces')
          .insert(spaceData)
          .select('id')
          .single();
        if (error) throw error;
        spaceId = data.id;
      }

      // Guardar tareas
      if (spaceId) {
        // Eliminar tareas existentes
        await supabase
          .from('task_templates')
          .delete()
          .eq('space_id', spaceId);

        // Insertar nuevas tareas (solo las habilitadas)
        const tasksToInsert = editingSpace.tasks
          .filter(t => t.enabled)
          .map(t => ({
            household_id: householdId,
            space_id: spaceId,
            name: t.name,
            frequency: t.frequency,
            estimated_minutes: t.estimatedMinutes,
            priority: 'normal',
            is_active: true
          }));

        if (tasksToInsert.length > 0) {
          await supabase
            .from('task_templates')
            .insert(tasksToInsert);
        }
      }

      onUpdate();
      cancelForm();
    } catch (error: unknown) {
      // Mejor manejo de errores de Supabase
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Error desconocido';
      console.error('Error saving space:', errorMessage, error);
      alert(`Error al guardar el espacio: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteSpace = async (id: string) => {
    if (!confirm('¿Eliminar este espacio y todas sus tareas?')) return;

    setDeleting(id);
    try {
      await supabase.from('scheduled_tasks').delete().eq('space_id', id);
      await supabase.from('task_templates').delete().eq('space_id', id);
      await supabase.from('spaces').delete().eq('id', id);
      onUpdate();
    } catch (error) {
      console.error('Error deleting space:', error);
    } finally {
      setDeleting(null);
    }
  };

  const getSelectedSpaceType = () => {
    return spaceTypes.find(st => st.id === editingSpace?.spaceTypeId);
  };

  const enabledTasksCount = editingSpace?.tasks.filter(t => t.enabled).length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header - dinámico según categoría */}
        <div className={`text-white p-4 rounded-t-2xl flex justify-between items-center ${
          activeCategory === 'interior'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
            : 'bg-gradient-to-r from-green-600 to-green-700'
        }`}>
          <div className="flex items-center gap-2">
            {activeCategory === 'interior' ? <Home size={20} /> : <Trees size={20} />}
            <span className="font-semibold">
              Espacios {activeCategory === 'interior' ? 'Interiores' : 'Exteriores'}
            </span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {activeCategory === 'interior' ? interiorSpaces.length : exteriorSpaces.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Space List */}
          {!showForm && (
            <>
              {/* AI Scanner Button */}
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg"
              >
                <Scan size={20} />
                Escanear con IA
                <Sparkles size={16} className="opacity-70" />
              </button>

              {/* Category Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveCategory('interior')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeCategory === 'interior'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  <Home size={16} />
                  Interior ({interiorSpaces.length})
                </button>
                <button
                  onClick={() => setActiveCategory('exterior')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeCategory === 'exterior'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  <Trees size={16} />
                  Exterior ({exteriorSpaces.length})
                </button>
              </div>

              {/* Space List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(activeCategory === 'interior' ? interiorSpaces : exteriorSpaces).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Home size={40} className="mx-auto mb-2 opacity-50" />
                    <p>No hay espacios {activeCategory === 'interior' ? 'interiores' : 'exteriores'}</p>
                  </div>
                ) : (
                  (activeCategory === 'interior' ? interiorSpaces : exteriorSpaces).map(space => (
                    <div
                      key={space.id}
                      className={`rounded-xl p-4 flex items-center gap-3 ${
                        activeCategory === 'interior' ? 'bg-blue-50' : 'bg-green-50'
                      }`}
                    >
                      <div className="text-2xl">{space.space_type?.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {space.custom_name || space.space_type?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Uso: {space.usage_level === 'alto' ? '🔥 Alto' :
                                space.usage_level === 'medio' ? '⚡ Medio' : '💤 Bajo'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(space)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteSpace(space.id)}
                          disabled={deleting === space.id}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => startNew(activeCategory)}
                className={`w-full py-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 ${
                  activeCategory === 'interior'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <Plus size={20} />
                Agregar Espacio {activeCategory === 'interior' ? 'Interior' : 'Exterior'}
              </button>
            </>
          )}

          {/* Space Form */}
          {showForm && editingSpace && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                {editingSpace.id ? 'Editar Espacio' : 'Nuevo Espacio'}
              </h3>

              {/* Space Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de espacio
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {(editingSpace.category === 'interior' ? interiorTypes : exteriorTypes).map(type => (
                    <button
                      key={type.id}
                      onClick={() => updateSpaceType(type.id)}
                      className={`p-2 rounded-xl text-center transition-colors ${
                        editingSpace.spaceTypeId === type.id
                          ? editingSpace.category === 'interior'
                            ? 'bg-blue-100 border-2 border-blue-600'
                            : 'bg-green-100 border-2 border-green-600'
                          : 'bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="text-xl">{type.icon}</div>
                      <div className="text-[10px] font-medium truncate">{type.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre personalizado (opcional)
                </label>
                <input
                  type="text"
                  value={editingSpace.customName}
                  onChange={(e) => setEditingSpace({ ...editingSpace, customName: e.target.value })}
                  placeholder={`Ej: ${getSelectedSpaceType()?.name || ''} principal`}
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
                    { value: 'alto', label: '🔥 Alto' },
                    { value: 'medio', label: '⚡ Medio' },
                    { value: 'bajo', label: '💤 Bajo' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setEditingSpace({
                        ...editingSpace,
                        usageLevel: option.value as 'alto' | 'medio' | 'bajo'
                      })}
                      className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                        editingSpace.usageLevel === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Space Attributes - Solo para espacios interiores que no sean baño */}
              {editingSpace.category === 'interior' && !getSelectedSpaceType()?.name?.toLowerCase().includes('baño') && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Características adicionales
                  </label>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                    {/* Toggle attributes */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'has_bathroom', label: '🚿 Tiene baño', icon: '🚿' },
                        { key: 'has_walkin_closet', label: '👔 Walking closet', icon: '👔' },
                        { key: 'has_balcony', label: '🌅 Tiene balcón', icon: '🌅' },
                        { key: 'has_curtains', label: '🪟 Tiene cortinas', icon: '🪟' },
                        { key: 'has_air_conditioning', label: '❄️ Aire acond.', icon: '❄️' },
                      ].map(attr => (
                        <button
                          key={attr.key}
                          onClick={() => updateAttribute(
                            attr.key as keyof SpaceAttributes,
                            !editingSpace.attributes[attr.key as keyof SpaceAttributes]
                          )}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                            editingSpace.attributes[attr.key as keyof SpaceAttributes]
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span>{attr.icon}</span>
                          <span className="truncate">{attr.label.split(' ').slice(1).join(' ')}</span>
                        </button>
                      ))}
                    </div>

                    {/* Número de ventanas */}
                    <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                      <span className="text-sm text-gray-600">🪟 Ventanas:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateAttribute('has_windows', Math.max(0, editingSpace.attributes.has_windows - 1))}
                          className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">{editingSpace.attributes.has_windows}</span>
                        <button
                          onClick={() => updateAttribute('has_windows', editingSpace.attributes.has_windows + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Tipo de piso */}
                    <div className="bg-white rounded-lg p-2">
                      <span className="text-sm text-gray-600 block mb-2">Tipo de piso:</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { value: 'tile', label: '🪨 Baldosa' },
                          { value: 'wood', label: '🪵 Madera' },
                          { value: 'carpet', label: '🧶 Alfombra' },
                          { value: 'concrete', label: '⬜ Concreto' },
                        ].map(floor => (
                          <button
                            key={floor.value}
                            onClick={() => updateAttribute('floor_type', floor.value)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              editingSpace.attributes.floor_type === floor.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {floor.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Área en m² */}
                    <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                      <span className="text-sm text-gray-600">📐 Área (m²):</span>
                      <input
                        type="number"
                        value={editingSpace.areaSqm || ''}
                        onChange={(e) => setEditingSpace({ ...editingSpace, areaSqm: parseFloat(e.target.value) || 0 })}
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
                          className={`p-3 ${task.enabled ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleTask(index)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                task.enabled
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {task.enabled && <Check size={12} className="text-white" />}
                            </button>
                            <span className={`flex-1 text-sm ${!task.enabled && 'text-gray-400'}`}>
                              {task.name}
                            </span>
                            {task.isCustom && (
                              <button
                                onClick={() => removeTask(index)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          {task.enabled && (
                            <div className="flex gap-1 mt-2 ml-7">
                              {FREQUENCIES.map(freq => (
                                <button
                                  key={freq.value}
                                  onClick={() => updateTaskFrequency(index, freq.value as TaskConfig['frequency'])}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    task.frequency === freq.value
                                      ? freq.color === 'red' ? 'bg-red-100 text-red-700' :
                                        freq.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                        freq.color === 'green' ? 'bg-green-100 text-green-700' :
                                        'bg-gray-200 text-gray-700'
                                      : 'bg-gray-100 text-gray-500'
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
                        onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
                      />
                      <button
                        onClick={addCustomTask}
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
                  onClick={cancelForm}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveSpace}
                  disabled={saving || !editingSpace.spaceTypeId}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <Check size={20} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Close button */}
          {!showForm && (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
            >
              Cerrar
            </button>
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
    </div>
  );
}
