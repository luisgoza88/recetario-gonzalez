import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock requireAuth first
vi.mock("@/lib/api/auth", () => ({
  requireAuth: vi.fn((request: NextRequest) => ({ userId: "user-123" })),
}));

// Mock Gemini client
const mockGenerateContent = vi.fn();
vi.mock("@/lib/gemini/client", () => ({
  getGeminiClient: vi.fn(() => ({
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  })),
  GEMINI_MODELS: { FLASH: "gemini-2.0-flash-exp" },
  GEMINI_CONFIG: { parsing: { temperature: 0.1, maxOutputTokens: 2048 } },
  cleanJsonResponse: vi.fn((input: string) => input),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { POST } from "../scan-receipt/route";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockImage(type = "image/jpeg", size = 1024): File {
  const bytes = new Uint8Array(size);
  const file = new File([bytes], "receipt.jpg", { type });
  // Ensure arrayBuffer() works in jsdom
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  file.arrayBuffer = () => Promise.resolve(buffer);
  return file;
}

function buildMockRequest(imageFile: File) {
  const request = new NextRequest("http://localhost/api/scan-receipt", {
    method: "POST",
  });

  // Mock formData() to avoid jsdom limitations
  const store = new Map<string, File | string>();
  store.set("image", imageFile);

  const fakeFormData = {
    get: (key: string) => store.get(key) ?? null,
    has: (key: string) => store.has(key),
    entries: () => store.entries(),
    keys: () => store.keys(),
  };

  vi.spyOn(request, "formData").mockResolvedValue(
    fakeFormData as unknown as FormData,
  );

  return request;
}

// ---------------------------------------------------------------------------
// Tests - Zod Validation of LLM Output
// ---------------------------------------------------------------------------

describe("POST /api/scan-receipt - Zod Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // VALID OUTPUT: LLM returns correct schema
  // -----------------------------------------------------------------------
  it("should return 200 when LLM output is valid", async () => {
    const validResponse = {
      items: [
        {
          name: "Leche entera",
          quantity: 2,
          unit: "litro",
          price: 4500,
          category: "lácteos",
          brand: "Alpina",
        },
      ],
      store: "Carulla",
      total: 9000,
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(validResponse) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].name).toBe("Leche entera");
  });

  // -----------------------------------------------------------------------
  // EDGE CASE: Missing "items" field (schema allows it via optional + passthrough)
  // -----------------------------------------------------------------------
  it("should return 200 with empty items when items field is missing", async () => {
    const responseWithoutItems = {
      store: "Carulla",
      total: 9000,
      // Missing "items" field — schema allows it via .optional()
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(responseWithoutItems) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toEqual([]); // Defaults to empty array when missing
  });

  // -----------------------------------------------------------------------
  // INVALID OUTPUT: items is not an array
  // -----------------------------------------------------------------------
  it("should return 502 when items is not an array", async () => {
    const invalidResponse = {
      items: "not-an-array",
      store: "Carulla",
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(invalidResponse) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toContain("formato inválido");
  });

  // -----------------------------------------------------------------------
  // INVALID OUTPUT: item missing "name" field
  // -----------------------------------------------------------------------
  it("should return 502 when item is missing name field", async () => {
    const invalidResponse = {
      items: [
        {
          // Missing "name" field
          quantity: 2,
          unit: "litro",
          price: 4500,
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(invalidResponse) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toContain("formato inválido");
  });

  // -----------------------------------------------------------------------
  // EDGE CASE: quantity as string (should be coerced, not fail validation)
  // -----------------------------------------------------------------------
  it("should accept quantity as string and coerce to number", async () => {
    const responseWithStringQuantity = {
      items: [
        {
          name: "Arroz",
          quantity: "1", // String instead of number
          unit: "kg",
          price: 3000,
          category: "granos",
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(responseWithStringQuantity) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items[0].quantity).toBe(1); // Coerced to number
  });

  // -----------------------------------------------------------------------
  // EDGE CASE: price as string (should be coerced)
  // -----------------------------------------------------------------------
  it("should accept price as string and coerce to number", async () => {
    const responseWithStringPrice = {
      items: [
        {
          name: "Tomate",
          quantity: 1,
          unit: "kg",
          price: "2500", // String price
          category: "vegetales",
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(responseWithStringPrice) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items[0].price).toBe(2500); // Coerced to number
  });

  // -----------------------------------------------------------------------
  // VALID OUTPUT: Empty items array (valid schema, no items found)
  // -----------------------------------------------------------------------
  it("should return 200 with empty items when LLM finds no items", async () => {
    const emptyResponse = {
      items: [],
      error: "No se pudo leer el recibo",
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(emptyResponse) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toEqual([]);
    expect(body.error).toBe("No se pudo leer el recibo");
  });

  // -----------------------------------------------------------------------
  // PASSTHROUGH: Extra fields are preserved (store, total, brand)
  // -----------------------------------------------------------------------
  it("should preserve extra fields via passthrough", async () => {
    const responseWithExtras = {
      items: [
        {
          name: "Pan",
          quantity: 1,
          unit: "unid",
          price: 1500,
          category: "granos",
          brand: "Bimbo",
          extraField: "should be preserved",
        },
      ],
      store: "Exito",
      total: 15000,
      anotherExtraField: "also preserved",
    };

    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(responseWithExtras) }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.store).toBe("Exito");
    expect(body.total).toBe(15000);
    // Note: extraField is preserved by passthrough but not exposed in mapped result
  });

  // -----------------------------------------------------------------------
  // NO RESPONSE: LLM returns no content
  // -----------------------------------------------------------------------
  it("should handle when LLM returns no content", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(200); // Not 502, handled gracefully
    const body = await response.json();
    expect(body.items).toEqual([]);
    expect(body.error).toBe("No hubo respuesta de la IA");
  });

  // -----------------------------------------------------------------------
  // INVALID JSON: LLM returns malformed JSON
  // -----------------------------------------------------------------------
  it("should handle malformed JSON from LLM", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: "{ invalid json }" }],
          },
        },
      ],
    });

    const request = buildMockRequest(createMockImage());
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Error al procesar el recibo");
  });
});

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
}));
