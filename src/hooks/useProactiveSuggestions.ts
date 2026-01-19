'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Recipe, MarketItem } from '@/types';

// Tipos de sugerencias proactivas
export type ProactiveSuggestionType =
  | 'menu_today'
  | 'menu_tomorrow'
  | 'low_stock'
  | 'high_stock'
  | 'missing_ingredient'
  | 'weekly_prep'
  | 'recipe_discovery'
  | 'no_feedback';

export type ProactiveSuggestionPriority = 'high' | 'medium' | 'low';

export interface ProactiveSuggestion {
  id: string;
  type: ProactiveSuggestionType;
  priority: ProactiveSuggestionPriority;
  title: string;
  description: string;
  icon: string;
  color: string;
  action?: {
    label: string;
    type: 'navigate' | 'dismiss' | 'generate_recipe' | 'add_to_cart';
    payload?: unknown;
  };
  metadata?: Record<string, unknown>;
}

interface DayMenuData {
  day_number: number;
  breakfast_id: string;
  lunch_id: string;
  dinner_id: string | null;
}

const CYCLE_START = new Date(2026, 0, 6); // Lunes 6 de Enero 2026

// Calcular día del ciclo (0-11) excluyendo domingos
function getDayOfCycle(date: Date): number {
  if (date.getDay() === 0) return -1; // Domingo

  const diffTime = date.getTime() - CYCLE_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return -2;

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
}

export function useProactiveSuggestions() {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const newSuggestions: ProactiveSuggestion[] = [];

      // Cargar datos necesarios en paralelo
      const [
        { data: menuData },
        { data: recipesData },
        { data: inventoryData },
        { data: marketItemsData },
        { data: feedbackData }
      ] = await Promise.all([
        supabase.from('day_menu').select('*'),
        supabase.from('recipes').select('*'),
        supabase.from('inventory').select('*, market_items(name, quantity)'),
        supabase.from('market_items').select('*'),
        supabase.from('meal_feedback').select('created_at').order('created_at', { ascending: false }).limit(1)
      ]);

      const menus = (menuData || []) as DayMenuData[];
      const recipes = (recipesData || []) as Recipe[];
      const recipesMap = new Map(recipes.map(r => [r.id, r]));

      // 1. ALERTAS DEL MENÚ DE HOY
      const today = new Date();
      const todayCycleDay = getDayOfCycle(today);
      const todayMenu = menus.find(m => m.day_number === todayCycleDay);

      if (todayMenu) {
        const breakfast = recipesMap.get(todayMenu.breakfast_id);
        const lunch = recipesMap.get(todayMenu.lunch_id);
        const dinner = todayMenu.dinner_id ? recipesMap.get(todayMenu.dinner_id) : null;

        const dayOfWeek = today.getDay();
        const isWeekendNoDinner = (dayOfWeek === 5 || dayOfWeek === 6) && !dinner;

        newSuggestions.push({
          id: 'menu-today',
          type: 'menu_today',
          priority: 'high',
          title: '📅 Menú de hoy',
          description: `🌅 ${breakfast?.name || 'Sin desayuno'}\n🍽️ ${lunch?.name || 'Sin almuerzo'}${isWeekendNoDinner ? '\n🌙 Salida familiar (sin cena)' : dinner ? `\n🌙 ${dinner.name}` : ''}`,
          icon: '📅',
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          action: {
            label: 'Ver calendario',
            type: 'navigate',
            payload: { tab: 'calendar' }
          },
          metadata: { breakfast, lunch, dinner }
        });
      } else if (today.getDay() === 0) {
        newSuggestions.push({
          id: 'menu-today-sunday',
          type: 'menu_today',
          priority: 'low',
          title: '🌴 Domingo libre',
          description: 'Hoy no hay menú programado. ¡Disfruta el día!',
          icon: '🌴',
          color: 'bg-green-50 border-green-200 text-green-800'
        });
      }

      // 2. ALERTAS DEL MENÚ DE MAÑANA (preparación)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowCycleDay = getDayOfCycle(tomorrow);
      const tomorrowMenu = menus.find(m => m.day_number === tomorrowCycleDay);

      if (tomorrowMenu && tomorrowCycleDay >= 0) {
        const tomorrowRecipes = [
          recipesMap.get(tomorrowMenu.breakfast_id),
          recipesMap.get(tomorrowMenu.lunch_id),
          tomorrowMenu.dinner_id ? recipesMap.get(tomorrowMenu.dinner_id) : null
        ].filter(Boolean) as Recipe[];

        // Verificar ingredientes necesarios para mañana
        const neededIngredients = new Set<string>();
        tomorrowRecipes.forEach(recipe => {
          recipe.ingredients?.forEach(ing => {
            neededIngredients.add(ing.name.toLowerCase());
          });
        });

        // Verificar contra inventario
        const inventoryMap = new Map<string, number>();
        inventoryData?.forEach((inv: { market_items: { name: string } | null; current_number: number }) => {
          if (inv.market_items?.name) {
            inventoryMap.set(inv.market_items.name.toLowerCase(), inv.current_number || 0);
          }
        });

        const missingForTomorrow: string[] = [];
        neededIngredients.forEach(ing => {
          const available = inventoryMap.get(ing) || 0;
          if (available === 0) {
            missingForTomorrow.push(ing);
          }
        });

        if (missingForTomorrow.length > 0 && missingForTomorrow.length <= 5) {
          newSuggestions.push({
            id: 'prep-tomorrow',
            type: 'menu_tomorrow',
            priority: 'high',
            title: '⚠️ Preparación para mañana',
            description: `Te podría faltar: ${missingForTomorrow.slice(0, 3).join(', ')}${missingForTomorrow.length > 3 ? ` (+${missingForTomorrow.length - 3} más)` : ''}`,
            icon: '⚠️',
            color: 'bg-orange-50 border-orange-200 text-orange-800',
            action: {
              label: 'Ver despensa',
              type: 'navigate',
              payload: { tab: 'market', mode: 'pantry' }
            },
            metadata: { missing: missingForTomorrow }
          });
        }
      }

      // 3. ALERTAS DE INVENTARIO BAJO
      const lowStockItems: { name: string; current: number; needed: number }[] = [];
      const highStockItems: { name: string; current: number; needed: number }[] = [];

      marketItemsData?.forEach((item: MarketItem) => {
        const inventory = inventoryData?.find((inv: { item_id: string }) => inv.item_id === item.id);
        const current = inventory?.current_number || 0;
        const needed = parseFloat(item.quantity.match(/[\d.]+/)?.[0] || '0');

        if (needed > 0) {
          const percentage = (current / needed) * 100;

          if (percentage <= 20 && current < needed) {
            lowStockItems.push({ name: item.name, current, needed });
          } else if (percentage >= 150) {
            highStockItems.push({ name: item.name, current, needed });
          }
        }
      });

      if (lowStockItems.length > 0) {
        const topLow = lowStockItems.slice(0, 5);
        newSuggestions.push({
          id: 'low-stock',
          type: 'low_stock',
          priority: 'medium',
          title: `📦 Stock bajo (${lowStockItems.length} items)`,
          description: topLow.map(i => `${i.name}: ${i.current}/${i.needed}`).join('\n'),
          icon: '📦',
          color: 'bg-red-50 border-red-200 text-red-800',
          action: {
            label: 'Ver despensa',
            type: 'navigate',
            payload: { tab: 'market', mode: 'pantry' }
          },
          metadata: { items: lowStockItems }
        });
      }

      if (highStockItems.length > 0) {
        const topHigh = highStockItems.slice(0, 3);
        newSuggestions.push({
          id: 'high-stock',
          type: 'high_stock',
          priority: 'low',
          title: `✨ Aprovecha tu inventario`,
          description: `Tienes mucho: ${topHigh.map(i => i.name).join(', ')}. ¡Úsalos en una receta!`,
          icon: '✨',
          color: 'bg-purple-50 border-purple-200 text-purple-800',
          action: {
            label: 'Generar receta',
            type: 'generate_recipe',
            payload: { ingredients: highStockItems.map(i => i.name) }
          },
          metadata: { items: highStockItems }
        });
      }

      // 4. ALERTA DE FEEDBACK
      const lastFeedback = feedbackData?.[0];
      if (lastFeedback) {
        const lastFeedbackDate = new Date(lastFeedback.created_at);
        const daysSinceLastFeedback = Math.floor((today.getTime() - lastFeedbackDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastFeedback >= 7) {
          newSuggestions.push({
            id: 'no-feedback',
            type: 'no_feedback',
            priority: 'low',
            title: '💬 ¿Cómo van las porciones?',
            description: `Llevas ${daysSinceLastFeedback} días sin dar feedback. Tu opinión ayuda a ajustar las recetas.`,
            icon: '💬',
            color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            action: {
              label: 'Ver calendario',
              type: 'navigate',
              payload: { tab: 'calendar' }
            }
          });
        }
      } else {
        // Nunca ha dado feedback
        newSuggestions.push({
          id: 'first-feedback',
          type: 'no_feedback',
          priority: 'medium',
          title: '💬 ¡Tu feedback es importante!',
          description: 'Después de cada comida, indica si la porción fue correcta. Esto ayuda a ajustar las recetas.',
          icon: '💬',
          color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          action: {
            label: 'Ver calendario',
            type: 'navigate',
            payload: { tab: 'calendar' }
          }
        });
      }

      // 5. SUGERENCIA DE RECETAS DISPONIBLES (basado en inventario)
      const availableRecipes: Recipe[] = [];
      recipes.forEach(recipe => {
        if (!recipe.ingredients) return;

        let availableCount = 0;
        recipe.ingredients.forEach(ing => {
          const ingName = ing.name.toLowerCase();
          let found = false;
          inventoryData?.forEach((inv: { market_items: { name: string } | null; current_number: number }) => {
            if (inv.market_items?.name?.toLowerCase().includes(ingName) || ingName.includes(inv.market_items?.name?.toLowerCase() || '')) {
              if (inv.current_number > 0) found = true;
            }
          });
          if (found) availableCount++;
        });

        const percentage = recipe.ingredients.length > 0
          ? (availableCount / recipe.ingredients.length) * 100
          : 0;

        if (percentage >= 80) {
          availableRecipes.push(recipe);
        }
      });

      if (availableRecipes.length > 0) {
        const randomRecipes = availableRecipes
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        newSuggestions.push({
          id: 'recipe-discovery',
          type: 'recipe_discovery',
          priority: 'low',
          title: '🍳 Recetas que puedes hacer ahora',
          description: randomRecipes.map(r => r.name).join(', '),
          icon: '🍳',
          color: 'bg-green-50 border-green-200 text-green-800',
          action: {
            label: 'Ver recetas',
            type: 'navigate',
            payload: { tab: 'recipes' }
          },
          metadata: { recipes: randomRecipes }
        });
      }

      // Ordenar por prioridad
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setSuggestions(newSuggestions);
    } catch (err) {
      console.error('Error generating proactive suggestions:', err);
      setError('Error al generar sugerencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const refresh = () => {
    generateSuggestions();
  };

  return {
    suggestions,
    loading,
    error,
    dismissSuggestion,
    refresh
  };
}
