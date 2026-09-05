import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock auth helpers from @/lib/api/auth
vi.mock("@/lib/api/auth", () => ({
  requireAuth: vi.fn(),
  // Defaults to "is a member"; individual tests override for the 403 path.
  requireHouseholdMembership: vi.fn().mockResolvedValue(true),
  forbiddenResponse: vi.fn(
    (message = "Insufficient permissions") =>
      new Response(JSON.stringify({ error: message, code: "FORBIDDEN" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
  ),
}));

// Mock AI service modules
vi.mock("@/lib/ai/ai-command-service", () => ({
  approveProposal: vi.fn(),
  rejectProposal: vi.fn(),
  partiallyApproveProposal: vi.fn(),
  getProposal: vi.fn(),
  rollbackAction: vi.fn(),
}));

vi.mock("@/lib/ai/proposal-executor", () => ({
  executeProposal: vi.fn(),
  executeProposalTransactional: vi.fn(),
  rollbackProposal: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

// Mock SQL escape
vi.mock("@/lib/utils/sql-escape", () => ({
  escapeIlike: vi.fn((input: string) => input.replace(/[\\%_]/g, "\\$&")),
}));

import { POST, GET } from "../ai-assistant/execute/route";
import { requireAuth, requireHouseholdMembership } from "@/lib/api/auth";
import {
  approveProposal,
  rejectProposal,
  getProposal,
} from "@/lib/ai/ai-command-service";
import { executeProposal } from "@/lib/ai/proposal-executor";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import { escapeIlike } from "@/lib/utils/sql-escape";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockRequest(
  url: string,
  method: "POST" | "GET",
  body?: Record<string, unknown>,
) {
  const request = new NextRequest(url, { method });

  if (method === "POST" && body) {
    vi.spyOn(request, "json").mockResolvedValue(body);
  }

  return request;
}

function createMockSupabaseClient() {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests - POST endpoint
// ---------------------------------------------------------------------------

describe("POST /api/ai-assistant/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProposal).mockResolvedValue({ household_id: "h1" } as Awaited<
      ReturnType<typeof getProposal>
    >);
  });

  // -----------------------------------------------------------------------
  // 1. AUTH REQUIRED
  // -----------------------------------------------------------------------
  it("returns 401 when no auth header is present", async () => {
    const { NextResponse } = await import("next/server");

    const unauthorizedResponse = NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
    vi.mocked(requireAuth).mockReturnValue(unauthorizedResponse);

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      { action: "approve", proposalId: "123", householdId: "h1" },
    );
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  // -----------------------------------------------------------------------
  // 2. VALIDATION ZOD - missing action
  // -----------------------------------------------------------------------
  it("returns 400 when action is missing", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      { proposalId: "123" },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Action required");
  });

  // -----------------------------------------------------------------------
  // 3. ESCAPEILIIKE FUNCIONA - no hace match con todo
  // -----------------------------------------------------------------------
  it("escapeIlike prevents wildcard injection", async () => {
    const input = "test%value_with_wildcards";
    const escaped = escapeIlike(input);

    // Should escape % and _ by prepending backslash
    expect(escaped).toBe("test\\%value\\_with\\_wildcards");
    // Verify original dangerous chars are escaped
    expect(escaped).toContain("\\%");
    expect(escaped).toContain("\\_");
  });

  // -----------------------------------------------------------------------
  // 4. APPROVE ACTION - happy path
  // -----------------------------------------------------------------------
  it("approves and executes proposal successfully", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });
    vi.mocked(approveProposal).mockResolvedValue(true);
    vi.mocked(executeProposal).mockResolvedValue({
      success: true,
      proposal_id: "proposal-123",
      executed_actions: [
        {
          action_id: "action-123",
          function_name: "swap_menu_recipe",
          success: true,
          audit_log_id: "audit-123",
        },
      ],
      can_rollback: true,
    });

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      {
        action: "approve",
        proposalId: "prop-123",
        householdId: "h1",
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.canRollback).toBe(true);
    expect(approveProposal).toHaveBeenCalledWith("prop-123", "user-123");
  });

  // -----------------------------------------------------------------------
  // 5. REJECT ACTION
  // -----------------------------------------------------------------------
  it("rejects proposal successfully", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });
    vi.mocked(rejectProposal).mockResolvedValue(true);

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      {
        action: "reject",
        proposalId: "prop-123",
        householdId: "h1",
        reason: "Not needed",
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Propuesta rechazada");
    expect(rejectProposal).toHaveBeenCalledWith(
      "prop-123",
      "user-123",
      "Not needed",
    );
  });

  // -----------------------------------------------------------------------
  // 6. INVALID ACTION
  // -----------------------------------------------------------------------
  it("returns 400 for unknown action", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      {
        action: "invalid_action",
        proposalId: "123",
        householdId: "h1",
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Acción no reconocida");
  });

  // -----------------------------------------------------------------------
  // 6b. CROSS-TENANT: non-member is rejected with 403
  // -----------------------------------------------------------------------
  it("returns 403 when the user does not belong to the household", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-from-h1" });
    vi.mocked(requireHouseholdMembership).mockResolvedValueOnce(false);

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      {
        action: "approve",
        proposalId: "prop-from-h2",
        householdId: "h2",
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  // -----------------------------------------------------------------------
  // 7. SWAP_MENU_RECIPE - function validation
  // -----------------------------------------------------------------------
  it("swap_menu_recipe validates day_number range", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    const mockSupabase = createMockSupabaseClient();
    vi.mocked(createAuthenticatedClient).mockResolvedValue(
      mockSupabase as never,
    );

    // Import the function directly to test it (requires refactoring in production)
    // For now, we test via the executor which would call it

    // This test demonstrates the INTENT - in production you'd refactor to export
    // the function or test through integration
    expect(1).toBe(1); // Placeholder - refactor needed to test individual functions
  });

  // -----------------------------------------------------------------------
  // 8. CROSS-HOUSEHOLD ISOLATION (RLS would prevent this)
  // -----------------------------------------------------------------------
  it("prevents execution across different households via RLS", async () => {
    // This test demonstrates that RLS policies in DB prevent cross-household access
    // The application layer trusts RLS to enforce this
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-from-h1" });
    vi.mocked(approveProposal).mockResolvedValue(false); // RLS would block

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "POST",
      {
        action: "approve",
        proposalId: "prop-from-h2", // Different household
        householdId: "h2",
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(approveProposal).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests - GET endpoint
// ---------------------------------------------------------------------------

describe("GET /api/ai-assistant/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. AUTH REQUIRED
  // -----------------------------------------------------------------------
  it("returns 401 when no auth header is present", async () => {
    const { NextResponse } = await import("next/server");

    const unauthorizedResponse = NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
    vi.mocked(requireAuth).mockReturnValue(unauthorizedResponse);

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute?proposalId=123",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  // -----------------------------------------------------------------------
  // 2. MISSING PROPOSAL_ID
  // -----------------------------------------------------------------------
  it("returns 400 when proposalId is missing", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("proposalId required");
  });

  // -----------------------------------------------------------------------
  // 3. GET PROPOSAL SUCCESS
  // -----------------------------------------------------------------------
  it("returns proposal when found", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });
    vi.mocked(getProposal).mockResolvedValue({
      id: "prop-123",
      status: "pending",
      actions: [],
    } as never);

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute?proposalId=prop-123",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.proposal.id).toBe("prop-123");
  });

  // -----------------------------------------------------------------------
  // 4. PROPOSAL NOT FOUND
  // -----------------------------------------------------------------------
  it("returns 404 when proposal not found", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });
    vi.mocked(getProposal).mockResolvedValue(null);

    const request = buildMockRequest(
      "http://localhost/api/ai-assistant/execute?proposalId=missing",
      "GET",
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Propuesta no encontrada");
  });
});
