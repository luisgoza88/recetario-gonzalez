'use client';

import { X } from 'lucide-react';
import { Recipe, Ingredient } from '@/types';

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  const ingredients = recipe.ingredients as Ingredient[];
  const hasTotal = ingredients[0]?.total;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Desayuno';
      case 'lunch': return 'Almuerzo';
      case 'dinner': return 'Cena';
      default: return type;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">{recipe.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {/* Type Badge */}
          <div className="mb-4">
            <span className={`
              text-sm px-3 py-1 rounded-full
              ${recipe.type === 'breakfast' ? 'bg-orange-100 text-orange-700' : ''}
              ${recipe.type === 'lunch' ? 'bg-green-100 text-green-700' : ''}
              ${recipe.type === 'dinner' ? 'bg-blue-100 text-blue-700' : ''}
            `}>
              {getTypeLabel(recipe.type)}
            </span>
          </div>

          {/* Portions */}
          {recipe.portions && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="font-semibold mb-1">Porciones:</div>
              <div><strong>Luis:</strong> {recipe.portions.luis}</div>
              <div><strong>Mariana:</strong> {recipe.portions.mariana}</div>
            </div>
          )}

          {/* Total */}
          {recipe.total && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>Total a preparar:</strong> {recipe.total}
            </div>
          )}

          {/* Ingredients Table */}
          <h4 className="font-semibold mb-2">Ingredientes</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left border">Ingrediente</th>
                  {hasTotal && <th className="p-2 text-left border">Total</th>}
                  <th className="p-2 text-left border">Luis</th>
                  <th className="p-2 text-left border">Mariana</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{ing.name}</td>
                    {hasTotal && <td className="p-2 border">{ing.total || ''}</td>}
                    <td className="p-2 border">{ing.luis}</td>
                    <td className="p-2 border">{ing.mariana}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Steps */}
          <h4 className="font-semibold mb-2">Preparación</h4>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {recipe.steps.map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
