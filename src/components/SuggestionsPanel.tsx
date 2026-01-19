'use client';

import { useState, useEffect } from 'react';
import {
  Lightbulb, Check, X, TrendingDown, TrendingUp, ShoppingCart,
  ChefHat, RefreshCw, Calendar, Package, Sparkles, MessageSquare,
  ChevronDown, ChevronUp, AlertTriangle, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AdjustmentSuggestion, Recipe, Ingredient } from '@/types';
import { useProactiveSuggestions, ProactiveSuggestion } from '@/hooks/useProactiveSuggestions';

interface SuggestionsPanelProps {
  onUpdate?: () => void;
  onNavigate?: (tab: string, mode?: string) => void;
}

export default function SuggestionsPanel({ onUpdate, onNavigate }: SuggestionsPanelProps) {
  // Sugerencias reactivas (basadas en feedback)
  const [reactiveSuggestions, setReactiveSuggestions] = useState<AdjustmentSuggestion[]>([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loadingReactive, setLoadingReactive] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  // Sugerencias proactivas (generadas automáticamente)
  const {
    suggestions: proactiveSuggestions,
    loading: loadingProactive,
    dismissSuggestion: dismissProactive,
    refresh: refreshProactive
  } = useProactiveSuggestions();

  // Estados de UI
  const [expandedSection, setExpandedSection] = useState<'proactive' | 'reactive' | null>('proactive');

  useEffect(() => {
    loadReactiveData();
  }, []);

  const loadReactiveData = async () => {
    setLoadingReactive(true);
    try {
      const { data: suggestionsData } = await supabase
        .from('adjustment_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('feedback_count', { ascending: false });

      if (suggestionsData) {
        setReactiveSuggestions(suggestionsData);

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
      setLoadingReactive(false);
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

      await supabase
        .from('adjustment_suggestions')
        .update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      setReactiveSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
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
    const recipe = recipes[suggestion.recipe_id!];
    if (!recipe) return;

    const changePercent = suggestion.change_percent || -20;
    const multiplier = 1 + (changePercent / 100);

    const ingredientNames = (recipe.ingredients as Ingredient[]).map(i => i.name.toLowerCase());

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
    const newNum = Math.round(num * multiplier * 10) / 10;

    return `${newNum}${unit ? ' ' + unit : ''}`;
  };

  const dismissReactiveSuggestion = async (suggestionId: string) => {
    await supabase
      .from('adjustment_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', suggestionId);

    setReactiveSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handleProactiveAction = (suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;

    switch (suggestion.action.type) {
      case 'navigate':
        const payload = suggestion.action.payload as { tab: string; mode?: string } | undefined;
        if (payload?.tab && onNavigate) {
          onNavigate(payload.tab, payload.mode);
        }
        break;
      case 'dismiss':
        dismissProactive(suggestion.id);
        break;
      case 'generate_recipe':
        // TODO: Abrir modal de generar receta
        if (onNavigate) {
          onNavigate('recipes');
        }
        break;
      case 'add_to_cart':
        if (onNavigate) {
          onNavigate('market', 'shopping');
        }
        break;
    }
  };

  const getProactiveIcon = (type: string) => {
    switch (type) {
      case 'menu_today':
      case 'menu_tomorrow':
        return <Calendar size={20} />;
      case 'low_stock':
        return <AlertTriangle size={20} />;
      case 'high_stock':
        return <Package size={20} />;
      case 'missing_ingredient':
        return <ShoppingCart size={20} />;
      case 'recipe_discovery':
        return <ChefHat size={20} />;
      case 'no_feedback':
        return <MessageSquare size={20} />;
      default:
        return <Lightbulb size={20} />;
    }
  };

  const getReactiveIcon = (type: string) => {
    switch (type) {
      case 'portion': return <ChefHat size={20} />;
      case 'market': return <ShoppingCart size={20} />;
      default: return <Lightbulb size={20} />;
    }
  };

  const getReactiveColor = (type: string) => {
    switch (type) {
      case 'portion': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'market': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const isLoading = loadingReactive || loadingProactive;
  const totalProactive = proactiveSuggestions.length;
  const totalReactive = reactiveSuggestions.length;
  const hasAnySuggestion = totalProactive > 0 || totalReactive > 0;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
        Cargando sugerencias...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Lightbulb className="text-yellow-500" size={22} />
          Centro de Sugerencias
        </h2>
        <button
          onClick={() => {
            refreshProactive();
            loadReactiveData();
          }}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar sugerencias"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {!hasAnySuggestion ? (
        <div className="p-6 text-center bg-white rounded-xl border">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-2">¡Todo en orden!</h3>
          <p className="text-sm text-gray-500">
            No hay sugerencias pendientes. El sistema te avisará cuando haya algo importante.
          </p>
        </div>
      ) : (
        <>
          {/* SECCIÓN PROACTIVA */}
          {totalProactive > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'proactive' ? null : 'proactive')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Sparkles className="text-blue-600" size={20} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">Alertas del Día</span>
                    <p className="text-xs text-gray-500">{totalProactive} sugerencia{totalProactive > 1 ? 's' : ''} activa{totalProactive > 1 ? 's' : ''}</p>
                  </div>
                </div>
                {expandedSection === 'proactive' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {expandedSection === 'proactive' && (
                <div className="p-3 space-y-3">
                  {proactiveSuggestions.map(suggestion => (
                    <div
                      key={suggestion.id}
                      className={`border-2 rounded-xl p-4 ${suggestion.color}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getProactiveIcon(suggestion.type)}
                          <span className="font-semibold">{suggestion.title}</span>
                        </div>
                        <button
                          onClick={() => dismissProactive(suggestion.id)}
                          className="p-1 hover:bg-white/50 rounded transition-colors"
                          title="Descartar"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <p className="text-sm whitespace-pre-line mb-3 opacity-90">
                        {suggestion.description}
                      </p>

                      {suggestion.action && (
                        <button
                          onClick={() => handleProactiveAction(suggestion)}
                          className="bg-white/80 hover:bg-white py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                          {suggestion.action.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN REACTIVA */}
          {totalReactive > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'reactive' ? null : 'reactive')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="text-yellow-600" size={20} />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-gray-800">Ajustes Sugeridos</span>
                    <p className="text-xs text-gray-500">Basados en tu feedback ({totalReactive})</p>
                  </div>
                </div>
                {expandedSection === 'reactive' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {expandedSection === 'reactive' && (
                <div className="p-3 space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    <p>Estas sugerencias se generaron analizando tu feedback de las últimas semanas.</p>
                  </div>

                  {reactiveSuggestions.map(suggestion => {
                    const recipe = suggestion.recipe_id ? recipes[suggestion.recipe_id] : null;
                    const isPositive = (suggestion.change_percent || 0) > 0;

                    return (
                      <div
                        key={suggestion.id}
                        className={`border-2 rounded-xl p-4 ${getReactiveColor(suggestion.suggestion_type)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getReactiveIcon(suggestion.suggestion_type)}
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

                        {recipe && (
                          <div className="font-medium mb-2">{recipe.name}</div>
                        )}

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

                        <p className="text-sm opacity-80 mb-4">{suggestion.reason}</p>

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
                            onClick={() => dismissReactiveSuggestion(suggestion.id)}
                            className="py-2 px-4 rounded-lg hover:bg-white/50 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Info footer */}
          <p className="text-xs text-gray-500 text-center px-4">
            Las alertas se actualizan automáticamente. Los ajustes aplicados modifican recetas y cantidades.
          </p>
        </>
      )}
    </div>
  );
}
