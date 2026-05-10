"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

interface EnableNotificationsBannerProps {
  /**
   * Callback cuando el usuario acepta/rechaza
   */
  onDismiss?: () => void;
}

/**
 * Banner para solicitar permisos de notificaciones
 *
 * Aparece cuando:
 * - Usuario tiene permiso "default" (no ha respondido)
 * - Ha pasado suficiente tiempo en la app (lazy-loaded)
 *
 * Características:
 * - Se puede cerrar con X (no vuelve a preguntar en 7 días)
 * - Botón "Activar" para solicitar permiso e inmediatamente suscribirse
 * - Muestra estado de carga mientras se suscribe
 */
export function EnableNotificationsBanner({
  onDismiss,
}: EnableNotificationsBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { supported, permission, loading, requestPermission, subscribe } =
    useNotifications();

  // Mostrar banner si:
  // 1. Está soportado en el navegador
  // 2. Usuario no ha respondido aún (permission === "default")
  // 3. Usuario no lo ha rechazado en este ciclo
  // 4. No se ha guardado en localStorage que fue rechazado recientemente
  useEffect(() => {
    if (!supported || permission !== "default" || dismissed) {
      return;
    }

    // Verificar localStorage para "rechazado hace poco"
    const dismissedUntil = localStorage.getItem(
      "notifications_dismissed_until",
    );
    if (dismissedUntil) {
      const until = new Date(dismissedUntil);
      if (until > new Date()) {
        setDismissed(true);
        return;
      } else {
        localStorage.removeItem("notifications_dismissed_until");
      }
    }

    // Mostrar banner después de un delay (para no bombardear)
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2000); // 2 segundos después de cargar

    return () => clearTimeout(timer);
  }, [supported, permission, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);

    // Guardar que fue rechazado por 7 días
    const until = new Date();
    until.setDate(until.getDate() + 7);
    localStorage.setItem("notifications_dismissed_until", until.toISOString());

    onDismiss?.();
  };

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
      setVisible(false);
      setDismissed(true);
      onDismiss?.();
    }
  };

  if (!visible || !supported || permission !== "default") {
    return null;
  }

  return (
    <div className="mx-4 my-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 flex-shrink-0 text-blue-600" />
        <p>
          Activa notificaciones para no olvidar tu menú del día y alertas de
          compras
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Activando..." : "Activar"}
        </button>
        <button
          onClick={handleDismiss}
          className="rounded hover:bg-blue-100 p-1"
          aria-label="Cerrar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
