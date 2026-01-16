'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, Check, X, TrendingDown, TrendingUp, ShoppingCart, ChefHat, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdjustmentSuggestion, Recipe, Ingredient } from '@/types';

interface SuggestionsPanelProps {
  onUpdate?: () => void;
}

export default function SuggestionsPanel({ onUpdate }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<AdjustmentSuggestion[]>([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar sugerencias pendientes
      const { data: suggestionsData } = await supabase
        .from('adjustment_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('feedback_count', { ascending: false });

      if (suggestionsData) {
        setSuggestions(suggestionsData);

        // Cargar recetas relacionadas
        const recipeIds = [...new Set(suggestionsData.map(s => s.recipe_id).filter(Boolean))];
        if (recipeIds.length > 0) {
          const { data: recipesData } = await supabase
            .from('recipes')
            .select('*')
            .in('id', recipeIds);

          if (recipesData) {
            const recipesMap: Record<string, Recipe> = {};
            recipesData.forEach(r => { recipesMap[r.id] = r; });
            setRecipes(recipesMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion: AdjustmentSuggestion) => {
    setApplying(suggestion.id);

    try {
      if (suggestion.suggestion_type === 'portion' && suggestion.recipe_id) {
        await applyPortionChange(suggestion);
      } else if (suggestion.suggestion_type === 'market' && suggestion.recipe_id) {
        await applyMarketChange(suggestion);
      }

      // Marcar como aplicada
      await supabase
        .from('adjustment_suggestions')
        .update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      onUpdate?.();
    } catch (error) {
      console.error('Error applying suggestion:', error);
    } finally {
      setApplying(null);
    }
  };

  const applyPortionChange = async (suggestion: AdjustmentSuggestion) => {
    const recipe = recipes[suggestion.recipe_id!];
    if (!recipe) return;

    const changePercent = suggestion.change_percent || 0;
    const multiplier = 1 + (changePercent / 100);

    // Ajustar ingredientes
    const updatedIngredients = (recipe.ingredients as Ingredient[]).map(ing => {
      return {
        ...ing,
        luis: adjustQuantityString(ing.luis, multiplier),
        mariana: adjustQuantityString(ing.mariana, multiplier),
        total: ing.total ? adjustQuantityString(ing.total, multiplier) : undefined
      };
    });

    await supabase
      .from('recipes')
      .update({
        ingredients: updatedIngredients,
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestion.recipe_id);
  };

  const applyMarketChange = async (suggestion: AdjustmentSuggestion) => {
    // Para cambios de mercado, reducimos las cantidades en market_items
    // relacionadas con la receta
    const recipe = recipes[suggestion.recipe_id!];
    if (!recipe) return;

    const changePercent = suggestion.change_percent || -20;
    const multiplier = 1 + (changePercent / 100);

    const ingredientNames = (recipe.ingredients as Ingredient[]).map(i => i.name.toLowerCase());

    // Buscar items del mercado que coincidan
    const { data: items } = await supabase
      .from('market_items')
      .select('id, name, quantity');

    if (items) {
      for (const item of items) {
        const itemNameLower = item.name.toLowerCase();
        const matches = ingredientNames.some(ing =>
          itemNameLower.includes(ing) || ing.includes(itemNameLower)
        );

        if (matches) {
          const newQuantity = adjustQuantityString(item.quantity, multiplier);
          await supabase
            .from('market_items')
            .update({ quantity: newQuantity })
            .eq('id', item.id);
        }
      }
    }
  };

  const adjustQuantityString = (qty: string, multiplier: number): string => {
    const match = qty.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return qty;

    const num = parseFloat(match[1]);
    const unit = match[2];
    const newNum = Math.round(num * multiplier * 10) / 10; // Redondear a 1 decimal

    return `${newNum}${unit ? ' ' + unit : ''}`;
  };

  const dismissSuggestion = async (suggestionId: string) => {
    await supabase
      .from('adjustment_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', suggestionId);

    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'portion': return <ChefHat size={20} />;
      case 'market': return <ShoppingCart size={20} />;
      default: return <Lightbulb size={20} />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'portion': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'market': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
        Cargando sugerencias...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-gray-700 mb-2">Todo al día</h3>
        <p className="text-sm text-gray-500">
          No hay sugerencias pendientes. El sistema genera sugerencias basadas en tu feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-yellow-700 font-semibold mb-1">
          <Lightbulb size={20} />
          Sugerencias de Ajustes
        </div>
        <p className="text-sm text-yellow-600">
          Basado en el feedback de las últimas semanas, el sistema sugiere estos ajustes:
        </p>
      </div>

      {/* Suggestions List */}
      {suggestions.map(suggestion => {
        const recipe = suggestion.recipe_id ? recipes[suggestion.recipe_id] : null;
        const isPositive = (suggestion.change_percent || 0) > 0;

        return (
          <div
            key={suggestion.id}
            className={`border-2 rounded-xl p-4 ${getSuggestionColor(suggestion.suggestion_type)}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getSuggestionIcon(suggestion.suggestion_type)}
                <span className="font-semibold">
                  {suggestion.suggestion_type === 'portion' && 'Ajustar Porción'}
                  {suggestion.suggestion_type === 'market' && 'Ajustar Mercado'}
                  {suggestion.suggestion_type === 'ingredient' && 'Ajustar Ingrediente'}
                </span>
              </div>
              <span className="text-xs bg-white/50 px-2 py-1 rounded-full">
                {suggestion.feedback_count} reportes
              </span>
            </div>

            {/* Recipe Name */}
            {recipe && (
              <div className="font-medium mb-2">{recipe.name}</div>
            )}

            {/* Change Indicator */}
            {suggestion.change_percent && (
              <div className={`flex items-center gap-2 text-sm mb-3 ${
                isPositive ? 'text-green-700' : 'text-red-700'
              }`}>
                {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>
                  {isPositive ? 'Aumentar' : 'Reducir'} cantidades en {Math.abs(suggestion.change_percent)}%
                </span>
              </div>
            )}

            {/* Reason */}
            <p className="text-sm opacity-80 mb-4">{suggestion.reason}</p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => applySuggestion(suggestion)}
                disabled={applying === suggestion.id}
                className="flex-1 bg-white/80 hover:bg-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {applying === suggestion.id ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                Aplicar
              </button>
              <button
                onClick={() => dismissSuggestion(suggestion.id)}
                className="py-2 px-4 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}

      {/* Info */}
      <p className="text-xs text-gray-500 text-center">
        Los ajustes aplicados modifican las recetas y cantidades del mercado automáticamente.
      </p>
    </div>
  );
}
