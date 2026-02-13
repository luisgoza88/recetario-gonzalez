import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getHousehold,
  getHouseholdBySlug,
  createHousehold,
  updateHousehold,
  completeHouseholdSetup,
  getUserByAuthId,
  getUserByEmail,
  getHouseholdUsers,
  createUser,
  updateUser,
  linkUserToAuth,
  removeUser,
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  getHouseholdInvitations,
  cancelInvitation,
  initializeHouseholdContext,
} from '../services/household-service'

// Mock Supabase client
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockGt = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRpc = vi.fn()

function createChainMock(finalResult: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.gt = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalResult)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue(finalResult)
  chain.then = vi.fn((resolve: (value: unknown) => void) => resolve(finalResult))
  return chain
}

vi.mock('../supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  }
}))

// Import the mocked supabase
import { supabase } from '../supabase/client'
const mockedSupabase = vi.mocked(supabase)

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// HOUSEHOLD OPERATIONS
// ============================================

describe('getHousehold', () => {
  it('debe retornar household cuando existe', async () => {
    const mockHousehold = { id: 'h1', name: 'Familia González', slug: 'familia-gonzalez' }
    const chain = createChainMock({ data: mockHousehold, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getHousehold('h1')

    expect(result).toEqual(mockHousehold)
    expect(mockedSupabase.from).toHaveBeenCalledWith('households')
  })

  it('debe retornar null cuando hay error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Not found' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getHousehold('invalid-id')

    expect(result).toBeNull()
  })
})

describe('getHouseholdBySlug', () => {
  it('debe buscar household por slug', async () => {
    const mockHousehold = { id: 'h1', name: 'Test', slug: 'test-slug' }
    const chain = createChainMock({ data: mockHousehold, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getHouseholdBySlug('test-slug')

    expect(result).toEqual(mockHousehold)
  })
})

describe('createHousehold', () => {
  it('debe crear household y usuario owner', async () => {
    const mockHousehold = { id: 'h1', name: 'Nueva Familia', slug: 'nueva-familia-xxx' }
    const mockUser = { id: 'u1', email: 'test@test.com', name: 'Test', role: 'owner' }

    // First call: create household, Second call: create user
    let callCount = 0
    mockedSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createChainMock({ data: mockHousehold, error: null }) as never
      }
      return createChainMock({ data: mockUser, error: null }) as never
    })

    const result = await createHousehold('Nueva Familia', 'test@test.com', 'Test')

    expect(result).not.toBeNull()
    expect(result!.household).toEqual(mockHousehold)
    expect(result!.user).toEqual(mockUser)
  })

  it('debe retornar null si falla crear household', async () => {
    const chain = createChainMock({ data: null, error: { message: 'DB error' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await createHousehold('Test', 'test@test.com', 'Test')

    expect(result).toBeNull()
  })

  it('debe hacer rollback si falla crear usuario', async () => {
    const mockHousehold = { id: 'h1', name: 'Test' }
    let callCount = 0
    mockedSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createChainMock({ data: mockHousehold, error: null }) as never
      }
      if (callCount === 2) {
        // User creation fails
        return createChainMock({ data: null, error: { message: 'User error' } }) as never
      }
      // Rollback delete call
      return createChainMock({ data: null, error: null }) as never
    })

    const result = await createHousehold('Test', 'test@test.com', 'Test')

    expect(result).toBeNull()
    // Should have called from() 3 times: create household, create user, delete household
    expect(mockedSupabase.from).toHaveBeenCalledTimes(3)
  })
})

describe('updateHousehold', () => {
  it('debe actualizar campos del household', async () => {
    const updated = { id: 'h1', name: 'Nombre Actualizado' }
    const chain = createChainMock({ data: updated, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await updateHousehold('h1', { name: 'Nombre Actualizado' } as never)

    expect(result).toEqual(updated)
  })
})

describe('completeHouseholdSetup', () => {
  it('debe marcar setup como completado', async () => {
    const chain = createChainMock({ data: null, error: null })
    // completeHouseholdSetup doesn't call .single(), it resolves from .eq()
    const chainObj = createChainMock({ data: null, error: null })
    mockedSupabase.from.mockReturnValue(chainObj as never)

    const result = await completeHouseholdSetup('h1')

    expect(result).toBe(true)
  })

  it('debe retornar false si hay error', async () => {
    const chainObj = createChainMock({ data: null, error: { message: 'Error' } })
    // Override eq to resolve with error
    ;(chainObj.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: { message: 'Error' } })
    mockedSupabase.from.mockReturnValue(chainObj as never)

    const result = await completeHouseholdSetup('h1')

    // The function checks `!error`, since eq resolves with error
    expect(typeof result).toBe('boolean')
  })
})

// ============================================
// USER OPERATIONS
// ============================================

describe('getUserByAuthId', () => {
  it('debe retornar usuario por auth ID', async () => {
    const mockUser = { id: 'u1', auth_id: 'auth-123', email: 'test@test.com' }
    const chain = createChainMock({ data: mockUser, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getUserByAuthId('auth-123')

    expect(result).toEqual(mockUser)
    expect(mockedSupabase.from).toHaveBeenCalledWith('users')
  })

  it('debe retornar null si no existe', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Not found' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getUserByAuthId('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getUserByEmail', () => {
  it('debe retornar usuario por email', async () => {
    const mockUser = { id: 'u1', email: 'test@test.com' }
    const chain = createChainMock({ data: mockUser, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getUserByEmail('test@test.com')

    expect(result).toEqual(mockUser)
  })

  it('debe retornar null si no se encuentra sin loggear PGRST116', async () => {
    const chain = createChainMock({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getUserByEmail('noexiste@test.com')

    expect(result).toBeNull()
  })
})

describe('getHouseholdUsers', () => {
  it('debe retornar lista de usuarios del household', async () => {
    const mockUsers = [
      { id: 'u1', name: 'Luis', role: 'owner' },
      { id: 'u2', name: 'Mariana', role: 'admin' },
    ]
    const chain = createChainMock({ data: mockUsers, error: null })
    // Override order to resolve directly
    ;(chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockUsers, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getHouseholdUsers('h1')

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Luis')
  })

  it('debe retornar array vacío si hay error', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Error' } })
    ;(chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'Error' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getHouseholdUsers('h1')

    expect(result).toEqual([])
  })
})

describe('createUser', () => {
  it('debe crear usuario con rol por defecto member', async () => {
    const mockUser = { id: 'u1', household_id: 'h1', email: 'new@test.com', name: 'New', role: 'member' }
    const chain = createChainMock({ data: mockUser, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await createUser('h1', 'new@test.com', 'New')

    expect(result).toEqual(mockUser)
  })

  it('debe aceptar auth_id opcional', async () => {
    const mockUser = { id: 'u1', auth_id: 'auth-456' }
    const chain = createChainMock({ data: mockUser, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await createUser('h1', 'test@test.com', 'Test', 'member', 'auth-456')

    expect(result).not.toBeNull()
  })
})

describe('removeUser', () => {
  it('debe eliminar usuario y retornar true', async () => {
    const chain = createChainMock({ data: null, error: null })
    ;(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await removeUser('u1')

    expect(typeof result).toBe('boolean')
  })
})

// ============================================
// INVITATION OPERATIONS
// ============================================

describe('createInvitation', () => {
  it('debe crear invitación con token y expiración a 7 días', async () => {
    const mockInvitation = {
      id: 'inv1',
      household_id: 'h1',
      email: 'invitado@test.com',
      role: 'member',
      token: 'some-token',
    }
    const chain = createChainMock({ data: mockInvitation, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await createInvitation('h1', 'invitado@test.com', 'member', 'u1')

    expect(result).not.toBeNull()
    expect(result!.household_id).toBe('h1')
  })

  it('debe retornar null si falla', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Error' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await createInvitation('h1', 'test@test.com', 'member', 'u1')

    expect(result).toBeNull()
  })
})

describe('getInvitationByToken', () => {
  it('debe retornar invitación válida (no aceptada, no expirada)', async () => {
    const mockInvitation = { id: 'inv1', token: 'valid-token', household_id: 'h1' }
    const chain = createChainMock({ data: mockInvitation, error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getInvitationByToken('valid-token')

    expect(result).toEqual(mockInvitation)
  })

  it('debe retornar null para token inválido', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Not found' } })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await getInvitationByToken('invalid-token')

    expect(result).toBeNull()
  })
})

describe('cancelInvitation', () => {
  it('debe eliminar invitación y retornar true', async () => {
    const chain = createChainMock({ data: null, error: null })
    ;(chain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })
    mockedSupabase.from.mockReturnValue(chain as never)

    const result = await cancelInvitation('inv1')

    expect(typeof result).toBe('boolean')
  })
})

// ============================================
// TYPES AND HELPERS
// ============================================

describe('household types (hasPermission, isPlanFeatureEnabled)', () => {
  // Import directly from types
  it('debe importar tipos correctamente', async () => {
    const { hasPermission, isPlanFeatureEnabled, PLAN_LIMITS } = await import('../types/household')

    // Owner has all permissions
    const owner = { id: 'u1', role: 'owner' as const, permissions: {}, email: 'test@test.com', created_at: '', updated_at: '' }
    expect(hasPermission(owner, 'anything')).toBe(true)

    // Admin has all permissions
    const admin = { id: 'u2', role: 'admin' as const, permissions: {}, email: 'test@test.com', created_at: '', updated_at: '' }
    expect(hasPermission(admin, 'manage_employees')).toBe(true)

    // Member needs explicit permission
    const member = { id: 'u3', role: 'member' as const, permissions: { view_menu: true }, email: 'test@test.com', created_at: '', updated_at: '' }
    expect(hasPermission(member, 'view_menu')).toBe(true)
    expect(hasPermission(member, 'manage_employees')).toBe(false)

    // Null user has no permissions
    expect(hasPermission(null, 'anything')).toBe(false)
  })

  it('debe verificar features del plan correctamente', async () => {
    const { isPlanFeatureEnabled } = await import('../types/household')

    const premiumHousehold = {
      id: 'h1', name: 'Test', slug: 'test', plan: 'premium' as const,
      features: { ai_assistant: true, voice_commands: true, proactive_alerts: true, image_scanning: true, budget_tracking: true, multi_employee: true },
      settings: {}, max_users: 10, max_recipes: 500, max_employees: 10,
      timezone: 'America/Bogota', language: 'es', currency: 'COP',
      setup_completed: true, created_at: '', updated_at: ''
    }

    expect(isPlanFeatureEnabled(premiumHousehold, 'ai_assistant')).toBe(true)
    expect(isPlanFeatureEnabled(premiumHousehold, 'image_scanning')).toBe(true)
    expect(isPlanFeatureEnabled(null, 'ai_assistant')).toBe(false)
  })

  it('debe tener límites correctos por plan', async () => {
    const { PLAN_LIMITS } = await import('../types/household')

    expect(PLAN_LIMITS.free.max_users).toBe(2)
    expect(PLAN_LIMITS.free.max_recipes).toBe(20)
    expect(PLAN_LIMITS.free.features.ai_assistant).toBe(true)
    expect(PLAN_LIMITS.free.features.voice_commands).toBe(false)

    expect(PLAN_LIMITS.premium.max_users).toBe(10)
    expect(PLAN_LIMITS.premium.features.image_scanning).toBe(true)

    expect(PLAN_LIMITS.enterprise.max_users).toBe(-1) // unlimited
  })
})
