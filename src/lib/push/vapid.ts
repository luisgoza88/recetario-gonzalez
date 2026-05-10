/**
 * VAPID Key management para Web Push Notifications
 *
 * VAPID (Voluntary Application Server Identification) es un mecanismo para
 * identificar tu servidor al servicio push. Las keys son:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY: usada en cliente para suscribirse
 * - VAPID_PRIVATE_KEY: usada en servidor para firmar mensajes push
 *
 * Para generar keys (una sola vez):
 * npx web-push generate-vapid-keys
 *
 * Luego pegar en .env.local y .env.production
 */

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Convierte base64url a Uint8Array
 * Necesario para pasar a PushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Verifica si VAPID public key está configurada
 */
export function isVapidConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}
