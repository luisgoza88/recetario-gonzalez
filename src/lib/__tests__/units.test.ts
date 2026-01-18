import { describe, it, expect } from 'vitest'
import {
  parseQuantity,
  normalizeQuantity,
  compareQuantities,
  formatQuantity,
  convertQuantity,
  isLowStock,
  calculateNeeded
} from '../units'

describe('parseQuantity', () => {
  it('debe parsear cantidad con unidad de peso', () => {
    const result = parseQuantity('500g')
    expect(result.value).toBe(500)
    expect(result.unit).toBe('g')
    expect(result.unitType).toBe('weight')
  })

  it('debe parsear kilogramos', () => {
    const result = parseQuantity('2.5 kg')
    expect(result.value).toBe(2.5)
    expect(result.unit).toBe('kg')
    expect(result.unitType).toBe('weight')
  })

  it('debe parsear cantidad con decimales y coma', () => {
    const result = parseQuantity('1,5 litros')
    expect(result.value).toBe(1.5)
    expect(result.unit).toBe('litros')
    expect(result.unitType).toBe('volume')
  })

  it('debe parsear unidades de conteo', () => {
    const result = parseQuantity('3 unidades')
    expect(result.value).toBe(3)
    expect(result.unit).toBe('unidades')
    expect(result.unitType).toBe('count')
  })

  it('debe manejar string vacío', () => {
    const result = parseQuantity('')
    expect(result.value).toBe(0)
    expect(result.unit).toBe('')
    expect(result.unitType).toBe('unknown')
  })

  it('debe asumir valor 1 si no hay número', () => {
    const result = parseQuantity('unidad')
    expect(result.value).toBe(1)
    expect(result.unit).toBe('unidad')
  })

  it('debe parsear cucharadas', () => {
    const result = parseQuantity('2 cucharadas')
    expect(result.value).toBe(2)
    expect(result.unit).toBe('cucharadas')
    expect(result.unitType).toBe('volume')
  })

  it('debe parsear tazas', () => {
    const result = parseQuantity('1 taza')
    expect(result.value).toBe(1)
    expect(result.unit).toBe('taza')
    expect(result.unitType).toBe('volume')
  })

  it('debe parsear libras', () => {
    const result = parseQuantity('2 libras')
    expect(result.value).toBe(2)
    expect(result.unit).toBe('libras')
    expect(result.unitType).toBe('weight')
  })
})

describe('normalizeQuantity', () => {
  it('debe convertir kg a gramos', () => {
    const result = normalizeQuantity('2 kg')
    expect(result.value).toBe(2000)
    expect(result.baseUnit).toBe('g')
  })

  it('debe mantener gramos sin cambio', () => {
    const result = normalizeQuantity('500g')
    expect(result.value).toBe(500)
    expect(result.baseUnit).toBe('g')
  })

  it('debe convertir litros a ml', () => {
    const result = normalizeQuantity('1.5 litros')
    expect(result.value).toBe(1500)
    expect(result.baseUnit).toBe('ml')
  })

  it('debe convertir tazas a ml', () => {
    const result = normalizeQuantity('2 tazas')
    expect(result.value).toBe(480)
    expect(result.baseUnit).toBe('ml')
  })

  it('debe convertir cucharadas a ml', () => {
    const result = normalizeQuantity('3 cucharadas')
    expect(result.value).toBe(45)
    expect(result.baseUnit).toBe('ml')
  })

  it('debe convertir libras a gramos', () => {
    const result = normalizeQuantity('1 libra')
    expect(result.value).toBeCloseTo(453.592, 1)
    expect(result.baseUnit).toBe('g')
  })

  it('debe manejar unidades de conteo', () => {
    const result = normalizeQuantity('5 unidades')
    expect(result.value).toBe(5)
    expect(result.baseUnit).toBe('unid')
  })
})

describe('compareQuantities', () => {
  it('debe retornar hasEnough=true cuando hay suficiente', () => {
    const result = compareQuantities('500g', '400g')
    expect(result.hasEnough).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.percentAvailable).toBe(100)
  })

  it('debe retornar hasEnough=false cuando no hay suficiente', () => {
    const result = compareQuantities('200g', '500g')
    expect(result.hasEnough).toBe(false)
    expect(result.compatible).toBe(true)
    expect(result.percentAvailable).toBe(40)
  })

  it('debe manejar diferentes unidades del mismo tipo', () => {
    const result = compareQuantities('1 kg', '500g')
    expect(result.hasEnough).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.percentAvailable).toBe(100)
  })

  it('debe manejar requerimiento de 0', () => {
    const result = compareQuantities('100g', '0g')
    expect(result.hasEnough).toBe(true)
    expect(result.percentAvailable).toBe(100)
  })

  it('debe marcar como incompatible peso vs volumen', () => {
    const result = compareQuantities('500g', '500ml')
    expect(result.compatible).toBe(false)
    expect(result.message).toContain('incompatibles')
  })

  it('debe respetar threshold personalizado', () => {
    // Con threshold 0.5 (50%), 200g de 500g debería ser suficiente
    const result = compareQuantities('250g', '500g', 0.5)
    expect(result.hasEnough).toBe(true)
  })
})

describe('formatQuantity', () => {
  it('debe formatear enteros sin decimales', () => {
    expect(formatQuantity(5, 'kg')).toBe('5 kg')
  })

  it('debe formatear decimales con 2 dígitos', () => {
    expect(formatQuantity(2.567, 'kg')).toBe('2.57 kg')
  })

  it('debe manejar valor sin unidad', () => {
    expect(formatQuantity(3, '')).toBe('3')
  })

  it('debe redondear .50 correctamente', () => {
    expect(formatQuantity(2.5, 'kg')).toBe('2.50 kg')
  })
})

describe('convertQuantity', () => {
  it('debe convertir kg a g', () => {
    expect(convertQuantity(2, 'kg', 'g')).toBe(2000)
  })

  it('debe convertir g a kg', () => {
    expect(convertQuantity(500, 'g', 'kg')).toBe(0.5)
  })

  it('debe convertir litros a ml', () => {
    expect(convertQuantity(1.5, 'litros', 'ml')).toBe(1500)
  })

  it('debe retornar el mismo valor para misma unidad', () => {
    expect(convertQuantity(500, 'g', 'g')).toBe(500)
  })

  it('debe retornar null para unidades incompatibles', () => {
    expect(convertQuantity(500, 'g', 'ml')).toBeNull()
  })

  it('debe convertir libras a gramos', () => {
    const result = convertQuantity(1, 'libra', 'g')
    expect(result).toBeCloseTo(453.592, 1)
  })
})

describe('isLowStock', () => {
  it('debe detectar stock bajo', () => {
    expect(isLowStock('100g', '1kg')).toBe(true)
  })

  it('debe detectar stock suficiente', () => {
    expect(isLowStock('500g', '1kg')).toBe(false)
  })

  it('debe respetar threshold personalizado', () => {
    // 400g de 1kg = 40%, que es < 50% threshold, así que ES bajo stock
    expect(isLowStock('400g', '1kg', 0.5)).toBe(true)
    // 600g de 1kg = 60%, que es >= 50% threshold, así que NO es bajo stock
    expect(isLowStock('600g', '1kg', 0.5)).toBe(false)
  })
})

describe('calculateNeeded', () => {
  it('debe calcular cantidad faltante', () => {
    const result = calculateNeeded('200g', '500g')
    expect(result?.needed).toBe(300)
    expect(result?.unit).toBe('g')
  })

  it('debe retornar 0 si hay más de lo necesario', () => {
    const result = calculateNeeded('1kg', '500g')
    expect(result?.needed).toBe(0)
  })

  it('debe retornar null para unidades incompatibles', () => {
    const result = calculateNeeded('500g', '500ml')
    expect(result).toBeNull()
  })

  it('debe funcionar con diferentes unidades del mismo tipo', () => {
    const result = calculateNeeded('500g', '1kg')
    expect(result?.needed).toBe(500)
  })
})
