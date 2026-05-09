/**
 * notifications.ts — Primitivas de Web Notifications API.
 *
 * Este modulo expone SOLO las primitivas de bajo nivel:
 *   - canNotify()
 *   - showNotification()
 *   - scheduleNotification()
 *   - requestNotificationPermission()
 *
 * La logica de CUANDO notificar (stock bajo, menus, tareas) vive en:
 *   src/lib/hooks/useProactiveAlerts.ts
 *
 * Las funciones initNotificationChecks / stopNotificationChecks /
 * checkLowStockAndNotify / checkTomorrowMealAndNotify fueron eliminadas
 * para resolver el memory leak del setInterval y la triplicacion de alertas.
 */

// Verificar si las notificaciones estan soportadas y permitidas
export function canNotify(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

// Mostrar notificacion local
export function showNotification(
  title: string,
  body: string,
  options?: NotificationOptions,
) {
  if (!canNotify()) return;

  const notificationOptions: NotificationOptions & {
    vibrate?: number[];
    renotify?: boolean;
  } = {
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "recetario",
    ...options,
  };

  if ("vibrate" in Notification.prototype) {
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

// Solicitar permiso de notificaciones al usuario
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Programar notificacion local con delay (para timers, etc.)
export function scheduleNotification(
  title: string,
  body: string,
  delayMs: number,
) {
  if (!canNotify()) return;

  return setTimeout(() => {
    showNotification(title, body);
  }, delayMs);
}
