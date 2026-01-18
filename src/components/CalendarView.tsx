'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Star, MessageSquare, Sparkles, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Recipe, Ingredient, MealType } from '@/types';
import RecipeModal from './RecipeModal';
import FeedbackModal from './FeedbackModal';
import SmartSuggestions from './SmartSuggestions';
import { useOnlineStatus } from '@/hooks/useOfflineSync';
import { cacheDayMenus, getCachedDayMenus } from '@/lib/indexedDB';

interface CalendarViewProps {
  recipes: Recipe[];
}

interface DayMenu {
  day_number: number;
  breakfast_id: string;
  lunch_id: string;
  dinner_id: string | null;
  reminder: string | null;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const CYCLE_START = new Date(2026, 0, 6); // Lunes 6 de Enero 2026

export default function CalendarView({ recipes }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayMenu, setDayMenu] = useState<DayMenu[]>([]);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [feedbackRecipe, setFeedbackRecipe] = useState<{ recipe: Recipe; mealType: MealType } | null>(null);
  const [suggestionsRecipe, setSuggestionsRecipe] = useState<{ recipe: Recipe; mealType: MealType } | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const isOnline = useOnlineStatus();

  // Define getDayOfCycle before useEffect that uses it
  const getDayOfCycle = useCallback((date: Date): number => {
    if (date.getDay() === 0) return -1; // Domingo

    const diffTime = date.getTime() - CYCLE_START.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return -2; // Before cycle starts

    // Count working days (excluding Sundays)
    let workingDays = 0;
    const tempDate = new Date(CYCLE_START);

    while (tempDate <= date) {
      if (tempDate.getDay() !== 0) {
        workingDays++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    workingDays--;
    return workingDays % 12;
  }, []);

  const getMenuForDate = useCallback((date: Date) => {
    const cycleDay = getDayOfCycle(date);
    if (cycleDay < 0) return null;
    return dayMenu.find(m => m.day_number === cycleDay);
  }, [dayMenu, getDayOfCycle]);

  // Load functions defined before useEffect
  const loadMenu = useCallback(async () => {
    try {
      // Try to fetch from Supabase first
      const { data, error } = await supabase
        .from('day_menu')
        .select('*')
        .order('day_number');

      if (data && !error) {
        setDayMenu(data);
        setIsFromCache(false);
        // Cache for offline use
        await cacheDayMenus(data.map(m => ({
          ...m,
          cachedAt: Date.now()
        })));
        return;
      }
    } catch {
      console.log('Network error, trying cache...');
    }

    // Fallback to cached data
    try {
      const cached = await getCachedDayMenus();
      if (cached.length > 0) {
        setDayMenu(cached);
        setIsFromCache(true);
        console.log('Using cached menu data');
      }
    } catch (cacheError) {
      console.error('Cache error:', cacheError);
    }
  }, []);

  const loadCompletedDays = useCallback(async () => {
    const { data } = await supabase
      .from('completed_days')
      .select('date')
      .eq('completed', true);

    if (data) {
      setCompletedDays(new Set(data.map(d => d.date)));
    }
  }, []);

  useEffect(() => {
    loadMenu();
    loadCompletedDays();

    // Auto-select today if it has menu
    const today = new Date();
    const cycleDay = getDayOfCycle(today);
    if (cycleDay >= 0) {
      setSelectedDate(today);
    }

    // Listen for goToToday event
    const handleGoToToday = () => {
      const today = new Date();
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setSelectedDate(today);
    };

    window.addEventListener('goToToday', handleGoToToday);
    return () => window.removeEventListener('goToToday', handleGoToToday);
  }, [loadMenu, loadCompletedDays, getDayOfCycle]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(null);
    setExpandedRecipe(null);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setExpandedRecipe(null);
  };

  const toggleDayComplete = async () => {
    if (!selectedDate) return;
    const dateKey = selectedDate.toISOString().split('T')[0];

    const isCompleted = completedDays.has(dateKey);

    if (isCompleted) {
      await supabase.from('completed_days').delete().eq('date', dateKey);
      setCompletedDays(prev => {
        const next = new Set(prev);
        next.delete(dateKey);
        return next;
      });
    } else {
      await supabase.from('completed_days').upsert({ date: dateKey, completed: true });
      setCompletedDays(prev => new Set([...prev, dateKey]));
    }
  };

  const getRecipeById = (id: string) => recipes.find(r => r.id === id);

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const today = new Date();

    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const cycleDay = getDayOfCycle(date);
      const hasMenu = cycleDay >= 0;
      const isSunday = date.getDay() === 0;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const dateKey = date.toISOString().split('T')[0];
      const isCompleted = completedDays.has(dateKey);

      // Domingos son seleccionables también (para generar con IA)
      const isSelectable = hasMenu || isSunday;

      days.push(
        <button
          key={day}
          onClick={() => isSelectable && selectDate(date)}
          disabled={!isSelectable}
          className={`
            aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-all
            ${isSunday && !isSelected ? 'bg-purple-50 text-purple-500 font-medium hover:bg-purple-100 border border-purple-200' : ''}
            ${hasMenu && !isSelected ? 'bg-green-50 text-green-700 font-semibold hover:bg-green-100' : ''}
            ${!hasMenu && !isSunday ? 'text-gray-300' : ''}
            ${isToday ? 'ring-2 ring-green-700' : ''}
            ${isSelected && isSunday ? 'bg-purple-600 text-white' : ''}
            ${isSelected && !isSunday ? 'bg-green-700 text-white' : ''}
          `}
        >
          <span>{day}</span>
          {hasMenu && (
            <span className={`text-[0.6rem] ${isSelected ? 'opacity-80' : 'opacity-70'}`}>
              D{cycleDay + 1}
            </span>
          )}
          {isSunday && !hasMenu && (
            <span className={`text-[0.5rem] ${isSelected ? 'opacity-80' : 'opacity-70'}`}>
              IA
            </span>
          )}
          {isCompleted && (
            <Check
              size={10}
              className={`absolute bottom-1 ${isSelected ? 'text-white' : 'text-green-600'}`}
            />
          )}
        </button>
      );
    }

    return days;
  };

  const renderDayDetail = () => {
    if (!selectedDate) return null;

    const menu = getMenuForDate(selectedDate);
    if (!menu) return null;

    const cycleDay = getDayOfCycle(selectedDate);
    const weekNum = cycleDay < 6 ? 1 : 2;
    const dayName = WEEKDAYS[selectedDate.getDay()];
    const dateKey = selectedDate.toISOString().split('T')[0];
    const isCompleted = completedDays.has(dateKey);

    const breakfast = getRecipeById(menu.breakfast_id);
    const lunch = getRecipeById(menu.lunch_id);
    const dinner = menu.dinner_id ? getRecipeById(menu.dinner_id) : null;

    return (
      <div className="mt-4">
        {/* Day Header */}
        <div className="bg-green-700 text-white p-4 rounded-t-xl flex justify-between items-center">
          <h3 className="font-semibold">
            📅 {dayName} {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
          </h3>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            Semana {weekNum} • Día {(cycleDay % 6) + 1}
          </span>
        </div>

        {/* Reminder */}
        {menu.reminder && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
            <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
              <Star size={16} />
              RECORDATORIO
            </div>
            <p className="text-orange-800 font-semibold mt-1">{menu.reminder}</p>
          </div>
        )}

        {/* Meals */}
        {breakfast && (
          <MealCard
            type="breakfast"
            label="🍳 DESAYUNO"
            recipe={breakfast}
            expanded={expandedRecipe === breakfast.id}
            onToggle={() => setExpandedRecipe(expandedRecipe === breakfast.id ? null : breakfast.id)}
            onView={() => setSelectedRecipe(breakfast)}
            onFeedback={() => setFeedbackRecipe({ recipe: breakfast, mealType: 'breakfast' })}
            onSuggestions={() => setSuggestionsRecipe({ recipe: breakfast, mealType: 'breakfast' })}
          />
        )}

        {lunch && (
          <MealCard
            type="lunch"
            label="🍗 ALMUERZO (5 porciones)"
            recipe={lunch}
            expanded={expandedRecipe === lunch.id}
            onToggle={() => setExpandedRecipe(expandedRecipe === lunch.id ? null : lunch.id)}
            onView={() => setSelectedRecipe(lunch)}
            onFeedback={() => setFeedbackRecipe({ recipe: lunch, mealType: 'lunch' })}
            onSuggestions={() => setSuggestionsRecipe({ recipe: lunch, mealType: 'lunch' })}
          />
        )}

        {dinner ? (
          <MealCard
            type="dinner"
            label="🐟 CENA (2 porciones)"
            recipe={dinner}
            expanded={expandedRecipe === dinner.id}
            onToggle={() => setExpandedRecipe(expandedRecipe === dinner.id ? null : dinner.id)}
            onView={() => setSelectedRecipe(dinner)}
            onFeedback={() => setFeedbackRecipe({ recipe: dinner, mealType: 'dinner' })}
            onSuggestions={() => setSuggestionsRecipe({ recipe: dinner, mealType: 'dinner' })}
            isLast
          />
        ) : (
          <div className="bg-white border-l-4 border-gray-400 p-4 rounded-b-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-gray-500 text-sm">🌙 CENA</div>
                <p className="text-gray-400">No hay cena - Salen a comer</p>
              </div>
              <button
                onClick={() => setSuggestionsRecipe({
                  recipe: {
                    id: 'generate-dinner',
                    name: 'Generar cena',
                    type: 'dinner',
                    ingredients: [],
                    steps: []
                  },
                  mealType: 'dinner'
                })}
                className="bg-purple-100 text-purple-700 p-2 rounded-lg hover:bg-purple-200 flex items-center gap-2"
                title="Generar receta de cena con IA"
              >
                <Sparkles size={18} />
                <span className="text-sm font-medium">Generar</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ¿Cambio de planes? Genera una receta de cena con IA
            </p>
          </div>
        )}

        {/* Complete Day Button */}
        <button
          onClick={toggleDayComplete}
          className={`
            w-full p-4 rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 transition-colors
            ${isCompleted
              ? 'bg-green-50 text-green-700 border-2 border-green-200'
              : 'bg-green-700 text-white hover:bg-green-800'}
          `}
        >
          {isCompleted ? (
            <>
              <Check size={20} />
              Día completado
            </>
          ) : (
            <>☐ Marcar día como completado</>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Month Navigation */}
      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="bg-green-50 text-green-700 p-2 rounded-lg hover:bg-green-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-semibold text-lg">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => changeMonth(1)}
          className="bg-green-50 text-green-700 p-2 rounded-lg hover:bg-green-100"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Offline Indicator */}
      {(!isOnline || isFromCache) && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <WifiOff size={16} />
          <span>
            {!isOnline
              ? 'Sin conexión - Mostrando datos guardados'
              : 'Datos cacheados - Actualiza cuando tengas conexión'}
          </span>
        </div>
      )}

      {/* Cycle Info */}
      <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
        📅 El ciclo de 15 días comienza el <strong>Lunes 6 de Enero 2026</strong>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-7 text-center text-xs text-gray-500 font-semibold mb-2">
          <div>Lu</div>
          <div>Ma</div>
          <div>Mi</div>
          <div>Ju</div>
          <div>Vi</div>
          <div>Sá</div>
          <div>Do</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-50 border-2 border-green-700 rounded" />
          <span>Con menú</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-700 rounded" />
          <span>Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 border rounded" />
          <span>Domingo</span>
        </div>
      </div>

      {/* Day Detail */}
      {renderDayDetail()}

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {/* Feedback Modal */}
      {feedbackRecipe && selectedDate && (
        <FeedbackModal
          date={selectedDate.toISOString().split('T')[0]}
          mealType={feedbackRecipe.mealType}
          recipe={feedbackRecipe.recipe}
          onClose={() => setFeedbackRecipe(null)}
          onSaved={() => {
            // Recargar datos si es necesario
          }}
        />
      )}

      {/* Smart Suggestions Modal */}
      {suggestionsRecipe && (
        <SmartSuggestions
          recipe={suggestionsRecipe.recipe}
          allRecipes={recipes}
          mealType={suggestionsRecipe.mealType}
          onSelectAlternative={(recipe) => {
            setSelectedRecipe(recipe);
            setSuggestionsRecipe(null);
          }}
          onClose={() => setSuggestionsRecipe(null)}
        />
      )}
    </div>
  );
}

interface MealCardProps {
  type: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  recipe: Recipe;
  expanded: boolean;
  onToggle: () => void;
  onView: () => void;
  onFeedback: () => void;
  onSuggestions: () => void;
  isLast?: boolean;
}

function MealCard({ type, label, recipe, expanded, onToggle, onView, onFeedback, onSuggestions, isLast }: MealCardProps) {
  const borderColor = {
    breakfast: 'border-orange-500',
    lunch: 'border-green-700',
    dinner: 'border-blue-700'
  }[type];

  return (
    <div className={`bg-white border-l-4 ${borderColor} p-4 ${isLast ? 'rounded-b-xl' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-gray-500 text-sm">{label}</div>
          <h4 className="font-semibold text-lg">{recipe.name}</h4>
        </div>
        <button
          onClick={onSuggestions}
          className="bg-purple-100 text-purple-700 p-2 rounded-lg hover:bg-purple-200"
          title="Verificar ingredientes"
        >
          <Sparkles size={18} />
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={onToggle}
          className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-full text-sm hover:bg-gray-200"
        >
          {expanded ? 'Ocultar receta ▲' : 'Ver receta ▼'}
        </button>
        <button
          onClick={onView}
          className="bg-green-100 text-green-700 py-2 px-4 rounded-full text-sm hover:bg-green-200"
        >
          Abrir
        </button>
        <button
          onClick={onFeedback}
          className="bg-yellow-100 text-yellow-700 py-2 px-3 rounded-full text-sm hover:bg-yellow-200"
          title="Dar feedback"
        >
          <MessageSquare size={16} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <RecipeDetail recipe={recipe} />
        </div>
      )}
    </div>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const ingredients = recipe.ingredients as Ingredient[];
  const hasTotal = ingredients[0]?.total;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left">Ingrediente</th>
              {hasTotal && <th className="p-2 text-left">Total</th>}
              <th className="p-2 text-left">Luis</th>
              <th className="p-2 text-left">Mariana</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{ing.name}</td>
                {hasTotal && <td className="p-2">{ing.total || ''}</td>}
                <td className="p-2">{ing.luis}</td>
                <td className="p-2">{ing.mariana}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="mt-4 list-decimal pl-5 space-y-1 text-sm">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </>
  );
}
