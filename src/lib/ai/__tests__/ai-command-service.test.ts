import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFunctionRiskLevel,
  requiresConfirmation,
  shouldAutoApprove,
  shouldCreateProposal,
  createAuditLog,
  completeAuditLog,
  createProposal,
  getProposal,
  approveProposal,
  rejectProposal,
  generateSessionId,
  functionCallToProposedAction,
  AI_RISK_LEVELS,
} from "../ai-command-service";
import type { AIRiskLevel, HouseholdAITrust } from "@/types";

// Mock Supabase client
const mockDb: Record<string, ReturnType<typeof vi.fn>> = {
  from: vi.fn(() => mockDb),
  select: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  eq: vi.fn(() => mockDb),
  single: vi.fn(() => ({ data: null, error: null })),
  rpc: vi.fn(() => ({ data: null, error: null })),
};

vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock trust service - must be factory function for hoisting
vi.mock("../trust-service", () => ({
  checkAutoApproval: vi.fn(() =>
    Promise.resolve({
      canAutoApprove: true,
      requiresApproval: false,
      reason: "Trust level allows",
      trustLevel: 3,
      riskLevel: 2,
    }),
  ),
  getHouseholdTrust: vi.fn(() =>
    Promise.resolve({
      household_id: "household-123",
      trust_level: 3,
      auto_approve_level: 2,
      successful_actions: 25,
      failed_actions: 2,
      rolled_back_actions: 1,
    }),
  ),
  recordSuccessfulAction: vi.fn(),
  recordFailedAction: vi.fn(),
  checkRateLimit: vi.fn(),
  checkBulkLimit: vi.fn(),
  recordRollback: vi.fn(),
  getTrustStats: vi.fn(),
}));

describe("ai-command-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.from.mockReturnValue(mockDb);
    mockDb.select.mockReturnValue(mockDb);
    mockDb.eq.mockReturnValue(mockDb);
  });

  describe("getFunctionRiskLevel", () => {
    it("should return LOW for read-only functions", async () => {
      const readFunctions = [
        "get_menu",
        "search_recipes",
        "list_tasks",
        "suggest_replacement",
        "calculate_nutrition",
      ];

      for (const fn of readFunctions) {
        const level = await getFunctionRiskLevel(fn);
        expect(level).toBe(AI_RISK_LEVELS.LOW);
      }
    });

    it("should return MEDIUM for write functions without config", async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.eq.mockReturnValue(mockDb);
      mockDb.single.mockResolvedValue({ data: null, error: null });

      const level = await getFunctionRiskLevel("unknown_function");
      expect(level).toBe(AI_RISK_LEVELS.MEDIUM);
    });

    it("should return valid risk level for write functions", async () => {
      const level = await getFunctionRiskLevel("update_inventory");
      // Should be MEDIUM or higher for write functions
      expect(level).toBeGreaterThanOrEqual(AI_RISK_LEVELS.MEDIUM);
      expect(level).toBeLessThanOrEqual(AI_RISK_LEVELS.CRITICAL);
    });
  });

  describe("requiresConfirmation", () => {
    it("should return boolean for any function", async () => {
      const result = await requiresConfirmation("some_function");
      expect(typeof result).toBe("boolean");
    });
  });

  describe("shouldAutoApprove", () => {
    it("should allow auto-approval for LOW risk with high trust", async () => {
      const result = await shouldAutoApprove(
        "household-123",
        AI_RISK_LEVELS.LOW as AIRiskLevel,
        1,
      );

      expect(result).toBe(true);
    });

    it("should block auto-approval for CRITICAL risk", async () => {
      const { checkAutoApproval } = await import("../trust-service");
      vi.mocked(checkAutoApproval).mockResolvedValueOnce({
        canAutoApprove: false,
        requiresApproval: true,
        reason: "Risk level too high",
        trustLevel: 2,
        riskLevel: 4,
      });

      const result = await shouldAutoApprove(
        "household-123",
        AI_RISK_LEVELS.CRITICAL as AIRiskLevel,
        1,
      );

      expect(result).toBe(false);
    });
  });

  describe("shouldCreateProposal", () => {
    it("should return boolean decision", async () => {
      const result = await shouldCreateProposal(["get_menu"], "household-123");
      expect(typeof result).toBe("boolean");
    });

    it("should handle multiple functions", async () => {
      const result = await shouldCreateProposal(
        ["get_menu", "update_inventory"],
        "household-123",
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("createAuditLog", () => {
    it("should create audit log entry via RPC", async () => {
      mockDb.rpc.mockResolvedValue({ data: "audit-log-456", error: null });

      const logId = await createAuditLog({
        householdId: "household-123",
        userId: "user-123",
        sessionId: "session-123",
        functionName: "update_inventory",
        parameters: { item_name: "Tomate", quantity: "2kg" },
        riskLevel: 2 as AIRiskLevel,
      });

      expect(logId).toBe("audit-log-456");
      expect(mockDb.rpc).toHaveBeenCalledWith(
        "create_ai_audit_log",
        expect.objectContaining({
          p_household_id: "household-123",
          p_function_name: "update_inventory",
          p_risk_level: 2,
        }),
      );
    });

    it("should return null on RPC error", async () => {
      mockDb.rpc.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const logId = await createAuditLog({
        householdId: "household-123",
        sessionId: "session-123",
        functionName: "test",
        parameters: {},
        riskLevel: 1 as AIRiskLevel,
      });

      expect(logId).toBe(null);
    });
  });

  describe("completeAuditLog", () => {
    it("should complete audit log with success status", async () => {
      mockDb.rpc.mockResolvedValue({ data: true, error: null });

      const result = await completeAuditLog({
        logId: "log-123",
        status: "completed",
        result: { success: true, data: {} },
        previousState: { inventory: { current_number: 5 } },
        newState: { inventory: { current_number: 2 } },
        affectedTables: ["inventory"],
      });

      expect(result).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith(
        "complete_ai_audit_log",
        expect.objectContaining({
          p_log_id: "log-123",
          p_status: "completed",
        }),
      );
    });

    it("should handle failed status with error message", async () => {
      mockDb.rpc.mockResolvedValue({ data: true, error: null });

      const result = await completeAuditLog({
        logId: "log-456",
        status: "failed",
        errorMessage: "Execution timeout",
      });

      expect(result).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith(
        "complete_ai_audit_log",
        expect.objectContaining({
          p_status: "failed",
          p_error_message: "Execution timeout",
        }),
      );
    });
  });

  describe("createProposal", () => {
    it("should create proposal with multiple actions", async () => {
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.select.mockReturnValue(mockDb);
      mockDb.single.mockResolvedValue({
        data: {
          proposal_id: "proposal-789",
          status: "pending",
          actions: [{ id: "action-1" }, { id: "action-2" }],
        },
        error: null,
      });

      const proposal = await createProposal({
        householdId: "household-123",
        userId: "user-123",
        sessionId: "session-123",
        summary: "Update menu for week",
        actions: [
          {
            id: "action-1",
            function_name: "swap_menu_recipe",
            parameters: { day_number: 1 },
            description: "Change recipe",
            description_es: "Cambiar receta",
            risk_level: 2 as AIRiskLevel,
            is_reversible: true,
          },
          {
            id: "action-2",
            function_name: "update_inventory",
            parameters: { item_name: "Arroz" },
            description: "Update inventory",
            description_es: "Actualizar inventario",
            risk_level: 2 as AIRiskLevel,
            is_reversible: true,
          },
        ],
      });

      expect(proposal).toBeDefined();
      expect(proposal?.proposal_id).toBe("proposal-789");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should calculate max risk level from actions", async () => {
      mockDb.insert.mockReturnValue(mockDb);
      mockDb.select.mockReturnValue(mockDb);
      mockDb.single.mockResolvedValue({
        data: { proposal_id: "p1", risk_level: 4 },
        error: null,
      });

      await createProposal({
        householdId: "household-123",
        sessionId: "session-123",
        summary: "Mixed risk actions",
        actions: [
          {
            id: "a1",
            function_name: "get_menu",
            parameters: {},
            description: "Low",
            description_es: "Bajo",
            risk_level: 1 as AIRiskLevel,
            is_reversible: true,
          },
          {
            id: "a2",
            function_name: "delete_all_recipes",
            parameters: {},
            description: "Critical",
            description_es: "Critico",
            risk_level: 4 as AIRiskLevel,
            is_reversible: false,
          },
        ],
      });

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk_level: 4, // Max risk
        }),
      );
    });
  });

  describe("getProposal", () => {
    it("should fetch proposal by ID", async () => {
      mockDb.select.mockReturnValue(mockDb);
      mockDb.eq.mockReturnValue(mockDb);
      mockDb.single.mockResolvedValue({
        data: { proposal_id: "p1", status: "pending" },
        error: null,
      });

      const proposal = await getProposal("p1");

      expect(proposal).toBeDefined();
      expect(proposal?.proposal_id).toBe("p1");
    });

    it("should return null if not found", async () => {
      mockDb.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const proposal = await getProposal("nonexistent");

      expect(proposal).toBe(null);
    });
  });

  describe("approveProposal", () => {
    it("should approve proposal via RPC", async () => {
      mockDb.rpc.mockResolvedValue({ data: true, error: null });

      const result = await approveProposal("p1", "user-123", "Looks good");

      expect(result).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith(
        "decide_ai_proposal",
        expect.objectContaining({
          p_proposal_id: "p1",
          p_decision: "approved",
          p_decision_by: "user-123",
          p_notes: "Looks good",
        }),
      );
    });
  });

  describe("rejectProposal", () => {
    it("should reject proposal via RPC", async () => {
      mockDb.rpc.mockResolvedValue({ data: true, error: null });

      const result = await rejectProposal("p1", "user-123", "Too risky");

      expect(result).toBe(true);
      expect(mockDb.rpc).toHaveBeenCalledWith(
        "decide_ai_proposal",
        expect.objectContaining({
          p_decision: "rejected",
          p_notes: "Too risky",
        }),
      );
    });
  });

  describe("generateSessionId", () => {
    it("should generate unique session ID", () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });
  });

  describe("functionCallToProposedAction", () => {
    it("should convert function call to proposed action", async () => {
      const action = await functionCallToProposedAction(
        "swap_menu_recipe",
        { day_number: 3, new_recipe_id: "recipe-789" },
        "Swap recipe on day 3",
      );

      expect(action.function_name).toBe("swap_menu_recipe");
      expect(action.parameters).toEqual({
        day_number: 3,
        new_recipe_id: "recipe-789",
      });
      expect(action.description).toBe("Swap recipe on day 3");
      expect(action.risk_level).toBeGreaterThanOrEqual(1);
      expect(action.id).toBeTruthy();
    });
  });
});
