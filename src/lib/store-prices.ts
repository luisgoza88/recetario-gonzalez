// Helper para acceder a precios de tiendas desde DB

import { supabase } from "@/lib/supabase/client";
import type { StoreKey } from "@/lib/constants/categories";

export interface StorePriceRecord {
  item_name: string;
  store: StoreKey;
  price: number;
  updated_at: string;
}

export interface StorePriceAggregate {
  item_name: string;
  category?: string;
  prices: Partial<Record<StoreKey, number>>;
}

let pricesCache: StorePriceRecord[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutos

export async function getStorePrices(): Promise<StorePriceRecord[]> {
  const now = Date.now();
  if (pricesCache && now - cacheTime < CACHE_DURATION) {
    return pricesCache;
  }

  const { data, error } = await supabase
    .from("store_prices")
    .select("item_name, store, price, updated_at");

  if (error) {
    console.error("Error fetching store prices:", error);
    return pricesCache || [];
  }

  pricesCache = data || [];
  cacheTime = now;
  return pricesCache;
}

export async function getAggregatedPrices(): Promise<StorePriceAggregate[]> {
  const records = await getStorePrices();

  const grouped = new Map<string, StorePriceAggregate>();

  for (const record of records) {
    if (!grouped.has(record.item_name)) {
      grouped.set(record.item_name, {
        item_name: record.item_name,
        prices: {},
      });
    }

    const item = grouped.get(record.item_name)!;
    item.prices[record.store as StoreKey] = record.price;
  }

  return Array.from(grouped.values());
}

export function getCheapestStore(
  prices: Partial<Record<StoreKey, number>>,
): { store: StoreKey; price: number } | null {
  const entries = Object.entries(prices).filter(
    ([, price]) => price !== undefined && price !== null,
  ) as Array<[StoreKey, number]>;

  if (entries.length === 0) return null;

  return entries.reduce(
    (cheapest, [store, price]) =>
      price < cheapest.price ? { store, price } : cheapest,
    { store: entries[0][0], price: entries[0][1] },
  );
}

export function getMostExpensiveStore(
  prices: Partial<Record<StoreKey, number>>,
): { store: StoreKey; price: number } | null {
  const entries = Object.entries(prices).filter(
    ([, price]) => price !== undefined && price !== null,
  ) as Array<[StoreKey, number]>;

  if (entries.length === 0) return null;

  return entries.reduce(
    (expensive, [store, price]) =>
      price > expensive.price ? { store, price } : expensive,
    { store: entries[0][0], price: entries[0][1] },
  );
}

export function calculateStoreTotal(
  items: StorePriceAggregate[],
  store: StoreKey,
): number {
  return items.reduce((total, item) => total + (item.prices[store] || 0), 0);
}

export function calculateOptimizedTotal(items: StorePriceAggregate[]): number {
  return items.reduce((total, item) => {
    const cheapest = getCheapestStore(item.prices);
    return total + (cheapest?.price || 0);
  }, 0);
}

export function generateOptimizedList(
  items: StorePriceAggregate[],
): Map<StoreKey, string[]> {
  const list = new Map<StoreKey, string[]>();
  const stores: StoreKey[] = ["exito", "d1", "jumbo", "carulla", "euro"];

  for (const store of stores) {
    list.set(store, []);
  }

  for (const item of items) {
    const cheapest = getCheapestStore(item.prices);
    if (cheapest) {
      list.get(cheapest.store)!.push(item.item_name);
    }
  }

  return list;
}

export function getCategories(items: StorePriceAggregate[]): string[] {
  const categories = new Set<string>();

  for (const item of items) {
    // Inferir categoría desde el nombre (heurística simple)
    if (
      item.item_name.includes("Salmón") ||
      item.item_name.includes("Lomo") ||
      item.item_name.includes("Filete")
    ) {
      categories.add("Proteínas Premium");
    } else if (
      item.item_name.includes("Pollo") ||
      item.item_name.includes("Cerdo") ||
      item.item_name.includes("Bistec") ||
      item.item_name.includes("Jamón")
    ) {
      categories.add("Proteínas Económicas");
    } else {
      categories.add("Otros");
    }
  }

  return Array.from(categories).sort();
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function clearStorePricesCache(): void {
  pricesCache = null;
  cacheTime = 0;
}
