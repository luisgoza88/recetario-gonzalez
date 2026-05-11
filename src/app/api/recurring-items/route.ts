import { NextRequest, NextResponse } from "next/server";
import { getDueItems } from "@/lib/recurring-items";

/**
 * GET /api/recurring-items?household_id=<uuid>
 *
 * Devuelve items que probablemente se acabaron o estan a punto basado
 * en el historial de compras del hogar (purchase_patterns).
 *
 * Sprint 6 (Lazyweb): MarketView usa esto para sugerir items recurrentes
 * arriba de la lista (patron Whole Foods "Popular items").
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get("household_id");

  if (!householdId) {
    return NextResponse.json(
      { error: "household_id is required" },
      { status: 400 },
    );
  }

  try {
    const items = await getDueItems(householdId);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), items: [] },
      { status: 500 },
    );
  }
}
