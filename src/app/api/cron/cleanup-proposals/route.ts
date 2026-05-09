/**
 * Cron Job: Cleanup Expired AI Proposals
 *
 * Ejecuta diariamente a las 3am UTC (configurado en vercel.json).
 * - Marca como 'expired' las propuestas pendientes cuyo expires_at ya pasó
 * - Elimina propuestas expiradas/rechazadas con más de 30 días de antigüedad
 *
 * Autenticación: Bearer token via CRON_SECRET (estándar Vercel Cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Validar Authorization header (estándar Vercel Cron)
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createServiceRoleClient();

    // 1. Marcar como expiradas las propuestas pendientes vencidas
    const { data: expiredData, error: expireError } = await db
      .from("ai_action_queue")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (expireError) {
      throw new Error(`Error expiring proposals: ${expireError.message}`);
    }

    const updated = expiredData?.length ?? 0;

    // 2. Eliminar registros expirados/rechazados con más de 30 días
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const { data: deletedData, error: deleteError } = await db
      .from("ai_action_queue")
      .delete()
      .in("status", ["expired", "rejected"])
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (deleteError) {
      throw new Error(`Error deleting old proposals: ${deleteError.message}`);
    }

    const deleted = deletedData?.length ?? 0;

    return NextResponse.json(
      {
        updated,
        deleted,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
