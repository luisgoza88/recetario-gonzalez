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

const MAX_RETRY_ATTEMPTS = 3;
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
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const errors: string[] = [];

    try {
      const operations = await getPendingOperations();

      for (const op of operations) {
        const retryCount = retryCountRef.current.get(op.id) || 0;

        // Skip if max retries exceeded
        if (retryCount >= MAX_RETRY_ATTEMPTS) {
          errors.push(
            `"${op.table}" falló después de ${MAX_RETRY_ATTEMPTS} intentos`,
          );
          // Remove the failed operation to prevent infinite retries
          await removePendingOperation(op.id);
          retryCountRef.current.delete(op.id);
          continue;
        }

        try {
          let error = null;

          switch (op.operation) {
            case "update": {
              const updateData = op.data as {
                id: string;
                [key: string]: unknown;
              };
              const { id, ...updateFields } = updateData;
              const result = await supabase
                .from(op.table)
                .update(updateFields)
                .eq("id", id);
              error = result.error;
              break;
            }

            case "insert": {
              const result = await supabase.from(op.table).insert(op.data);
              error = result.error;
              break;
            }

            case "delete": {
              const deleteData = op.data as { id: string };
              const result = await supabase
                .from(op.table)
                .delete()
                .eq("id", deleteData.id);
              error = result.error;
              break;
            }
          }

          if (error) {
            console.error(
              `Sync error for ${op.table} (attempt ${retryCount + 1}):`,
              error,
            );
            retryCountRef.current.set(op.id, retryCount + 1);
          } else {
            // Eliminar operación exitosa
            await removePendingOperation(op.id);
            retryCountRef.current.delete(op.id);
          }
        } catch (opError) {
          console.error(`Failed to sync operation ${op.id}:`, opError);
          retryCountRef.current.set(op.id, retryCount + 1);
        }
      }

      setSyncErrors(errors);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, isSyncing, updatePendingCount]);

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
