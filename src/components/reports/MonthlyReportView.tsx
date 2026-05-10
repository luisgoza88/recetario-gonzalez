"use client";

import { useEffect, useState } from "react";
import {
  X,
  ChefHat,
  Star,
  TrendingUp,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import { supabase } from "@/lib/supabase/client";
import Spinner from "@/components/ui/Spinner";

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

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[100] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-bold">📊 Mi Reporte Mensual</h1>
          {report?.period && (
            <p className="text-xs text-purple-100">
              {new Date(report.period.start).toLocaleDateString("es-CO", {
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="text-gray-500 mt-4">Calculando tu mes...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {report && (
          <>
            {/* Hero */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-3xl p-6 text-center shadow-xl">
              <ChefHat size={48} className="mx-auto mb-3 text-white" />
              <p className="text-6xl font-bold">
                {report.cooking.totalMealsCooked}
              </p>
              <p className="text-lg text-purple-100 mt-2">
                comidas cocinadas este mes
              </p>
            </div>

            {/* Top Recetas */}
            {report.cooking.topRecipes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                  <Sparkles size={20} className="text-yellow-500" />
                  Tu Top 5 Recetas
                </h3>
                <ul className="space-y-3">
                  {report.cooking.topRecipes.slice(0, 5).map((r, i) => (
                    <li
                      key={r.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl font-bold text-purple-600 w-8">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {r.name}
                        </span>
                      </div>
                      <div className="text-right text-sm flex-shrink-0">
                        <span className="text-gray-500">{r.count}x</span>
                        {r.rating > 0 && (
                          <span className="ml-2 text-yellow-600">
                            ⭐ {r.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                <Star size={20} className="text-yellow-500" />
                Satisfacción
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-yellow-500">
                    {report.feedback.avgRating.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Calificación promedio</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">
                    {report.feedback.wouldRepeatPct}%
                  </p>
                  <p className="text-sm text-gray-500">Volverían a cocinar</p>
                </div>
              </div>
            </div>

            {/* Spending */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-5 shadow-xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <DollarSign size={20} />
                Gasto y Ahorro
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-green-100">Gastado en mercado</span>
                  <span className="font-bold text-xl">
                    ${report.spending.totalSpent.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-100">Promedio semanal</span>
                  <span className="font-semibold">
                    ${report.spending.avgPerWeek.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="border-t border-green-400 pt-3 flex justify-between items-center">
                  <span className="text-green-100">Ahorro vs restaurante</span>
                  <span className="font-bold text-2xl">
                    💰 $
                    {report.spending.estimatedSavingsVsRestaurant.toLocaleString(
                      "es-CO",
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Insights */}
            {report.insights.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-white">
                  <TrendingUp size={20} className="text-purple-600" />
                  Insights
                </h3>
                <ul className="space-y-2">
                  {report.insights.map((insight, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
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
              onClick={() => {
                const text =
                  `📊 Mi mes en Recetario:\n` +
                  `🍳 ${report.cooking.totalMealsCooked} comidas\n` +
                  `⭐ ${report.feedback.avgRating.toFixed(1)}/5 promedio\n` +
                  `💰 ${report.spending.estimatedSavingsVsRestaurant.toLocaleString("es-CO")} ahorrados`;
                if (navigator.share) {
                  navigator.share({ text }).catch(() => {});
                } else {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(text)}`,
                    "_blank",
                  );
                }
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl shadow"
            >
              📤 Compartir mi reporte
            </button>
          </>
        )}
      </div>
    </div>
  );
}
