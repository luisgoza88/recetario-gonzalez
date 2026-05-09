"use client";

import { useEffect, useState } from "react";
import { Bell, WifiOff } from "lucide-react";
import { requestNotificationPermission } from "@/lib/notifications";
import logger from "@/lib/logger";

export default function ServiceWorkerRegistration() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Registrar service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          logger.info("SW registered", { scope: registration.scope });
        })
        .catch((error) => {
          logger.warn("SW registration failed", { error: String(error) });
        });
    }

    // Detectar estado de conexion
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Verificar permiso de notificaciones
    let promptTimer: ReturnType<typeof setTimeout> | undefined;

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);

      // Mostrar prompt solo si no se ha decidido
      if (Notification.permission === "default") {
        promptTimer = setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (promptTimer) clearTimeout(promptTimer);
      // Las alertas proactivas son gestionadas por useProactiveAlerts
      // con cleanup propio — no hay intervals que limpiar aqui.
    };
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? "granted" : "denied");
    setShowNotificationPrompt(false);

    if (granted) {
      new Notification("Notificaciones activadas", {
        body: "Recibiras recordatorios del recetario.",
        icon: "/icon.svg",
      });
    }
  };

  const dismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
  };

  return (
    <>
      {/* Toast de offline */}
      {showOfflineToast && (
        <div className="fixed top-16 left-4 right-4 z-50 animate-slide-down">
          <div className="bg-orange-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md mx-auto">
            <WifiOff size={20} />
            <div className="flex-1">
              <p className="font-medium">Sin conexion</p>
              <p className="text-sm opacity-90">Usando datos guardados</p>
            </div>
            <button
              onClick={() => setShowOfflineToast(false)}
              className="text-white/80 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Prompt de notificaciones */}
      {showNotificationPrompt && notificationPermission === "default" && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-white border border-gray-200 px-4 py-4 rounded-xl shadow-lg max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell size={20} className="text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">
                  Activar notificaciones?
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Recibe recordatorios de comidas y alertas de stock bajo.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleRequestPermission}
                    className="flex-1 bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-800"
                  >
                    Activar
                  </button>
                  <button
                    onClick={dismissNotificationPrompt}
                    className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de estado offline */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-1 text-xs z-[60]">
          <WifiOff size={12} className="inline mr-1" /> Modo offline
        </div>
      )}
    </>
  );
}
