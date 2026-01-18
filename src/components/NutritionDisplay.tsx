'use client';

import { Flame, Beef, Wheat, Droplets, Leaf } from 'lucide-react';
import { NutritionInfo, DietaryTag } from '@/types';

interface NutritionDisplayProps {
  nutrition: NutritionInfo;
  servings?: number;
  compact?: boolean;
}

// Colores para los macros
const MACRO_COLORS = {
  calories: 'text-orange-600 bg-orange-50',
  protein: 'text-red-600 bg-red-50',
  carbs: 'text-amber-600 bg-amber-50',
  fat: 'text-blue-600 bg-blue-50',
  fiber: 'text-green-600 bg-green-50',
};

export default function NutritionDisplay({ nutrition, servings = 1, compact = false }: NutritionDisplayProps) {
  if (!nutrition) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-orange-600">
          <Flame size={12} />
          {nutrition.calories} kcal
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <Beef size={12} />
          {nutrition.protein}g
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <Wheat size={12} />
          {nutrition.carbs}g
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Leaf size={16} className="text-green-600" />
        Información Nutricional
        <span className="text-xs font-normal text-gray-500">(por porción)</span>
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Calorías */}
        <div className={`rounded-lg p-3 ${MACRO_COLORS.calories}`}>
          <div className="flex items-center gap-1 mb-1">
            <Flame size={14} />
            <span className="text-xs font-medium">Calorías</span>
          </div>
          <div className="text-lg font-bold">{nutrition.calories}</div>
          <div className="text-xs opacity-70">kcal</div>
        </div>

        {/* Proteína */}
        <div className={`rounded-lg p-3 ${MACRO_COLORS.protein}`}>
          <div className="flex items-center gap-1 mb-1">
            <Beef size={14} />
            <span className="text-xs font-medium">Proteína</span>
          </div>
          <div className="text-lg font-bold">{nutrition.protein}</div>
          <div className="text-xs opacity-70">gramos</div>
        </div>

        {/* Carbohidratos */}
        <div className={`rounded-lg p-3 ${MACRO_COLORS.carbs}`}>
          <div className="flex items-center gap-1 mb-1">
            <Wheat size={14} />
            <span className="text-xs font-medium">Carbos</span>
          </div>
          <div className="text-lg font-bold">{nutrition.carbs}</div>
          <div className="text-xs opacity-70">gramos</div>
        </div>

        {/* Grasas */}
        <div className={`rounded-lg p-3 ${MACRO_COLORS.fat}`}>
          <div className="flex items-center gap-1 mb-1">
            <Droplets size={14} />
            <span className="text-xs font-medium">Grasas</span>
          </div>
          <div className="text-lg font-bold">{nutrition.fat}</div>
          <div className="text-xs opacity-70">gramos</div>
        </div>
      </div>

      {/* Info adicional si está disponible */}
      {(nutrition.fiber || nutrition.sodium || nutrition.sugar) && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-600">
          {nutrition.fiber !== undefined && (
            <span>Fibra: <strong>{nutrition.fiber}g</strong></span>
          )}
          {nutrition.sugar !== undefined && (
            <span>Azúcar: <strong>{nutrition.sugar}g</strong></span>
          )}
          {nutrition.sodium !== undefined && (
            <span>Sodio: <strong>{nutrition.sodium}mg</strong></span>
          )}
        </div>
      )}

      {/* Total para múltiples porciones */}
      {servings > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Total para {servings} porciones: <strong>{nutrition.calories * servings} kcal</strong>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar tags dietéticos
interface DietaryTagsProps {
  tags: DietaryTag[];
}

const TAG_STYLES: Record<DietaryTag, { label: string; color: string }> = {
  'vegetariano': { label: 'Vegetariano', color: 'bg-green-100 text-green-700' },
  'vegano': { label: 'Vegano', color: 'bg-green-200 text-green-800' },
  'sin-gluten': { label: 'Sin Gluten', color: 'bg-yellow-100 text-yellow-700' },
  'sin-lactosa': { label: 'Sin Lactosa', color: 'bg-blue-100 text-blue-700' },
  'bajo-carbohidrato': { label: 'Low Carb', color: 'bg-purple-100 text-purple-700' },
  'alto-proteina': { label: 'Alto Proteína', color: 'bg-red-100 text-red-700' },
  'bajo-sodio': { label: 'Bajo Sodio', color: 'bg-cyan-100 text-cyan-700' },
  'bajo-azucar': { label: 'Bajo Azúcar', color: 'bg-pink-100 text-pink-700' },
  'keto': { label: 'Keto', color: 'bg-indigo-100 text-indigo-700' },
  'paleo': { label: 'Paleo', color: 'bg-orange-100 text-orange-700' },
};

export function DietaryTags({ tags }: DietaryTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => {
        const style = TAG_STYLES[tag];
        return (
          <span
            key={tag}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.color}`}
          >
            {style.label}
          </span>
        );
      })}
    </div>
  );
}

// Componente para mostrar tiempo de preparación
interface PrepTimeDisplayProps {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
}

export function PrepTimeDisplay({ prepTime, cookTime, totalTime }: PrepTimeDisplayProps) {
  if (!prepTime && !cookTime && !totalTime) return null;

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      {prepTime && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Prep:</span>
          <span className="font-medium">{formatTime(prepTime)}</span>
        </div>
      )}
      {cookTime && (
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Cocción:</span>
          <span className="font-medium">{formatTime(cookTime)}</span>
        </div>
      )}
      {totalTime && (
        <div className="flex items-center gap-1 text-green-700">
          <span>Total:</span>
          <span className="font-semibold">{formatTime(totalTime)}</span>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar dificultad
interface DifficultyDisplayProps {
  difficulty: 'fácil' | 'media' | 'difícil';
}

export function DifficultyDisplay({ difficulty }: DifficultyDisplayProps) {
  const styles = {
    'fácil': { color: 'text-green-600', bg: 'bg-green-100', dots: 1 },
    'media': { color: 'text-yellow-600', bg: 'bg-yellow-100', dots: 2 },
    'difícil': { color: 'text-red-600', bg: 'bg-red-100', dots: 3 },
  };

  const style = styles[difficulty];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.color}`}>
      <span className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i <= style.dots ? 'bg-current' : 'bg-gray-300'}`}
          />
        ))}
      </span>
      <span className="capitalize">{difficulty}</span>
    </div>
  );
}
