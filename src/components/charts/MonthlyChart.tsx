/**
 * src/components/charts/MonthlyChart.tsx
 *
 * Gráfico SVG de barras animadas con toggle de serie y línea de promedio.
 * Sin dependencias externas. Las barras crecen desde 0 al montar usando la
 * animación CSS `animate-bar-rise` (definida en globals.css).
 *
 * Recibe los datos por props para preservar la lógica de datos del reporte real.
 */

"use client";

import { useEffect, useMemo, useState } from "react";

export type ChartSerieKey = "tasks" | "meals" | "market";

export interface ChartSerie {
  label: string;
  color: string;
  data: number[];
  unit: string;
}

export type MonthlyChartSeries = Partial<Record<ChartSerieKey, ChartSerie>>;

interface MonthlyChartProps {
  series: MonthlyChartSeries;
  /** Etiquetas del eje X (ej: ["S1","S2",...]). Si no, se autogenera S1..Sn */
  xLabels?: string[];
}

const DEFAULT_ORDER: ChartSerieKey[] = ["tasks", "meals", "market"];

export default function MonthlyChart({ series, xLabels }: MonthlyChartProps) {
  const keys = useMemo(
    () =>
      DEFAULT_ORDER.filter(
        (k) => series[k] && (series[k] as ChartSerie).data.length > 0,
      ),
    [series],
  );

  const [serie, setSerie] = useState<ChartSerieKey | null>(keys[0] ?? null);
  const [tooltip, setTooltip] = useState<{ i: number; v: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Si cambian las series disponibles y la activa ya no existe, reajustar.
  useEffect(() => {
    if (!serie || !keys.includes(serie)) {
      setSerie(keys[0] ?? null);
    }
  }, [keys, serie]);

  // Reinicia la animación de barras al montar / cambiar de serie.
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [serie]);

  const cfg = serie ? series[serie] : undefined;

  if (!cfg || cfg.data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
        <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          Sin datos suficientes
        </p>
        <p className="text-[12px] text-[var(--ink-soft)] mt-2">
          No hay actividad registrada para graficar este mes.
        </p>
      </div>
    );
  }

  const data = cfg.data;
  const labels =
    xLabels && xLabels.length === data.length
      ? xLabels
      : data.map((_, i) => `S${i + 1}`);
  const max = Math.max(...data) * 1.1 || 1;
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const w = 300,
    h = 140,
    padL = 24,
    padR = 12,
    padT = 8,
    padB = 22;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const barW = (chartW / data.length) * 0.65;
  const gap = (chartW / data.length) * 0.35;
  const bestIdx = data.indexOf(Math.max(...data));

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
          {cfg.label} por semana
        </p>
        {keys.length > 1 && (
          <div className="flex bg-stone-100 rounded-lg p-0.5 text-[11px]">
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setSerie(k)}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  serie === k
                    ? "bg-white shadow-sm text-[var(--ink)]"
                    : "text-stone-500"
                }`}
              >
                {(series[k] as ChartSerie).label}
              </button>
            ))}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 160 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padT + chartH * (1 - p);
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="#f5f5f4"
                strokeWidth={1}
              />
              <text
                x={padL - 4}
                y={y + 3}
                fontSize="9"
                fill="#a8a29e"
                textAnchor="end"
              >
                {Math.round(max * p)}
              </text>
            </g>
          );
        })}

        <line
          x1={padL}
          x2={w - padR}
          y1={padT + chartH * (1 - avg / max)}
          y2={padT + chartH * (1 - avg / max)}
          stroke={cfg.color}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity="0.4"
        />
        <text
          x={w - padR}
          y={padT + chartH * (1 - avg / max) - 4}
          fontSize="9"
          fill={cfg.color}
          textAnchor="end"
          fontWeight="600"
        >
          avg {Math.round(avg)}
        </text>

        {data.map((v, i) => {
          const x = padL + gap / 2 + i * (barW + gap);
          const targetH = (v / max) * chartH;
          const aboveAvg = v > avg;
          return (
            <g key={i}>
              <rect
                x={x}
                y={padT + chartH - targetH}
                width={barW}
                height={targetH}
                rx={4}
                fill={aboveAvg ? cfg.color : cfg.color + "88"}
                className={mounted ? "animate-bar-rise" : undefined}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "bottom",
                  transform: mounted ? "scaleY(1)" : "scaleY(0)",
                }}
                onMouseEnter={() => setTooltip({ i, v })}
                onMouseLeave={() => setTooltip(null)}
              />
              <text
                x={x + barW / 2}
                y={h - 6}
                fontSize="9"
                fill="#a8a29e"
                textAnchor="middle"
              >
                {labels[i]}
              </text>
              {tooltip?.i === i && (
                <g>
                  <rect
                    x={x + barW / 2 - 22}
                    y={padT + chartH - targetH - 22}
                    width={44}
                    height={18}
                    rx={4}
                    fill={cfg.color}
                  />
                  <text
                    x={x + barW / 2}
                    y={padT + chartH - targetH - 10}
                    fontSize="10"
                    fill="white"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {v}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[var(--border)]">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Total
          </p>
          <p className="text-[16px] font-semibold tabular-nums text-[var(--ink)] tracking-tight">
            {data.reduce((a, b) => a + b, 0).toLocaleString()}{" "}
            <span className="text-[10px] text-stone-400">{cfg.unit}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Mejor semana
          </p>
          <p
            className="text-[16px] font-semibold tabular-nums tracking-tight"
            style={{ color: cfg.color }}
          >
            {labels[bestIdx]} · {Math.max(...data).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
