"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Share2, Sparkles } from "lucide-react";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import { supabase } from "@/lib/supabase/client";
import Spinner from "@/components/ui/Spinner";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import MonthlyChart, {
  type MonthlyChartSeries,
} from "@/components/charts/MonthlyChart";

/**
 * Reparte un total en `weeks` semanas de forma determinista (sin inventar
 * datos de API): distribución uniforme con el residuo en la última semana.
 */
function spread(total: number, weeks = 5): number[] {
  if (total <= 0) return Array(weeks).fill(0);
  const base = Math.floor(total / weeks);
  const arr = Array(weeks).fill(base);
  arr[weeks - 1] = total - base * (weeks - 1);
  return arr;
}

interface MonthlyReport {
  period: { start: string; end: string };
  cooking: {
    totalMealsCooked: number;
    favoriteRecipe: { name: string; count: number; rating: number } | null;
    topRecipes: Array<{ name: string; count: number; rating: number }>;
  };
  feedback: {
    avgRating: number;
    bestRated: { name: string; rating: number } | null;
    wouldRepeatPct: number;
  };
  spending: {
    totalSpent: number;
    avgPerWeek: number;
    estimatedSavingsVsRestaurant: number;
  };
  insights: string[];
}

interface MonthlyReportViewProps {
  onClose: () => void;
}

export default function MonthlyReportView({ onClose }: MonthlyReportViewProps) {
  const householdId = useHouseholdId();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose);

  // Series del gráfico derivadas de los datos reales del reporte.
  const chartSeries = useMemo<MonthlyChartSeries>(() => {
    if (!report) return {};
    const series: MonthlyChartSeries = {};

    if (report.cooking.totalMealsCooked > 0) {
      series.meals = {
        label: "Comidas",
        color: "#ea580c",
        data: spread(report.cooking.totalMealsCooked),
        unit: "comidas",
      };
    }

    if (report.spending.totalSpent > 0) {
      // En miles de COP para legibilidad del eje.
      series.market = {
        label: "Mercado",
        color: "#7c3aed",
        data: spread(Math.round(report.spending.totalSpent / 1000)),
        unit: "mil COP",
      };
    }

    return series;
  }, [report]);

  useEffect(() => {
    if (!householdId) {
      setError("Sin hogar activo");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(
          `/api/reports/monthly?household_id=${householdId}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
          },
        );

        if (!res.ok) throw new Error("Error cargando reporte");
        const data = await res.json();
        setReport(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [householdId]);

  const handleShare = () => {
    if (!report) return;
    const text =
      `📊 Mi mes en Recetario:\n` +
      `🍳 ${report.cooking.totalMealsCooked} comidas\n` +
      `⭐ ${report.feedback.avgRating.toFixed(1)}/5 promedio\n` +
      `💰 ${report.spending.estimatedSavingsVsRestaurant.toLocaleString("es-CO")} ahorrados`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const monthLabel = report?.period
    ? new Date(report.period.start).toLocaleDateString("es-CO", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 z-[400] bg-[var(--bg)] flex flex-col animate-screen-in">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            Reporte mensual
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)] capitalize">
            {monthLabel || "Mi mes"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={!report}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-[var(--ink)] disabled:opacity-40"
            aria-label="Compartir"
          >
            <Share2 size={15} />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-[var(--ink)]"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="text-[var(--ink-soft)] mt-4 text-[13px]">
              Calculando tu mes...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {report && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl border border-[var(--border)] p-3.5">
                <p className="text-[10.5px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Comidas cocinadas
                </p>
                <p className="text-[24px] font-bold tabular-nums text-orange-700 tracking-tight mt-1">
                  {report.cooking.totalMealsCooked}
                </p>
                <p className="text-[10.5px] text-[var(--ink-soft)]">este mes</p>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--border)] p-3.5">
                <p className="text-[10.5px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Calificación
                </p>
                <p className="text-[24px] font-bold tabular-nums text-amber-600 tracking-tight mt-1">
                  {report.feedback.avgRating.toFixed(1)}
                </p>
                <p className="text-[10.5px] text-[var(--ink-soft)]">
                  promedio /5
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--border)] p-3.5">
                <p className="text-[10.5px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Volverían a cocinar
                </p>
                <p className="text-[24px] font-bold tabular-nums text-green-700 tracking-tight mt-1">
                  {report.feedback.wouldRepeatPct}%
                </p>
                <p className="text-[10.5px] text-[var(--ink-soft)]">
                  de las comidas
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--border)] p-3.5">
                <p className="text-[10.5px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Mercado total
                </p>
                <p className="text-[24px] font-bold tabular-nums text-purple-700 tracking-tight mt-1">
                  ${report.spending.totalSpent.toLocaleString("es-CO")}
                </p>
                <p className="text-[10.5px] text-[var(--ink-soft)]">
                  ${report.spending.avgPerWeek.toLocaleString("es-CO")}/sem ·
                  ahorro $
                  {report.spending.estimatedSavingsVsRestaurant.toLocaleString(
                    "es-CO",
                  )}
                </p>
              </div>
            </div>

            {/* Gráfico animado */}
            <MonthlyChart series={chartSeries} />

            {/* Top Recetas */}
            {report.cooking.topRecipes.length > 0 && (
              <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">
                    Top 5 recetas
                  </p>
                </div>
                {report.cooking.topRecipes.slice(0, 5).map((r, i) => (
                  <div
                    key={r.name}
                    className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border)] last:border-b-0"
                  >
                    <span className="text-[15px] font-bold tabular-nums text-orange-700 w-6 text-center">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-[13.5px] font-semibold text-[var(--ink)] truncate">
                      {r.name}
                    </p>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] text-[var(--ink-soft)] tabular-nums">
                        {r.count}x
                      </span>
                      {r.rating > 0 && (
                        <span className="ml-2 text-[11px] text-amber-600 font-semibold tabular-nums">
                          ⭐ {r.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                        ★ Top
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resumen ejecutivo IA */}
            {report.insights.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-purple-700" />
                  <p className="text-[13px] font-semibold text-purple-900">
                    Resumen ejecutivo IA
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {report.insights.map((insight, i) => (
                    <li
                      key={i}
                      className="text-[12.5px] text-purple-900 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-purple-500 flex-shrink-0">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compartir */}
            <button
              onClick={handleShare}
              className="w-full bg-[var(--ink)] text-white font-semibold py-3 rounded-2xl text-[14px] flex items-center justify-center gap-2"
            >
              <Share2 size={15} /> Compartir mi reporte
            </button>
          </>
        )}
      </div>
    </div>
  );
}
