import { describe, it, expect, vi } from 'vitest'

// Mock module-level dependencies that countIngredientMatches does not use,
// but that are imported at the top of recetario-queries.ts
vi.mock('@/lib/ai-assistant/db', () => ({
  createAIClient: vi.fn()
}))

vi.mock('@/lib/ai-assistant/constants', () => ({
  RECIPE_VARIANTS: {}
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}))

import { countIngredientMatches } from '@/app/api/ai-assistant/functions/recetario-queries'

// ---------------------------------------------------------------------------
// 1. Exact match
// ---------------------------------------------------------------------------
describe('countIngredientMatches - exact match', () => {
  it('debe hacer match exacto de "Tomate" con inventario ["Tomate"]', () => {
    const result = countIngredientMatches(['Tomate'], ['Tomate'])
    expect(result.matchCount).toBe(1)
    expect(result.totalCount).toBe(1)
    expect(result.matchPercent).toBe(100)
  })

  it('debe hacer match exacto con multiples items en inventario', () => {
    const result = countIngredientMatches(
      ['Tomate', 'Cebolla'],
      ['Tomate', 'Cebolla', 'Ajo']
    )
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// 2. Case insensitive
// ---------------------------------------------------------------------------
describe('countIngredientMatches - case insensitive', () => {
  it('debe hacer match de "tomate" con inventario ["Tomate"]', () => {
    const result = countIngredientMatches(['tomate'], ['Tomate'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de "TOMATE" con inventario ["tomate"]', () => {
    const result = countIngredientMatches(['TOMATE'], ['tomate'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de "cEbOlLa" con inventario ["Cebolla"]', () => {
    const result = countIngredientMatches(['cEbOlLa'], ['Cebolla'])
    expect(result.matchCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Accent insensitive
// ---------------------------------------------------------------------------
describe('countIngredientMatches - accent insensitive', () => {
  it('debe hacer match de "Limon" con inventario ["Limon"] (sin acento ambos)', () => {
    const result = countIngredientMatches(['Limon'], ['Limon'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de "Limon" con inventario que tiene acento', () => {
    const result = countIngredientMatches(['Limon'], ['Limón'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de "Limón" (con acento) con inventario ["Limon"] (sin acento)', () => {
    const result = countIngredientMatches(['Limón'], ['Limon'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de "Plátano" con inventario ["Platano"]', () => {
    const result = countIngredientMatches(['Plátano'], ['Platano'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de "Jamón" con inventario ["Jamon"]', () => {
    const result = countIngredientMatches(['Jamón'], ['Jamon'])
    expect(result.matchCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 4. Partial match (one contains the other)
// ---------------------------------------------------------------------------
describe('countIngredientMatches - partial match', () => {
  it('debe hacer match de "Queso rallado" con inventario que tiene "Queso mozzarella" (por parcial de "queso")', () => {
    // "queso rallado" contains "queso" and "queso mozzarella" contains "queso"
    // Partial match: "queso rallado".includes("queso mozzarella") is false,
    // and "queso mozzarella".includes("queso rallado") is false.
    // But fuzzy: "queso" (5 chars >= 4) matches "queso" in item words => match
    const result = countIngredientMatches(['Queso rallado'], ['Queso mozzarella'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match parcial cuando ingrediente contiene al item del inventario', () => {
    // "pollo pechuga" includes "pollo" => partial: sub.includes(normItem)
    const result = countIngredientMatches(['Pollo pechuga deshuesada'], ['Pollo'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match parcial cuando item del inventario contiene al ingrediente', () => {
    // normItem "pollo pechuga" includes sub "pollo"
    const result = countIngredientMatches(['Pollo'], ['Pollo pechuga'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match parcial de "Arroz" con "Arroz blanco"', () => {
    const result = countIngredientMatches(['Arroz'], ['Arroz blanco'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match parcial de "Leche entera" con "Leche"', () => {
    const result = countIngredientMatches(['Leche entera'], ['Leche'])
    expect(result.matchCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 5. Fuzzy matching (words >= 4 chars)
// ---------------------------------------------------------------------------
describe('countIngredientMatches - fuzzy matching by keyword', () => {
  it('debe hacer match fuzzy por palabra clave compartida >= 4 chars', () => {
    // "pechuga deshuesada" vs "pechuga entera" -> "pechuga" (7 chars) matches exactly
    const result = countIngredientMatches(['Pechuga deshuesada'], ['Pechuga entera'])
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match fuzzy cuando una palabra del ingrediente esta contenida en una del inventario', () => {
    // "tomates" (7 chars) in ingredient, "tomatera" contains "tomate" but let's try:
    // subWords: ["tomates"], itemWords: ["tomatillo"]
    // "tomates".includes("tomatillo") => false, "tomatillo".includes("tomates") => false
    // But "mozzarella" vs "mozzarella" => exact keyword match
    const result = countIngredientMatches(
      ['Queso mozzarella rallado'],
      ['Mozzarella fresca']
    )
    expect(result.matchCount).toBe(1)
  })

  it('no debe hacer match fuzzy si las palabras comunes tienen < 4 caracteres', () => {
    // "Sal de mar" => words >= 4 chars: ["de", "mar"] filtered => [] (none >= 4)
    // Wait: "sal"=3, "de"=2, "mar"=3 => no words >= 4 in ingredient
    // "Sal gruesa" => "sal"=3, "gruesa"=6 => subWords=["gruesa"]
    // inventoryWords: "sal"=3, "marina"=6 => itemWords=["marina"]
    // "gruesa" vs "marina" => no match
    const result = countIngredientMatches(['Sal gruesa'], ['Sal marina'])
    // Partial match will catch this: "sal gruesa".includes("sal marina") => false
    // "sal marina".includes("sal gruesa") => false
    // Fuzzy: subWords=["gruesa"], itemWords=["marina"], no overlap
    // BUT partial: "sal marina" doesn't include "sal gruesa" and vice versa
    // However both contain "sal" but "sal" is only 3 chars...
    // Actually let's check partial more carefully:
    //   norm = "sal gruesa", normItem = "sal marina"
    //   normItem.includes(sub) => "sal marina".includes("sal gruesa") => false
    //   sub.includes(normItem) => "sal gruesa".includes("sal marina") => false
    // So no partial match, and no fuzzy match => no match
    expect(result.matchCount).toBe(0)
  })

  it('debe hacer match fuzzy cuando palabra del inventario contiene palabra del ingrediente', () => {
    // ingredient: "Carne molida" => subWords=["carne","molida"]
    // inventory: "Carne de res molida" => itemWords=["carne","molida"]
    // "carne"==="carne" => true
    const result = countIngredientMatches(['Carne molida'], ['Carne de res molida'])
    expect(result.matchCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 6. Compound ingredients with +
// ---------------------------------------------------------------------------
describe('countIngredientMatches - compound ingredients with +', () => {
  it('debe hacer match de "Hogao + Aguacate" si al menos uno de los sub-ingredientes hace match', () => {
    // The function returns true if ANY sub-ingredient matches (for loop returns true on first found)
    const result = countIngredientMatches(
      ['Hogao + Aguacate'],
      ['Hogao', 'Tomate']
    )
    expect(result.matchCount).toBe(1)
  })

  it('debe hacer match de compuesto si el segundo sub-ingrediente hace match', () => {
    const result = countIngredientMatches(
      ['Chimichurri + Ensalada'],
      ['Ensalada']
    )
    expect(result.matchCount).toBe(1)
  })

  it('no debe hacer match si ningun sub-ingrediente del compuesto hace match', () => {
    const result = countIngredientMatches(
      ['Hogao + Aguacate'],
      ['Chocolate', 'Vainilla']
    )
    expect(result.matchCount).toBe(0)
  })

  it('debe contar compuesto como un solo ingrediente en totalCount', () => {
    const result = countIngredientMatches(
      ['Hogao + Aguacate', 'Arroz'],
      ['Hogao', 'Arroz']
    )
    expect(result.totalCount).toBe(2)
    expect(result.matchCount).toBe(2)
    expect(result.matchPercent).toBe(100)
  })

  it('debe manejar multiples + en un ingrediente', () => {
    const result = countIngredientMatches(
      ['Hogao + Aguacate + Limón'],
      ['Limon']  // accent insensitive match with Limón
    )
    expect(result.matchCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 7. No match
// ---------------------------------------------------------------------------
describe('countIngredientMatches - no match', () => {
  it('no debe hacer match de "Chocolate" con inventario ["Tomate", "Cebolla"]', () => {
    const result = countIngredientMatches(['Chocolate'], ['Tomate', 'Cebolla'])
    expect(result.matchCount).toBe(0)
    expect(result.totalCount).toBe(1)
    expect(result.matchPercent).toBe(0)
  })

  it('no debe hacer match de items completamente diferentes', () => {
    const result = countIngredientMatches(
      ['Vainilla', 'Canela', 'Nuez moscada'],
      ['Tomate', 'Cebolla', 'Ajo']
    )
    expect(result.matchCount).toBe(0)
    expect(result.totalCount).toBe(3)
    expect(result.matchPercent).toBe(0)
  })

  it('no debe hacer match con inventario vacio', () => {
    const result = countIngredientMatches(['Tomate', 'Cebolla'], [])
    expect(result.matchCount).toBe(0)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 8. countIngredientMatches returns correct matchCount, totalCount, matchPercent
// ---------------------------------------------------------------------------
describe('countIngredientMatches - return values', () => {
  it('debe retornar matchCount, totalCount y matchPercent correctos con match parcial', () => {
    const result = countIngredientMatches(
      ['Tomate', 'Cebolla', 'Chocolate', 'Vainilla'],
      ['Tomate', 'Cebolla']
    )
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(4)
    expect(result.matchPercent).toBe(50)
  })

  it('debe redondear matchPercent al entero mas cercano', () => {
    // 1/3 = 33.33... => Math.round => 33
    const result = countIngredientMatches(
      ['Tomate', 'Cebolla', 'Ajo'],
      ['Tomate']
    )
    expect(result.matchCount).toBe(1)
    expect(result.totalCount).toBe(3)
    expect(result.matchPercent).toBe(33)
  })

  it('debe redondear hacia arriba cuando corresponde', () => {
    // 2/3 = 66.66... => Math.round => 67
    const result = countIngredientMatches(
      ['Tomate', 'Cebolla', 'Ajo'],
      ['Tomate', 'Cebolla']
    )
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(3)
    expect(result.matchPercent).toBe(67)
  })

  it('debe retornar 100% cuando todos hacen match', () => {
    const result = countIngredientMatches(
      ['Tomate', 'Cebolla'],
      ['Tomate', 'Cebolla']
    )
    expect(result.matchPercent).toBe(100)
  })

  it('debe retornar 0% cuando ninguno hace match', () => {
    const result = countIngredientMatches(
      ['Chocolate'],
      ['Tomate']
    )
    expect(result.matchPercent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 9. Empty ingredients array
// ---------------------------------------------------------------------------
describe('countIngredientMatches - empty ingredients', () => {
  it('debe retornar todos 0s con array de ingredientes vacio', () => {
    const result = countIngredientMatches([], ['Tomate', 'Cebolla'])
    expect(result.matchCount).toBe(0)
    expect(result.totalCount).toBe(0)
    expect(result.matchPercent).toBe(0)
  })

  it('debe retornar todos 0s con ambos arrays vacios', () => {
    const result = countIngredientMatches([], [])
    expect(result.matchCount).toBe(0)
    expect(result.totalCount).toBe(0)
    expect(result.matchPercent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Mix of string and object ingredients
// ---------------------------------------------------------------------------
describe('countIngredientMatches - mixed string and object ingredients', () => {
  it('debe manejar ingredientes como objetos { name: string }', () => {
    const result = countIngredientMatches(
      [{ name: 'Tomate' }, { name: 'Cebolla' }],
      ['Tomate', 'Cebolla']
    )
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(100)
  })

  it('debe manejar mezcla de strings y objetos', () => {
    const result = countIngredientMatches(
      ['Tomate', { name: 'Cebolla' }, 'Ajo', { name: 'Arroz' }],
      ['Tomate', 'Cebolla', 'Ajo', 'Arroz']
    )
    expect(result.matchCount).toBe(4)
    expect(result.totalCount).toBe(4)
    expect(result.matchPercent).toBe(100)
  })

  it('debe manejar objetos sin propiedad name', () => {
    // { name: undefined } -> ingName = '' -> skips matching, no match
    const result = countIngredientMatches(
      [{ name: undefined }, { name: 'Tomate' }],
      ['Tomate']
    )
    // Object with no name is counted in totalCount but not matchCount
    expect(result.matchCount).toBe(1)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(50)
  })

  it('debe manejar objetos con name vacio', () => {
    const result = countIngredientMatches(
      [{ name: '' }, 'Tomate'],
      ['Tomate']
    )
    expect(result.matchCount).toBe(1)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(50)
  })

  it('debe manejar objetos vacios (sin propiedad name)', () => {
    const result = countIngredientMatches(
      [{}, 'Tomate'],
      ['Tomate']
    )
    expect(result.matchCount).toBe(1)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(50)
  })

  it('debe aplicar logica de matching avanzado a ingredientes objeto tambien', () => {
    // Case insensitive + accent insensitive on object ingredients
    const result = countIngredientMatches(
      [{ name: 'limón' }, { name: 'TOMATE' }],
      ['Limon', 'tomate']
    )
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(2)
    expect(result.matchPercent).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Edge cases and additional scenarios
// ---------------------------------------------------------------------------
describe('countIngredientMatches - edge cases', () => {
  it('debe manejar ingredientes con espacios extra', () => {
    const result = countIngredientMatches(
      ['  Tomate  '],
      ['Tomate']
    )
    expect(result.matchCount).toBe(1)
  })

  it('debe manejar ingredientes con espacios multiples internos', () => {
    // normalizeForMatch collapses whitespace: "pollo   pechuga" -> "pollo pechuga"
    const result = countIngredientMatches(
      ['Pollo   pechuga'],
      ['Pollo pechuga']
    )
    expect(result.matchCount).toBe(1)
  })

  it('debe manejar un solo ingrediente que hace match', () => {
    const result = countIngredientMatches(['Ajo'], ['Ajo'])
    expect(result.matchCount).toBe(1)
    expect(result.totalCount).toBe(1)
    expect(result.matchPercent).toBe(100)
  })

  it('debe manejar inventario grande sin problemas', () => {
    const largeInventory = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
    const result = countIngredientMatches(['Item 50', 'Item 99', 'NoExiste'], largeInventory)
    expect(result.matchCount).toBe(2)
    expect(result.totalCount).toBe(3)
  })
})
