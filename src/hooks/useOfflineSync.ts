"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  getPendingOperations,
  removePendingOperation,
  addPendingOperation,
  clearAllCache,
  isCacheValid,
  getCacheStats,
  PendingOperation,
} from "@/lib/indexedDB";

let syncInFlight = false;
const CACHE_MAX_AGE_HOURS = 24;

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
  queueOperation: (
    op: Omit<PendingOperation, "id" | "createdAt">,
  ) => Promise<void>;
  lastSyncTime: number | null;
  syncErrors: string[];
  clearExpiredCache: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Actualizar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Contar operaciones pendientes
  const updatePendingCount = useCallback(async () => {
    try {
      const ops = await getPendingOperations();
      setPendingCount(ops.length);
    } catch (error) {
      console.error("Error counting pending operations:", error);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("recetario-offline-changed", updatePendingCount);
    return () =>
      window.removeEventListener(
        "recetario-offline-changed",
        updatePendingCount,
      );
  }, [updatePendingCount]);

  // Limpiar cache expirado
  const clearExpiredCache = useCallback(async () => {
    try {
      const stats = await getCacheStats();
      // If there's cached data, check if it's valid
      if (stats.dayMenus > 0 || stats.recipes > 0 || stats.marketItems > 0) {
        // We can't check individual items easily, so clear all if online
        // and cache is potentially stale (app just loaded)
        if (isOnline) {
          // Get a sample cached item to check age
          const { getCachedDayMenus } = await import("@/lib/indexedDB");
          const menus = await getCachedDayMenus();
          if (
            menus.length > 0 &&
            !isCacheValid(menus[0].cachedAt, CACHE_MAX_AGE_HOURS)
          ) {
            console.log("[CACHE] Clearing expired cache...");
            await clearAllCache();
          }
        }
      }
    } catch (error) {
      console.error("Error clearing expired cache:", error);
    }
  }, [isOnline]);

  // Limpiar cache expirado al inicio
  useEffect(() => {
    clearExpiredCache();
  }, [clearExpiredCache]);

  // Actualizar count al inicio y cuando cambia isOnline
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount, isOnline]);

  // Sincronizar operaciones pendientes con retry y backoff
  const runSync = useCallback(async () => {
    if (!isOnline || syncInFlight) return;
    const scope = localStorage.getItem("recetario-session-scope");
    if (!scope) return;
    const householdId = localStorage.getItem("currentHouseholdId");
    syncInFlight = true;

    setIsSyncing(true);
    const errors: string[] = [];

    try {
      const operations = (await getPendingOperations()).sort(
        (a, b) => a.createdAt - b.createdAt,
      );

      for (const op of operations) {
        const retryCount = retryCountRef.current.get(op.id) || 0;

        if (localStorage.getItem("recetario-session-scope") !== scope) break;

        try {
          let error = null;

          // Queue only the two supported, idempotent market operations.
          if (!["inventory", "market_checklist"].includes(op.table)) {
            throw new Error(
              "Operación pendiente no compatible; se conserva para revisión",
            );
          }
          const data = op.data as Record<string, unknown>;
          const itemId = data.item_id ?? data.id;
          if (typeof itemId !== "string")
            throw new Error("Producto pendiente sin identificador");
          if (op.operation === "delete") {
            const result = await supabase
              .from(op.table)
              .delete()
              .eq("item_id", itemId)
              .eq("household_id", householdId);
            error = result.error;
          } else {
            const { id: _id, ...fields } = data;
            const result = await supabase.from(op.table).upsert(
              {
                ...fields,
                item_id: itemId,
                household_id: householdId,
              },
              { onConflict: "item_id" },
            );
            error = result.error;
          }

          if (error) {
            console.error(
              `Sync error for ${op.table} (attempt ${retryCount + 1}):`,
              error,
            );
            retryCountRef.current.set(op.id, retryCount + 1);
            errors.push(
              `No se pudo sincronizar ${op.table}. El cambio sigue guardado.`,
            );
            break;
          } else {
            // Eliminar operación exitosa
            await removePendingOperation(op.id);
            retryCountRef.current.delete(op.id);
          }
        } catch (opError) {
          console.error(`Failed to sync operation ${op.id}:`, opError);
          retryCountRef.current.set(op.id, retryCount + 1);
          errors.push(
            opError instanceof Error
              ? opError.message
              : "Error de sincronización",
          );
          break;
        }
      }

      setSyncErrors(errors);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      syncInFlight = false;
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, updatePendingCount]);

  const syncNow = useCallback(async () => {
    if (navigator.locks) {
      await navigator.locks.request(
        "recetario-offline-sync",
        { ifAvailable: true },
        async (lock) => {
          if (lock) await runSync();
        },
      );
    } else await runSync();
  }, [runSync]);

  // Auto-sync cuando vuelve la conexión
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow();
    }
  }, [isOnline, pendingCount, syncNow]);

  // Agregar operación a la cola
  const queueOperation = useCallback(
    async (op: Omit<PendingOperation, "id" | "createdAt">) => {
      await addPendingOperation(op);
      await updatePendingCount();
    },
    [updatePendingCount],
  );

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncNow,
    queueOperation,
    lastSyncTime,
    syncErrors,
    clearExpiredCache,
  };
}

// Hook simplificado para detectar solo el estado de conexión
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
