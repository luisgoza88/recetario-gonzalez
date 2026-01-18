'use client';

import { useState, useEffect } from 'react';
import { Check, X, Star, Package, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { SmartSubstitution, SubstitutionResult, findSmartSubstitutionsForMany, recordSubstitutionUse } from '@/lib/smart-substitutions';
import { DietaryTag } from '@/types';

interface SmartSubstitutionPanelProps {
  missingIngredients: string[];
  dietaryTags?: DietaryTag[];
  onSubstitutionSelect?: (original: string, substitute: string) => void;
}

export default function SmartSubstitutionPanel({
  missingIngredients,
  dietaryTags = [],
  onSubstitutionSelect
}: SmartSubstitutionPanelProps) {
  const [results, setResults] = useState<SubstitutionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  const [selectedSubs, setSelectedSubs] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (missingIngredients.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    findSmartSubstitutionsForMany(missingIngredients, dietaryTags)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [missingIngredients, dietaryTags]);

  const handleSelectSubstitution = async (original: string, substitute: string) => {
    setSelectedSubs(prev => {
      const next = new Map(prev);
      if (next.get(original) === substitute) {
        next.delete(original);
      } else {
        next.set(original, substitute);
      }
      return next;
    });

    // Registrar uso para aprendizaje
    await recordSubstitutionUse(original, substitute, 4);

    if (onSubstitutionSelect) {
      onSubstitutionSelect(original, substitute);
    }
  };

  const handleRateSubstitution = async (original: string, substitute: string, isGood: boolean) => {
    await recordSubstitutionUse(original, substitute, isGood ? 5 : 2);
  };

  if (loading) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const availableCount = results.filter(r => r.hasAvailableOption).length;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-orange-100/50 border-b border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-600" />
            <span className="font-medium text-orange-800">
              {results.length} ingrediente{results.length !== 1 ? 's' : ''} con sustitución
            </span>
          </div>
          {availableCount > 0 && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <Package size={12} />
              {availableCount} en despensa
            </span>
          )}
        </div>
      </div>

      {/* Lista de ingredientes */}
      <div className="divide-y divide-orange-100">
        {results.map((result) => {
          const isExpanded = expandedIngredient === result.ingredient;
          const selectedSub = selectedSubs.get(result.ingredient);
          const bestOption = result.substitutions.find(s => s.isAvailable && s.dietaryCompatible);

          return (
            <div key={result.ingredient} className="p-3">
              {/* Ingrediente faltante */}
              <button
                onClick={() => setExpandedIngredient(isExpanded ? null : result.ingredient)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-orange-900">{result.ingredient}</span>
                  {result.hasAvailableOption && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Sustituto disponible" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedSub && (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      → {selectedSub.split('(')[0].trim()}
                    </span>
                  )}
                  <span className="text-orange-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Quick suggestion si no está expandido */}
              {!isExpanded && bestOption && !selectedSub && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Sugerido: <span className="text-green-700 font-medium">{bestOption.substitute}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSubstitution(result.ingredient, bestOption.substitute);
                    }}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Usar este
                  </button>
                </div>
              )}

              {/* Lista expandida de sustituciones */}
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {result.substitutions.map((sub, idx) => (
                    <SubstitutionOption
                      key={idx}
                      substitution={sub}
                      isSelected={selectedSub === sub.substitute}
                      onSelect={() => handleSelectSubstitution(result.ingredient, sub.substitute)}
                      onRate={(isGood) => handleRateSubstitution(result.ingredient, sub.substitute, isGood)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      {selectedSubs.size > 0 && (
        <div className="p-3 bg-green-50 border-t border-green-200">
          <div className="text-sm text-green-800">
            <strong>{selectedSubs.size} sustitución{selectedSubs.size !== 1 ? 'es' : ''}</strong> seleccionada{selectedSubs.size !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

interface SubstitutionOptionProps {
  substitution: SmartSubstitution;
  isSelected: boolean;
  onSelect: () => void;
  onRate: (isGood: boolean) => void;
}

function SubstitutionOption({ substitution, isSelected, onSelect, onRate }: SubstitutionOptionProps) {
  const [showRating, setShowRating] = useState(false);

  return (
    <div
      className={`p-2 rounded-lg border transition-all ${
        isSelected
          ? 'border-green-400 bg-green-50'
          : substitution.isAvailable && substitution.dietaryCompatible
          ? 'border-green-200 bg-white hover:border-green-300'
          : !substitution.dietaryCompatible
          ? 'border-red-100 bg-red-50/30'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${
              !substitution.dietaryCompatible ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}>
              {substitution.substitute}
            </span>

            {substitution.isAvailable && (
              <span className="flex items-center gap-0.5 text-xs text-green-600">
                <Package size={10} />
                {substitution.availableQuantity}
              </span>
            )}

            {substitution.rating && substitution.rating >= 4 && (
              <Star size={12} className="text-amber-500 fill-amber-500" />
            )}
          </div>

          <p className="text-xs text-gray-500 mt-0.5">{substitution.reason}</p>
        </div>

        <div className="flex items-center gap-1">
          {isSelected ? (
            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
              <Check size={14} />
            </span>
          ) : (
            <button
              onClick={onSelect}
              disabled={!substitution.dietaryCompatible}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                substitution.dietaryCompatible
                  ? 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                  : 'border-gray-200 bg-gray-100 cursor-not-allowed'
              }`}
            />
          )}
        </div>
      </div>

      {/* Rating buttons (después de usar) */}
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
          <span className="text-xs text-gray-500">¿Funcionó bien?</span>
          <button
            onClick={() => onRate(true)}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
            title="Sí, funcionó bien"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={() => onRate(false)}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="No funcionó bien"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
