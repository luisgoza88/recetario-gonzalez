import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock createAuthenticatedClient before importing the module under test
const mockRpc = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createAuthenticatedClient: vi.fn().mockResolvedValue({
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}))

import {
  getAuthenticatedUser,
  requireAuth,
  requirePermission,
  forbiddenResponse,
} from '../api/auth'

describe('getAuthenticatedUser', () => {
  it('should return userId when x-user-id header is present', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-user-id': 'test-user-123' },
    })

    const result = getAuthenticatedUser(request)

    expect(result).toEqual({ userId: 'test-user-123' })
  })

  it('should return null when x-user-id header is missing', () => {
    const request = new NextRequest('http://localhost/api/test')

    const result = getAuthenticatedUser(request)

    expect(result).toBeNull()
  })

  it('should return null when x-user-id header is empty string', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-user-id': '' },
    })

    const result = getAuthenticatedUser(request)

    // Empty string is falsy, so it returns null
    expect(result).toBeNull()
  })
})

describe('requireAuth', () => {
  it('should return user object when authenticated', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-user-id': 'auth-user-456' },
    })

    const result = requireAuth(request)

    expect(result).toEqual({ userId: 'auth-user-456' })
  })

  it('should return 401 NextResponse when not authenticated', async () => {
    const request = new NextRequest('http://localhost/api/test')

    const result = requireAuth(request)

    // result should be a NextResponse, not a user object
    expect(result).not.toHaveProperty('userId')

    // Verify it is a Response with status 401
    const response = result as Response
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe('Authentication required')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('should return 401 when x-user-id header is empty', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-user-id': '' },
    })

    const result = requireAuth(request)

    const response = result as Response
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.code).toBe('UNAUTHORIZED')
  })
})

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when RPC returns true', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const result = await requirePermission('household-123', 'edit_recipes')

    expect(result).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('check_user_permission', {
      p_household_id: 'household-123',
      p_permission: 'edit_recipes',
    })
  })

  it('should return false when RPC returns false', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const result = await requirePermission('household-123', 'manage_employees')

    expect(result).toBe(false)
  })

  it('should return false when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Permission check failed' },
    })

    const result = await requirePermission('household-123', 'edit_recipes')

    expect(result).toBe(false)
  })

  it('should return false when RPC returns null data without error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await requirePermission('household-123', 'edit_recipes')

    expect(result).toBe(false) // !!null === false
  })
})

describe('forbiddenResponse', () => {
  it('should return 403 with default message', async () => {
    const response = forbiddenResponse()

    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body.error).toBe('Insufficient permissions')
    expect(body.code).toBe('FORBIDDEN')
  })

  it('should return 403 with custom message', async () => {
    const response = forbiddenResponse('You cannot access this resource')

    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body.error).toBe('You cannot access this resource')
    expect(body.code).toBe('FORBIDDEN')
  })
})
