'use client'

import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface OfflineIndicatorProps {
  className?: string
  showSyncButton?: boolean
  compact?: boolean
}

export default function OfflineIndicator({
  className = '',
  showSyncButton = true,
  compact = false
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync()

  // Si está online y no hay pendientes, no mostrar nada
  if (isOnline && pendingCount === 0) {
    return null
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {!isOnline ? (
          <div className="flex items-center gap-1 text-orange-600">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs">Offline</span>
          </div>
        ) : pendingCount > 0 ? (
          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-xs">{pendingCount}</span>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`rounded-lg p-3 ${
      !isOnline
        ? 'bg-orange-50 border border-orange-200'
        : 'bg-blue-50 border border-blue-200'
    } ${className}`}>
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <>
            <CloudOff className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-700">
                Sin conexión
              </p>
              <p className="text-xs text-orange-600">
                Los cambios se guardarán cuando vuelvas a conectarte
              </p>
            </div>
          </>
        ) : (
          <>
            <Cloud className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700">
                {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
            {showSyncButton && (
              <button
                onClick={syncNow}
                disabled={isSyncing}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Componente simple para mostrar estado en el header
export function OfflineBadge() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync()

  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div className={`
      px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
      ${!isOnline
        ? 'bg-orange-100 text-orange-700'
        : 'bg-blue-100 text-blue-700'
      }
    `}>
      {!isOnline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{pendingCount}</span>
        </>
      )}
    </div>
  )
}
