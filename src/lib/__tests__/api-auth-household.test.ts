import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock createAuthenticatedClient before importing the module under test
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { requireHouseholdMembership } from "../api/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMockChain(
  getUserResult: { user: { id: string } | null },
  membershipResult: {
    data: { id: string } | null;
    error?: { message: string } | null;
  },
) {
  mockGetUser.mockResolvedValue({ data: getUserResult, error: null });

  // Chain methods: from().select().eq().eq().eq().maybeSingle()
  // Each eq() returns an object with eq() AND maybeSingle()
  mockFrom.mockReturnValue({
    select: mockSelect,
  });
  mockSelect.mockReturnValue({
    eq: mockEq,
  });
  mockEq.mockReturnValue({
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
  });
  mockMaybeSingle.mockResolvedValue(membershipResult);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("requireHouseholdMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain to avoid stale references
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    });
  });

  // -----------------------------------------------------------------------
  // HAPPY PATH: User is an active member
  // -----------------------------------------------------------------------
  it("should return true when user is an active member of the household", async () => {
    setupMockChain(
      { user: { id: "user-123" } },
      { data: { id: "membership-1" }, error: null },
    );

    const result = await requireHouseholdMembership("household-abc");

    expect(result).toBe(true);
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledWith("household_memberships");
    expect(mockSelect).toHaveBeenCalledWith("id");
    expect(mockEq).toHaveBeenCalledWith("household_id", "household-abc");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockEq).toHaveBeenCalledWith("is_active", true);
    expect(mockMaybeSingle).toHaveBeenCalledOnce();
  });

  // -----------------------------------------------------------------------
  // EARLY RETURN: No householdId provided
  // -----------------------------------------------------------------------
  it("should return false when householdId is not provided", async () => {
    const result = await requireHouseholdMembership("");

    expect(result).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("should return false when householdId is undefined", async () => {
    const result = await requireHouseholdMembership(
      undefined as unknown as string,
    );

    expect(result).toBe(false);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // NO USER AUTHENTICATED
  // -----------------------------------------------------------------------
  it("should return false when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await requireHouseholdMembership("household-abc");

    expect(result).toBe(false);
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockFrom).not.toHaveBeenCalled(); // Should not query DB if no user
  });

  // -----------------------------------------------------------------------
  // USER NOT A MEMBER (query returns null)
  // -----------------------------------------------------------------------
  it("should return false when user is not a member of the household", async () => {
    setupMockChain({ user: { id: "user-123" } }, { data: null, error: null });

    const result = await requireHouseholdMembership("household-xyz");

    expect(result).toBe(false);
    expect(mockMaybeSingle).toHaveBeenCalledOnce();
  });

  // -----------------------------------------------------------------------
  // DB ERROR (query returns error)
  // -----------------------------------------------------------------------
  it("should return false when database query returns an error", async () => {
    setupMockChain(
      { user: { id: "user-123" } },
      { data: null, error: { message: "Connection timeout" } },
    );

    const result = await requireHouseholdMembership("household-abc");

    expect(result).toBe(false);
  });

  // -----------------------------------------------------------------------
  // EDGE CASE: User exists but membership is inactive (RLS should block)
  // -----------------------------------------------------------------------
  it("should return false when membership exists but is_active=false (RLS blocks)", async () => {
    // RLS policy filters is_active=true, so this should return null
    setupMockChain({ user: { id: "user-123" } }, { data: null, error: null });

    const result = await requireHouseholdMembership("household-abc");

    expect(result).toBe(false);
  });

  // -----------------------------------------------------------------------
  // CROSS-TENANT PROTECTION: User from different household
  // -----------------------------------------------------------------------
  it("should return false when user tries to access a different household", async () => {
    // User belongs to household-aaa, tries to access household-bbb
    setupMockChain(
      { user: { id: "user-999" } },
      { data: null, error: null }, // No membership found
    );

    const result = await requireHouseholdMembership("household-bbb");

    expect(result).toBe(false);
    expect(mockEq).toHaveBeenCalledWith("household_id", "household-bbb");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-999");
  });

  // -----------------------------------------------------------------------
  // MULTIPLE HOUSEHOLDS: User is member of household-A, not household-B
  // -----------------------------------------------------------------------
  it("should correctly distinguish between multiple households for the same user", async () => {
    // Simulate user-123 is member of household-A
    setupMockChain(
      { user: { id: "user-123" } },
      { data: { id: "membership-A" }, error: null },
    );

    const resultA = await requireHouseholdMembership("household-A");
    expect(resultA).toBe(true);

    // Now simulate user-123 is NOT member of household-B
    setupMockChain({ user: { id: "user-123" } }, { data: null, error: null });

    const resultB = await requireHouseholdMembership("household-B");
    expect(resultB).toBe(false);
  });
});
