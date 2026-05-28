"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Store,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { STORE_OPTIONS } from "@/types";
import { supabase } from "@/lib/supabase/client";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface PriceLogModalProps {
  itemName: string;
  onSave: (price: number, store: string) => void;
  onSkip: () => void;
}

/** Registro real de la tabla price_history */
interface PriceRecord {
  price: number;
  store: string | null;
  recorded_at: string;
}

/** Ranking agregado por supermercado (precio mas reciente por tienda) */
interface StoreRanking {
  store: string;
  price: number;
  count: number;
  isBest: boolean;
}

const cop = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

export default function PriceLogModal({
  itemName,
  onSave,
  onSkip,
}: PriceLogModalProps) {
  const [price, setPrice] = useState("");
  const [store, setStore] = useState("");
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEscapeKey(onSkip, true);

  // Cargar historial real de precios para este item
  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("price_history")
          .select("price, store, recorded_at")
          .ilike("item_name", itemName)
          .order("recorded_at", { ascending: true });
        if (!active) return;
        if (error) {
          console.error("Error loading price history:", error);
          setHistory([]);
        } else {
          setHistory(
            (data || []).map((r: PriceRecord) => ({
              price: Number(r.price),
              store: r.store,
              recorded_at: r.recorded_at,
            })),
          );
        }
      } catch (err) {
        console.error("Error loading price history:", err);
        if (active) setHistory([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [itemName]);

  // Serie cronologica de precios reales para el sparkline
  const series = useMemo(
    () => history.map((h) => h.price).filter((p) => p > 0),
    [history],
  );

  // Variacion porcentual entre el primer y ultimo registro real
  const variation = useMemo(() => {
    if (series.length < 2) return null;
    const first = series[0];
    const last = series[series.length - 1];
    if (first <= 0) return null;
    return Math.round(((last - first) / first) * 100);
  }, [series]);

  // Ranking de supermercados con el precio mas reciente registrado por tienda
  const ranking = useMemo<StoreRanking[]>(() => {
    const byStore = new Map<string, { price: number; count: number }>();
    for (const r of history) {
      const s = r.store || "Otro";
      const existing = byStore.get(s);
      // El historial viene ordenado asc por fecha, asi que el ultimo gana
      byStore.set(s, {
        price: r.price,
        count: (existing?.count || 0) + 1,
      });
    }
    const rows = Array.from(byStore.entries()).map(([s, v]) => ({
      store: s,
      price: v.price,
      count: v.count,
      isBest: false,
    }));
    rows.sort((a, b) => a.price - b.price);
    if (rows.length > 0) rows[0].isBest = true;
    return rows;
  }, [history]);

  // Sparkline SVG a partir de la serie real
  const sparkPath = useMemo(() => {
    if (series.length < 2) return null;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const w = 280;
    const h = 56;
    const range = max - min || 1;
    const path = series
      .map((v, i) => {
        const x = (i / (series.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 6) - 3;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    return { path, w, h };
  }, [series]);

  const handleSave = () => {
    const numPrice = parseFloat(price);
    if (!numPrice || numPrice <= 0 || !store) return;
    onSave(numPrice, store);
  };

  const canSave = !!price && !!store && parseFloat(price) > 0;
  const trendDown = variation !== null && variation < 0;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onSkip}
    >
      <div
        className="bg-[var(--bg)] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92%" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Header */}
        <header className="bg-white px-5 pt-3 sm:pt-5 pb-3 border-b border-[var(--border)] flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
              Comparar precios
            </p>
            <h3 className="text-[18px] font-semibold tracking-tight text-[var(--ink)] truncate">
              {itemName}
            </h3>
          </div>
          <button
            onClick={onSkip}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 ml-3"
            aria-label="Cerrar"
          >
            <X size={16} className="text-[var(--ink-soft)]" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Sparkline de historial real */}
          {sparkPath && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Historial de precios
                </p>
                {variation !== null && (
                  <span
                    className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                      trendDown ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {trendDown ? (
                      <TrendingDown size={11} />
                    ) : (
                      <TrendingUp size={11} />
                    )}
                    {variation > 0 ? "+" : ""}
                    {variation}%
                  </span>
                )}
              </div>
              <svg
                viewBox={`0 0 ${sparkPath.w} ${sparkPath.h}`}
                className="w-full mt-2"
                preserveAspectRatio="none"
                style={{ height: 70 }}
              >
                <defs>
                  <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity="0.18"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path
                  d={`${sparkPath.path} L ${sparkPath.w} ${sparkPath.h} L 0 ${sparkPath.h} Z`}
                  fill="url(#spark-grad)"
                />
                <path
                  d={sparkPath.path}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex justify-between text-[10px] text-stone-400 mt-1 tabular-nums">
                <span>Primero · {cop(series[0])}</span>
                <span>Último · {cop(series[series.length - 1])}</span>
              </div>
            </div>
          )}

          {/* Ranking de supermercados (mas barato arriba) */}
          {ranking.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold px-1">
                Por supermercado
              </p>
              <div className="space-y-2">
                {ranking.map((s) => (
                  <div
                    key={s.store}
                    className={`bg-white rounded-2xl border p-3 flex items-center gap-3 ${
                      s.isBest
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[14px] bg-[var(--accent-soft)] text-[var(--accent)]">
                      {s.store.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-[var(--ink)]">
                          {s.store}
                        </p>
                        {s.isBest && (
                          <span className="bg-[var(--accent)] text-white text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded">
                            Mejor precio
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                        {s.count} {s.count === 1 ? "registro" : "registros"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-[var(--ink)] tabular-nums tracking-tight">
                        {cop(s.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Estado vacio: sin historial todavia */}
          {!isLoading && ranking.length === 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0">
                <Receipt size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-[12.5px] text-[var(--ink-soft)] leading-snug">
                Aún no hay precios registrados para{" "}
                <span className="font-semibold text-[var(--ink)]">
                  {itemName}
                </span>
                . Registra el primero abajo.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)]" />
            </div>
          )}

          {/* Registrar nuevo precio */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-[var(--accent)]" />
              <p className="text-[12.5px] font-semibold text-[var(--ink)]">
                Registrar precio
              </p>
            </div>

            {/* Input de precio */}
            <div className="relative">
              <DollarSign
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="Precio (ej: 5500)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[16px] tabular-nums text-[var(--ink)] outline-none"
                autoFocus
              />
            </div>

            {/* Seleccion de tienda */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                <Store size={12} />
                <span>¿Dónde compraste?</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {STORE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStore(s)}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      store === s
                        ? "bg-[var(--accent)] text-white"
                        : "bg-stone-100 text-[var(--ink-soft)] hover:bg-stone-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer fijo con acciones */}
        <div className="border-t border-[var(--border)] bg-white px-5 py-3 flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl text-[var(--ink-soft)] text-[13px] font-semibold hover:bg-stone-50 transition-colors"
          >
            Omitir
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 bg-[var(--accent)] text-white py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <CheckCircle2 size={14} /> Guardar precio
          </button>
        </div>
      </div>
    </div>
  );
}
