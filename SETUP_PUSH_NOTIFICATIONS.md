# Setup Push Notifications - Checklist Paso a Paso

## ✅ Ya Completado (No necesita hacer nada)

- [x] Código TypeScript (sin dependencias nuevas)
- [x] Service Worker listeners (push + notificationclick)
- [x] Tabla Supabase con RLS
- [x] Hook useNotifications (completo)
- [x] Banner UI (EnableNotificationsBanner)
- [x] Endpoint API /api/push/send (skeleton)
- [x] VAPID utilities (conversión base64url)

## ⏳ TODO: Setup para Producción

### Paso 1: Instalar Dependencia (5 minutos)

```bash
npm install web-push
npm install --save-dev @types/web-push
```

Luego verifica que compile:

```bash
npm run build
```

### Paso 2: Generar VAPID Keys (2 minutos)

**Solo necesita hacer esto UNA VEZ**:

```bash
npx web-push generate-vapid-keys
```

Te mostrará algo como:

```
Public Key: BMy0qJqx5l6FqwqC...XUp0Fvlw
Private Key: aB12wxyzABC123...XYZ789
```

**Guarda ambas keys en un lugar seguro**.

### Paso 3: Agregar Variables de Entorno

#### En `.env.local` (para desarrollo local):

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMy0qJqx5l6FqwqC...XUp0Fvlw
VAPID_PRIVATE_KEY=aB12wxyzABC123...XYZ789
CRON_SECRET=tu_secreto_super_seguro_aqui_minimo_32_caracteres
```

#### En Vercel Dashboard (para producción):

1. Ve a https://vercel.com/dashboard
2. Selecciona proyecto "recetario-app"
3. Settings → Environment Variables
4. Agrega:
   - `VAPID_PRIVATE_KEY` = `aB12wxyzABC123...XYZ789`
   - `CRON_SECRET` = `tu_secreto_super_seguro_aqui_minimo_32_caracteres`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = `BMy0qJqx5l6FqwqC...XUp0Fvlw` (ya debería estar)

5. Redeploy: git push a main (o manual deploy en Vercel)

### Paso 4: Aplicar Migration Supabase

```bash
# Option A: CLI local
supabase migration up

# Option B: Manual en Supabase Dashboard
# 1. Ve a https://app.supabase.com
# 2. Project: snyelpbcfbzaxadrtxpa
# 3. SQL Editor
# 4. New Query
# 5. Copia contenido de: supabase/migrations/20260510000000_push_subscriptions.sql
# 6. Run
```

### Paso 5: Implementar Envío Real en `/api/push/send`

Archivo: `src/app/api/push/send/route.ts`

Reemplaza líneas 97-104:

```typescript
// ANTES (TODO):
console.log(`[PUSH] Would send ${subscriptions.length} notifications:`, {
  title,
  body,
  url: url || "/",
  recipients: subscriptions.length,
});

// DESPUES (REAL):
import webpush from "web-push";

// Al inicio del archivo, después de imports:
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.NEXT_PUBLIC_EMAIL || "noreply@recetario-app.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Reemplazar el loop de actualización:
const sentNotifications: { success: number; failed: number; errors: string[] } =
  {
    success: 0,
    failed: 0,
    errors: [],
  };

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
      JSON.stringify({ title, body, url: url || "/" }),
    );
    sentNotifications.success++;
  } catch (error: any) {
    sentNotifications.failed++;

    // Si el endpoint expiró (410), eliminar de BD
    if (error.statusCode === 410) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
    } else {
      sentNotifications.errors.push(`${sub.id}: ${error.message}`);
    }
  }
}

// Return:
return NextResponse.json({
  sent: sentNotifications.success,
  failed: sentNotifications.failed,
  errors: sentNotifications.errors,
});
```

### Paso 6: Integrar Banner en UI

Elige dónde quieres que aparezca (generalmente en el dashboard principal):

```tsx
// En: src/components/sections/TodayDashboard.tsx o app/page.tsx

import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";

export function YourComponent() {
  return (
    <>
      <EnableNotificationsBanner
        onDismiss={() => {
          // Opcional: hacer algo cuando se cierre
          console.log("User dismissed notifications banner");
        }}
      />

      {/* resto del contenido */}
    </>
  );
}
```

### Paso 7: Configurar Cron Job para Envíos Automáticos

Elige una opción:

#### Option A: Vercel Cron (Recomendado)

En `src/app/api/crons/` crea `send-daily-notifications.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel
  const token = request.headers.get("authorization");
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Llamar al endpoint de push
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "https://recetario-app-self.vercel.app"}/api/push/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "¡Hora de Cocinar!",
        body: "Hoy preparamos algo delicioso",
        url: "/?tab=calendar",
      }),
    },
  );

  return response;
}
```

En `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/crons/send-daily-notifications",
      "schedule": "0 11 * * *"
    }
  ]
}
```

#### Option B: GitHub Actions Workflow

En `.github/workflows/send-notifications.yml`:

```yaml
name: Send Daily Notifications

on:
  schedule:
    - cron: "30 11 * * *" # 11:30 AM UTC

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: Send Push Notifications
        run: |
          curl -X POST https://recetario-app-self.vercel.app/api/push/send \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{
              "title": "Hora de Cocinar",
              "body": "Hoy: Receta sorpresa",
              "url": "/?tab=calendar"
            }'
```

Luego agregar `CRON_SECRET` a GitHub Secrets.

## Testing Local

### Test 1: Verificar que el Hook Funciona

```tsx
// En un componente:
import { useNotifications } from "@/hooks/useNotifications";

export function TestNotifications() {
  const { supported, permission, subscribe } = useNotifications();

  return (
    <div>
      <p>Supported: {supported ? "✅" : "❌"}</p>
      <p>Permission: {permission}</p>
      <button onClick={() => subscribe()}>Test Subscribe</button>
    </div>
  );
}
```

### Test 2: Simular Push desde DevTools

```javascript
// En DevTools Console, cuando el SW está activo:
navigator.serviceWorker.ready.then((reg) => {
  const pushData = new Blob(
    [
      JSON.stringify({
        title: "Test Push",
        body: "Esto es una prueba",
        url: "/",
      }),
    ],
    { type: "application/json" },
  );

  const event = new PushEvent("push", { data: pushData });
  reg.active?.dispatchEvent(event);
});
```

### Test 3: Llamar Endpoint de Push

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Authorization: Bearer test_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Title",
    "body": "Test body message",
    "url": "/?tab=market"
  }'
```

Respuesta esperada:

```json
{
  "sent": 0,
  "failed": 0,
  "note": "Install web-push package for real notifications..."
}
```

Después de Paso 5, debería ser:

```json
{
  "sent": 1,
  "failed": 0,
  "errors": []
}
```

## Verificación Final

Antes de merging a main:

- [ ] `npm run build` pasa sin errores
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` está en .env.local
- [ ] Service Worker se cargan en DevTools → Application
- [ ] Banner aparece en la app (si permission es "default")
- [ ] Puedo clickear "Activar" sin errores
- [ ] Suscripción aparece en `push_subscriptions` table
- [ ] Migration aplicada a BD
- [ ] Variables de entorno en Vercel configuradas
- [ ] Cron job configurado (opcional pero recomendado)

## Troubleshooting

### "Push notifications not supported"

- Verificar NEXT_PUBLIC_VAPID_PUBLIC_KEY está en .env.local
- Verificar navegador soporta Web Push (Chrome, Edge, Firefox)
- HTTPS requerido (localhost funciona en dev)

### "Permission denied"

- Usuario rechazó permisos en el navegador
- Banner reaparece en 7 días o usuario puede cambiar en settings del navegador

### "Service Worker not active"

- DevTools → Application → Service Workers
- Limpiar site data: DevTools → Application → Clear site data
- Reload página

### Notificaciones no llegan en Producción

- Verificar VAPID_PRIVATE_KEY está en Vercel
- Verificar `push_subscriptions` tiene registros
- Revisar logs: Vercel → Logs → Function Logs
- Verificar CRON_SECRET es igual en Vercel y cron config

## Recursos

- Guía completa: `src/lib/push/README.md`
- Status actual: `PUSH_NOTIFICATIONS_STATUS.md`
- Code: Revisar archivos en `src/lib/push/`, `src/hooks/`, `src/components/notifications/`
