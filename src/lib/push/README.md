# Push Notifications - Guía de Implementación

## Descripción General

Sistema de Push Notifications para la PWA usando Web Push API estándar. Los usuarios reciben alertas en su celular incluso cuando la app está cerrada.

## Archivos Creados

- `src/lib/push/vapid.ts` - Utilidades VAPID (conversión base64, verificación configuración)
- `src/hooks/useNotifications.ts` - Hook React para gestionar suscripciones
- `src/components/notifications/EnableNotificationsBanner.tsx` - Banner para solicitar permisos
- `src/app/api/push/send/route.ts` - Endpoint para enviar notificaciones (server)
- `supabase/migrations/20260510000000_push_subscriptions.sql` - Tabla de suscripciones
- `src/sw.ts` - Service Worker actualizado con handlers mejorados

## Flujo de Usuario

1. **Solicitar Permiso**

   ```tsx
   const { requestPermission, subscribe } = useNotifications();
   await requestPermission(); // Abre dialog del navegador
   ```

2. **Suscribirse**

   ```tsx
   const { ok, error } = await subscribe();
   // Guarda en push_subscriptions table
   ```

3. **Recibir Notificación**
   - Server envía POST a `/api/push/send` con Authorization header
   - Endpoint recupera suscripciones de BD
   - Web Push Service entrega a clientes (SW maneja)

4. **Click en Notificación**
   - SW abre URL especificada o "/" por defecto

## Pasos para Producción

### Paso 1: Generar VAPID Keys (una sola vez)

```bash
npm install web-push
npx web-push generate-vapid-keys
```

Salida:

```
Public Key: BMx...
Private Key: aB...
```

### Paso 2: Configurar Variables de Entorno

En `.env.local` (desarrollo) y `.env.production` (Vercel):

```env
# Cliente (visible en el navegador)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMx...

# Servidor (secreto)
VAPID_PRIVATE_KEY=aB...
CRON_SECRET=tu_clave_secreta_para_cron
```

### Paso 3: Instalar web-push

```bash
npm install web-push
npm install --save-dev @types/web-push
```

### Paso 4: Actualizar `/api/push/send`

Reemplazar TODO en `src/app/api/push/send/route.ts`:

```typescript
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!, // email o URL
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// En el loop de suscripciones:
for (const sub of subscriptions) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key,
        },
      },
      JSON.stringify({ title, body, url }),
    );
  } catch (error) {
    // Manejar errores (suscripción expirada, etc)
    if (error.statusCode === 410) {
      // Endpoint ya no válido, eliminar
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
    }
  }
}
```

### Paso 5: Aplicar Migration

```bash
supabase migration up
```

O manualmente en Supabase dashboard SQL editor.

### Paso 6: Usar en Componentes

En `TodayDashboard.tsx` o `SettingsView.tsx`:

```tsx
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";

export function MyComponent() {
  return (
    <>
      <EnableNotificationsBanner />
      {/* resto del contenido */}
    </>
  );
}
```

## Testing

### Test Local (Desarrollo)

1. Abrir DevTools → Application → Service Workers
2. Simular push notification:

   ```javascript
   // En console del SW
   self.registration.showNotification("Test", {
     body: "Esto es una prueba",
     icon: "/icon.svg",
   });
   ```

3. O usar script en servidor:
   ```bash
   curl -X POST http://localhost:3000/api/push/send \
     -H "Authorization: Bearer test_secret" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Menú del Día",
       "body": "Hoy: Arroz con pollo",
       "url": "/?tab=calendar"
     }'
   ```

### Test Producción (Vercel)

1. Asegurar env vars configuradas en Vercel dashboard
2. Endpoint real en https://recetario-app-self.vercel.app/api/push/send
3. Usar cron job (Vercel Cron, GitHub Actions, etc)

## Casos de Uso (Sugerencias)

### 1. Alerta de Hora de Cocinar

```typescript
// Cron diario a las 11:30 AM
POST /api/push/send
{
  "title": "Hora de Cocinar",
  "body": "Hoy prepara: Arroz con pollo",
  "url": "/?tab=calendar"
}
```

### 2. Recordatorio de Lista de Compras

```typescript
// Cron sábados a las 8 AM
{
  "title": "Lista de Compras",
  "body": "No olvides los ingredientes de la semana",
  "url": "/?tab=market"
}
```

### 3. Feedback Pendiente

```typescript
// Cuando hay feedback sin responder
{
  "title": "Feedback Pendiente",
  "body": "¿Qué tal el almuerzo de hoy?",
  "url": "/?modal=feedback"
}
```

## Arquitectura

```
Cliente
  ├─ EnableNotificationsBanner.tsx
  │   ├─ Solicita permiso
  │   └─ Llama useNotifications.subscribe()
  └─ useNotifications.ts
      └─ PushManager.subscribe()
         └─ Guarda en push_subscriptions

Server
  ├─ Cron / Trigger
  │  └─ POST /api/push/send
  │     └─ webpush.sendNotification()
  │        └─ Service Worker recibe "push" event
  │           └─ self.registration.showNotification()
  │              └─ Usuario ve notificación

Service Worker (src/sw.ts)
  ├─ "push" event listener
  │  └─ Muestra notificación
  └─ "notificationclick" listener
     └─ Abre URL o "/""
```

## Seguridad

- RLS habilitado en `push_subscriptions`
- Users solo ven/eliminan sus propias suscripciones
- Endpoint `/api/push/send` requiere `CRON_SECRET`
- VAPID private key nunca en cliente (solo en servidor)
- Endpoints y keys almacenados de forma segura

## Troubleshooting

### "Push notifications not supported"

- Verificar navegador soporta Web Push (Chrome, Edge, Firefox)
- Verificar HTTPS (requerido para Web Push)
- Verificar NEXT_PUBLIC_VAPID_PUBLIC_KEY configurada

### "Permission not granted"

- Usuario rechazó permisos: Mostrar instrucciones para cambiar en configuración del navegador
- Banner reaparece cada 7 días

### Notificaciones no llegan

- Verificar `push_subscriptions` tiene registros (SELECT \* FROM push_subscriptions)
- Verificar VAPID_PRIVATE_KEY configurada en servidor
- Revisar logs de web-push para errores 410 (endpoint expirado)

### Service Worker no recibe push

- Verificar Service Worker está activo: DevTools → Application → Service Workers
- Verificar "skip waiting" está habilitado en Serwist config
- Limpiar cache: DevTools → Application → Clear site data

## Referencias

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [VAPID Spec](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)
- [web-push npm](https://github.com/web-push-libs/web-push)
- [Service Worker Events](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
