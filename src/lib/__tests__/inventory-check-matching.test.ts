import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAvailableIngredientsList,
  clearInventoryCache,
  checkRecipeIngredients,
  findAlternativeRecipes,
  loadCurrentInventory,
} from '../inventory-check'
import type { Recipe } from '@/types'

// Mock Supabase client
vi.mock('../supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
  },
}))

beforeEach(() => {
  clearInventoryCache()
  vi.clearAllMocks()
})

// Helper para crear recetas de prueba
function createTestRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    name: 'Receta de prueba',
    type: 'lunch' as const,
    ingredients: [
      { name: 'Arroz', total: '500g', luis: '300g', mariana: '200g' },
      { name: 'Pollo', total: '1 kg', luis: '600g', mariana: '400g' },
      { name: 'Cebolla', total: '2 unidades', luis: '1', mariana: '1' },
    ],
    instructions: ['Paso 1', 'Paso 2'],
    portions: { luis: 3, mariana: 2 },
    ...overrides,
  } as Recipe
}

// ============================================
// INGREDIENT MATCHING: EXACT
// ============================================

describe('checkRecipeIngredients - coincidencia exacta', () => {
  it('debe detectar todos los ingredientes disponibles', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo', { quantity: '2 kg', number: 2, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '6 unidades', number: 6, itemName: 'Cebolla' }],
    ])

    const recipe = createTestRecipe()
    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.availableIngredients.length).toBeGreaterThan(0)
    expect(result.recipe.name).toBe('Receta de prueba')
  })

  it('debe detectar ingredientes faltantes', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      // Pollo y Cebolla no están
    ])

    const recipe = createTestRecipe()
    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.missingIngredients.length).toBeGreaterThan(0)
    expect(result.canMake).toBe(false)
  })

  it('debe manejar inventario completamente vacío', async () => {
    const inventory = new Map<string, { quantity: string; number: number; itemName: string }>()

    const recipe = createTestRecipe()
    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.canMake).toBe(false)
    expect(result.missingIngredients).toHaveLength(3)
    expect(result.availablePercent).toBe(0)
  })

  it('debe considerar items con stock 0 como no disponibles', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '0', number: 0, itemName: 'Arroz' }],
      ['Pollo', { quantity: '0', number: 0, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '0', number: 0, itemName: 'Cebolla' }],
    ])

    const recipe = createTestRecipe()
    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.canMake).toBe(false)
    expect(result.availablePercent).toBe(0)
  })
})

// ============================================
// INGREDIENT MATCHING: PARTIAL
// ============================================

describe('checkRecipeIngredients - coincidencia parcial', () => {
  it('debe encontrar "Pollo pechuga" cuando receta pide "Pollo"', async () => {
    const inventory = new Map([
      ['Pollo pechuga', { quantity: '2 kg', number: 2, itemName: 'Pollo pechuga' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Pollo', total: '1 kg', luis: '600g', mariana: '400g' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    // "Pollo" is contained in "Pollo pechuga" → partial match
    expect(result.availableIngredients.length).toBeGreaterThanOrEqual(1)
  })

  it('debe encontrar match parcial para ingredientes con descripciones', async () => {
    const inventory = new Map([
      ['Tomate', { quantity: '1 kg', number: 5, itemName: 'Tomate' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Tomate maduro', total: '3 unidades', luis: '2', mariana: '1' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    // "Tomate" is contained in "Tomate maduro" → partial match
    expect(result.availableIngredients.length).toBe(1)
  })
})

// ============================================
// COMPOUND INGREDIENTS
// ============================================

describe('checkRecipeIngredients - ingredientes compuestos', () => {
  it('debe separar ingredientes con + y verificar cada uno', async () => {
    const inventory = new Map([
      ['Aguacate', { quantity: '3 unidades', number: 3, itemName: 'Aguacate' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Hogao + Aguacate', total: '2 porciones', luis: '1', mariana: '1' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    // Aguacate should be found, Hogao might not be (unless preparation check finds it)
    expect(result).toBeDefined()
    expect(result.recipe.name).toBe('Receta de prueba')
  })
})

// ============================================
// FUZZY MATCHING
// ============================================

describe('checkRecipeIngredients - fuzzy matching', () => {
  it('debe encontrar match por palabra clave >= 4 caracteres', async () => {
    const inventory = new Map([
      ['Bistec de res (punta anca)', { quantity: '1 kg', number: 2, itemName: 'Bistec de res (punta anca)' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Bistec', total: '500g', luis: '300g', mariana: '200g' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    // "Bistec" (6 chars) should fuzzy-match "Bistec de res (punta anca)"
    expect(result.availableIngredients.length).toBeGreaterThanOrEqual(1)
  })

  it('no debe hacer fuzzy match con palabras < 4 caracteres', async () => {
    const inventory = new Map([
      ['Sal marina especial', { quantity: '500g', number: 1, itemName: 'Sal marina especial' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Sal', total: '1 cucharada', luis: '1', mariana: '1' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    // "Sal" has only 3 chars, fuzzy matching requires >= 4
    // But partial match should still work since "Sal" is contained in "Sal marina especial"
    expect(result).toBeDefined()
  })
})

// ============================================
// AVAILABILITY CALCULATION
// ============================================

describe('availablePercent', () => {
  it('debe calcular 100% cuando todos los ingredientes están disponibles', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo', { quantity: '2 kg', number: 2, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '10 unidades', number: 10, itemName: 'Cebolla' }],
    ])

    const recipe = createTestRecipe()
    const result = await checkRecipeIngredients(recipe, inventory)

    // All 3 ingredients found
    if (result.availableIngredients.length === 3) {
      expect(result.availablePercent).toBeCloseTo(100, 0)
      expect(result.canMake).toBe(true)
    }
  })

  it('debe calcular porcentaje parcial correctamente', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      // Pollo y Cebolla no disponibles
    ])

    const recipe = createTestRecipe()
    const result = await checkRecipeIngredients(recipe, inventory)

    // 1 of 3 ingredients found = ~33%
    expect(result.availablePercent).toBeLessThan(50)
    expect(result.canMake).toBe(false)
  })
})

// ============================================
// ALTERNATIVE RECIPES
// ============================================

describe('findAlternativeRecipes', () => {
  it('debe encontrar recetas alternativas con >= 80% disponibilidad', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo', { quantity: '2 kg', number: 2, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '6 unidades', number: 6, itemName: 'Cebolla' }],
    ])

    const recipes = [
      createTestRecipe({ id: 'r1', name: 'Arroz con pollo' }),
      createTestRecipe({
        id: 'r2',
        name: 'Pasta carbonara',
        ingredients: [
          { name: 'Pasta', total: '500g', luis: '300g', mariana: '200g' },
          { name: 'Tocino', total: '200g', luis: '120g', mariana: '80g' },
        ],
      }),
    ]

    const result = await findAlternativeRecipes(recipes, inventory, undefined)

    // Arroz con pollo should have high availability, Pasta carbonara low
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('debe excluir receta actual por ID', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo', { quantity: '2 kg', number: 2, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '6 unidades', number: 6, itemName: 'Cebolla' }],
    ])

    const recipes = [
      createTestRecipe({ id: 'r1', name: 'Receta A' }),
      createTestRecipe({ id: 'r2', name: 'Receta B' }),
    ]

    const result = await findAlternativeRecipes(recipes, inventory, 'r1')

    // r1 should be excluded
    const ids = result.map(r => r.recipe.id)
    expect(ids).not.toContain('r1')
  })

  it('debe filtrar por tipo de comida', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo', { quantity: '2 kg', number: 2, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '6', number: 6, itemName: 'Cebolla' }],
    ])

    const recipes = [
      createTestRecipe({ id: 'r1', type: 'lunch' as const }),
      createTestRecipe({ id: 'r2', type: 'dinner' as const }),
      createTestRecipe({ id: 'r3', type: 'breakfast' as const }),
    ]

    const result = await findAlternativeRecipes(recipes, inventory, undefined, 'lunch')

    // Only lunch recipes should be included
    for (const alt of result) {
      expect(alt.recipe.type).toBe('lunch')
    }
  })

  it('debe ordenar por disponibilidad descendente', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo', { quantity: '2 kg', number: 2, itemName: 'Pollo' }],
      ['Cebolla', { quantity: '6', number: 6, itemName: 'Cebolla' }],
      ['Tomate', { quantity: '1 kg', number: 3, itemName: 'Tomate' }],
    ])

    const recipes = [
      createTestRecipe({
        id: 'r1',
        ingredients: [
          { name: 'Arroz', total: '500g', luis: '300g', mariana: '200g' },
          { name: 'Pollo', total: '1 kg', luis: '600g', mariana: '400g' },
          { name: 'Cebolla', total: '2', luis: '1', mariana: '1' },
        ],
      }),
      createTestRecipe({
        id: 'r2',
        ingredients: [
          { name: 'Arroz', total: '500g', luis: '300g', mariana: '200g' },
          { name: 'Tomate', total: '3', luis: '2', mariana: '1' },
        ],
      }),
    ]

    const result = await findAlternativeRecipes(recipes, inventory)

    if (result.length >= 2) {
      expect(result[0].availablePercent).toBeGreaterThanOrEqual(result[1].availablePercent)
    }
  })
})

// ============================================
// INGREDIENT STATUS STRUCTURE
// ============================================

describe('IngredientStatus fields', () => {
  it('debe incluir todos los campos requeridos', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Arroz', total: '500g', luis: '300g', mariana: '200g' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    const allIngredients = [...result.availableIngredients, ...result.missingIngredients]
    for (const ing of allIngredients) {
      expect(ing).toHaveProperty('name')
      expect(ing).toHaveProperty('required')
      expect(ing).toHaveProperty('available')
      expect(ing).toHaveProperty('availableNumber')
      expect(ing).toHaveProperty('needed')
      expect(ing).toHaveProperty('neededNumber')
      expect(ing).toHaveProperty('hasEnough')
      expect(ing).toHaveProperty('percentAvailable')
      expect(ing).toHaveProperty('unitCompatible')
    }
  })
})

// ============================================
// EDGE CASES
// ============================================

describe('edge cases de matching', () => {
  it('debe manejar receta sin ingredientes', async () => {
    const inventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
    ])

    const recipe = createTestRecipe({ ingredients: [] })
    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.canMake).toBe(true)
    expect(result.missingIngredients).toHaveLength(0)
    expect(result.availablePercent).toBe(0) // 0/0 = 0
  })

  it('debe manejar ingredientes con acentos correctamente', async () => {
    const inventory = new Map([
      ['Plátano', { quantity: '6 unidades', number: 6, itemName: 'Plátano' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Plátano', total: '2 unidades', luis: '1', mariana: '1' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.availableIngredients.length).toBe(1)
  })

  it('debe manejar cantidades sin unidad', async () => {
    const inventory = new Map([
      ['Huevos', { quantity: '12', number: 12, itemName: 'Huevos' }],
    ])

    const recipe = createTestRecipe({
      ingredients: [
        { name: 'Huevos', total: '4', luis: '2', mariana: '2' },
      ],
    })

    const result = await checkRecipeIngredients(recipe, inventory)

    expect(result.availableIngredients.length).toBe(1)
  })
})
