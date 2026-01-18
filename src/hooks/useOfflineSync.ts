'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  getPendingOperations,
  removePendingOperation,
  addPendingOperation,
  PendingOperation
} from '@/lib/indexedDB'

interface UseOfflineSyncReturn {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  syncNow: () => Promise<void>
  queueOperation: (op: Omit<PendingOperation, 'id' | 'createdAt'>) => Promise<void>
  lastSyncTime: number | null
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  // Actualizar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Contar operaciones pendientes
  const updatePendingCount = useCallback(async () => {
    try {
      const ops = await getPendingOperations()
      setPendingCount(ops.length)
    } catch (error) {
      console.error('Error counting pending operations:', error)
    }
  }, [])

  // Actualizar count al inicio y cuando cambia isOnline
  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount, isOnline])

  // Sincronizar operaciones pendientes
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)

    try {
      const operations = await getPendingOperations()

      for (const op of operations) {
        try {
          let error = null

          switch (op.operation) {
            case 'update': {
              const updateData = op.data as { id: string; [key: string]: unknown }
              const { id, ...updateFields } = updateData
              const result = await supabase
                .from(op.table)
                .update(updateFields)
                .eq('id', id)
              error = result.error
              break
            }

            case 'insert': {
              const result = await supabase
                .from(op.table)
                .insert(op.data)
              error = result.error
              break
            }

            case 'delete': {
              const deleteData = op.data as { id: string }
              const result = await supabase
                .from(op.table)
                .delete()
                .eq('id', deleteData.id)
              error = result.error
              break
            }
          }

          if (error) {
            console.error(`Sync error for ${op.table}:`, error)
            // Mantener operación en cola si hay error
          } else {
            // Eliminar operación exitosa de la cola
            await removePendingOperation(op.id)
          }
        } catch (opError) {
          console.error(`Failed to sync operation ${op.id}:`, opError)
        }
      }

      setLastSyncTime(Date.now())
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
      await updatePendingCount()
    }
  }, [isOnline, isSyncing, updatePendingCount])

  // Auto-sync cuando vuelve la conexión
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow()
    }
  }, [isOnline, pendingCount, syncNow])

  // Agregar operación a la cola
  const queueOperation = useCallback(async (
    op: Omit<PendingOperation, 'id' | 'createdAt'>
  ) => {
    await addPendingOperation(op)
    await updatePendingCount()
  }, [updatePendingCount])

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncNow,
    queueOperation,
    lastSyncTime
  }
}

// Hook simplificado para detectar solo el estado de conexión
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
