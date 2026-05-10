import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * API endpoint para enviar push notifications
 *
 * Endpoint: POST /api/push/send
 *
 * Autenticación:
 * - Requiere header: Authorization: Bearer {CRON_SECRET}
 * - O: autenticación interna (edge functions, webhooks)
 *
 * Body:
 * {
 *   "title": "string",
 *   "body": "string",
 *   "url": "string (opcional)",
 *   "userIds": ["uuid[]"] (opcional, si no se envía es broadcast)
 * }
 *
 * Respuesta:
 * {
 *   "sent": number,
 *   "failed": number,
 *   "note": "Instalar web-push para envío real"
 * }
 *
 * TODO PRODUCCIÓN:
 * 1. npm install web-push
 * 2. Generar VAPID keys: npx web-push generate-vapid-keys
 * 3. Configurar env vars: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY
 * 4. Reemplazar console.log con web-push.sendNotification()
 * 5. Agregar manejo de errores (suscripciones expiradas, endpoints inválidos)
 */

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 401 },
      );
    }

    // Parsear body
    const { title, body, url, userIds } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "Missing required fields: title, body" },
        { status: 400 },
      );
    }

    // Obtener suscripciones de la BD
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    let query = supabase.from("push_subscriptions").select("*");

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: subscriptions, error: dbError } = await query;

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        note: "No active subscriptions found",
      });
    }

    // TODO: Implementar envío real con web-push
    // Por ahora, solo loguear que se hubiera enviado
    console.log(`[PUSH] Would send ${subscriptions.length} notifications:`, {
      title,
      body,
      url: url || "/",
      recipients: subscriptions.length,
    });

    // Actualizar last_used_at para cada suscripción
    const now = new Date().toISOString();
    const updatePromises = subscriptions.map(async (sub) => {
      try {
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: now })
          .eq("id", sub.id);
        return { success: true };
      } catch (error) {
        console.error(`Failed to update subscription ${sub.id}:`, error);
        return { success: false };
      }
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      sent: successCount,
      failed: results.length - successCount,
      note: "Install web-push package for real notifications. See code comments for TODO steps.",
      subscriptions_count: subscriptions.length,
      push_payload: {
        title,
        body,
        url: url || "/",
      },
    });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
