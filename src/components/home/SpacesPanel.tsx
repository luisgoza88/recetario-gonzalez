'use client';

import { useState, useEffect } from 'react';
import {
  X, Plus, Home, Trash2, Edit2, Check, Trees
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Space, SpaceType } from '@/types';

interface SpacesPanelProps {
  householdId: string;
  spaces: Space[];
  onClose: () => void;
  onUpdate: () => void;
}

interface SpaceForm {
  id?: string;
  spaceTypeId: string;
  customName: string;
  category: 'interior' | 'exterior';
  usageLevel: 'alto' | 'medio' | 'bajo';
}

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

  const interiorSpaces = spaces.filter(s => s.category === 'interior');
  const exteriorSpaces = spaces.filter(s => s.category === 'exterior');
  const interiorTypes = spaceTypes.filter(st => st.category === 'interior');
  const exteriorTypes = spaceTypes.filter(st => st.category === 'exterior');

  const startNew = (category: 'interior' | 'exterior') => {
    const types = category === 'interior' ? interiorTypes : exteriorTypes;
    setEditingSpace({
      spaceTypeId: types[0]?.id || '',
      customName: '',
      category,
      usageLevel: 'medio'
    });
    setShowForm(true);
  };

  const startEdit = (space: Space) => {
    setEditingSpace({
      id: space.id,
      spaceTypeId: space.space_type_id || '',
      customName: space.custom_name || '',
      category: space.category,
      usageLevel: space.usage_level
    });
    setActiveCategory(space.category);
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingSpace(null);
    setShowForm(false);
  };

  const saveSpace = async () => {
    if (!editingSpace || !editingSpace.spaceTypeId) return;

    setSaving(true);
    try {
      const data = {
        household_id: householdId,
        space_type_id: editingSpace.spaceTypeId,
        custom_name: editingSpace.customName.trim() || null,
        category: editingSpace.category,
        usage_level: editingSpace.usageLevel
      };

      if (editingSpace.id) {
        await supabase
          .from('spaces')
          .update(data)
          .eq('id', editingSpace.id);
      } else {
        await supabase
          .from('spaces')
          .insert(data);
      }

      onUpdate();
      cancelForm();
    } catch (error) {
      console.error('Error saving space:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteSpace = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este espacio? También se eliminarán las tareas asociadas.')) return;

    setDeleting(id);
    try {
      // Eliminar tareas asociadas primero
      await supabase
        .from('task_templates')
        .delete()
        .eq('space_id', id);

      await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('space_id', id);

      // Luego eliminar el espacio
      await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

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
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {(editingSpace.category === 'interior' ? interiorTypes : exteriorTypes).map(type => (
                    <button
                      key={type.id}
                      onClick={() => setEditingSpace({ ...editingSpace, spaceTypeId: type.id })}
                      className={`p-3 rounded-xl text-center transition-colors ${
                        editingSpace.spaceTypeId === type.id
                          ? editingSpace.category === 'interior'
                            ? 'bg-blue-100 border-2 border-blue-600'
                            : 'bg-green-100 border-2 border-green-600'
                          : 'bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-xs font-medium">{type.name}</div>
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
                  placeholder={`Ej: ${getSelectedSpaceType()?.name || 'Mi espacio'} principal`}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Usage Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de uso (define frecuencia de limpieza)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'alto', label: '🔥 Alto', desc: 'Limpieza frecuente' },
                    { value: 'medio', label: '⚡ Medio', desc: 'Limpieza regular' },
                    { value: 'bajo', label: '💤 Bajo', desc: 'Limpieza ocasional' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setEditingSpace({
                        ...editingSpace,
                        usageLevel: option.value as 'alto' | 'medio' | 'bajo'
                      })}
                      className={`p-3 rounded-xl text-center transition-colors ${
                        editingSpace.usageLevel === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="text-lg">{option.label.split(' ')[0]}</div>
                      <div className="text-xs mt-1">
                        {editingSpace.usageLevel === option.value ? option.desc : option.label.split(' ')[1]}
                      </div>
                    </button>
                  ))}
                </div>
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

          {/* Close button when not in form */}
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
