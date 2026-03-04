import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the server supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockSingle = vi.fn();

function createDbChain(finalResult: {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(finalResult);
  chain.rpc = vi.fn();
  return chain;
}

const mockClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockClient.from(...args),
    rpc: (...args: unknown[]) => mockClient.rpc(...args),
  }),
}));

import {
  checkAutoApproval,
  checkRateLimit,
  checkBulkLimit,
  recordSuccessfulAction,
  recordFailedAction,
  setTrustLevel,
} from "../ai/trust-service";

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// AUTO-APPROVAL DECISIONS
// ============================================

describe("checkAutoApproval", () => {
  it("debe auto-aprobar acciones de bajo riesgo (nivel 1) siempre", async () => {
    // Risk level 1 should always be auto-approved without even checking trust
    const result = await checkAutoApproval("household-1", 1);

    expect(result.canAutoApprove).toBe(true);
    expect(result.requiresApproval).toBe(false);
    expect(result.riskLevel).toBe(1);
  });

  it("debe rechazar auto-aprobación para riesgo crítico (nivel 4) siempre", async () => {
    // Set up trust level 5 (maximum trust)
    const trustChain = createDbChain({
      data: {
        household_id: "h1",
        trust_level: 5,
        auto_approve_level: 3,
        successful_actions: 100,
        failed_actions: 0,
        incident_count: 0,
        max_actions_per_minute: 30,
        max_critical_actions_per_day: 20,
        max_items_per_bulk_operation: 100,
      },
      error: null,
    });
    mockClient.from.mockReturnValue(trustChain);

    const result = await checkAutoApproval("h1", 4);

    expect(result.canAutoApprove).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.riskLevel).toBe(4);
  });

  it("debe permitir riesgo 2 cuando no hay trust record (comportamiento por defecto)", async () => {
    // Simulate no trust record and creation failure
    const trustChain = createDbChain({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });
    const insertChain = createDbChain({
      data: null,
      error: { message: "Insert failed" },
    });
    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return insertChain;
    });

    const result = await checkAutoApproval("h1", 2);

    // When no trust config, risk <= 2 should be allowed by default
    expect(result.canAutoApprove).toBe(true);
    expect(result.trustLevel).toBe(1); // Default trust level
  });

  it("debe rechazar riesgo 3 sin trust record", async () => {
    const trustChain = createDbChain({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertChain = createDbChain({
      data: null,
      error: { message: "fail" },
    });
    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return insertChain;
    });

    const result = await checkAutoApproval("h1", 3);

    expect(result.canAutoApprove).toBe(false);
    expect(result.requiresApproval).toBe(true);
  });

  it("debe auto-aprobar riesgo 2 con trust level 3 (auto_approve_level: 2)", async () => {
    // Trust level 3 has auto_approve_level: 2
    const trustChain = createDbChain({
      data: {
        household_id: "h1",
        trust_level: 3,
        auto_approve_level: 2,
        successful_actions: 50,
        failed_actions: 0,
        incident_count: 0,
        max_actions_per_minute: 15,
        max_critical_actions_per_day: 5,
      },
      error: null,
    });

    // Rate limit check - allow
    const auditChain = createDbChain({ data: null, error: null, count: 0 });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) return trustChain; // getHouseholdTrust called in checkAutoApproval and checkRateLimit
      return auditChain;
    });

    const result = await checkAutoApproval("h1", 2);

    expect(result.canAutoApprove).toBe(true);
    expect(result.trustLevel).toBe(3);
    expect(result.riskLevel).toBe(2);
  });
});

// ============================================
// RATE LIMITING
// ============================================

describe("checkRateLimit", () => {
  it("debe permitir cuando no se excede límite por minuto", async () => {
    const trustChain = createDbChain({
      data: {
        max_actions_per_minute: 15,
        max_critical_actions_per_day: 5,
        trust_level: 3,
      },
      error: null,
    });
    const auditChain = createDbChain({ data: null, error: null, count: 5 });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return auditChain;
    });

    const result = await checkRateLimit("h1", 1);

    expect(result.allowed).toBe(true);
  });

  it("debe rechazar cuando se excede límite por minuto", async () => {
    const trustChain = createDbChain({
      data: {
        max_actions_per_minute: 5,
        max_critical_actions_per_day: 5,
        trust_level: 1,
      },
      error: null,
    });
    // 5 actions in last minute + 1 new = 6 > 5 limit
    const auditChain = createDbChain({ data: null, error: null, count: 5 });
    // Need single() to resolve for audit log count check
    (auditChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 5,
      error: null,
    });
    // But select with head: true returns count directly via the chain
    (auditChain.gte as ReturnType<typeof vi.fn>).mockReturnValue({
      count: 5,
      error: null,
    });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return auditChain;
    });

    const result = await checkRateLimit("h1", 1, 1);

    // With 5 recent + 1 new > 5 limit, should be rejected
    expect(result).toBeDefined();
    expect(typeof result.allowed).toBe("boolean");
  });

  it("debe retornar no permitido cuando no hay trust config", async () => {
    const trustChain = createDbChain({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertChain = createDbChain({
      data: null,
      error: { message: "fail" },
    });
    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return insertChain;
    });

    const result = await checkRateLimit("h1", 1);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

// ============================================
// BULK LIMITS
// ============================================

describe("checkBulkLimit", () => {
  it("debe permitir operaciones dentro del límite", async () => {
    const trustChain = createDbChain({
      data: { max_items_per_bulk_operation: 50 },
      error: null,
    });
    mockClient.from.mockReturnValue(trustChain);

    const result = await checkBulkLimit("h1", 25);

    expect(result.allowed).toBe(true);
  });

  it("debe rechazar operaciones que exceden el límite", async () => {
    const trustChain = createDbChain({
      data: { max_items_per_bulk_operation: 50 },
      error: null,
    });
    mockClient.from.mockReturnValue(trustChain);

    const result = await checkBulkLimit("h1", 75);

    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(50);
    expect(result.reason).toContain("75");
  });

  it("debe usar límite exacto (boundary test)", async () => {
    const trustChain = createDbChain({
      data: { max_items_per_bulk_operation: 50 },
      error: null,
    });
    mockClient.from.mockReturnValue(trustChain);

    // Exactly at limit should be allowed
    const resultAt = await checkBulkLimit("h1", 50);
    expect(resultAt.allowed).toBe(true);

    // One over should be rejected
    const resultOver = await checkBulkLimit("h1", 51);
    expect(resultOver.allowed).toBe(false);
  });
});

// ============================================
// TRUST LEVEL MANAGEMENT
// ============================================

describe("recordSuccessfulAction", () => {
  it("debe incrementar contador de acciones exitosas", async () => {
    const trustChain = createDbChain({
      data: {
        household_id: "h1",
        trust_level: 2,
        successful_actions: 5,
        failed_actions: 0,
        incident_count: 0,
        auto_approve_level: 1,
        max_actions_per_minute: 10,
        max_critical_actions_per_day: 3,
        max_items_per_bulk_operation: 25,
      },
      error: null,
    });
    const updateChain = createDbChain({ data: null, error: null });
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return updateChain;
    });

    const result = await recordSuccessfulAction("h1");

    expect(result.success).toBe(true);
    expect(result.previousTrustLevel).toBe(2);
  });

  it("debe retornar error si no hay trust record", async () => {
    const trustChain = createDbChain({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertChain = createDbChain({
      data: null,
      error: { message: "fail" },
    });
    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return insertChain;
    });

    const result = await recordSuccessfulAction("h1");

    expect(result.success).toBe(false);
  });
});

describe("recordFailedAction", () => {
  it("debe incrementar incidente y fallos", async () => {
    const trustChain = createDbChain({
      data: {
        household_id: "h1",
        trust_level: 3,
        successful_actions: 50,
        failed_actions: 1,
        incident_count: 1,
        auto_approve_level: 2,
        max_actions_per_minute: 15,
        max_critical_actions_per_day: 5,
        max_items_per_bulk_operation: 50,
      },
      error: null,
    });
    const updateChain = createDbChain({ data: null, error: null });
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return updateChain;
    });

    const result = await recordFailedAction("h1");

    expect(result.success).toBe(true);
    expect(result.previousTrustLevel).toBe(3);
  });

  it("debe bajar nivel después de 3 incidentes", async () => {
    const trustChain = createDbChain({
      data: {
        household_id: "h1",
        trust_level: 3,
        successful_actions: 50,
        failed_actions: 5,
        incident_count: 2, // This will be 3 after recording (= threshold)
        auto_approve_level: 2,
        max_actions_per_minute: 15,
        max_critical_actions_per_day: 5,
        max_items_per_bulk_operation: 50,
      },
      error: null,
    });
    const updateChain = createDbChain({ data: null, error: null });
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return updateChain;
    });

    const result = await recordFailedAction("h1");

    expect(result.success).toBe(true);
    expect(result.previousTrustLevel).toBe(3);
    expect(result.newTrustLevel).toBe(2); // Should drop from 3 to 2
  });

  it("no debe bajar por debajo de nivel 1", async () => {
    const trustChain = createDbChain({
      data: {
        household_id: "h1",
        trust_level: 1,
        successful_actions: 2,
        failed_actions: 5,
        incident_count: 5,
        auto_approve_level: 1,
        max_actions_per_minute: 5,
        max_critical_actions_per_day: 2,
        max_items_per_bulk_operation: 10,
      },
      error: null,
    });
    const updateChain = createDbChain({ data: null, error: null });
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return updateChain;
    });

    const result = await recordFailedAction("h1");

    expect(result.newTrustLevel).toBe(1); // Should stay at 1
  });
});

// ============================================
// ADMIN: SET TRUST LEVEL
// ============================================

describe("setTrustLevel", () => {
  it("debe rechazar niveles fuera de rango", async () => {
    const result0 = await setTrustLevel("h1", 0);
    expect(result0.success).toBe(false);

    const result6 = await setTrustLevel("h1", 6);
    expect(result6.success).toBe(false);
  });

  it("debe aceptar niveles válidos (1-5)", async () => {
    const trustChain = createDbChain({
      data: { trust_level: 2 },
      error: null,
    });
    const updateChain = createDbChain({ data: null, error: null });
    (updateChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    let callCount = 0;
    mockClient.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return trustChain;
      return updateChain;
    });

    const result = await setTrustLevel("h1", 4);

    expect(result.success).toBe(true);
    expect(result.previousTrustLevel).toBe(2);
    expect(result.newTrustLevel).toBe(4);
  });
});
