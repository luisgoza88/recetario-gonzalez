import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock withRateLimit from @/lib/rate-limit
vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: vi.fn(),
}));

// Mock createServiceRoleClient from @/lib/supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { POST } from '../validate-invitation/route';
import { withRateLimit } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/validate-invitation', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

/** Default rate-limit mock that allows the request through. */
const allowedRateLimit = {
  allowed: true,
  headers: {
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': '4',
    'X-RateLimit-Reset': new Date(Date.now() + 900_000).toISOString(),
  },
};

/** Rate-limit mock that blocks the request. */
const blockedRateLimit = {
  allowed: false,
  headers: {
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': new Date(Date.now() + 900_000).toISOString(),
    'Retry-After': '900',
  },
};

/**
 * Creates a mock Supabase client with a chainable query builder.
 * The final `.single()` call resolves with the provided data/error.
 */
function createMockSupabase(singleResult: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/validate-invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default, rate limiting allows the request
    vi.mocked(withRateLimit).mockResolvedValue(allowedRateLimit);
  });

  // -----------------------------------------------------------------------
  // 1. Missing code
  // -----------------------------------------------------------------------
  it('returns 400 when no code is provided', async () => {
    const mockSupabase = createMockSupabase({ data: null, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    const request = buildRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.isValid).toBe(false);
    expect(body.error).toBe('Código requerido');
  });

  // -----------------------------------------------------------------------
  // 2. Wrong code length
  // -----------------------------------------------------------------------
  it('returns 400 when code is not 8 characters', async () => {
    const mockSupabase = createMockSupabase({ data: null, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    const request = buildRequest({ code: 'ABC' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.isValid).toBe(false);
    expect(body.error).toBe('El código debe tener 8 caracteres');
  });

  // -----------------------------------------------------------------------
  // 3. Valid invitation found
  // -----------------------------------------------------------------------
  it('returns isValid:true when invitation is found and active', async () => {
    const invitationData = {
      id: 'inv-1',
      code: 'ABCD1234',
      is_active: true,
      current_uses: 0,
      max_uses: 5,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      household: { id: 'hh-1', name: 'Casa González' },
    };

    const mockSupabase = createMockSupabase({ data: invitationData, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    const request = buildRequest({ code: 'ABCD1234' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isValid).toBe(true);
    expect(body.invitation).toEqual(invitationData);
    expect(body.householdName).toBe('Casa González');
  });

  // -----------------------------------------------------------------------
  // 4. Invalid / expired / not found
  // -----------------------------------------------------------------------
  it('returns isValid:false when invitation is not found', async () => {
    const mockSupabase = createMockSupabase({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    });
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    const request = buildRequest({ code: 'XXXX9999' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isValid).toBe(false);
    expect(body.error).toBe('Código de invitación inválido o expirado');
  });

  // -----------------------------------------------------------------------
  // 5. Rate limited
  // -----------------------------------------------------------------------
  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(withRateLimit).mockResolvedValue(blockedRateLimit);

    const request = buildRequest({ code: 'ABCD1234' });
    const response = await POST(request);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.isValid).toBe(false);
    expect(body.error).toContain('Demasiados intentos');
  });

  // -----------------------------------------------------------------------
  // 6. Max uses reached
  // -----------------------------------------------------------------------
  it('returns isValid:false when invitation has reached max uses', async () => {
    const invitationData = {
      id: 'inv-2',
      code: 'FULL1234',
      is_active: true,
      current_uses: 5,
      max_uses: 5,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      household: { id: 'hh-1', name: 'Casa González' },
    };

    const mockSupabase = createMockSupabase({ data: invitationData, error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabase as never);

    const request = buildRequest({ code: 'FULL1234' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isValid).toBe(false);
    expect(body.error).toBe('Este código de invitación ya fue utilizado');
  });
});
