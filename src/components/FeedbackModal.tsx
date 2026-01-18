'use client';

import { useState } from 'react';
import { X, MessageSquare, Check, Brain } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Recipe, MealType, PortionRating, LeftoverRating, Ingredient, MealFeedback } from '@/types';
import { analyzeNewFeedback } from '@/lib/feedback-learning';

interface FeedbackModalProps {
  date: string;
  mealType: MealType;
  recipe: Recipe;
  onClose: () => void;
  onSaved: () => void;
}

export default function FeedbackModal({ date, mealType, recipe, onClose, onSaved }: FeedbackModalProps) {
  const [portionRating, setPortionRating] = useState<PortionRating | null>(null);
  const [leftoverRating, setLeftoverRating] = useState<LeftoverRating | null>(null);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [usedUpIngredients, setUsedUpIngredients] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mealLabels: Record<MealType, string> = {
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena'
  };

  const ingredients = (recipe.ingredients as Ingredient[]).map(i => i.name);

  const toggleIngredient = (list: string[], setList: (v: string[]) => void, ingredient: string) => {
    if (list.includes(ingredient)) {
      setList(list.filter(i => i !== ingredient));
    } else {
      setList([...list, ingredient]);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('meal_feedback')
        .insert({
          date,
          meal_type: mealType,
          recipe_id: recipe.id,
          recipe_name: recipe.name, // Guardar nombre para historial de IA
          portion_rating: portionRating,
          leftover_rating: leftoverRating,
          missing_ingredients: missingIngredients.length > 0 ? missingIngredients : null,
          used_up_ingredients: usedUpIngredients.length > 0 ? usedUpIngredients : null,
          notes: notes.trim() || null
        });

      if (error) throw error;

      // Actualizar inventario si se agotaron ingredientes
      if (usedUpIngredients.length > 0) {
        await updateInventoryForUsedUp(usedUpIngredients);
      }

      // Analizar y generar sugerencias con el nuevo sistema de aprendizaje
      await analyzeAndGenerateSuggestions({
        id: '',
        date,
        meal_type: mealType,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        portion_rating: portionRating || undefined,
        leftover_rating: leftoverRating || undefined,
        missing_ingredients: missingIngredients.length > 0 ? missingIngredients : undefined,
        notes: notes.trim() || undefined
      });

      setSaved(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving feedback:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateInventoryForUsedUp = async (ingredientNames: string[]) => {
    // Buscar items del mercado que coincidan con los ingredientes agotados
    for (const name of ingredientNames) {
      const { data: items } = await supabase
        .from('market_items')
        .select('id')
        .ilike('name', `%${name}%`)
        .limit(1);

      if (items && items.length > 0) {
        await supabase
          .from('inventory')
          .upsert({
            item_id: items[0].id,
            current_quantity: '0',
            current_number: 0,
            last_updated: new Date().toISOString()
          }, { onConflict: 'item_id' });
      }
    }
  };

  const analyzeAndGenerateSuggestions = async (feedbackData: Partial<MealFeedback>) => {
    // Usar el nuevo sistema de aprendizaje con pesos temporales
    try {
      await analyzeNewFeedback(feedbackData as MealFeedback);
    } catch (error) {
      console.error('Error in feedback learning analysis:', error);
    }
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-700">Feedback guardado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="bg-green-700 text-white p-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <span className="font-semibold">Feedback - {mealLabels[mealType]}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Recipe Name */}
          <div className="text-center pb-4 border-b">
            <h3 className="text-lg font-semibold">{recipe.name}</h3>
            <p className="text-sm text-gray-500">{date}</p>
          </div>

          {/* Portion Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cómo estuvo la porción?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'poca', label: 'Poca', emoji: '😕' },
                { value: 'bien', label: 'Bien', emoji: '👍' },
                { value: 'mucha', label: 'Mucha', emoji: '😅' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setPortionRating(option.value as PortionRating)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    portionRating === option.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Leftover Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Sobró comida?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'nada', label: 'Nada', emoji: '✨' },
                { value: 'poco', label: 'Poco', emoji: '🍽️' },
                { value: 'mucho', label: 'Mucho', emoji: '📦' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setLeftoverRating(option.value as LeftoverRating)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    leftoverRating === option.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Missing Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Faltó algún ingrediente?
            </label>
            <div className="flex flex-wrap gap-2">
              {ingredients.map(ing => (
                <button
                  key={ing}
                  onClick={() => toggleIngredient(missingIngredients, setMissingIngredients, ing)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    missingIngredients.includes(ing)
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {missingIngredients.includes(ing) && '✗ '}{ing}
                </button>
              ))}
            </div>
          </div>

          {/* Used Up Ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Se agotó algún ingrediente? (actualiza inventario)
            </label>
            <div className="flex flex-wrap gap-2">
              {ingredients.map(ing => (
                <button
                  key={ing}
                  onClick={() => toggleIngredient(usedUpIngredients, setUsedUpIngredients, ing)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    usedUpIngredients.includes(ing)
                      ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {usedUpIngredients.includes(ing) && '⚠ '}{ing}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentarios adicionales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: La salsa quedó muy salada, reducir sal la próxima vez..."
              className="w-full p-3 border rounded-xl resize-none h-24 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-700 text-white py-4 rounded-xl font-semibold hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Guardando...
              </>
            ) : (
              <>
                <Check size={20} />
                Guardar Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
