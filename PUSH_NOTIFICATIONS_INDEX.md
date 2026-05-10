# Push Notifications - Índice de Archivos

## Resumen Ejecutivo

Sistema de Web Push Notifications para PWA ya implementado. Los usuarios reciben notificaciones en su celular aunque la app esté cerrada.

**Estado**: Código completo. Falta: instalar web-push, generar VAPID keys, configurar env vars.

---

## Archivos de Referencia Rápida

### Para Entender qué se Hizo

**Lee primero**: `PUSH_NOTIFICATIONS_STATUS.md`

- ¿Qué está completado?
- ¿Qué falta?
- Diagrama de arquitectura
- Errores pre-existentes (no causados por esto)

### Para Implementar en Producción

**Lee luego**: `SETUP_PUSH_NOTIFICATIONS.md`

- Checklist paso a paso
- Comandos exactos a ejecutar
- Ejemplos de código
- Testing local
- Troubleshooting

### Para Entender la Técnica

**Referencia**: `src/lib/push/README.md`

- Web Push API explicada
- VAPID keys
- Flujo completo
- Casos de uso sugeridos
- Arquitectura detallada

---

## Archivos del Código

### Core (Lo que el usuario interactúa)

| Archivo                                                      | Líneas | Descripción                                                   |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------- |
| `src/components/notifications/EnableNotificationsBanner.tsx` | 121    | Banner que aparece al usuario pidiendo activar notificaciones |
| `src/hooks/useNotifications.ts`                              | 223    | Hook React: requestPermission, subscribe, unsubscribe         |
| `src/lib/push/vapid.ts`                                      | 41     | Utilidades VAPID (conversión base64url)                       |

### Backend

| Archivo                                                     | Descripción                                             |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `src/app/api/push/send/route.ts`                            | POST endpoint para enviar notificaciones desde servidor |
| `supabase/migrations/20260510000000_push_subscriptions.sql` | Tabla y RLS policies                                    |

### Infrastructure

| Archivo     | Descripción                                    |
| ----------- | ---------------------------------------------- |
| `src/sw.ts` | Service Worker con listeners de push mejorados |

### Documentación

| Archivo                  | Contenido             |
| ------------------------ | --------------------- |
| `src/lib/push/README.md` | Guía técnica completa |

---

## Flujo de Integración

```
1. Mostrar Banner
   ↓
2. Usuario clickea "Activar"
   ↓
3. Hook pide permiso + suscripción
   ↓
4. Guarda en push_subscriptions (Supabase)
   ↓
5. Cron job POST /api/push/send
   ↓
6. web-push.sendNotification()
   ↓
7. Service Worker recibe "push" event
   ↓
8. Muestra notificación visual
   ↓
9. Usuario clickea → Service Worker abre URL
```

---

## Integración en Componentes

### Opción A: En Layout Principal

```tsx
// src/app/layout.tsx o similar
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <EnableNotificationsBanner />
        {children}
      </body>
    </html>
  );
}
```

### Opción B: En Dashboard

```tsx
// src/components/sections/TodayDashboard.tsx
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";

export function TodayDashboard() {
  return (
    <div>
      <EnableNotificationsBanner />
      {/* resto del dashboard */}
    </div>
  );
}
```

---

## Casos de Uso

### 1. Alerta Diaria de Cocina

```
Hora: 11:30 AM
Título: "¡Hora de Cocinar!"
Body: "Hoy preparamos: Arroz con pollo"
URL: "/?tab=calendar"
```

### 2. Recordatorio de Compras

```
Hora: Sábados 8 AM
Título: "Lista de Compras"
Body: "No olvides los ingredientes de la semana"
URL: "/?tab=market"
```

### 3. Feedback Pendiente

```
Trigger: Cuando hay feedback sin responder
Título: "¿Qué tal la comida?"
Body: "Ayúdanos a mejorar el menú"
URL: "/?modal=feedback"
```

---

## Variables de Entorno Necesarias

```env
# Cliente (público)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMy0qJqx5l6FqwqC...

# Servidor (secreto)
VAPID_PRIVATE_KEY=aB12wxyzABC123...
CRON_SECRET=tu_secreto_minimo_32_caracteres
```

---

## Testing Rápido

### En el Navegador

```javascript
// DevTools Console
const { supported, permission, subscribe } = useNotifications();
console.log(permission); // "granted", "denied", o "default"
await subscribe();
```

### Curl Test

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Authorization: Bearer test_secret" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Body","url":"/"}'
```

---

## Checklist Pre-Deploy

- [ ] `npm install web-push`
- [ ] `npx web-push generate-vapid-keys`
- [ ] `.env.local` tiene VAPID keys
- [ ] Vercel dashboard tiene env vars
- [ ] Migration aplicada a BD
- [ ] Banner integrado en componente
- [ ] `/api/push/send` implementado con web-push real
- [ ] npm run build pasa
- [ ] Service Worker activo en DevTools
- [ ] Cron job configurado (opcional)

---

## Seguridad Checklist

- [x] RLS habilitado en push_subscriptions
- [x] Users solo ven sus propias suscripciones
- [x] VAPID private key nunca en cliente
- [x] Endpoint requiere CRON_SECRET
- [x] No se almacenan tokens de auth
- [x] Endpoints expirados (410) se eliminan de BD

---

## Troubleshooting Rápido

| Problema                 | Solución                                              |
| ------------------------ | ----------------------------------------------------- |
| "Push not supported"     | Revisar NEXT_PUBLIC_VAPID_PUBLIC_KEY en .env.local    |
| Banner no aparece        | Verificar permission es "default"                     |
| SW no recibe push        | DevTools → Clear site data y reload                   |
| Notificaciones no llegan | Verificar VAPID_PRIVATE_KEY en servidor, revisar logs |
| Endpoint expirado        | Se elimina automáticamente (410 handling)             |

---

## Referencias Externas

- [Web Push API Spec](https://www.w3.org/TR/push-api/)
- [VAPID](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)
- [web-push npm](https://github.com/web-push-libs/web-push)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## Siguiente Paso

Leer: `SETUP_PUSH_NOTIFICATIONS.md` para los 7 pasos de setup.
