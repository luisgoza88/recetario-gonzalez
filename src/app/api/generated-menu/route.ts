import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createHouseholdClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// GET: Fetch generated menu for a week
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const weekStartDate = searchParams.get("weekStartDate");
  const status = searchParams.get("status"); // optional filter

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = ((await createHouseholdClient()) as any)
      .from("generated_menus")
      .select("*")
      .order("created_at", { ascending: false });

    if (weekStartDate) {
      query = query.eq("week_start_date", weekStartDate);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      logger.error("Error fetching generated menus", { error: error.message });
      return NextResponse.json(
        { error: "Error fetching menus" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, menus: data || [] });
  } catch (error) {
    logger.error("GET generated-menu error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH: Update status (approve, archive, etc.)
const PatchSchema = z.object({
  menuId: z.string().uuid(),
  action: z.enum(["approve", "archive", "revert_to_draft"]),
});

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rawBody = await request.json();
    const { menuId, action } = PatchSchema.parse(rawBody);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case "approve":
        updates.status = "approved";
        updates.approved_at = new Date().toISOString();
        break;
      case "archive":
        updates.status = "archived";
        break;
      case "revert_to_draft":
        updates.status = "draft";
        updates.approved_at = null;
        break;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await ((await createHouseholdClient()) as any)
      .from("generated_menus")
      .update(updates)
      .eq("id", menuId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating generated menu", { error: error.message });
      return NextResponse.json(
        { error: "Error updating menu" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, menu: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 },
      );
    }
    logger.error("PATCH generated-menu error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
