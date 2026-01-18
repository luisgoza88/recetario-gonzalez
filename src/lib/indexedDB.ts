import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Schema para la base de datos
interface RecetarioDBSchema extends DBSchema {
  // Datos de usuario
  frequentItems: {
    key: string
    value: {
      id: string
      name: string
      count: number
      lastUsed: number
    }
  }
  recentSearches: {
    key: string
    value: {
      query: string
      timestamp: number
    }
  }
  customProducts: {
    key: string
    value: {
      id: string
      name: string
      category: string
      createdAt: number
    }
  }

  // Cache de datos de Supabase para offline
  cachedDayMenus: {
    key: number // day_number (0-11)
    value: {
      day_number: number
      breakfast_id: string
      lunch_id: string
      dinner_id: string | null
      reminder: string | null
      breakfast?: unknown
      lunch?: unknown
      dinner?: unknown | null
      cachedAt: number
    }
  }
  cachedRecipes: {
    key: string // recipe id
    value: {
      id: string
      name: string
      type: string
      ingredients: unknown[]
      steps: string[]
      portions?: unknown
      total?: string
      image_url?: string
      description?: string
      tips?: string
      prep_time?: number
      cook_time?: number
      total_time?: number
      nutrition?: unknown
      difficulty?: string
      dietary_tags?: string[]
      cachedAt: number
    }
  }
  cachedMarketItems: {
    key: string // item id
    value: {
      id: string
      name: string
      category: string
      category_id?: string
      quantity: string
      checked: boolean
      order_index: number
      is_custom?: boolean
      cachedAt: number
    }
  }
  cachedInventory: {
    key: string // item id
    value: {
      item_id: string
      current_quantity: string
      current_number: number
      cachedAt: number
    }
  }

  // Cola de operaciones pendientes para sync
  pendingOperations: {
    key: string // operation id
    value: {
      id: string
      operation: 'update' | 'insert' | 'delete'
      table: string
      data: unknown
      createdAt: number
    }
  }
}

const DB_NAME = 'recetario-offline'
const DB_VERSION = 2 // Incrementar version para agregar nuevos stores

let dbPromise: Promise<IDBPDatabase<RecetarioDBSchema>> | null = null

// Inicializar la base de datos
export async function getDB(): Promise<IDBPDatabase<RecetarioDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<RecetarioDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1: Datos de usuario
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('frequentItems')) {
            db.createObjectStore('frequentItems', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('recentSearches')) {
            db.createObjectStore('recentSearches', { keyPath: 'query' })
          }
          if (!db.objectStoreNames.contains('customProducts')) {
            db.createObjectStore('customProducts', { keyPath: 'id' })
          }
        }

        // Version 2: Cache para offline
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('cachedDayMenus')) {
            db.createObjectStore('cachedDayMenus', { keyPath: 'day_number' })
          }
          if (!db.objectStoreNames.contains('cachedRecipes')) {
            db.createObjectStore('cachedRecipes', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('cachedMarketItems')) {
            db.createObjectStore('cachedMarketItems', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('cachedInventory')) {
            db.createObjectStore('cachedInventory', { keyPath: 'item_id' })
          }
          if (!db.objectStoreNames.contains('pendingOperations')) {
            db.createObjectStore('pendingOperations', { keyPath: 'id' })
          }
        }
      }
    })
  }
  return dbPromise
}

// =====================================================
// CACHE DE DATOS PARA OFFLINE
// =====================================================

// Day Menus
export async function cacheDayMenus(menus: RecetarioDBSchema['cachedDayMenus']['value'][]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('cachedDayMenus', 'readwrite')
  const now = Date.now()

  for (const menu of menus) {
    await tx.store.put({ ...menu, cachedAt: now })
  }

  await tx.done
}

export async function getCachedDayMenus(): Promise<RecetarioDBSchema['cachedDayMenus']['value'][]> {
  const db = await getDB()
  return db.getAll('cachedDayMenus')
}

export async function getCachedDayMenu(dayNumber: number): Promise<RecetarioDBSchema['cachedDayMenus']['value'] | undefined> {
  const db = await getDB()
  return db.get('cachedDayMenus', dayNumber)
}

// Recipes
export async function cacheRecipes(recipes: RecetarioDBSchema['cachedRecipes']['value'][]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('cachedRecipes', 'readwrite')
  const now = Date.now()

  for (const recipe of recipes) {
    await tx.store.put({ ...recipe, cachedAt: now })
  }

  await tx.done
}

export async function getCachedRecipes(): Promise<RecetarioDBSchema['cachedRecipes']['value'][]> {
  const db = await getDB()
  return db.getAll('cachedRecipes')
}

export async function getCachedRecipe(id: string): Promise<RecetarioDBSchema['cachedRecipes']['value'] | undefined> {
  const db = await getDB()
  return db.get('cachedRecipes', id)
}

// Market Items
export async function cacheMarketItems(items: RecetarioDBSchema['cachedMarketItems']['value'][]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('cachedMarketItems', 'readwrite')
  const now = Date.now()

  for (const item of items) {
    await tx.store.put({ ...item, cachedAt: now })
  }

  await tx.done
}

export async function getCachedMarketItems(): Promise<RecetarioDBSchema['cachedMarketItems']['value'][]> {
  const db = await getDB()
  return db.getAll('cachedMarketItems')
}

// Inventory
export async function cacheInventory(items: RecetarioDBSchema['cachedInventory']['value'][]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('cachedInventory', 'readwrite')
  const now = Date.now()

  for (const item of items) {
    await tx.store.put({ ...item, cachedAt: now })
  }

  await tx.done
}

export async function getCachedInventory(): Promise<RecetarioDBSchema['cachedInventory']['value'][]> {
  const db = await getDB()
  return db.getAll('cachedInventory')
}

// =====================================================
// COLA DE OPERACIONES PENDIENTES
// =====================================================

export interface PendingOperation {
  id: string
  operation: 'update' | 'insert' | 'delete'
  table: string
  data: unknown
  createdAt: number
}

export async function addPendingOperation(op: Omit<PendingOperation, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDB()
  const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const operation: PendingOperation = {
    ...op,
    id,
    createdAt: Date.now()
  }
  await db.put('pendingOperations', operation)
  return id
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await getDB()
  return db.getAll('pendingOperations')
}

export async function removePendingOperation(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendingOperations', id)
}

export async function clearPendingOperations(): Promise<void> {
  const db = await getDB()
  await db.clear('pendingOperations')
}

// =====================================================
// UTILIDADES
// =====================================================

// Verificar si el cache es reciente (menos de X horas)
export function isCacheValid(cachedAt: number, maxAgeHours = 24): boolean {
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000
  return Date.now() - cachedAt < maxAgeMs
}

// Limpiar todo el cache
export async function clearAllCache(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('cachedDayMenus'),
    db.clear('cachedRecipes'),
    db.clear('cachedMarketItems'),
    db.clear('cachedInventory')
  ])
}

// Obtener estadísticas del cache
export async function getCacheStats(): Promise<{
  dayMenus: number
  recipes: number
  marketItems: number
  inventory: number
  pendingOps: number
}> {
  const db = await getDB()
  const [dayMenus, recipes, marketItems, inventory, pendingOps] = await Promise.all([
    db.count('cachedDayMenus'),
    db.count('cachedRecipes'),
    db.count('cachedMarketItems'),
    db.count('cachedInventory'),
    db.count('pendingOperations')
  ])

  return { dayMenus, recipes, marketItems, inventory, pendingOps }
}

// =====================================================
// DATOS DE USUARIO (LEGACY - mantener compatibilidad)
// =====================================================

export async function addFrequentItem(item: { id: string; name: string }): Promise<void> {
  const db = await getDB()
  const existing = await db.get('frequentItems', item.id)

  if (existing) {
    await db.put('frequentItems', {
      ...existing,
      count: existing.count + 1,
      lastUsed: Date.now()
    })
  } else {
    await db.put('frequentItems', {
      id: item.id,
      name: item.name,
      count: 1,
      lastUsed: Date.now()
    })
  }
}

export async function getFrequentItems(limit = 10): Promise<RecetarioDBSchema['frequentItems']['value'][]> {
  const db = await getDB()
  const all = await db.getAll('frequentItems')
  return all.sort((a, b) => b.count - a.count).slice(0, limit)
}

export async function addRecentSearch(query: string): Promise<void> {
  const db = await getDB()
  await db.put('recentSearches', {
    query,
    timestamp: Date.now()
  })
}

export async function getRecentSearches(limit = 5): Promise<string[]> {
  const db = await getDB()
  const all = await db.getAll('recentSearches')
  return all
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map(item => item.query)
}
