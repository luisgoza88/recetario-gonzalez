import { supabase } from './supabase/client';

// Tipos para notificaciones
export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: Date;
  type: 'meal_reminder' | 'low_stock' | 'prep_reminder';
}

// Verificar si las notificaciones están soportadas y permitidas
export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Mostrar notificación local
export function showNotification(title: string, body: string, options?: NotificationOptions) {
  if (!canNotify()) return;

  const notificationOptions: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'recetario',
    ...options,
  };

  // Vibrate y renotify son propiedades extendidas (móvil)
  if ('vibrate' in Notification.prototype) {
    (notificationOptions as Record<string, unknown>).vibrate = [200, 100, 200];
  }
  (notificationOptions as Record<string, unknown>).renotify = true;

  const notification = new Notification(title, notificationOptions);

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
}

// Verificar stock bajo y notificar
export async function checkLowStockAndNotify() {
  if (!canNotify()) return;

  try {
    // Obtener items con bajo stock
    const { data: items } = await supabase
      .from('market_items')
      .select('id, name, quantity');

    const { data: inventory } = await supabase
      .from('inventory')
      .select('item_id, current_number');

    if (!items || !inventory) return;

    const inventoryMap = new Map(
      inventory.map(i => [i.item_id, i.current_number || 0])
    );

    const lowStockItems: string[] = [];

    for (const item of items) {
      const currentNum = inventoryMap.get(item.id) || 0;
      const requiredMatch = item.quantity.match(/[\d.]+/);
      const required = requiredMatch ? parseFloat(requiredMatch[0]) : 0;

      if (required > 0 && currentNum < required * 0.2) {
        lowStockItems.push(item.name);
      }
    }

    if (lowStockItems.length > 0) {
      const itemList = lowStockItems.slice(0, 3).join(', ');
      const more = lowStockItems.length > 3 ? ` y ${lowStockItems.length - 3} más` : '';

      showNotification(
        'Stock bajo',
        `Productos con poco stock: ${itemList}${more}`,
        { tag: 'low-stock' }
      );
    }
  } catch (error) {
    console.error('Error checking low stock:', error);
  }
}

// Verificar menú de mañana y notificar para preparación
export async function checkTomorrowMealAndNotify() {
  if (!canNotify()) return;

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calcular día del ciclo para mañana
    const CYCLE_START = new Date(2026, 0, 6);
    const diffTime = tomorrow.getTime() - CYCLE_START.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || tomorrow.getDay() === 0) return;

    // Contar días laborales
    let workingDays = 0;
    const tempDate = new Date(CYCLE_START);
    while (tempDate <= tomorrow) {
      if (tempDate.getDay() !== 0) workingDays++;
      tempDate.setDate(tempDate.getDate() + 1);
    }
    const cycleDay = (workingDays - 1) % 12;

    // Obtener menú de mañana
    const { data: menu } = await supabase
      .from('day_menu')
      .select('lunch_id, reminder')
      .eq('day_number', cycleDay)
      .single();

    if (!menu) return;

    // Obtener nombre de la receta
    const { data: recipe } = await supabase
      .from('recipes')
      .select('name')
      .eq('id', menu.lunch_id)
      .single();

    if (recipe) {
      let body = `Mañana toca: ${recipe.name}`;
      if (menu.reminder) {
        body += `. Recordatorio: ${menu.reminder}`;
      }

      showNotification(
        'Prepara para mañana',
        body,
        { tag: 'meal-prep' }
      );
    }
  } catch (error) {
    console.error('Error checking tomorrow meal:', error);
  }
}

// Inicializar verificaciones periódicas
export function initNotificationChecks() {
  if (!canNotify()) return;

  // Verificar stock bajo cada 4 horas
  setInterval(() => {
    checkLowStockAndNotify();
  }, 4 * 60 * 60 * 1000);

  // Verificar a las 7pm para preparar comida de mañana
  const checkMealPrepTime = () => {
    const now = new Date();
    const targetHour = 19; // 7pm

    if (now.getHours() === targetHour && now.getMinutes() < 5) {
      checkTomorrowMealAndNotify();
    }
  };

  // Verificar cada minuto si es hora de la notificación
  setInterval(checkMealPrepTime, 60 * 1000);

  // También verificar al iniciar
  setTimeout(() => {
    checkLowStockAndNotify();
  }, 5000);

  console.log('Notification checks initialized');
}

// Programar notificación local (para timers, etc.)
export function scheduleNotification(title: string, body: string, delayMs: number) {
  if (!canNotify()) return;

  return setTimeout(() => {
    showNotification(title, body);
  }, delayMs);
}
