import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock createAuthenticatedClient before importing the module under test
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockLte = vi.fn();
const mockNot = vi.fn();
const mockGte = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

import {
  getRecipesToAvoid,
  getAvoidPromptSection,
} from "../recipe-recommendations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMockChain(result: {
  data: { recipe_id: string }[] | null;
  error?: { message: string } | null;
}) {
  // Chain: from().select().lte().not().gte().eq()?
  mockFrom.mockReturnValue({
    select: mockSelect,
  });
  mockSelect.mockReturnValue({
    lte: mockLte,
  });
  mockLte.mockReturnValue({
    not: mockNot,
  });
  mockNot.mockReturnValue({
    gte: mockGte,
  });
  mockGte.mockReturnValue({
    eq: mockEq,
    // If eq() is not called (no householdId), gte() is the final query
    data: result.data,
    error: result.error || null,
  });
  mockEq.mockReturnValue({
    data: result.data,
    error: result.error || null,
  });
}

// ---------------------------------------------------------------------------
// Tests - getRecipesToAvoid
// ---------------------------------------------------------------------------

describe("getRecipesToAvoid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // HAPPY PATH: Returns unique recipe IDs with rating <= 2
  // -----------------------------------------------------------------------
  it("should return unique recipe IDs when low-rated feedback exists", async () => {
    setupMockChain({
      data: [
        { recipe_id: "recipe-123" },
        { recipe_id: "recipe-456" },
        { recipe_id: "recipe-123" }, // Duplicate
      ],
      error: null,
    });

    const result = await getRecipesToAvoid();

    expect(result).toEqual(["recipe-123", "recipe-456"]);
    expect(mockFrom).toHaveBeenCalledWith("meal_feedback");
    expect(mockSelect).toHaveBeenCalledWith("recipe_id");
    expect(mockLte).toHaveBeenCalledWith("star_rating", 2);
    expect(mockNot).toHaveBeenCalledWith("star_rating", "is", null);
    expect(mockGte).toHaveBeenCalled(); // Date filter
  });

  // -----------------------------------------------------------------------
  // HOUSEHOLD FILTER: Applies householdId when provided
  // -----------------------------------------------------------------------
  it("should filter by household_id when provided", async () => {
    setupMockChain({
      data: [{ recipe_id: "recipe-789" }],
      error: null,
    });

    const result = await getRecipesToAvoid("household-abc");

    expect(result).toEqual(["recipe-789"]);
    expect(mockEq).toHaveBeenCalledWith("household_id", "household-abc");
  });

  // -----------------------------------------------------------------------
  // NO HOUSEHOLD: Does not filter by household_id when absent
  // -----------------------------------------------------------------------
  it("should not filter by household_id when not provided", async () => {
    setupMockChain({
      data: [],
      error: null,
    });

    await getRecipesToAvoid();

    expect(mockEq).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // EMPTY RESULT: Returns empty array when no low-rated feedback
  // -----------------------------------------------------------------------
  it("should return empty array when no low-rated feedback exists", async () => {
    setupMockChain({
      data: [],
      error: null,
    });

    const result = await getRecipesToAvoid();

    expect(result).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // NULL DATA: Returns empty array when query returns null
  // -----------------------------------------------------------------------
  it("should return empty array when query returns null data", async () => {
    setupMockChain({
      data: null,
      error: null,
    });

    const result = await getRecipesToAvoid();

    expect(result).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // DB ERROR: Returns empty array on database error
  // -----------------------------------------------------------------------
  it("should return empty array when database error occurs", async () => {
    setupMockChain({
      data: null,
      error: { message: "Connection timeout" },
    });

    const result = await getRecipesToAvoid();

    expect(result).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // DEDUPLICATION: Removes duplicate recipe_ids
  // -----------------------------------------------------------------------
  it("should deduplicate recipe_ids", async () => {
    setupMockChain({
      data: [
        { recipe_id: "recipe-aaa" },
        { recipe_id: "recipe-bbb" },
        { recipe_id: "recipe-aaa" },
        { recipe_id: "recipe-bbb" },
        { recipe_id: "recipe-ccc" },
      ],
      error: null,
    });

    const result = await getRecipesToAvoid();

    expect(result).toEqual(["recipe-aaa", "recipe-bbb", "recipe-ccc"]);
  });

  // -----------------------------------------------------------------------
  // EXCEPTION HANDLING: Returns empty array on exception
  // -----------------------------------------------------------------------
  it("should return empty array when exception is thrown", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const result = await getRecipesToAvoid();

    expect(result).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // DATE FILTER: Verifies 30-day filter is applied
  // -----------------------------------------------------------------------
  it("should filter feedback from last 30 days", async () => {
    setupMockChain({
      data: [],
      error: null,
    });

    await getRecipesToAvoid();

    // Verify gte() was called with a date (we can't test exact date due to timing)
    expect(mockGte).toHaveBeenCalledWith("created_at", expect.any(String));
    const dateArg = mockGte.mock.calls[0][1];
    // Verify it's a valid ISO date
    expect(new Date(dateArg).toISOString()).toBe(dateArg);
  });
});

// ---------------------------------------------------------------------------
// Tests - getAvoidPromptSection
// ---------------------------------------------------------------------------

describe("getAvoidPromptSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // EMPTY RESULT: Returns empty string when no recipes to avoid
  // -----------------------------------------------------------------------
  it("should return empty string when no recipes to avoid", async () => {
    setupMockChain({
      data: [],
      error: null,
    });

    const result = await getAvoidPromptSection();

    expect(result).toBe("");
  });

  // -----------------------------------------------------------------------
  // FORMATTED OUTPUT: Returns formatted prompt with recipe IDs
  // -----------------------------------------------------------------------
  it("should return formatted prompt section when recipes exist", async () => {
    setupMockChain({
      data: [{ recipe_id: "recipe-pasta" }, { recipe_id: "recipe-tacos" }],
      error: null,
    });

    const result = await getAvoidPromptSection();

    expect(result).toContain("RECETAS A EVITAR");
    expect(result).toContain("rating <= 2 estrellas");
    expect(result).toContain("últimos 30 días");
    expect(result).toContain("- recipe-pasta");
    expect(result).toContain("- recipe-tacos");
    expect(result).toContain("NO sugieras estas recetas");
  });

  // -----------------------------------------------------------------------
  // HOUSEHOLD FILTERING: Passes householdId correctly
  // -----------------------------------------------------------------------
  it("should pass householdId to getRecipesToAvoid", async () => {
    setupMockChain({
      data: [{ recipe_id: "recipe-xxx" }],
      error: null,
    });

    await getAvoidPromptSection("household-test");

    expect(mockEq).toHaveBeenCalledWith("household_id", "household-test");
  });

  // -----------------------------------------------------------------------
  // SINGLE RECIPE: Formats correctly with one recipe
  // -----------------------------------------------------------------------
  it("should format correctly with single recipe", async () => {
    setupMockChain({
      data: [{ recipe_id: "recipe-single" }],
      error: null,
    });

    const result = await getAvoidPromptSection();

    expect(result).toContain("- recipe-single");
    expect(
      result.split("\n").filter((line) => line.startsWith("- ")).length,
    ).toBe(1);
  });

  // -----------------------------------------------------------------------
  // MULTIPLE RECIPES: Formats each on separate line
  // -----------------------------------------------------------------------
  it("should format multiple recipes on separate lines", async () => {
    setupMockChain({
      data: [
        { recipe_id: "recipe-1" },
        { recipe_id: "recipe-2" },
        { recipe_id: "recipe-3" },
      ],
      error: null,
    });

    const result = await getAvoidPromptSection();

    const recipeLines = result
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(recipeLines).toHaveLength(3);
    expect(recipeLines[0]).toBe("- recipe-1");
    expect(recipeLines[1]).toBe("- recipe-2");
    expect(recipeLines[2]).toBe("- recipe-3");
  });

  // -----------------------------------------------------------------------
  // DB ERROR: Returns empty string on error
  // -----------------------------------------------------------------------
  it("should return empty string when database error occurs", async () => {
    setupMockChain({
      data: null,
      error: { message: "DB error" },
    });

    const result = await getAvoidPromptSection();

    expect(result).toBe("");
  });
});
