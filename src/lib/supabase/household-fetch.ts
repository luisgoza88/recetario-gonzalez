/** Defense in depth for PostgREST. RLS remains the authorization boundary. */
const HOUSEHOLD_TABLES = new Set([
  "adjustment_suggestions",
  "ai_action_queue",
  "ai_audit_log",
  "ai_context",
  "ai_conversations",
  "budgets",
  "cleaning_supplies",
  "daily_completions",
  "daily_task_instances",
  "day_menu",
  "employee_checkins",
  "employees",
  "generated_menus",
  "home_employees",
  "household_ai_trust",
  "household_mood_history",
  "inspection_reports",
  "inventory",
  "market_checklist",
  "market_items",
  "meal_feedback",
  "preparations",
  "price_history",
  "purchase_patterns",
  "purchases",
  "quick_routine_logs",
  "recipe_favorites",
  "recipe_shares",
  "recipes",
  "schedule_config",
  "schedule_templates",
  "scheduled_tasks",
  "shopping_lists",
  "spaces",
  "substitution_history",
  "task_templates",
  "workload_predictions_log",
]);

export function createHouseholdFetch(
  getHouseholdId: () => string | null | undefined,
  baseFetch: typeof fetch = (...args) => fetch(...args),
): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const table = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
    if (!table || !HOUSEHOLD_TABLES.has(table)) return baseFetch(request);
    const householdId = getHouseholdId();
    const deny = () =>
      new Response(
        JSON.stringify({
          code: "HOUSEHOLD_REQUIRED",
          message: "Selecciona un hogar válido",
          details: null,
          hint: null,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    if (!householdId || !/^[\da-f-]{36}$/i.test(householdId)) return deny();
    // Append an AND condition, preserving any existing caller filter.
    url.searchParams.append("household_id", `eq.${householdId}`);
    let body: string | undefined;
    if (["POST", "PATCH"].includes(request.method)) {
      const data = await request.json();
      const rows = Array.isArray(data) ? data : [data];
      if (
        rows.some(
          (row) =>
            !row ||
            typeof row !== "object" ||
            (row.household_id != null && row.household_id !== householdId),
        )
      )
        return deny();
      const scoped = rows.map((row) => ({ ...row, household_id: householdId }));
      body = JSON.stringify(Array.isArray(data) ? scoped : scoped[0]);
      if (
        url.searchParams.has("columns") &&
        !url.searchParams
          .get("columns")!
          .split(",")
          .some((column) => column.replaceAll('"', "") === "household_id")
      ) {
        url.searchParams.set(
          "columns",
          url.searchParams.get("columns") + ",household_id",
        );
      }
    }
    const response = await baseFetch(url, {
      method: request.method,
      headers: request.headers,
      body,
      signal: request.signal,
      credentials: request.credentials,
    });
    if (getHouseholdId() !== householdId) return deny();
    return response;
  };
}
