import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Supabase clients
vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

import { GET, POST } from "../daily-completion/route";
import {
  createAuthenticatedClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockRequest(
  url: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
) {
  const request = new NextRequest(url, { method });

  if (method === "POST" && body) {
    vi.spyOn(request, "json").mockResolvedValue(body);
  }

  return request;
}

let currentDataClient: ReturnType<typeof createMockServiceClient>;

function createMockAuthClient(shouldPass = true, isMember = true) {
  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue(
          shouldPass
            ? { data: { user: { id: "user-123" } }, error: null }
            : { data: { user: null }, error: new Error("Unauthorized") },
        ),
    },
    // Chain used by requireHouseholdMembership() to verify the user belongs
    // to the requested household before the service-role client runs.
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    from: vi.fn(function (this: unknown, table: string) {
      return table === "daily_completions" ? currentDataClient : this;
    }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue(
        isMember
          ? { data: { id: "membership-1" }, error: null }
          : { data: null, error: null },
      ),
  };
}

function createMockServiceClient() {
  const client = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  currentDataClient = client;
  return client;
}

// ---------------------------------------------------------------------------
// Tests - GET endpoint
// ---------------------------------------------------------------------------

describe("GET /api/daily-completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. AUTH REQUIRED
  // -----------------------------------------------------------------------
  it("returns 401 when not authenticated", async () => {
    const mockAuthClient = createMockAuthClient(false);
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion?date=2026-05-08",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("UNAUTHORIZED");
  });

  // -----------------------------------------------------------------------
  // 2. MISSING DATE PARAM
  // -----------------------------------------------------------------------
  it("returns 400 when date parameter is missing", async () => {
    const mockAuthClient = createMockAuthClient(true);
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("date parameter required");
  });

  // -----------------------------------------------------------------------
  // 3. SUCCESSFUL GET WITH HOUSEHOLD_ID FILTER
  // -----------------------------------------------------------------------
  it("returns completion data filtered by household_id", async () => {
    const mockAuthClient = createMockAuthClient(true);
    const mockServiceClient = createMockServiceClient();

    const mockCompletion = {
      id: "c1",
      household_id: "h1",
      employee_id: "e1",
      completion_date: "2026-05-08",
      meals_completed: { breakfast: true },
      tasks_completed: ["task1"],
    };

    mockServiceClient.maybeSingle.mockResolvedValue({
      data: mockCompletion,
      error: null,
    });

    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion?date=2026-05-08&household_id=h1",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(mockCompletion);
    expect(mockServiceClient.eq).toHaveBeenCalledWith(
      "completion_date",
      "2026-05-08",
    );
    expect(mockServiceClient.eq).toHaveBeenCalledWith("household_id", "h1");
  });

  // -----------------------------------------------------------------------
  // 4. GET WITH EMPLOYEE_ID FILTER
  // -----------------------------------------------------------------------
  it("filters by employee_id when provided", async () => {
    const mockAuthClient = createMockAuthClient(true);
    const mockServiceClient = createMockServiceClient();

    mockServiceClient.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion?date=2026-05-08&household_id=h1&employee_id=e2",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockServiceClient.eq).toHaveBeenCalledWith("employee_id", "e2");
  });

  // -----------------------------------------------------------------------
  // 5. CROSS-TENANT: non-member is rejected with 403
  // -----------------------------------------------------------------------
  it("returns 403 when the user does not belong to the household", async () => {
    const mockAuthClient = createMockAuthClient(true, false); // not a member
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion?date=2026-05-08&household_id=other-household",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  // -----------------------------------------------------------------------
  // 6. MISSING HOUSEHOLD_ID PARAM
  // -----------------------------------------------------------------------
  it("returns 400 when household_id parameter is missing", async () => {
    const mockAuthClient = createMockAuthClient(true);
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion?date=2026-05-08",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("household_id parameter required");
  });
});

// ---------------------------------------------------------------------------
// Tests - POST endpoint
// ---------------------------------------------------------------------------

describe("POST /api/daily-completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. AUTH REQUIRED
  // -----------------------------------------------------------------------
  it("returns 401 when not authenticated", async () => {
    const mockAuthClient = createMockAuthClient(false);
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "POST",
      { date: "2026-05-08", household_id: "h1", employee_id: "e1" },
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  // -----------------------------------------------------------------------
  // 2. VALIDATION - missing date
  // -----------------------------------------------------------------------
  it("returns 400 when date is missing", async () => {
    const mockAuthClient = createMockAuthClient(true);
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "POST",
      { household_id: "h1" },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("date is required");
  });

  // -----------------------------------------------------------------------
  // 3. SUCCESSFUL INSERT (NEW RECORD)
  // -----------------------------------------------------------------------
  it("creates new completion record when none exists", async () => {
    const mockAuthClient = createMockAuthClient(true);
    const mockServiceClient = createMockServiceClient();

    // No existing record
    mockServiceClient.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const newRecord = {
      id: "new-c1",
      household_id: "h1",
      employee_id: "e1",
      completion_date: "2026-05-08",
      meals_completed: { breakfast: true },
      tasks_completed: ["task1"],
    };

    mockServiceClient.single.mockResolvedValue({
      data: newRecord,
      error: null,
    });

    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "POST",
      {
        date: "2026-05-08",
        household_id: "h1",
        employee_id: "e1",
        meals_completed: { breakfast: true },
        tasks_completed: ["task1"],
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(newRecord);
    expect(mockServiceClient.insert).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 4. SUCCESSFUL UPDATE (EXISTING RECORD)
  // -----------------------------------------------------------------------
  it("updates existing completion record", async () => {
    const mockAuthClient = createMockAuthClient(true);
    const mockServiceClient = createMockServiceClient();

    // Existing record
    mockServiceClient.maybeSingle.mockResolvedValue({
      data: { id: "existing-c1" },
      error: null,
    });

    const updatedRecord = {
      id: "existing-c1",
      household_id: "h1",
      employee_id: "e1",
      completion_date: "2026-05-08",
      meals_completed: { breakfast: true, lunch: true },
      tasks_completed: ["task1", "task2"],
    };

    mockServiceClient.single.mockResolvedValue({
      data: updatedRecord,
      error: null,
    });

    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "POST",
      {
        date: "2026-05-08",
        household_id: "h1",
        employee_id: "e1",
        meals_completed: { breakfast: true, lunch: true },
        tasks_completed: ["task1", "task2"],
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(updatedRecord);
    expect(mockServiceClient.update).toHaveBeenCalled();
    expect(mockServiceClient.eq).toHaveBeenCalledWith("id", "existing-c1");
  });

  // -----------------------------------------------------------------------
  // 5. CROSS-HOUSEHOLD PROTECTION (RLS enforcement)
  // -----------------------------------------------------------------------
  it("RLS prevents updating completion from different household", async () => {
    const mockAuthClient = createMockAuthClient(true);
    const mockServiceClient = createMockServiceClient();

    // Simulate RLS blocking the query
    mockServiceClient.maybeSingle.mockResolvedValue({
      data: null, // RLS blocks seeing other household's data
      error: null,
    });

    mockServiceClient.single.mockResolvedValue({
      data: null,
      error: { message: "RLS policy violation", code: "42501" },
    });

    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "POST",
      {
        date: "2026-05-08",
        household_id: "h2", // User from h1 trying to post to h2
        employee_id: "e1",
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("RLS policy violation");
  });

  // -----------------------------------------------------------------------
  // 6. DB ERROR HANDLING
  // -----------------------------------------------------------------------
  it("returns 500 when database error occurs", async () => {
    const mockAuthClient = createMockAuthClient(true);
    const mockServiceClient = createMockServiceClient();

    mockServiceClient.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    mockServiceClient.single.mockResolvedValue({
      data: null,
      error: { message: "Database connection lost" },
    });

    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockAuthClient as never,
    );
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockServiceClient as never,
    );

    const request = buildMockRequest(
      "http://localhost/api/daily-completion",
      "POST",
      { date: "2026-05-08", household_id: "h1", employee_id: "e1" },
    );
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Database connection lost");
  });
});
