---
name: pwa-serwist-patterns
description: "PWA con Serwist + Next.js: service worker, IndexedDB cache, offline sync, push notifications."
globs:
  - "src/sw.ts"
  - "src/lib/indexedDB.ts"
  - "src/hooks/useOfflineSync.ts"
  - "next.config.ts"
---

# PWA & Serwist Patterns

## Configuracion Next.js (`next.config.ts`)

```typescript
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production", // Solo en produccion
});

export default withSerwist(nextConfig);
```

## Service Worker (`src/sw.ts`)

```typescript
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

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
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192x192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});

serwist.addEventListeners();
```

## IndexedDB Cache (`src/lib/indexedDB.ts`)

```typescript
import { openDB } from "idb";

const DB_NAME = "recetario-cache";
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore("frequentItems");
    db.createObjectStore("recentSearches");
    db.createObjectStore("customProducts");
    db.createObjectStore("cachedDayMenus");
    db.createObjectStore("cachedRecipes");
    db.createObjectStore("pendingOperations", { autoIncrement: true });
  },
});

// Leer
export async function getCachedMenu(dayNumber: number) {
  const db = await dbPromise;
  return db.get("cachedDayMenus", dayNumber);
}

// Escribir
export async function cacheMenu(dayNumber: number, menu: DayMenu) {
  const db = await dbPromise;
  await db.put("cachedDayMenus", menu, dayNumber);
}

// Pending operations (para sync offline)
export async function addPendingOperation(op: PendingOperation) {
  const db = await dbPromise;
  await db.add("pendingOperations", op);
}
```

## Offline Sync Hook (`src/hooks/useOfflineSync.ts`)

```typescript
export function useOfflineSync() {
  useEffect(() => {
    const handleOnline = async () => {
      const db = await dbPromise;
      const ops = await db.getAll("pendingOperations");
      for (const op of ops) {
        await executeOperation(op);
        await db.delete("pendingOperations", op.id);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
```

## Reglas

1. SW solo activo en produccion
2. IndexedDB es cache, no fuente de verdad
3. No cachear tokens o datos de auth
4. Push notifications requieren permiso explicito
5. `pendingOperations` se procesan al volver online
