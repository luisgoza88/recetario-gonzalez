"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import logger from "@/lib/logger";

export default function ServiceWorkerRegistration() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    // Registrar service worker
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
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

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // Las alertas proactivas son gestionadas por useProactiveAlerts
      // con cleanup propio — no hay intervals que limpiar aqui.
    };
  }, []);

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
              aria-label="Cerrar aviso sin conexión"
              onClick={() => setShowOfflineToast(false)}
              className="text-white/80 hover:text-white"
            >
              ×
            </button>
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
