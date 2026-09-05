---
name: web-push-notifications
description: "Web Push notifications con VAPID en recetario-app: setup de keys, subscribe flow (cliente → DB), send flow (server con web-push), service worker handler, cleanup automatico de endpoints expirados (410/404). Como triggear push desde cron jobs."
globs:
  - "src/app/api/push/**"
  - "src/lib/notifications/**"
  - "src/components/notifications/**"
  - "public/sw.js"
---

# Notificaciones web

El flujo real está en `src/hooks/useNotifications.ts`: permiso solicitado por una acción explícita, service worker listo, PushManager.subscribe y persistencia de la suscripción. SettingsView usa ese flujo. No existe `/api/push/subscribe`; revisar implementación antes de inventar una ruta.

`src/app/api/push/send/route.ts` protege el envío con su secreto del servidor. No invocar envíos reales durante pruebas sin autorización. Registrar el worker solo en producción y normalizar la URL del clic al mismo origen.

No afirmar que hay recordatorios automáticos por tener permiso o una suscripción guardada: el disparador de envío debe existir y estar configurado. No añadir cron, campañas ni envíos a otras personas por inferencia.
