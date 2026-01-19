/**
 * AI-Powered Proactive Notifications
 * Generates intelligent alerts based on home context
 */

import { supabase } from './supabase/client';
import { showNotification, canNotify } from './notifications';

// Notification types
export interface ProactiveAlert {
  id: string;
  type: 'meal_reminder' | 'inventory_alert' | 'task_reminder' | 'prep_tip' | 'weekly_summary';
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  actionable?: {
    action: string;
    label: string;
  };
  timestamp: Date;
  dismissed?: boolean;
}

// Storage key for alerts
const ALERTS_KEY = 'ai_proactive_alerts';
const LAST_CHECK_KEY = 'ai_last_notification_check';

// Get stored alerts
export function getStoredAlerts(): ProactiveAlert[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ALERTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Store alerts
function storeAlerts(alerts: ProactiveAlert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

// Add new alert
export function addAlert(alert: Omit<ProactiveAlert, 'id' | 'timestamp'>): ProactiveAlert {
  const newAlert: ProactiveAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  const alerts = getStoredAlerts();
  // Keep only last 20 alerts
  const updated = [newAlert, ...alerts].slice(0, 20);
  storeAlerts(updated);

  return newAlert;
}

// Dismiss alert
export function dismissAlert(alertId: string): void {
  const alerts = getStoredAlerts();
  const updated = alerts.map(a =>
    a.id === alertId ? { ...a, dismissed: true } : a
  );
  storeAlerts(updated);
}

// Clear all alerts
export function clearAllAlerts(): void {
  storeAlerts([]);
}

// Get undismissed alerts
export function getActiveAlerts(): ProactiveAlert[] {
  return getStoredAlerts().filter(a => !a.dismissed);
}

// Check if enough time has passed since last check
function shouldCheckAlerts(): boolean {
  if (typeof window === 'undefined') return false;

  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  if (!lastCheck) return true;

  const lastCheckTime = new Date(lastCheck).getTime();
  const now = Date.now();
  const hoursSinceLastCheck = (now - lastCheckTime) / (1000 * 60 * 60);

  // Check at most once per hour
  return hoursSinceLastCheck >= 1;
}

function updateLastCheckTime(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
}

/**
 * Generate proactive alerts based on current context
 */
export async function generateProactiveAlerts(): Promise<ProactiveAlert[]> {
  if (!shouldCheckAlerts()) return getActiveAlerts();

  const alerts: ProactiveAlert[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  try {
    // 1. Check morning tasks (7-9am)
    if (currentHour >= 7 && currentHour < 9) {
      const taskAlerts = await checkMorningTasks();
      alerts.push(...taskAlerts);
    }

    // 2. Check lunch preparation (10-11am)
    if (currentHour >= 10 && currentHour < 12) {
      const lunchAlert = await checkLunchPreparation();
      if (lunchAlert) alerts.push(lunchAlert);
    }

    // 3. Check dinner preparation (4-5pm)
    if (currentHour >= 16 && currentHour < 18) {
      const dinnerAlert = await checkDinnerPreparation();
      if (dinnerAlert) alerts.push(dinnerAlert);
    }

    // 4. Check critical inventory (anytime)
    const inventoryAlerts = await checkCriticalInventory();
    alerts.push(...inventoryAlerts);

    // 5. Evening summary (7-8pm)
    if (currentHour >= 19 && currentHour < 20) {
      const summaryAlert = await generateEveningSummary();
      if (summaryAlert) alerts.push(summaryAlert);
    }

    // Store new alerts
    for (const alert of alerts) {
      const stored = addAlert({
        type: alert.type,
        title: alert.title,
        body: alert.body,
        priority: alert.priority,
        actionable: alert.actionable,
      });

      // Show push notification for high priority
      if (alert.priority === 'high' && canNotify()) {
        showNotification(alert.title, alert.body, { tag: alert.type });
      }
    }

    updateLastCheckTime();
    return getActiveAlerts();

  } catch (error) {
    console.error('Error generating proactive alerts:', error);
    return getActiveAlerts();
  }
}

/**
 * Check morning tasks
 */
async function checkMorningTasks(): Promise<ProactiveAlert[]> {
  const alerts: ProactiveAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('daily_task_instances')
    .select('task_name, time_start, employee:home_employees(name)')
    .eq('date', today)
    .eq('status', 'pending')
    .order('time_start')
    .limit(5);

  if (tasks && tasks.length > 0) {
    const taskList = tasks.slice(0, 3).map(t => t.task_name).join(', ');
    alerts.push({
      id: '',
      type: 'task_reminder',
      title: 'Tareas del día',
      body: `Hay ${tasks.length} tareas pendientes: ${taskList}${tasks.length > 3 ? '...' : ''}`,
      priority: 'medium',
      timestamp: new Date(),
      actionable: {
        action: 'view_tasks',
        label: 'Ver tareas'
      }
    });
  }

  return alerts;
}

/**
 * Check lunch preparation needs
 */
async function checkLunchPreparation(): Promise<ProactiveAlert | null> {
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) return null; // Skip Sunday

  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;

  const { data: menu } = await supabase
    .from('day_menu')
    .select(`
      lunch:recipes!day_menu_lunch_id_fkey(name, prep_time, ingredients)
    `)
    .eq('day_number', cycleDay)
    .single();

  if (!menu?.lunch) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lunch = menu.lunch as any;
  const prepTime = lunch.prep_time || 30;

  // Check if any ingredients need defrosting
  const ingredients = Array.isArray(lunch.ingredients) ? lunch.ingredients : [];
  const needsDefrost = ingredients.some((ing: unknown) => {
    const ingStr = typeof ing === 'string' ? ing : (ing as { name?: string })?.name || '';
    return /pollo|carne|pescado|cerdo|res|camarón/i.test(ingStr);
  });

  let body = `Almuerzo: ${lunch.name} (${prepTime} min)`;
  if (needsDefrost) {
    body += '\n¡Recuerda descongelar la proteína!';
  }

  return {
    id: '',
    type: 'prep_tip',
    title: 'Preparación del almuerzo',
    body,
    priority: needsDefrost ? 'high' : 'medium',
    timestamp: new Date(),
    actionable: {
      action: `view_recipe:${lunch.name}`,
      label: 'Ver receta'
    }
  };
}

/**
 * Check dinner preparation needs (skip Friday/Saturday)
 */
async function checkDinnerPreparation(): Promise<ProactiveAlert | null> {
  const dayOfWeek = new Date().getDay();
  // Skip Sunday, Friday, Saturday
  if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) return null;

  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;

  const { data: menu } = await supabase
    .from('day_menu')
    .select(`
      dinner:recipes!day_menu_dinner_id_fkey(name, prep_time)
    `)
    .eq('day_number', cycleDay)
    .single();

  if (!menu?.dinner) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dinner = menu.dinner as any;

  return {
    id: '',
    type: 'meal_reminder',
    title: 'Preparar la cena',
    body: `Cena de hoy: ${dinner.name} (${dinner.prep_time || 30} min)`,
    priority: 'medium',
    timestamp: new Date(),
    actionable: {
      action: `view_recipe:${dinner.name}`,
      label: 'Ver receta'
    }
  };
}

/**
 * Check critical inventory items
 */
async function checkCriticalInventory(): Promise<ProactiveAlert[]> {
  const alerts: ProactiveAlert[] = [];

  const { data } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name, category)')
    .eq('current_number', 0)
    .limit(10);

  if (data && data.length > 0) {
    const criticalItems = data.map(i => i.market_item?.name).filter(Boolean);

    if (criticalItems.length >= 3) {
      alerts.push({
        id: '',
        type: 'inventory_alert',
        title: '¡Inventario crítico!',
        body: `${criticalItems.length} items agotados: ${criticalItems.slice(0, 3).join(', ')}${criticalItems.length > 3 ? '...' : ''}`,
        priority: 'high',
        timestamp: new Date(),
        actionable: {
          action: 'view_inventory',
          label: 'Ver inventario'
        }
      });
    }
  }

  return alerts;
}

/**
 * Generate evening summary
 */
async function generateEveningSummary(): Promise<ProactiveAlert | null> {
  const today = new Date().toISOString().split('T')[0];

  // Get today's task completion
  const { data: tasks } = await supabase
    .from('daily_task_instances')
    .select('status')
    .eq('date', today);

  if (!tasks || tasks.length === 0) return null;

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const percent = Math.round((completed / total) * 100);

  // Get tomorrow's menu preview
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDay();

  if (tomorrowDay === 0) {
    // Sunday - no menu
    return {
      id: '',
      type: 'weekly_summary',
      title: 'Resumen del día',
      body: `Tareas: ${completed}/${total} completadas (${percent}%)\nMañana es domingo - sin menú programado`,
      priority: 'low',
      timestamp: new Date()
    };
  }

  const cycleDay = ((tomorrowDay === 0 ? 7 : tomorrowDay) - 1) % 12 + 1;

  const { data: menu } = await supabase
    .from('day_menu')
    .select(`
      lunch:recipes!day_menu_lunch_id_fkey(name)
    `)
    .eq('day_number', cycleDay)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lunchName = (menu?.lunch as any)?.name || 'Sin programar';

  return {
    id: '',
    type: 'weekly_summary',
    title: 'Resumen del día',
    body: `Tareas: ${completed}/${total} (${percent}%)\nMañana: ${lunchName}`,
    priority: 'low',
    timestamp: new Date()
  };
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Initialize proactive notification system
 */
export function initProactiveNotifications(): void {
  if (typeof window === 'undefined') return;

  // Check for alerts on load
  setTimeout(() => {
    generateProactiveAlerts();
  }, 3000);

  // Check periodically (every 30 minutes)
  setInterval(() => {
    generateProactiveAlerts();
  }, 30 * 60 * 1000);

  console.log('Proactive notifications initialized');
}
