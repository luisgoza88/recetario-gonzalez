"use client";

import { useEffect, useState, useCallback } from "react";
import {
  VAPID_PUBLIC_KEY,
  urlBase64ToUint8Array,
  isVapidConfigured,
} from "@/lib/push/vapid";
import { supabase } from "@/lib/supabase/client";

interface UseNotificationsReturn {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: (householdId?: string) => Promise<{ ok: boolean; error?: string }>;
  unsubscribe: () => Promise<void>;
}

/**
 * Hook para gestionar Web Push Notifications
 *
 * Funcionalidad:
 * - Verificar soporte de navegador (Notification, serviceWorker, PushManager)
 * - Solicitar permiso de notificaciones
 * - Suscribirse al servicio push (guardar en Supabase)
 * - Desuscribirse
 *
 * Uso:
 * const { supported, permission, subscribe, requestPermission } = useNotifications();
 *
 * if (permission === "default") {
 *   <button onClick={() => requestPermission().then(() => subscribe())}>
 *     Activar notificaciones
 *   </button>
 * }
 */
export function useNotifications(): UseNotificationsReturn {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar: verificar soporte y permisos
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSupported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      isVapidConfigured();

    setSupported(isSupported);

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Verificar si ya está suscrito
    if (isSupported) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {
          // Silent fail
        });
    }
  }, []);

  /**
   * Solicitar permiso de notificaciones
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (err) {
      setError(`Error requesting permission: ${String(err)}`);
      return false;
    }
  }, [supported]);

  /**
   * Suscribirse al servicio push
   * Guarda la suscripción en Supabase
   */
  const subscribe = useCallback(
    async (householdId?: string) => {
      setLoading(true);
      setError(null);

      try {
        if (!supported) {
          throw new Error("Push notifications not supported in this browser");
        }

        if (permission !== "granted") {
          throw new Error("Permission not granted");
        }

        if (!VAPID_PUBLIC_KEY) {
          throw new Error("VAPID public key not configured");
        }

        // Obtener service worker registration
        const reg = await navigator.serviceWorker.ready;

        // Obtener suscripción existente o crear nueva
        let subscription = await reg.pushManager.getSubscription();

        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
              .buffer as ArrayBuffer,
          });
        }

        // Serializar suscripción
        const subJson = subscription.toJSON();

        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          throw new Error("Invalid push subscription data");
        }

        // Obtener usuario autenticado
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Guardar en base de datos
        const { error: dbError } = await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_id: user.id,
              endpoint: subJson.endpoint,
              p256dh_key: subJson.keys.p256dh,
              auth_key: subJson.keys.auth,
              user_agent: navigator.userAgent,
            },
            { onConflict: "user_id,endpoint" },
          );

        if (dbError) {
          throw dbError;
        }

        setSubscribed(true);
        return { ok: true };
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        return { ok: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [supported, permission],
  );

  /**
   * Desuscribirse del servicio push
   */
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supported) return;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe del push service
        await subscription.unsubscribe();

        // Eliminar de base de datos
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint);
        }
      }

      setSubscribed(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
