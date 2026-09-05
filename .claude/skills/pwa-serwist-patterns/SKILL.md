---
name: pwa-serwist-patterns
description: "PWA con Serwist + Next.js: service worker, IndexedDB cache, offline sync, push notifications."
globs:
  - "src/sw.ts"
  - "src/lib/indexedDB.ts"
  - "src/hooks/useOfflineSync.ts"
  - "next.config.ts"
---

# PWA y datos sin conexión

Editar `src/sw.ts`, no sobrescribir cambios ajenos en el archivo generado `public/sw.js`. Serwist compila el worker con webpack en producción; en desarrollo no se registra un worker antiguo.

No cachear respuestas privadas de Supabase ni APIs autenticadas en el caché HTTP del worker. Las copias locales viven en IndexedDB con nombre por usuario/hogar. La base legacy sin identidad no se reutiliza automáticamente.

La cola offline de mercado usa item_id, operaciones idempotentes y exclusión entre instancias/pestañas. Conservar los fallos para reintento y respetar el orden; no eliminar operaciones por agotar reintentos ni sincronizarlas bajo otra sesión. Revisar useOfflineSync e indexedDB antes de cambiar el contrato.

Para notificaciones, URLs normalizadas al mismo origen. La suscripción PushManager real se gestiona desde useNotifications; conceder permiso por sí solo no crea una suscripción.
