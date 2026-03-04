import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 intentos por 15 minutos, por IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimit = await withRateLimit(ip, "validate-invitation");

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          isValid: false,
          error:
            "Demasiados intentos. Por favor espera 15 minutos antes de intentar de nuevo.",
        },
        { status: 429, headers: rateLimit.headers },
      );
    }

    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { isValid: false, error: "Código requerido" },
        { status: 400 },
      );
    }

    const normalizedCode = code.toUpperCase().trim();

    if (normalizedCode.length !== 8) {
      return NextResponse.json(
        { isValid: false, error: "El código debe tener 8 caracteres" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("household_invitations")
      .select(
        `
        *,
        household:households(id, name)
      `,
      )
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { isValid: false, error: "Código de invitación inválido o expirado" },
        { headers: rateLimit.headers },
      );
    }

    if (data.current_uses >= data.max_uses) {
      return NextResponse.json(
        { isValid: false, error: "Este código de invitación ya fue utilizado" },
        { headers: rateLimit.headers },
      );
    }

    return NextResponse.json(
      {
        isValid: true,
        invitation: data,
        householdName: data.household?.name,
      },
      { headers: rateLimit.headers },
    );
  } catch {
    return NextResponse.json(
      { isValid: false, error: "Error al validar el código" },
      { status: 500 },
    );
  }
}
