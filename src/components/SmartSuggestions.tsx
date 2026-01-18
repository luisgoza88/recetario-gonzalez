'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChefHat,
  Sparkles,
  X,
  Check,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Zap,
  Heart,
  Leaf,
  Flame,
  Coins,
  Coffee
} from 'lucide-react';
import { Recipe } from '@/types';
import {
  RecipeAvailability,
  IngredientStatus,
  loadCurrentInventory,
  checkRecipeIngredients,
  findAlternativeRecipes,
  getAvailableIngredientsList
} from '@/lib/inventory-check';

// Tipos de estilo de receta
type RecipeStyle =
  | 'saludable'
  | 'rapida'
  | 'economica'
  | 'alta-proteina'
  | 'baja-carbohidrato'
  | 'vegetariana'
  | 'comfort'
  | 'ligera';

interface RecipeStyleOption {
  id: RecipeStyle;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const RECIPE_STYLES: RecipeStyleOption[] = [
  {
    id: 'saludable',
    label: 'Saludable',
    description: 'Balanceada y nutritiva',
    icon: <Heart size={18} />,
    color: 'bg-green-100 text-green-700 border-green-300'
  },
  {
    id: 'rapida',
    label: 'Rápida',
    description: 'Menos de 30 min',
    icon: <Zap size={18} />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
  },
  {
    id: 'alta-proteina',
    label: 'Alta Proteína',
    description: 'Rica en proteínas',
    icon: <Flame size={18} />,
    color: 'bg-red-100 text-red-700 border-red-300'
  },
  {
    id: 'ligera',
    label: 'Ligera',
    description: 'Baja en calorías',
    icon: <Leaf size={18} />,
    color: 'bg-teal-100 text-teal-700 border-teal-300'
  },
  {
    id: 'economica',
    label: 'Económica',
    description: 'Bajo presupuesto',
    icon: <Coins size={18} />,
    color: 'bg-blue-100 text-blue-700 border-blue-300'
  },
  {
    id: 'comfort',
    label: 'Comfort',
    description: 'Reconfortante',
    icon: <Coffee size={18} />,
    color: 'bg-orange-100 text-orange-700 border-orange-300'
  }
];

interface SmartSuggestionsProps {
  recipe: Recipe;
  allRecipes: Recipe[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  onSelectAlternative: (recipe: Recipe) => void;
  onClose: () => void;
}

interface AIRecipe {
  name: string;
  description: string;
  type: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: number;
  calories: string;
  ingredients: Array<{
    name: string;
    total: string;
    luis: string;
    mariana: string;
    available: boolean;
  }>;
  steps: string[];
  tips: string;
  nutritionHighlights: string[];
  usedIngredients: string[];
  additionalIngredients: string[];
}

export default function SmartSuggestions({
  recipe,
  allRecipes,
  mealType,
  onSelectAlternative,
  onClose
}: SmartSuggestionsProps) {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<RecipeAvailability | null>(null);
  const [alternatives, setAlternatives] = useState<RecipeAvailability[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<AIRecipe | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showIngredients, setShowIngredients] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<RecipeStyle>('saludable');
  const [showStyleSelector, setShowStyleSelector] = useState(true);

  // Modo especial: generar receta desde cero (sin receta existente)
  const isGenerateMode = recipe.id === 'generate-dinner' || recipe.id === 'generate-lunch' || recipe.id === 'generate-breakfast';

  useEffect(() => {
    checkInventory();
  }, [recipe]);

  const checkInventory = async () => {
    setLoading(true);
    try {
      const inventory = await loadCurrentInventory();

      // En modo generar, solo cargar ingredientes disponibles
      if (isGenerateMode) {
        const available = getAvailableIngredientsList(inventory);
        setAvailableIngredients(available);
        // Crear una disponibilidad "falsa" para que muestre la sección de IA
        setAvailability({
          recipe,
          canMake: false,
          availablePercent: 0,
          missingIngredients: [],
          availableIngredients: []
        });
        setLoading(false);
        return;
      }

      const recipeAvailability = await checkRecipeIngredients(recipe, inventory);
      setAvailability(recipeAvailability);

      // Buscar alternativas solo si faltan ingredientes
      if (!recipeAvailability.canMake) {
        const alts = await findAlternativeRecipes(allRecipes, inventory, recipe.id, mealType);
        setAlternatives(alts.slice(0, 5)); // Top 5 alternativas
      }

      // Guardar ingredientes disponibles para IA
      const available = getAvailableIngredientsList(inventory);
      setAvailableIngredients(available);
    } catch (error) {
      console.error('Error checking inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecipe = async () => {
    setGeneratingAI(true);
    setAiError(null);
    setShowStyleSelector(false); // Ocultar selector mientras genera

    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableIngredients,
          mealType,
          servings: 5,
          recipeStyle: selectedStyle,
          preferences: ['Fácil de preparar']
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error generando receta');
      }

      setAiRecipe(data.recipe);
    } catch (error) {
      console.error('AI recipe error:', error);
      setAiError(error instanceof Error ? error.message : 'Error al generar receta');
      setShowStyleSelector(true); // Mostrar selector si hay error
    } finally {
      setGeneratingAI(false);
    }
  };

  const resetAIGeneration = () => {
    setAiRecipe(null);
    setAiError(null);
    setShowStyleSelector(true);
  };

  const saveAIRecipe = async () => {
    if (!aiRecipe) return;

    setSavingRecipe(true);
    try {
      // Aquí podrías guardar la receta en Supabase
      // Por ahora, mostrar como alternativa
      const newRecipe: Recipe = {
        id: `ai-${Date.now()}`,
        name: aiRecipe.name,
        type: mealType,
        ingredients: aiRecipe.ingredients.map(i => ({
          name: i.name,
          total: i.total,
          luis: i.luis,
          mariana: i.mariana
        })),
        steps: aiRecipe.steps
      };

      onSelectAlternative(newRecipe);
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setSavingRecipe(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4" />
          <p className="text-gray-600">Verificando inventario...</p>
        </div>
      </div>
    );
  }

  if (!availability) return null;

  const mealLabels = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena' };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <span className="font-semibold">Sugerencias Inteligentes</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Generate Mode Header */}
          {isGenerateMode ? (
            <div className="p-4 rounded-xl bg-purple-50">
              <div className="flex items-start gap-3">
                <Sparkles className="text-purple-600 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-800">Generar {mealLabels[mealType]}</h3>
                  <p className="text-sm text-purple-600 mt-1">
                    ¿Cambio de planes? Crea una receta con los ingredientes que tienes disponibles
                  </p>
                  <p className="text-xs text-purple-500 mt-2">
                    {availableIngredients.length} ingredientes disponibles en tu inventario
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Current Recipe Status */
            <div className={`p-4 rounded-xl ${availability.canMake ? 'bg-green-50' : 'bg-orange-50'}`}>
              <div className="flex items-start gap-3">
                {availability.canMake ? (
                  <Check className="text-green-600 mt-1" size={20} />
                ) : (
                  <AlertTriangle className="text-orange-600 mt-1" size={20} />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{recipe.name}</h3>
                  <p className="text-sm text-gray-600">{mealLabels[mealType]}</p>

                  {availability.canMake ? (
                    <p className="text-green-700 text-sm mt-2">
                      Tienes todos los ingredientes necesarios
                    </p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-orange-700 text-sm font-medium">
                        Faltan {availability.missingIngredients.length} ingrediente{availability.missingIngredients.length > 1 ? 's' : ''}:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {availability.missingIngredients.map((ing, i) => (
                          <span key={i} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                            {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Disponibilidad</span>
                      <span>{Math.round(availability.availablePercent)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          availability.canMake ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${availability.availablePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alternatives Section - Solo mostrar si no es modo generar */}
          {!isGenerateMode && !availability.canMake && alternatives.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-blue-50 p-3 border-b">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                  <ChefHat size={18} />
                  Recetas alternativas con lo que tienes
                </h4>
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectAlternative(alt.recipe)}
                    className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{alt.recipe.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alt.canMake
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {Math.round(alt.availablePercent)}% listo
                      </span>
                    </div>
                    {alt.missingIngredients.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Falta: {alt.missingIngredients.map(i => i.name).join(', ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Recipe Generation - Mostrar en modo generar o si faltan ingredientes */}
          {(isGenerateMode || !availability.canMake) && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-purple-50 p-3 border-b">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <Sparkles size={18} />
                  Generar receta nueva con IA
                </h4>
                <p className="text-xs text-purple-600 mt-1">
                  Elige el tipo de receta y la generamos con tus ingredientes
                </p>
              </div>

              <div className="p-3">
                {/* Recipe Style Selector */}
                {showStyleSelector && !aiRecipe && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ¿Qué tipo de receta quieres?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {RECIPE_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-2 rounded-lg border-2 text-left transition-all ${
                            selectedStyle === style.id
                              ? `${style.color} border-current`
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {style.icon}
                            <span className="font-medium text-sm">{style.label}</span>
                          </div>
                          <p className="text-xs opacity-75 mt-0.5">{style.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available ingredients toggle */}
                <button
                  onClick={() => setShowIngredients(!showIngredients)}
                  className="w-full flex justify-between items-center text-sm text-gray-600 mb-2"
                >
                  <span>Ver ingredientes disponibles ({availableIngredients.length})</span>
                  {showIngredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showIngredients && (
                  <div className="bg-gray-50 p-2 rounded-lg mb-3 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {availableIngredients.map((ing, i) => (
                        <span key={i} className="bg-white text-gray-600 px-2 py-0.5 rounded text-xs border">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!aiRecipe ? (
                  <button
                    onClick={generateAIRecipe}
                    disabled={generatingAI || availableIngredients.length < 3}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generatingAI ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Generando receta {RECIPE_STYLES.find(s => s.id === selectedStyle)?.label.toLowerCase()}...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generar Receta {RECIPE_STYLES.find(s => s.id === selectedStyle)?.label}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* AI Recipe Result */}
                    <div className="bg-purple-50 p-3 rounded-xl">
                      <h5 className="font-semibold text-purple-800">{aiRecipe.name}</h5>
                      <p className="text-sm text-purple-600 mt-1">{aiRecipe.description}</p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                          {aiRecipe.prepTime} prep
                        </span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                          {aiRecipe.cookTime} cocción
                        </span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                          ~{aiRecipe.calories}
                        </span>
                      </div>

                      {aiRecipe.nutritionHighlights && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {aiRecipe.nutritionHighlights.map((h, i) => (
                            <span key={i} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                              {h}
                            </span>
                          ))}
                        </div>
                      )}

                      {aiRecipe.additionalIngredients?.length > 0 && (
                        <div className="mt-2 text-xs text-orange-600">
                          <strong>Necesitarás:</strong> {aiRecipe.additionalIngredients.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveAIRecipe}
                        disabled={savingRecipe}
                        className="flex-1 bg-green-700 text-white py-2 rounded-xl font-semibold hover:bg-green-800 flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        Usar esta receta
                      </button>
                      <button
                        onClick={generateAIRecipe}
                        disabled={generatingAI}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
                        title="Regenerar misma receta"
                      >
                        <RefreshCw size={18} className={generatingAI ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    <button
                      onClick={resetAIGeneration}
                      className="w-full text-sm text-purple-600 hover:text-purple-800 mt-2"
                    >
                      ← Elegir otro tipo de receta
                    </button>
                  </div>
                )}

                {aiError && (
                  <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                    {aiError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All good message */}
          {availability.canMake && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={32} className="text-green-600" />
              </div>
              <h4 className="font-semibold text-green-800">Todo listo para cocinar</h4>
              <p className="text-sm text-gray-600 mt-1">
                Tienes todos los ingredientes para esta receta
              </p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
