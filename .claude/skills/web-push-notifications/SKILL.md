---
name: web-push-notifications
description: "Web Push notifications con VAPID en recetario-app: setup de keys, subscribe flow (cliente → DB), send flow (server con web-push), service worker handler, cleanup automatico de endpoints expirados (410/404). Como triggear push desde cron jobs."
globs:
  - "src/app/api/push/**"
  - "src/lib/notifications/**"
  - "src/components/notifications/**"
  - "public/sw.js"
---

# Web Push Notifications

Implementacion completa de Web Push reales en recetario-app, con VAPID y
service worker. Reemplaza el sistema viejo de `console.log("notif")`.

---

## Arquitectura

```
1. Cliente (browser)
   ├── Pide permission via Notification.requestPermission()
   ├── Subscribe al PushManager con applicationServerKey = VAPID_PUBLIC_KEY
   └── POSTea la subscription a /api/push/subscribe → guarda en push_subscriptions

2. Trigger (cron, server, manual)
   ├── POST /api/push/send con CRON_SECRET en Authorization
   ├── Body: { title, body, url?, userIds? | householdId? }
   └── Server itera subscriptions y envia con web-push

3. Service Worker (public/sw.js)
   ├── 'push' event → showNotification()
   └── 'notificationclick' event → focus o open URL
```

---

## Setup inicial (una vez)

### Generar VAPID keys

```bash
npx web-push generate-vapid-keys
# Output:
# Public Key:  BCD1z6bvnMjzk1FLSzuu...
# Private Key: <secret>
```

### Configurar env vars en Vercel

| Variable                       | Scope                | Sensitive                           |
| ------------------------------ | -------------------- | ----------------------------------- |
| `VAPID_PUBLIC_KEY`             | Production + Preview | No                                  |
| `VAPID_PRIVATE_KEY`            | Production + Preview | **Si**                              |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Production + Preview | No (cliente la necesita)            |
| `VAPID_SUBJECT`                | Production + Preview | No (formato: `mailto:tu@email.com`) |
| `CRON_SECRET`                  | Production + Preview | **Si**                              |

⚠️ Si pegas la value y queda con `\n` al final, `webpush.setVapidDetails()` falla. El codigo hace `.trim()` defensivo pero verifica.

### Migration de DB

```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_subs" ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_subs" ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_delete_own_subs" ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());
CREATE POLICY "service_role_full_access" ON push_subscriptions FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Endpoints

### POST `/api/push/send` (server-only, requiere CRON_SECRET)

```typescript
// src/app/api/push/send/route.ts (resumen)
import webpush from "web-push";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

export async function POST(request: NextRequest) {
  // Auth via Bearer CRON_SECRET
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return 401;

  const { title, body, url, userIds, householdId } = await request.json();

  // Cargar subscriptions filtradas por userIds[] o householdId
  let query = supabase.from("push_subscriptions").select("*");
  if (userIds?.length) query = query.in("user_id", userIds);
  else if (householdId) {
    const { data: members } = await supabase
      .from("household_memberships")
      .select("user_id")
      .eq("household_id", householdId)
      .eq("is_active", true);
    query = query.in(
      "user_id",
      members.map((m) => m.user_id),
    );
  }

  const { data: subscriptions } = await query;

  // Enviar y limpiar expired
  const expiredIds = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          JSON.stringify({ title, body, url }),
        );
      } catch (err) {
        // 410 Gone o 404 = endpoint murio, limpiar
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id);
        }
      }
    }),
  );

  if (expiredIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return { sent, failed, expired_removed: expiredIds.length };
}
```

### GET `/api/push/send` (health check publico)

```typescript
// Devuelve { configured: boolean, vapid_public_key: string }
// La VAPID public key es publica por diseno (cliente la necesita).
// Esta ruta es public (esta en PUBLIC_API_PATHS del middleware).
```

---

## Cliente: subscribir a notificaciones

```typescript
// src/lib/notifications/useNotifications.ts (resumen)
async function subscribeToNotifications(userId: string) {
  // 1. Pedir permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  // 2. Obtener registration del SW
  const registration = await navigator.serviceWorker.ready;

  // 3. Subscribe con la VAPID public key
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    ),
  });

  // 4. Guardar en DB
  const { endpoint, keys } = subscription.toJSON();
  await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint,
    p256dh_key: keys.p256dh,
    auth_key: keys.auth,
    user_agent: navigator.userAgent,
  });
}
```

---

## Service Worker (public/sw.js)

```javascript
// Push handler
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      data: { url: data.url || "/" },
    }),
  );
});

// Click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((wins) => {
      // Focus existing tab or open new one
      const url = event.notification.data?.url || "/";
      for (const win of wins) {
        if (win.url.includes(url)) return win.focus();
      }
      return clients.openWindow(url);
    }),
  );
});
```

---

## Triggear push desde cron job

```bash
# Cron de Vercel o externo
curl -X POST https://recetario-app-self.vercel.app/api/push/send \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Recordatorio de almuerzo 🍽️",
    "body": "No olvides marcar tu menu de hoy",
    "url": "/",
    "householdId": "b3ccbf7e-f3a6-4db0-a97f-0b429aa1efd7"
  }'
```

---

## Health check rapido

```bash
# 1. VAPID configurado?
curl https://recetario-app-self.vercel.app/api/push/send
# Esperado: {"configured":true,"vapid_public_key":"BCD1..."}

# 2. Cuantas subscriptions activas?
# Via Supabase SQL Editor:
SELECT COUNT(*) FROM push_subscriptions;

# 3. Test de envio (necesitas CRON_SECRET):
curl -X POST https://.../api/push/send \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"title":"Test","body":"Hola","userIds":["<tu-user-id>"]}'
```

---

## Errores comunes

| Sintoma                                      | Causa                          | Fix                                                                      |
| -------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `503 VAPID keys not configured`              | env vars faltan                | Configurar `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en Vercel + redeploy |
| `401 Missing Authorization header`           | cron sin auth header           | Anadir `-H "Authorization: Bearer $CRON_SECRET"`                         |
| Notif no aparece pero `sent: 1` en respuesta | Permission denegado en browser | El usuario tiene que `Notification.requestPermission()` antes            |
| `apikey=...%0A&vsn=...` en realtime          | trailing newline en env var    | Re-pegar la VAPID key sin newline                                        |
| Endpoint expirado, no se limpia              | DB no tiene el row             | Es esperado: el server limpia con DELETE WHERE id IN (expiredIds)        |

---

## Referencias

- web-push npm: https://github.com/web-push-libs/web-push
- VAPID spec: https://datatracker.ietf.org/doc/html/rfc8292
- Migration en repo: `push_subscriptions`
- Endpoint: `src/app/api/push/send/route.ts`
- Service worker: `public/sw.js`
