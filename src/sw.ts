/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Evento de instalación
self.addEventListener("install", () => {
  // Service Worker instalado
});

// Evento de activación
self.addEventListener("activate", () => {
  // Service Worker activado
});

// Manejar notificaciones push
// Tipos para push event data
interface PushEventData {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  [key: string]: unknown;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  try {
    const data: PushEventData = event.data.json();
    const options: NotificationOptions = {
      body: data.body || "",
      icon: data.icon || "/icon.svg",
      badge: data.badge || "/icon.svg",
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Recetario", options),
    );
  } catch (error) {
    // Si el payload no es JSON válido, mostrar notificación simple
    console.error("Error parsing push event:", error);
    event.waitUntil(
      self.registration.showNotification("Recetario", {
        body: "Nueva notificación",
        icon: "/icon.svg",
      }),
    );
  }
});

// Manejar click en notificación
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Si ya hay una ventana abierta con la misma URL, enfocarla
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return (client as WindowClient).focus();
        }
      }
      // Si no, abrir una nueva ventana
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});

serwist.addEventListeners();
