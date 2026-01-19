'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { SpaceType } from '@/types';

interface SpaceTypeSelectorProps {
  spaceTypes: SpaceType[];
  selectedTypeId: string;
  category: 'interior' | 'exterior';
  onSelect: (typeId: string) => void;
}

// Definición de grupos para agrupar tipos de espacio
const SPACE_GROUPS: Record<string, { label: string; keywords: string[] }> = {
  living: { label: 'Áreas Comunes', keywords: ['sala', 'comedor', 'recibidor', 'living'] },
  bedroom: { label: 'Habitaciones', keywords: ['habitación', 'dormitorio', 'cuarto', 'alcoba'] },
  kitchen: { label: 'Cocina y Lavandería', keywords: ['cocina', 'lavandería', 'despensa'] },
  bathroom: { label: 'Baños', keywords: ['baño', 'sanitario', 'wc'] },
  office: { label: 'Oficina y Estudio', keywords: ['estudio', 'oficina', 'biblioteca'] },
  storage: { label: 'Almacenamiento', keywords: ['bodega', 'closet', 'garaje'] },
  outdoor: { label: 'Exteriores', keywords: ['jardín', 'terraza', 'patio', 'balcón', 'piscina'] },
  other: { label: 'Otros', keywords: [] }
};

function getSpaceGroup(typeName: string): string {
  const name = typeName.toLowerCase();

  for (const [groupKey, group] of Object.entries(SPACE_GROUPS)) {
    if (group.keywords.some(kw => name.includes(kw))) {
      return groupKey;
    }
  }

  return 'other';
}

export default function SpaceTypeSelector({
  spaceTypes,
  selectedTypeId,
  category,
  onSelect
}: SpaceTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar tipos por categoría
  const filteredTypes = useMemo(() => {
    return spaceTypes.filter(type => type.category === category);
  }, [spaceTypes, category]);

  // Filtrar por búsqueda
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return filteredTypes;

    const query = searchQuery.toLowerCase();
    return filteredTypes.filter(type =>
      type.name.toLowerCase().includes(query)
    );
  }, [filteredTypes, searchQuery]);

  // Agrupar los resultados
  const groupedResults = useMemo(() => {
    const groups: Record<string, SpaceType[]> = {};

    for (const type of searchResults) {
      const groupKey = getSpaceGroup(type.name);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(type);
    }

    // Ordenar grupos y convertir a array
    const orderedGroupKeys = ['living', 'bedroom', 'kitchen', 'bathroom', 'office', 'storage', 'outdoor', 'other'];

    return orderedGroupKeys
      .filter(key => groups[key] && groups[key].length > 0)
      .map(key => ({
        key,
        label: SPACE_GROUPS[key].label,
        types: groups[key]
      }));
  }, [searchResults]);

  // Tipo seleccionado
  const selectedType = spaceTypes.find(t => t.id === selectedTypeId);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enfocar input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (typeId: string) => {
    onSelect(typeId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tipo de espacio
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-xl flex items-center gap-3 transition-colors ${
          isOpen
            ? 'ring-2 ring-blue-500 border-blue-500'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedType ? (
          <>
            <span className="text-2xl">{selectedType.icon}</span>
            <span className="flex-1 text-left font-medium">{selectedType.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-400">Seleccionar tipo...</span>
        )}
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tipo de espacio..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {groupedResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No se encontraron espacios
              </div>
            ) : (
              groupedResults.map(group => (
                <div key={group.key}>
                  {/* Group Header */}
                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {group.label}
                  </div>

                  {/* Group Items */}
                  {group.types.map(type => (
                    <button
                      key={type.id}
                      onClick={() => handleSelect(type.id)}
                      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                        type.id === selectedTypeId ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <span className="flex-1 text-left text-sm font-medium">{type.name}</span>
                      {type.id === selectedTypeId && (
                        <Check size={18} className="text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Quick Add Option (for custom types) */}
          {searchQuery.trim() && searchResults.length === 0 && (
            <div className="p-2 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Usa el nombre personalizado para agregar &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
