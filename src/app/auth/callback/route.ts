import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const db = await createAuthenticatedClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          safeRedirect(request.nextUrl.searchParams.get("redirect")),
          request.url,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/auth/login?error=confirmation_failed", request.url),
  );
}
