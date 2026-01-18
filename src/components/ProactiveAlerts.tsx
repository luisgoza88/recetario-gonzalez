'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle, ShoppingCart, Calendar, Lightbulb,
  ChevronRight, X, Clock, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Recipe, MarketItem } from '@/types';
import { loadCurrentInventory, checkRecipeIngredients } from '@/lib/inventory-check';

interface Alert {
  id: string;
  type: 'missing_ingredients' | 'low_inventory' | 'suggestion' | 'reminder';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  data?: Record<string, unknown>;
}

interface ProactiveAlertsProps {
  onNavigateToMarket: () => void;
  onNavigateToSuggestions: () => void;
  compact?: boolean;
}

export default function ProactiveAlerts({
  onNavigateToMarket,
  onNavigateToSuggestions,
  compact = false
}: ProactiveAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateAlerts();
  }, []);

  const generateAlerts = async () => {
    try {
      setLoading(true);
      const newAlerts: Alert[] = [];

      // 1. Verificar ingredientes para mañana
      const tomorrowAlerts = await checkTomorrowIngredients();
      newAlerts.push(...tomorrowAlerts);

      // 2. Verificar inventario bajo
      const inventoryAlerts = await checkLowInventory();
      newAlerts.push(...inventoryAlerts);

      // 3. Verificar sugerencias pendientes
      const suggestionAlerts = await checkPendingSuggestions();
      newAlerts.push(...suggestionAlerts);

      // Ordenar por prioridad
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error generating alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTomorrowIngredients = async (): Promise<Alert[]> => {
    const alerts: Alert[] = [];

    try {
      // Calcular día de mañana en el ciclo
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Si mañana es domingo, no hay menú
      if (tomorrow.getDay() === 0) {
        return alerts;
      }

      const startDate = new Date('2025-01-06');
      const diffDays = Math.floor((tomorrow.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      let sundays = 0;
      const tempDate = new Date(startDate);
      while (tempDate <= tomorrow) {
        if (tempDate.getDay() === 0) sundays++;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const effectiveDays = diffDays - sundays;
      const dayNumber = ((effectiveDays % 12) + 12) % 12;

      // Cargar menú de mañana
      const { data: menuData } = await supabase
        .from('day_menu')
        .select(`
          *,
          breakfast:recipes!day_menu_breakfast_id_fkey(*),
          lunch:recipes!day_menu_lunch_id_fkey(*),
          dinner:recipes!day_menu_dinner_id_fkey(*)
        `)
        .eq('day_number', dayNumber)
        .single();

      if (!menuData) return alerts;

      // Usar el sistema robusto de inventory-check
      const inventory = await loadCurrentInventory();
      const recipes = [menuData.breakfast, menuData.lunch, menuData.dinner].filter(Boolean) as Recipe[];

      // Verificar cada receta con el sistema de matching robusto
      const allMissing: string[] = [];

      for (const recipe of recipes) {
        const availability = await checkRecipeIngredients(recipe, inventory);

        // Agregar ingredientes faltantes (sin duplicados)
        availability.missingIngredients.forEach(ing => {
          if (!allMissing.includes(ing.name)) {
            allMissing.push(ing.name);
          }
        });
      }

      if (allMissing.length > 0) {
        alerts.push({
          id: 'tomorrow-ingredients',
          type: 'missing_ingredients',
          priority: allMissing.length > 3 ? 'high' : 'medium',
          title: `${allMissing.length} ingrediente${allMissing.length > 1 ? 's' : ''} para mañana`,
          message: `Faltan: ${allMissing.slice(0, 3).join(', ')}${allMissing.length > 3 ? ` y ${allMissing.length - 3} más` : ''}`,
          action: {
            label: 'Ver lista',
            onClick: onNavigateToMarket
          },
          data: { missing: allMissing }
        });
      }
    } catch (error) {
      console.error('Error checking tomorrow ingredients:', error);
    }

    return alerts;
  };

  const checkLowInventory = async (): Promise<Alert[]> => {
    const alerts: Alert[] = [];

    try {
      // Buscar items con inventario bajo o cero que estén marcados como frecuentes
      const { data: lowItems } = await supabase
        .from('market_items')
        .select(`
          id, name, category,
          inventory!left(current_number)
        `)
        .in('category', ['Proteínas Premium', 'Lácteos', 'Vegetales']);

      const itemsNeeded = (lowItems || []).filter(item => {
        const qty = item.inventory?.[0]?.current_number || 0;
        return qty === 0;
      });

      if (itemsNeeded.length > 0) {
        const essentialItems = itemsNeeded.slice(0, 5);
        alerts.push({
          id: 'low-inventory',
          type: 'low_inventory',
          priority: itemsNeeded.length > 5 ? 'high' : 'medium',
          title: 'Despensa con faltantes',
          message: `${essentialItems.map(i => i.name).join(', ')}${itemsNeeded.length > 5 ? ` y ${itemsNeeded.length - 5} más` : ''}`,
          action: {
            label: 'Ir al mercado',
            onClick: onNavigateToMarket
          },
          data: { items: itemsNeeded }
        });
      }
    } catch (error) {
      console.error('Error checking inventory:', error);
    }

    return alerts;
  };

  const checkPendingSuggestions = async (): Promise<Alert[]> => {
    const alerts: Alert[] = [];

    try {
      const { count } = await supabase
        .from('adjustment_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (count && count > 0) {
        alerts.push({
          id: 'pending-suggestions',
          type: 'suggestion',
          priority: 'low',
          title: `${count} sugerencia${count > 1 ? 's' : ''} de ajuste`,
          message: 'La IA tiene recomendaciones para mejorar tus porciones',
          action: {
            label: 'Ver sugerencias',
            onClick: onNavigateToSuggestions
          }
        });
      }
    } catch (error) {
      console.error('Error checking suggestions:', error);
    }

    return alerts;
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return null;
  }

  const getPriorityStyles = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-800'
        };
      case 'medium':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: 'text-orange-500',
          text: 'text-orange-800'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-800'
        };
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'missing_ingredients':
        return <ShoppingCart size={18} />;
      case 'low_inventory':
        return <AlertTriangle size={18} />;
      case 'suggestion':
        return <Lightbulb size={18} />;
      case 'reminder':
        return <Clock size={18} />;
      default:
        return <Sparkles size={18} />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {visibleAlerts.slice(0, 2).map(alert => {
          const styles = getPriorityStyles(alert.priority);
          return (
            <button
              key={alert.id}
              onClick={alert.action?.onClick}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${styles.bg} ${styles.border} border text-left hover:opacity-90 transition-opacity`}
            >
              <span className={styles.icon}>{getAlertIcon(alert.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${styles.text} truncate`}>{alert.title}</p>
              </div>
              <ChevronRight size={16} className={styles.icon} />
            </button>
          );
        })}
        {visibleAlerts.length > 2 && (
          <p className="text-xs text-gray-500 text-center">
            +{visibleAlerts.length - 2} alerta{visibleAlerts.length - 2 > 1 ? 's' : ''} más
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles size={16} className="text-purple-500" />
        <h3 className="text-sm font-medium text-gray-600">IA Proactiva</h3>
      </div>

      <div className="space-y-2">
        {visibleAlerts.map(alert => {
          const styles = getPriorityStyles(alert.priority);
          return (
            <div
              key={alert.id}
              className={`relative flex items-start gap-3 p-4 rounded-xl ${styles.bg} ${styles.border} border`}
            >
              <button
                onClick={() => dismissAlert(alert.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/50 text-gray-400"
              >
                <X size={14} />
              </button>

              <span className={`mt-0.5 ${styles.icon}`}>
                {getAlertIcon(alert.type)}
              </span>

              <div className="flex-1 min-w-0 pr-6">
                <p className={`font-medium ${styles.text}`}>{alert.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>

                {alert.action && (
                  <button
                    onClick={alert.action.onClick}
                    className={`mt-2 text-sm font-medium ${styles.text} flex items-center gap-1 hover:underline`}
                  >
                    {alert.action.label}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
