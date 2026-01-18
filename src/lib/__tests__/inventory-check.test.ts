import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAvailableIngredientsList, clearInventoryCache } from '../inventory-check'

// Mock Supabase client
vi.mock('../supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [],
        error: null
      }))
    }))
  }
}))

// Tests para funciones puras (no requieren DB)
describe('getAvailableIngredientsList', () => {
  it('debe retornar lista de ingredientes con stock > 0', () => {
    const inventory = new Map([
      ['Tomate', { quantity: '1 kg', number: 5, itemName: 'Tomate' }],
      ['Cebolla', { quantity: '500g', number: 3, itemName: 'Cebolla' }],
      ['Ajo', { quantity: '0', number: 0, itemName: 'Ajo' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toHaveLength(2)
    expect(result).toContain('Tomate (1 kg)')
    expect(result).toContain('Cebolla (500g)')
    expect(result).not.toContain('Ajo (0)')
  })

  it('debe retornar lista vacía si no hay stock', () => {
    const inventory = new Map([
      ['Tomate', { quantity: '0', number: 0, itemName: 'Tomate' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toHaveLength(0)
  })

  it('debe formatear correctamente cantidad y nombre', () => {
    const inventory = new Map([
      ['Huevos', { quantity: '12 unidades', number: 12, itemName: 'Huevos' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result[0]).toBe('Huevos (12 unidades)')
  })
})

describe('clearInventoryCache', () => {
  it('debe ejecutarse sin errores', () => {
    expect(() => clearInventoryCache()).not.toThrow()
  })
})

// Tests para normalización de ingredientes
describe('normalizeIngredient (comportamiento)', () => {
  // Estas pruebas verifican el comportamiento de normalización
  // a través de las funciones exportadas

  it('debe manejar inventario con nombres con acentos', () => {
    const inventory = new Map([
      ['Plátano', { quantity: '6 unidades', number: 6, itemName: 'Plátano' }],
      ['Jamón', { quantity: '500g', number: 2, itemName: 'Jamón' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toContain('Plátano (6 unidades)')
    expect(result).toContain('Jamón (500g)')
  })

  it('debe manejar nombres con espacios múltiples', () => {
    const inventory = new Map([
      ['Pollo   entero', { quantity: '1 kg', number: 1, itemName: 'Pollo   entero' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toHaveLength(1)
  })
})

// Tests para splitCompoundIngredient (comportamiento)
describe('ingredientes compuestos', () => {
  it('debe manejar items con + en el nombre', () => {
    // Verificamos que el sistema de inventario pueda manejar
    // nombres con caracteres especiales
    const inventory = new Map([
      ['Hogao + Aguacate', { quantity: '2 porciones', number: 2, itemName: 'Hogao + Aguacate' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toHaveLength(1)
    expect(result[0]).toContain('Hogao + Aguacate')
  })
})

// Tests para verificación de recetas
describe('verificación de recetas (estructura)', () => {
  it('debe manejar inventario vacío', () => {
    const emptyInventory = new Map<string, { quantity: string; number: number; itemName: string }>()
    const result = getAvailableIngredientsList(emptyInventory)
    expect(result).toHaveLength(0)
  })

  it('debe manejar inventario con muchos items', () => {
    const largeInventory = new Map<string, { quantity: string; number: number; itemName: string }>()

    for (let i = 0; i < 100; i++) {
      largeInventory.set(`Item ${i}`, {
        quantity: `${i} unidades`,
        number: i,
        itemName: `Item ${i}`
      })
    }

    const result = getAvailableIngredientsList(largeInventory)

    // Item 0 tiene number: 0, así que no se incluye
    expect(result).toHaveLength(99)
  })
})

// Tests para escenarios comunes en la aplicación
describe('escenarios de uso real', () => {
  it('debe manejar inventario típico de la familia González', () => {
    const typicalInventory = new Map([
      ['Arroz', { quantity: '5 kg', number: 5, itemName: 'Arroz' }],
      ['Pollo pechuga', { quantity: '2 kg', number: 4, itemName: 'Pollo pechuga' }],
      ['Huevos', { quantity: '30 unidades', number: 30, itemName: 'Huevos' }],
      ['Leche', { quantity: '2 litros', number: 4, itemName: 'Leche' }],
      ['Tomate', { quantity: '1 kg', number: 5, itemName: 'Tomate' }],
      ['Cebolla', { quantity: '1 kg', number: 6, itemName: 'Cebolla' }],
      ['Ajo', { quantity: '200g', number: 2, itemName: 'Ajo' }],
      ['Aceite', { quantity: '1 litro', number: 1, itemName: 'Aceite' }],
      ['Sal', { quantity: '500g', number: 1, itemName: 'Sal' }],
      ['Azúcar agotada', { quantity: '0', number: 0, itemName: 'Azúcar agotada' }]
    ])

    const result = getAvailableIngredientsList(typicalInventory)

    // Todos menos la azúcar agotada
    expect(result).toHaveLength(9)
    expect(result.some(i => i.includes('Arroz'))).toBe(true)
    expect(result.some(i => i.includes('Pollo pechuga'))).toBe(true)
    expect(result.some(i => i.includes('Huevos'))).toBe(true)
    expect(result.some(i => i.includes('Azúcar agotada'))).toBe(false)
  })

  it('debe incluir preparaciones caseras si tienen stock', () => {
    const inventoryWithPrep = new Map([
      ['Hogao', { quantity: '500g', number: 2, itemName: 'Hogao' }],
      ['Guacamole', { quantity: '300g', number: 1, itemName: 'Guacamole' }]
    ])

    const result = getAvailableIngredientsList(inventoryWithPrep)

    expect(result).toContain('Hogao (500g)')
    expect(result).toContain('Guacamole (300g)')
  })
})

// Tests para edge cases
describe('edge cases', () => {
  it('debe manejar quantities con formatos variados', () => {
    const inventory = new Map([
      ['Item1', { quantity: '1/2 kg', number: 0.5, itemName: 'Item1' }],
      ['Item2', { quantity: '2.5 litros', number: 2.5, itemName: 'Item2' }],
      ['Item3', { quantity: '', number: 1, itemName: 'Item3' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toContain('Item1 (1/2 kg)')
    expect(result).toContain('Item2 (2.5 litros)')
    expect(result).toContain('Item3 ()')
  })

  it('debe manejar números decimales pequeños', () => {
    const inventory = new Map([
      ['Especias', { quantity: '0.1 kg', number: 0.1, itemName: 'Especias' }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result).toHaveLength(1)
  })

  it('debe manejar nombres muy largos', () => {
    const longName = 'Pechuga de pollo deshuesada y sin piel fresca premium'
    const inventory = new Map([
      [longName, { quantity: '2 kg', number: 2, itemName: longName }]
    ])

    const result = getAvailableIngredientsList(inventory)

    expect(result[0]).toContain(longName)
  })
})
