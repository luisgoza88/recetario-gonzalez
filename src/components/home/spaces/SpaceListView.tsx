'use client';

import { Home, Trees, Edit2, Trash2, Plus } from 'lucide-react';
import { Space } from '@/types';

interface SpaceListViewProps {
  activeCategory: 'interior' | 'exterior';
  onChangeCategory: (category: 'interior' | 'exterior') => void;
  interiorSpaces: Space[];
  exteriorSpaces: Space[];
  onEdit: (space: Space) => void;
  onDelete: (spaceId: string) => void;
  onAddNew: (category: 'interior' | 'exterior') => void;
  onClose: () => void;
  deletingId: string | null;
}

export default function SpaceListView({
  activeCategory,
  onChangeCategory,
  interiorSpaces,
  exteriorSpaces,
  onEdit,
  onDelete,
  onAddNew,
  onClose,
  deletingId,
}: SpaceListViewProps) {
  const currentSpaces = activeCategory === 'interior' ? interiorSpaces : exteriorSpaces;

  return (
    <>
      {/* Category Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => onChangeCategory('interior')}
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
          onClick={() => onChangeCategory('exterior')}
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
        {currentSpaces.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Home size={40} className="mx-auto mb-2 opacity-50" />
            <p>No hay espacios {activeCategory === 'interior' ? 'interiores' : 'exteriores'}</p>
          </div>
        ) : (
          currentSpaces.map(space => (
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
                  onClick={() => onEdit(space)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => onDelete(space.id)}
                  disabled={deletingId === space.id}
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
        onClick={() => onAddNew(activeCategory)}
        className={`w-full py-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 ${
          activeCategory === 'interior'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        <Plus size={20} />
        Agregar Espacio {activeCategory === 'interior' ? 'Interior' : 'Exterior'}
      </button>

      <button
        onClick={onClose}
        className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
      >
        Cerrar
      </button>
    </>
  );
}
