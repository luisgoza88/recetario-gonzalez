import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeProposal,
  assertExecutionSucceeded,
  executeActionWithLogging,
  rollbackProposal,
  FunctionExecutor,
} from "../proposal-executor";
import type { AIProposal, AIProposedAction, AIRiskLevel } from "@/types";

// Mock Supabase client
const mockDb: Record<string, ReturnType<typeof vi.fn>> = {
  from: vi.fn(() => mockDb),
  select: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  eq: vi.fn(() => mockDb),
  single: vi.fn(() => ({ data: null, error: null })),
  rpc: vi.fn(() => ({ data: true, error: null })),
};

vi.mock("@/lib/supabase/server", () => ({
  createAuthenticatedClient: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("../ai-command-service", () => ({
  createAuditLog: vi.fn(() => Promise.resolve("audit-log-123")),
  completeAuditLog: vi.fn(() => Promise.resolve(true)),
  getProposal: vi.fn(),
  generateSessionId: vi.fn(() => "session-123"),
  rollbackAction: vi.fn(() =>
    Promise.resolve({ success: true, function_name: "test_fn" }),
  ),
  getFunctionConfig: vi.fn(() => Promise.resolve({ risk_level: 2 })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper para crear propuesta mock
function createMockProposal(
  status: AIProposal["status"] = "approved",
  actions: AIProposedAction[] = [],
): AIProposal {
  return {
    id: "id-123",
    proposal_id: "proposal-123",
    household_id: "household-123",
    user_id: "user-123",
    session_id: "session-123",
    summary: "Test proposal",
    risk_level: 2 as AIRiskLevel,
    actions,
    status,
    tables_affected: ["test_table"],
    records_affected: actions.length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  };
}

function createMockAction(
  overrides?: Partial<AIProposedAction>,
): AIProposedAction {
  return {
    id: "action-123",
    function_name: "swap_menu_recipe",
    parameters: { day_number: 1, new_recipe_id: "recipe-456" },
    description: "Swap recipe",
    description_es: "Cambiar receta",
    risk_level: 2 as AIRiskLevel,
    is_reversible: true,
    ...overrides,
  };
}

// Mock executor
class MockExecutor implements FunctionExecutor {
  shouldFail = false;
  executedFunctions: string[] = [];

  async execute(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    this.executedFunctions.push(functionName);
    if (this.shouldFail) {
      throw new Error("Execution failed");
    }
    return { success: true, data: args };
  }

  reset() {
    this.shouldFail = false;
    this.executedFunctions = [];
  }
}

describe("proposal-executor", () => {
  const mockExecutor = new MockExecutor();

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutor.reset();
    mockDb.from.mockReturnValue(mockDb);
    mockDb.select.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.eq.mockReturnValue(mockDb);
  });

  describe("executeProposal", () => {
    it("should execute approved proposal successfully", async () => {
      const action = createMockAction();
      const proposal = createMockProposal("approved", [action]);

      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(proposal);

      // Mock state capture: day_menu antes de ejecutar
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: "menu-1",
          household_id: "household-123",
          day_number: 1,
          breakfast_id: "old-recipe",
        },
        error: null,
      });
      // Mock state capture: day_menu después de ejecutar
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: "menu-1",
          household_id: "household-123",
          day_number: 1,
          breakfast_id: "recipe-456",
        },
        error: null,
      });

      const result = await executeProposal(
        "proposal-123",
        mockExecutor,
        "household-123",
        "user-123",
      );

      expect(result.success).toBe(true);
      expect(result.executed_actions).toHaveLength(1);
      expect(result.failed_actions).toBeUndefined();
      expect(result.can_rollback).toBe(true);
      expect(mockExecutor.executedFunctions).toContain("swap_menu_recipe");
    });

    it("does not offer rollback without complete snapshots", async () => {
      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(
        createMockProposal("approved", [createMockAction()]),
      );
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });
      const result = await executeProposal(
        "proposal-123",
        mockExecutor,
        "household-123",
        "user-123",
      );
      expect(result.success).toBe(true);
      expect(result.can_rollback).toBe(false);
    });

    it("should capture pre-state before execution", async () => {
      const action = createMockAction({
        function_name: "swap_menu_recipe",
        parameters: { day_number: 1, new_recipe_id: "recipe-456" },
      });
      const proposal = createMockProposal("approved", [action]);

      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(proposal);

      // Mock day_menu pre-state
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: "menu-1",
          household_id: "household-123",
          day_number: 1,
          breakfast_id: "old-recipe",
        },
        error: null,
      });
      // Mock day_menu post-state
      mockDb.single.mockResolvedValueOnce({
        data: {
          id: "menu-1",
          household_id: "household-123",
          day_number: 1,
          breakfast_id: "recipe-456",
        },
        error: null,
      });

      const result = await executeProposal(
        "proposal-123",
        mockExecutor,
        "household-123",
      );

      expect(result.success).toBe(true);
      const { completeAuditLog } = await import("../ai-command-service");
      // Verificar que completeAuditLog fue llamado con previousState
      expect(completeAuditLog).toHaveBeenCalled();
      const callArgs = vi.mocked(completeAuditLog).mock.calls[0][0];
      expect(callArgs).toHaveProperty("previousState");
      expect(callArgs).toHaveProperty("newState");
      expect(callArgs).toHaveProperty("status", "completed");
    });

    it("should return error if proposal not found", async () => {
      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(null);

      const result = await executeProposal(
        "invalid-proposal",
        mockExecutor,
        "household-123",
      );

      expect(result.success).toBe(false);
      expect(result.failed_actions?.[0]?.error).toContain("not found");
      expect(result.can_rollback).toBe(false);
    });

    it("should return error if proposal status is not approved", async () => {
      const proposal = createMockProposal("pending", []);
      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(proposal);

      const result = await executeProposal(
        "proposal-123",
        mockExecutor,
        "household-123",
      );

      expect(result.success).toBe(false);
      expect(result.failed_actions?.[0]?.error).toContain("Invalid status");
    });

    it("should handle execution errors and log them", async () => {
      const action = createMockAction();
      const proposal = createMockProposal("approved", [action]);

      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(proposal);

      mockExecutor.shouldFail = true;

      const result = await executeProposal(
        "proposal-123",
        mockExecutor,
        "household-123",
      );

      expect(result.success).toBe(false);
      expect(result.failed_actions).toHaveLength(1);
      expect(result.failed_actions?.[0]?.error).toContain("Execution failed");
    });

    it("should execute only approved actions in partially_approved proposal", async () => {
      const action1 = createMockAction({
        id: "action-1",
        function_name: "update_inventory",
      });
      const action2 = createMockAction({
        id: "action-2",
        function_name: "mark_shopping_item",
      });
      const proposal = createMockProposal("partially_approved", [
        action1,
        action2,
      ]);
      proposal.approved_actions = ["action-1"]; // Solo action-1 aprobada

      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(proposal);

      const result = await executeProposal(
        "proposal-123",
        mockExecutor,
        "household-123",
      );

      expect(result.executed_actions).toHaveLength(1);
      expect(mockExecutor.executedFunctions).toEqual(["update_inventory"]);
      expect(mockExecutor.executedFunctions).not.toContain(
        "mark_shopping_item",
      );
    });
  });

  describe("executeActionWithLogging", () => {
    it("should execute single action with audit log", async () => {
      const result = await executeActionWithLogging(
        "update_inventory",
        { item_name: "Ajo", new_quantity: "200g" },
        mockExecutor,
        "household-123",
        "user-123",
      );

      expect(result.success).toBe(true);
      expect(result.audit_log_id).toBe("audit-log-123");
      expect(result.can_rollback).toBe(false); // No pre-state captured in this mock
    });

    it("should return error on execution failure", async () => {
      mockExecutor.shouldFail = true;

      const result = await executeActionWithLogging(
        "invalid_function",
        {},
        mockExecutor,
        "household-123",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Execution failed");
      expect(result.can_rollback).toBe(false);
    });
  });

  describe("rollbackProposal", () => {
    it("should rollback all actions in reverse order", async () => {
      const proposal = createMockProposal("completed", [
        createMockAction({ id: "action-1" }),
        createMockAction({ id: "action-2" }),
      ]);
      proposal.audit_log_ids = ["log-1", "log-2"];

      const { getProposal, rollbackAction } = await import(
        "../ai-command-service"
      );
      vi.mocked(getProposal).mockResolvedValue(proposal);
      vi.mocked(rollbackAction).mockResolvedValue({
        success: true,
        audit_log_id: "log-1",
        function_name: "swap_menu_recipe",
      });

      const result = await rollbackProposal(
        "proposal-123",
        "user-123",
        "Test rollback",
      );

      expect(result.success).toBe(true);
      expect(result.rolled_back).toBe(2);
      expect(result.failed).toBe(0);
      expect(rollbackAction).toHaveBeenCalledTimes(2);
      // Verificar orden inverso
      expect(rollbackAction).toHaveBeenNthCalledWith(
        1,
        "log-2",
        "user-123",
        "Test rollback",
      );
      expect(rollbackAction).toHaveBeenNthCalledWith(
        2,
        "log-1",
        "user-123",
        "Test rollback",
      );
    });

    it("should return error if no audit logs found", async () => {
      const proposal = createMockProposal("completed", []);
      proposal.audit_log_ids = [];

      const { getProposal } = await import("../ai-command-service");
      vi.mocked(getProposal).mockResolvedValue(proposal);

      const result = await rollbackProposal("proposal-123", "user-123");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("No audit logs found for proposal");
    });

    it("should handle partial rollback failures", async () => {
      const proposal = createMockProposal("completed", []);
      proposal.audit_log_ids = ["log-1", "log-2"];

      const { getProposal, rollbackAction } = await import(
        "../ai-command-service"
      );
      vi.mocked(getProposal).mockResolvedValue(proposal);
      vi.mocked(rollbackAction)
        .mockResolvedValueOnce({
          success: true,
          audit_log_id: "log-2",
          function_name: "fn1",
        })
        .mockResolvedValueOnce({
          success: false,
          audit_log_id: "log-1",
          function_name: "fn2",
          error: "Rollback failed",
        });

      const result = await rollbackProposal("proposal-123", "user-123");

      expect(result.success).toBe(false);
      expect(result.rolled_back).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Rollback failed");
    });
  });
});

describe("returned tool failures", () => {
  it.each([
    { error: "Unsupported function" },
    { success: false, message: "No guardado" },
  ])("rejects %j", async (failure) => {
    const { getProposal } = await import("../ai-command-service");
    vi.mocked(getProposal).mockResolvedValue(
      createMockProposal("approved", [createMockAction()]),
    );
    const result = await executeProposal(
      "proposal-123",
      { execute: async () => failure },
      "household-123",
      "user-123",
    );
    expect(result.success).toBe(false);
    expect(result.executed_actions).toHaveLength(0);
    expect(result.failed_actions).toHaveLength(1);
  });
  it("refuses a proposal from another household before dispatch", async () => {
    const { getProposal } = await import("../ai-command-service");
    vi.mocked(getProposal).mockResolvedValue(
      createMockProposal("approved", [createMockAction()]),
    );
    const execute = vi.fn();
    const result = await executeProposal(
      "proposal-123",
      { execute },
      "other-household",
      "user-123",
    );
    expect(result.success).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });
  it("accepts successful tools with a null error field", () => {
    expect(() =>
      assertExecutionSucceeded({ data: {}, error: null }),
    ).not.toThrow();
  });
});
