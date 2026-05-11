"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingDown, ChevronDown, ChevronUp, Store } from "lucide-react";
import {
  getAggregatedPrices,
  calculateStoreTotal,
  formatCOP,
  type StorePriceAggregate,
} from "@/lib/store-prices";
import { STORE_LABELS, type StoreKey } from "@/lib/constants/categories";
import type { MarketItem } from "@/types";

const ALL_STORES: StoreKey[] = ["exito", "d1", "jumbo", "carulla", "euro"];

interface StoreTotal {
  store: StoreKey;
  label: string;
  total: number;
  itemCount: number;
}

interface PriceComparisonCardProps {
  /** Lista de items de mercado actuales (no marcados como comprados) */
  items: MarketItem[];
  /** Mostrar solo si hay al menos este numero de items. Default 5. */
  minItems?: number;
}

export function PriceComparisonCard({
  items,
  minItems = 5,
}: PriceComparisonCardProps) {
  const [storeTotals, setStoreTotals] = useState<StoreTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [currentStoreKey, setCurrentStoreKey] = useState<StoreKey | null>(null);

  const pendingItems = items.filter((i) => !i.checked);

  const loadPrices = useCallback(async () => {
    if (pendingItems.length < minItems) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allPrices = await getAggregatedPrices();

      // Filtrar solo los items que estan en la lista de compras pendiente
      const pendingNames = new Set(
        pendingItems.map((i) => i.name.toLowerCase().trim()),
      );

      const relevantPrices: StorePriceAggregate[] = allPrices.filter((p) =>
        pendingNames.has(p.item_name.toLowerCase().trim()),
      );

      if (relevantPrices.length === 0) {
        setStoreTotals([]);
        setLoading(false);
        return;
      }

      const totals: StoreTotal[] = ALL_STORES.map((store) => {
        const total = calculateStoreTotal(relevantPrices, store);
        const itemCount = relevantPrices.filter(
          (p) => (p.prices[store] ?? 0) > 0,
        ).length;
        return {
          store,
          label: STORE_LABELS[store] ?? store,
          total,
          itemCount,
        };
      })
        .filter((t) => t.total > 0)
        .sort((a, b) => a.total - b.total);

      setStoreTotals(totals);

      // Detectar tienda actual desde localStorage
      const saved = localStorage.getItem("preferred_store") as StoreKey | null;
      if (saved && ALL_STORES.includes(saved)) {
        setCurrentStoreKey(saved);
      }
    } catch {
      // Silencioso: si falla no mostramos la card
      setStoreTotals([]);
    } finally {
      setLoading(false);
    }
  }, [pendingItems.length, minItems]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // No mostrar si hay pocos items o no hay datos de precios
  if (pendingItems.length < minItems || loading || storeTotals.length === 0) {
    return null;
  }

  const cheapest = storeTotals[0];
  const currentStore = currentStoreKey
    ? storeTotals.find((t) => t.store === currentStoreKey)
    : null;

  const savings =
    currentStore && currentStore.store !== cheapest.store
      ? currentStore.total - cheapest.total
      : null;

  const handleSelectStore = (store: StoreKey) => {
    setCurrentStoreKey(store);
    localStorage.setItem("preferred_store", store);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-emerald-50 p-4 border-b border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">
              Comparador de precios
            </span>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/60 transition-colors"
            aria-label={
              expanded ? "Ocultar desglose" : "Ver desglose por tienda"
            }
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Resumen principal */}
        <div className="mt-3 flex items-end gap-3 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Mas barato en</p>
            <p className="text-lg font-bold text-green-700">{cheapest.label}</p>
            <p className="text-sm text-gray-600">{formatCOP(cheapest.total)}</p>
          </div>

          {savings !== null && savings > 0 && (
            <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-medium">
              Ahorras {formatCOP(savings)} vs {currentStore!.label}
            </div>
          )}

          {!currentStore && (
            <p className="text-xs text-gray-400 self-end">
              Selecciona tu tienda para ver cuanto ahorras
            </p>
          )}
        </div>
      </div>

      {/* Desglose por tienda */}
      {expanded && (
        <div className="divide-y divide-gray-50">
          {storeTotals.map((t, idx) => {
            const isCheapest = idx === 0;
            const isCurrent = t.store === currentStoreKey;

            return (
              <button
                key={t.store}
                onClick={() => handleSelectStore(t.store)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                  isCurrent ? "bg-green-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Store
                    size={14}
                    className={isCurrent ? "text-green-600" : "text-gray-400"}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isCurrent ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {t.label}
                  </span>
                  {isCheapest && (
                    <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      MEJOR PRECIO
                    </span>
                  )}
                  {isCurrent && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">
                      tu tienda
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      isCheapest ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    {formatCOP(t.total)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {t.itemCount} de {pendingItems.length} items
                  </p>
                </div>
              </button>
            );
          })}

          <p className="text-[10px] text-gray-400 px-4 py-2 text-center">
            Basado en precios registrados. Toca una tienda para marcarla como la
            tuya.
          </p>
        </div>
      )}
    </div>
  );
}
