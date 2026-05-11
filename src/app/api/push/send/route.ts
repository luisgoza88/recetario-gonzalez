import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

/**
 * API endpoint para enviar push notifications
 *
 * Endpoint: POST /api/push/send
 *
 * Auth: Authorization: Bearer {CRON_SECRET}
 *
 * Body:
 * {
 *   "title": "string",
 *   "body": "string",
 *   "url": "string (opcional)",
 *   "userIds": ["uuid[]"] (opcional, broadcast si no se envía)
 * }
 *
 * Variables de entorno requeridas:
 * - VAPID_PUBLIC_KEY (también en NEXT_PUBLIC_VAPID_PUBLIC_KEY para el cliente)
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:tu@email.com)
 * - CRON_SECRET
 * - SUPABASE_SERVICE_ROLE_KEY
 */

// Configurar VAPID al cargar el módulo
const VAPID_PUBLIC =
  process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:lmg880@gmail.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (err) {
    console.error("[push/send] Error setting VAPID details:", err);
  }
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth
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

    // Verificar configuracion VAPID
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json(
        {
          error: "VAPID keys not configured",
          help: "Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT in environment variables",
        },
        { status: 503 },
      );
    }

    // Parse body
    const { title, body, url, userIds, householdId } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "Missing required fields: title, body" },
        { status: 400 },
      );
    }

    // Obtener suscripciones
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    let query = supabase.from("push_subscriptions").select("*");

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    } else if (householdId) {
      // Si pasaron householdId, buscar miembros activos del hogar
      const { data: members } = await supabase
        .from("household_memberships")
        .select("user_id")
        .eq("household_id", householdId)
        .eq("is_active", true);
      const memberIds = (members || []).map((m) => m.user_id);
      if (memberIds.length === 0) {
        return NextResponse.json({
          sent: 0,
          failed: 0,
          note: "No active members in household",
        });
      }
      query = query.in("user_id", memberIds);
    }

    const { data: subscriptions, error: dbError } = await query;

    if (dbError) {
      console.error("[push/send] DB error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 },
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        note: "No active subscriptions",
      });
    }

    // Payload del push
    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    // Enviar a cada suscripción
    await Promise.all(
      (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key,
              },
            },
            payload,
          );
          sent++;

          // Actualizar last_used_at
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        } catch (err: unknown) {
          failed++;
          const status = (err as { statusCode?: number })?.statusCode;
          // 410 Gone = endpoint expirado, 404 Not Found = inválido
          if (status === 410 || status === 404) {
            expiredIds.push(sub.id);
          } else {
            console.error(`[push/send] Failed to send to ${sub.id}:`, err);
          }
        }
      }),
    );

    // Limpiar suscripciones expiradas
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return NextResponse.json({
      sent,
      failed,
      expired_removed: expiredIds.length,
      total_subscriptions: subscriptions.length,
    });
  } catch (error) {
    console.error("[push/send] Unhandled error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Health check / info
 */
export async function GET() {
  return NextResponse.json({
    configured: !!(VAPID_PUBLIC && VAPID_PRIVATE),
    vapid_public_key: VAPID_PUBLIC || null,
  });
}
