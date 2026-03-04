import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createServiceRoleClient before importing the module under test
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

import {
  checkRateLimit,
  withRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIG,
} from "../rate-limit";

describe("RATE_LIMIT_CONFIG", () => {
  it("should have all expected actions", () => {
    const expectedActions = [
      "generate-recipe",
      "generate-image",
      "scan-pantry",
      "ai-chat",
      "ai-assistant",
      "validate-invitation",
    ];
    expect(Object.keys(RATE_LIMIT_CONFIG)).toEqual(expectedActions);
  });

  it("should have correct structure for each action", () => {
    for (const action of Object.values(RATE_LIMIT_CONFIG)) {
      expect(action).toHaveProperty("limit");
      expect(action).toHaveProperty("windowMs");
      expect(typeof action.limit).toBe("number");
      expect(typeof action.windowMs).toBe("number");
      expect(action.limit).toBeGreaterThan(0);
      expect(action.windowMs).toBeGreaterThan(0);
    }
  });

  it("should have validate-invitation set to 5 attempts per 15 minutes", () => {
    const config = RATE_LIMIT_CONFIG["validate-invitation"];
    expect(config.limit).toBe(5);
    expect(config.windowMs).toBe(15 * 60 * 1000);
  });
});

describe("createRateLimitResponse", () => {
  it("should format correctly with retryAfterMs", () => {
    const resetAt = new Date("2026-02-05T12:00:00.000Z");
    const result = createRateLimitResponse({
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs: 5000,
    });

    expect(result.error).toBe("Rate limit exceeded");
    expect(result.message).toContain("límite de solicitudes");
    expect(result.retryAfter).toBe(5); // 5000ms -> 5 seconds
    expect(result.resetAt).toBe(resetAt.toISOString());
  });

  it("should format correctly without retryAfterMs", () => {
    const resetAt = new Date("2026-02-05T12:00:00.000Z");
    const result = createRateLimitResponse({
      allowed: false,
      remaining: 0,
      resetAt,
    });

    expect(result.error).toBe("Rate limit exceeded");
    expect(result.retryAfter).toBe(3600); // default fallback
    expect(result.resetAt).toBe(resetAt.toISOString());
  });

  it("should ceil retryAfter to next full second", () => {
    const resetAt = new Date("2026-02-05T12:00:00.000Z");
    const result = createRateLimitResponse({
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs: 2100, // 2.1 seconds
    });

    expect(result.retryAfter).toBe(3); // Math.ceil(2.1) = 3
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return allowed=true when DB returns allowed=true", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, current_count: 3, reset_at: futureDate }],
      error: null,
    });

    const result = await checkRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(17); // 20 - 3
    expect(result.retryAfterMs).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "user-123:generate-recipe",
      p_limit: 20,
      p_window_ms: 3600000,
    });
  });

  it("should return allowed=false when DB returns allowed=false", async () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: false, current_count: 20, reset_at: futureDate }],
      error: null,
    });

    const result = await checkRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeDefined();
  });

  it("should fail-open when DB returns an error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB connection failed" },
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(20); // full limit
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should fail-open when DB returns empty data", async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(20);

    consoleSpy.mockRestore();
  });

  it("should fail-open when rpc throws an exception", async () => {
    mockRpc.mockRejectedValue(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(20);

    consoleSpy.mockRestore();
  });

  it("should use custom limit and window when provided", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, current_count: 1, reset_at: futureDate }],
      error: null,
    });

    await checkRateLimit("user-123", "generate-recipe", 50, 120000);

    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "user-123:generate-recipe",
      p_limit: 50,
      p_window_ms: 120000,
    });
  });

  it("should use validate-invitation config (5 attempts / 15 min)", async () => {
    const futureDate = new Date(Date.now() + 900000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: false, current_count: 5, reset_at: futureDate }],
      error: null,
    });

    const result = await checkRateLimit("user-456", "validate-invitation");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0); // 5 - 5
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "user-456:validate-invitation",
      p_limit: 5,
      p_window_ms: 15 * 60 * 1000,
    });
  });
});

describe("withRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return allowed=true with correct headers when not rate limited", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, current_count: 5, reset_at: futureDate }],
      error: null,
    });

    const result = await withRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
    expect(result.headers["X-RateLimit-Limit"]).toBe("20");
    expect(result.headers["X-RateLimit-Remaining"]).toBe("15");
    expect(result.headers["X-RateLimit-Reset"]).toBe(futureDate);
    expect(result.headers["Retry-After"]).toBeUndefined();
  });

  it("should return allowed=false with response and Retry-After header when blocked", async () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: false, current_count: 20, reset_at: futureDate }],
      error: null,
    });

    const result = await withRateLimit("user-123", "generate-recipe");

    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response!.error).toBe("Rate limit exceeded");
    expect(result.headers["X-RateLimit-Limit"]).toBe("20");
    expect(result.headers["X-RateLimit-Remaining"]).toBe("0");
    expect(result.headers["Retry-After"]).toBeDefined();
    expect(Number(result.headers["Retry-After"])).toBeGreaterThanOrEqual(0);
  });

  it("should include all required rate limit headers", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, current_count: 0, reset_at: futureDate }],
      error: null,
    });

    const result = await withRateLimit("user-123", "ai-chat");

    expect(result.headers).toHaveProperty("X-RateLimit-Limit");
    expect(result.headers).toHaveProperty("X-RateLimit-Remaining");
    expect(result.headers).toHaveProperty("X-RateLimit-Reset");
    expect(result.headers["X-RateLimit-Limit"]).toBe("100"); // ai-chat limit
  });
});
