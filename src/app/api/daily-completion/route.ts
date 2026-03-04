import { NextRequest, NextResponse } from "next/server";
import {
  createAuthenticatedClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

// ============================================
// GET - Retrieve daily completion for a date
// ============================================
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user first
    const authClient = await createAuthenticatedClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const householdId = searchParams.get("household_id");
    const employeeId = searchParams.get("employee_id");

    if (!date) {
      return NextResponse.json(
        { error: "date parameter required" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("daily_completions")
      .select("*")
      .eq("completion_date", date);

    if (householdId) {
      query = query.eq("household_id", householdId);
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Error fetching daily completion:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Daily completion GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// POST - Create or update daily completion
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user first
    const authClient = await createAuthenticatedClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      date,
      household_id,
      employee_id,
      meals_completed,
      tasks_completed,
      preparations_completed,
      photo_urls,
      notes,
      started_at,
      completed_at,
    } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Check if a record exists for this date
    const { data: existing } = await supabase
      .from("daily_completions")
      .select("id")
      .eq("completion_date", date)
      .eq("household_id", household_id)
      .eq("employee_id", employee_id)
      .maybeSingle();

    const record = {
      household_id,
      employee_id,
      completion_date: date,
      meals_completed: meals_completed || {},
      tasks_completed: tasks_completed || [],
      preparations_completed: preparations_completed || [],
      photo_urls: photo_urls || [],
      notes: notes || null,
      started_at: started_at || null,
      completed_at: completed_at || null,
    };

    let result;

    if (existing) {
      // Update existing record
      result = await supabase
        .from("daily_completions")
        .update(record)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Insert new record
      result = await supabase
        .from("daily_completions")
        .insert(record)
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error saving daily completion:", result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error("Daily completion POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
