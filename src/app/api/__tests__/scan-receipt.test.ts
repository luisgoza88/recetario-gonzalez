import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock requireAuth from @/lib/api/auth
vi.mock("@/lib/api/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock Gemini client
vi.mock("@/lib/gemini/client", () => ({
  getGeminiClient: vi.fn(),
  GEMINI_MODELS: { FLASH: "gemini-2.0-flash" },
  GEMINI_CONFIG: {
    parsing: { temperature: 0.2, maxOutputTokens: 2000 },
  },
  cleanJsonResponse: vi.fn((content: string) => content),
}));

import { POST } from "../scan-receipt/route";
import { requireAuth } from "@/lib/api/auth";
import { getGeminiClient, cleanJsonResponse } from "@/lib/gemini/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFakeImageFile() {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  return createFileWithArrayBuffer(pngBytes, "receipt.png", "image/png");
}

/**
 * Create a real File object for testing with a working arrayBuffer() method.
 * jsdom's File/Blob may not implement arrayBuffer(), so we override it.
 */
function createFileWithArrayBuffer(
  bytes: Uint8Array,
  name: string,
  type: string,
) {
  // Convert to ArrayBuffer to ensure compatibility with File constructor
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const file = new File([buffer], name, { type });
  file.arrayBuffer = () => Promise.resolve(buffer);
  return file;
}

/**
 * Build a NextRequest with a mocked formData() method to avoid jsdom
 * limitations with multipart body parsing.
 */
function buildMockRequest(formFields?: Record<string, File | string | null>) {
  const request = new NextRequest("http://localhost/api/scan-receipt", {
    method: "POST",
  });

  // Build a fake FormData-like object using a Map, to avoid jsdom's
  // FormData stripping methods from File objects.
  const store = new Map<string, File | string>();
  if (formFields) {
    for (const [key, value] of Object.entries(formFields)) {
      if (value !== null) {
        store.set(key, value);
      }
    }
  }

  const fakeFormData = {
    get: (key: string) => store.get(key) ?? null,
    has: (key: string) => store.has(key),
    entries: () => store.entries(),
    keys: () => store.keys(),
  };

  // Override formData() to return our fake FormData
  vi.spyOn(request, "formData").mockResolvedValue(
    fakeFormData as unknown as FormData,
  );

  return request;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/scan-receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Authentication
  // -----------------------------------------------------------------------
  it("returns 401 when no auth header is present", async () => {
    const { NextResponse } = await import("next/server");

    // Simulate requireAuth returning a 401 NextResponse
    const unauthorizedResponse = NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 },
    );
    vi.mocked(requireAuth).mockReturnValue(unauthorizedResponse);

    const request = buildMockRequest({ image: createFakeImageFile() });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("UNAUTHORIZED");
  });

  // -----------------------------------------------------------------------
  // 2. Validation -- missing image
  // -----------------------------------------------------------------------
  it("returns 400 when no image is provided in form data", async () => {
    // Auth passes
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    // Send empty form (no "image" field)
    const request = buildMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Datos inválidos");
  });

  // -----------------------------------------------------------------------
  // 3. Successful scan with mocked Gemini response
  // -----------------------------------------------------------------------
  it("returns 200 with parsed items when Gemini returns valid JSON", async () => {
    // Auth passes
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    // Prepare a Gemini-like response
    const geminiResponseJson = JSON.stringify({
      items: [
        {
          name: "Leche entera",
          quantity: 2,
          unit: "litro",
          price: 4500,
          category: "lácteos",
          brand: "Alpina",
        },
        {
          name: "Pechuga de pollo",
          quantity: 1,
          unit: "kg",
          price: 12000,
          category: "proteínas",
        },
      ],
      store: "Exito",
      total: "16500",
    });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: geminiResponseJson }],
          },
        },
      ],
    });

    vi.mocked(getGeminiClient).mockReturnValue({
      models: { generateContent: mockGenerateContent },
    } as unknown as ReturnType<typeof getGeminiClient>);

    vi.mocked(cleanJsonResponse).mockReturnValue(geminiResponseJson);

    const request = buildMockRequest({ image: createFakeImageFile() });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Top-level structure
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("store", "Exito");
    expect(body).toHaveProperty("total", "16500");

    // Items array
    expect(body.items).toHaveLength(2);

    // First item -- category should be mapped
    const leche = body.items[0];
    expect(leche.name).toBe("Leche entera");
    expect(leche.quantity).toBe(2);
    expect(leche.unit).toBe("litro");
    expect(leche.price).toBe(4500);
    expect(leche.brand).toBe("Alpina");
    expect(leche.category).toEqual({
      id: "dairy",
      name: "Lácteos",
      icon: "🧀",
    });

    // Second item
    const pollo = body.items[1];
    expect(pollo.name).toBe("Pechuga de pollo");
    expect(pollo.category).toEqual({
      id: "proteins",
      name: "Proteínas",
      icon: "🥩",
    });

    // Gemini was called exactly once
    expect(mockGenerateContent).toHaveBeenCalledOnce();
  });

  // -----------------------------------------------------------------------
  // 4. Gemini returns empty content
  // -----------------------------------------------------------------------
  it("returns items:[] with error when Gemini returns no content", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: undefined }] } }],
    });

    vi.mocked(getGeminiClient).mockReturnValue({
      models: { generateContent: mockGenerateContent },
    } as unknown as ReturnType<typeof getGeminiClient>);

    const request = buildMockRequest({ image: createFakeImageFile() });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toEqual([]);
    expect(body.error).toBe("No hubo respuesta de la IA");
  });

  // -----------------------------------------------------------------------
  // 5. Gemini throws an error -> 500
  // -----------------------------------------------------------------------
  it("returns 500 when Gemini throws an unexpected error", async () => {
    vi.mocked(requireAuth).mockReturnValue({ userId: "user-123" });

    const mockGenerateContent = vi
      .fn()
      .mockRejectedValue(new Error("Gemini network failure"));

    vi.mocked(getGeminiClient).mockReturnValue({
      models: { generateContent: mockGenerateContent },
    } as unknown as ReturnType<typeof getGeminiClient>);

    const request = buildMockRequest({ image: createFakeImageFile() });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Error al procesar el recibo");
    expect(body.items).toEqual([]);
  });
});

vi.mock("@/lib/rate-limit", () => ({
  withRateLimit: vi.fn().mockResolvedValue({ allowed: true, headers: {} }),
}));
