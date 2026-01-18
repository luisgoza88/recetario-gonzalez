'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Home, Trash2, Edit2, Check, Trees, Clock,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Space, SpaceType, TaskTemplate } from '@/types';

interface SpacesPanelProps {
  householdId: string;
  spaces: Space[];
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
}

interface SpaceForm {
  id?: string;
  spaceTypeId: string;
  customName: string;
  category: 'interior' | 'exterior';
  usageLevel: 'alto' | 'medio' | 'bajo';
  tasks: TaskConfig[];
}

// Tareas predeterminadas por tipo de espacio
const DEFAULT_TASKS: Record<string, TaskConfig[]> = {
  'sala': [
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar vidrios', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar cortinas', frequency: 'mensual', enabled: false, estimatedMinutes: 30 },
  ],
  'cocina': [
    { name: 'Limpiar mesones', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Barrer/Trapear', frequency: 'diaria', enabled: true, estimatedMinutes: 15 },
    { name: 'Lavar platos', frequency: 'diaria', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar estufa', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar nevera por fuera', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar nevera por dentro', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
    { name: 'Limpiar horno', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Organizar alacena', frequency: 'mensual', enabled: false, estimatedMinutes: 45 },
  ],
  'habitacion': [
    { name: 'Tender cama', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Cambiar sábanas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar closet', frequency: 'mensual', enabled: false, estimatedMinutes: 60 },
  ],
  'baño': [
    { name: 'Limpiar sanitario', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar lavamanos', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar espejo', frequency: 'semanal', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar ducha', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Cambiar toallas', frequency: 'semanal', enabled: true, estimatedMinutes: 5 },
    { name: 'Desinfección profunda', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
  ],
  'comedor': [
    { name: 'Limpiar mesa', frequency: 'diaria', enabled: true, estimatedMinutes: 5 },
    { name: 'Limpiar sillas', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
  ],
  'estudio': [
    { name: 'Organizar escritorio', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Sacudir muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar computador', frequency: 'quincenal', enabled: true, estimatedMinutes: 15 },
  ],
  'lavanderia': [
    { name: 'Lavar ropa blanca', frequency: 'semanal', enabled: true, estimatedMinutes: 60 },
    { name: 'Lavar ropa de color', frequency: 'semanal', enabled: true, estimatedMinutes: 60 },
    { name: 'Planchar', frequency: 'semanal', enabled: true, estimatedMinutes: 90 },
    { name: 'Limpiar lavadora', frequency: 'quincenal', enabled: true, estimatedMinutes: 20 },
    { name: 'Organizar productos', frequency: 'mensual', enabled: false, estimatedMinutes: 20 },
  ],
  'jardin': [
    { name: 'Regar plantas', frequency: 'diaria', enabled: true, estimatedMinutes: 20 },
    { name: 'Podar plantas', frequency: 'semanal', enabled: true, estimatedMinutes: 30 },
    { name: 'Recoger hojas', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Cortar césped', frequency: 'quincenal', enabled: true, estimatedMinutes: 60 },
    { name: 'Fertilizar', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
    { name: 'Fumigar', frequency: 'mensual', enabled: false, estimatedMinutes: 45 },
  ],
  'piscina': [
    { name: 'Verificar químicos', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Limpiar superficie', frequency: 'diaria', enabled: true, estimatedMinutes: 15 },
    { name: 'Aspirar fondo', frequency: 'semanal', enabled: true, estimatedMinutes: 45 },
    { name: 'Limpiar filtros', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Limpiar bordes', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Mantenimiento bomba', frequency: 'mensual', enabled: true, estimatedMinutes: 30 },
  ],
  'terraza': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Limpiar muebles', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Regar plantas', frequency: 'diaria', enabled: true, estimatedMinutes: 10 },
    { name: 'Lavar piso', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
  ],
  'garaje': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
    { name: 'Organizar', frequency: 'mensual', enabled: true, estimatedMinutes: 60 },
    { name: 'Limpiar manchas', frequency: 'mensual', enabled: false, estimatedMinutes: 30 },
  ],
  'patio': [
    { name: 'Barrer', frequency: 'semanal', enabled: true, estimatedMinutes: 20 },
    { name: 'Recoger basura', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    { name: 'Lavar piso', frequency: 'quincenal', enabled: true, estimatedMinutes: 30 },
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
  onClose,
  onUpdate
}: SpacesPanelProps) {
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<SpaceForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'interior' | 'exterior'>('interior');
  const [showTasks, setShowTasks] = useState(true);
  const [newTaskName, setNewTaskName] = useState('');

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

  const getDefaultTasksForType = (typeName: string): TaskConfig[] => {
    const normalizedName = typeName.toLowerCase();

    for (const [key, tasks] of Object.entries(DEFAULT_TASKS)) {
      if (normalizedName.includes(key)) {
        return tasks.map(t => ({ ...t }));
      }
    }

    // Tareas genéricas
    return [
      { name: 'Barrer/Aspirar', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
      { name: 'Trapear', frequency: 'semanal', enabled: true, estimatedMinutes: 15 },
      { name: 'Limpiar polvo', frequency: 'semanal', enabled: true, estimatedMinutes: 10 },
    ];
  };

  const interiorSpaces = spaces.filter(s => s.category === 'interior');
  const exteriorSpaces = spaces.filter(s => s.category === 'exterior');
  const interiorTypes = spaceTypes.filter(st => st.category === 'interior');
  const exteriorTypes = spaceTypes.filter(st => st.category === 'exterior');

  const startNew = async (category: 'interior' | 'exterior') => {
    const types = category === 'interior' ? interiorTypes : exteriorTypes;
    const selectedType = types[0];
    const defaultTasks = selectedType ? getDefaultTasksForType(selectedType.name) : [];

    setEditingSpace({
      spaceTypeId: selectedType?.id || '',
      customName: '',
      category,
      usageLevel: 'medio',
      tasks: defaultTasks
    });
    setShowForm(true);
  };

  const startEdit = async (space: Space) => {
    // Cargar tareas existentes del espacio
    const existingTasks = await loadSpaceTasks(space.id);

    // Si no hay tareas, usar las predeterminadas
    const tasks = existingTasks.length > 0
      ? existingTasks
      : getDefaultTasksForType(space.space_type?.name || '');

    setEditingSpace({
      id: space.id,
      spaceTypeId: space.space_type_id || '',
      customName: space.custom_name || '',
      category: space.category,
      usageLevel: space.usage_level,
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
    const newTasks = selectedType ? getDefaultTasksForType(selectedType.name) : [];

    setEditingSpace({
      ...editingSpace,
      spaceTypeId: typeId,
      tasks: newTasks
    });
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
        usage_level: editingSpace.usageLevel
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
    } catch (error) {
      console.error('Error saving space:', error);
      alert('Error al guardar el espacio');
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
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Home size={20} />
            <span className="font-semibold">Gestionar Espacios</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Space List */}
          {!showForm && (
            <>
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
    </div>
  );
}
