'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Schema for our IndexedDB database
interface GroceryPreferencesDB extends DBSchema {
  frequentItems: {
    key: string;
    value: {
      productId: string;
      productName: string;
      category?: string;
      categoryId?: string;
      count: number;
      lastUsed: number; // timestamp
    };
    indexes: {
      'by-count': number;
      'by-lastUsed': number;
    };
  };
  recentSearches: {
    key: number;
    value: {
      id?: number;
      query: string;
      timestamp: number;
    };
  };
  customProducts: {
    key: string;
    value: {
      id: string;
      name: string;
      category?: string;
      categoryId?: string;
      unit?: string;
      createdAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<GroceryPreferencesDB>> | null = null;

function getDB(): Promise<IDBPDatabase<GroceryPreferencesDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available on server'));
  }

  if (!dbPromise) {
    dbPromise = openDB<GroceryPreferencesDB>('recetario-preferences', 1, {
      upgrade(db) {
        // Frequent items store
        if (!db.objectStoreNames.contains('frequentItems')) {
          const frequentStore = db.createObjectStore('frequentItems', {
            keyPath: 'productId'
          });
          frequentStore.createIndex('by-count', 'count');
          frequentStore.createIndex('by-lastUsed', 'lastUsed');
        }

        // Recent searches
        if (!db.objectStoreNames.contains('recentSearches')) {
          db.createObjectStore('recentSearches', {
            keyPath: 'id',
            autoIncrement: true
          });
        }

        // Custom products added by user
        if (!db.objectStoreNames.contains('customProducts')) {
          db.createObjectStore('customProducts', {
            keyPath: 'id'
          });
        }
      }
    });
  }
  return dbPromise;
}

// ==================== Frequent Items ====================

export interface FrequentItem {
  productId: string;
  productName: string;
  category?: string;
  categoryId?: string;
  count: number;
  lastUsed: number;
}

export async function recordProductUsage(
  productId: string,
  productName: string,
  category?: string,
  categoryId?: string
): Promise<void> {
  try {
    const db = await getDB();
    const existing = await db.get('frequentItems', productId);

    await db.put('frequentItems', {
      productId,
      productName,
      category,
      categoryId,
      count: (existing?.count || 0) + 1,
      lastUsed: Date.now()
    });
  } catch (error) {
    console.error('Error recording product usage:', error);
  }
}

export async function getFrequentItems(limit = 10): Promise<FrequentItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAllFromIndex('frequentItems', 'by-count');
    // Sort by count descending and take top N
    return items.sort((a, b) => b.count - a.count).slice(0, limit);
  } catch (error) {
    console.error('Error getting frequent items:', error);
    return [];
  }
}

export async function getRecentItems(limit = 5): Promise<FrequentItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAllFromIndex('frequentItems', 'by-lastUsed');
    // Sort by lastUsed descending and take top N
    return items.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, limit);
  } catch (error) {
    console.error('Error getting recent items:', error);
    return [];
  }
}

// ==================== Recent Searches ====================

export async function saveRecentSearch(query: string): Promise<void> {
  try {
    const db = await getDB();
    await db.add('recentSearches', {
      query,
      timestamp: Date.now()
    });

    // Keep only last 20 searches
    const all = await db.getAll('recentSearches');
    if (all.length > 20) {
      const toDelete = all.slice(0, all.length - 20);
      for (const item of toDelete) {
        if (item.id) {
          await db.delete('recentSearches', item.id);
        }
      }
    }
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}

export async function getRecentSearches(limit = 5): Promise<string[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('recentSearches');
    return all
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(s => s.query);
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
}

// ==================== Custom Products ====================

export interface CustomProduct {
  id: string;
  name: string;
  category?: string;
  categoryId?: string;
  unit?: string;
  createdAt: number;
}

export async function saveCustomProduct(product: Omit<CustomProduct, 'createdAt'>): Promise<void> {
  try {
    const db = await getDB();
    await db.put('customProducts', {
      ...product,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Error saving custom product:', error);
  }
}

export async function getCustomProducts(): Promise<CustomProduct[]> {
  try {
    const db = await getDB();
    return await db.getAll('customProducts');
  } catch (error) {
    console.error('Error getting custom products:', error);
    return [];
  }
}

// ==================== Barcode Lookup ====================

interface ProductInfo {
  name: string;
  brand?: string;
  category?: string;
  quantity?: string;
}

// Open Food Facts API for barcode lookup
export async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const data = await response.json();

    if (data.status === 1 && data.product) {
      return {
        name: data.product.product_name || data.product.product_name_es || 'Producto desconocido',
        brand: data.product.brands,
        category: data.product.categories,
        quantity: data.product.quantity
      };
    }
    return null;
  } catch (error) {
    console.error('Error looking up barcode:', error);
    return null;
  }
}

// Cache barcode results locally
const barcodeCache = new Map<string, ProductInfo | null>();

export async function lookupBarcodeWithCache(barcode: string): Promise<ProductInfo | null> {
  // Check memory cache first
  if (barcodeCache.has(barcode)) {
    return barcodeCache.get(barcode) || null;
  }

  // Fetch from API
  const product = await lookupBarcode(barcode);
  barcodeCache.set(barcode, product);
  return product;
}
