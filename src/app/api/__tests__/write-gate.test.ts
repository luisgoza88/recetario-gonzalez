import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del command-service: la compuerta consulta el registry de riesgo y la
// política de auto-aprobación del hogar, y aquí queremos controlarlos.
const mocks = vi.hoisted(() => ({
  getFunctionRiskLevel: vi.fn(),
  shouldCreateProposal: vi.fn(),
}));

vi.mock("@/lib/ai/ai-command-service", () => ({
  getFunctionRiskLevel: mocks.getFunctionRiskLevel,
  shouldCreateProposal: mocks.shouldCreateProposal,
  AI_RISK_LEVELS: { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 },
}));

import {
  isWriteFunction,
  partitionCalls,
  needsHumanApproval,
  ALWAYS_REQUIRE_APPROVAL,
  WRITE_FUNCTIONS,
} from "../ai-assistant/write-gate";

const HOUSEHOLD = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getFunctionRiskLevel.mockResolvedValue(1);
  mocks.shouldCreateProposal.mockResolvedValue(false);
});

describe("isWriteFunction", () => {
  it("reconoce mutaciones", () => {
    expect(isWriteFunction("swap_menu_recipe")).toBe(true);
    expect(isWriteFunction("delete_recipe")).toBe(true);
    expect(isWriteFunction("update_inventory")).toBe(true);
  });

  it("no marca las consultas como escritura", () => {
    expect(isWriteFunction("get_today_menu")).toBe(false);
    expect(isWriteFunction("search_recipes")).toBe(false);
    expect(isWriteFunction("get_inventory")).toBe(false);
  });

  it("no marca funciones desconocidas como escritura (fail-closed hacia lectura)", () => {
    expect(isWriteFunction("funcion_inventada")).toBe(false);
  });

  it("toda funcion destructiva esta tambien en el catalogo de escrituras", () => {
    for (const name of ALWAYS_REQUIRE_APPROVAL) {
      expect(WRITE_FUNCTIONS.has(name)).toBe(true);
    }
  });
});

describe("partitionCalls", () => {
  it("separa lecturas de escrituras conservando el orden", () => {
    const { reads, writes } = partitionCalls([
      { name: "get_today_menu" },
      { name: "swap_menu_recipe" },
      { name: "get_inventory" },
      { name: "delete_recipe" },
    ]);
    expect(reads.map((r) => r.name)).toEqual([
      "get_today_menu",
      "get_inventory",
    ]);
    expect(writes.map((w) => w.name)).toEqual([
      "swap_menu_recipe",
      "delete_recipe",
    ]);
  });

  it("maneja el caso vacio", () => {
    expect(partitionCalls([])).toEqual({ reads: [], writes: [] });
  });
});

describe("needsHumanApproval", () => {
  it("no pide aprobacion si no hay escrituras", async () => {
    await expect(needsHumanApproval([], HOUSEHOLD)).resolves.toBe(false);
    expect(mocks.getFunctionRiskLevel).not.toHaveBeenCalled();
  });

  it("SIEMPRE pide aprobacion para funciones destructivas, aunque el registry las marque como riesgo bajo", async () => {
    mocks.getFunctionRiskLevel.mockResolvedValue(1); // el registry miente
    mocks.shouldCreateProposal.mockResolvedValue(false); // y el trust auto-aprueba

    for (const destructive of ALWAYS_REQUIRE_APPROVAL) {
      await expect(
        needsHumanApproval([{ name: destructive }], HOUSEHOLD),
      ).resolves.toBe(true);
    }
  });

  it("pide aprobacion cuando el riesgo maximo es HIGH", async () => {
    mocks.getFunctionRiskLevel.mockResolvedValue(3);
    await expect(
      needsHumanApproval([{ name: "swap_menu_recipe" }], HOUSEHOLD),
    ).resolves.toBe(true);
  });

  it("pide aprobacion si UNA sola de varias escrituras es de riesgo alto", async () => {
    mocks.getFunctionRiskLevel.mockImplementation(async (name: string) =>
      name === "create_employee" ? 3 : 1,
    );
    await expect(
      needsHumanApproval(
        [{ name: "add_to_shopping_list" }, { name: "create_employee" }],
        HOUSEHOLD,
      ),
    ).resolves.toBe(true);
  });

  it("delega en la politica del hogar cuando el riesgo es bajo/medio", async () => {
    mocks.getFunctionRiskLevel.mockResolvedValue(2);
    mocks.shouldCreateProposal.mockResolvedValue(true);

    await expect(
      needsHumanApproval([{ name: "update_inventory" }], HOUSEHOLD),
    ).resolves.toBe(true);
    expect(mocks.shouldCreateProposal).toHaveBeenCalledWith(
      ["update_inventory"],
      HOUSEHOLD,
    );
  });

  it("ejecuta directo cuando el riesgo es bajo y el hogar auto-aprueba", async () => {
    mocks.getFunctionRiskLevel.mockResolvedValue(1);
    mocks.shouldCreateProposal.mockResolvedValue(false);

    await expect(
      needsHumanApproval([{ name: "mark_shopping_item" }], HOUSEHOLD),
    ).resolves.toBe(false);
  });

  it("pide aprobacion para riesgo CRITICAL", async () => {
    mocks.getFunctionRiskLevel.mockResolvedValue(4);
    await expect(
      needsHumanApproval([{ name: "update_recipe" }], HOUSEHOLD),
    ).resolves.toBe(true);
  });
});
