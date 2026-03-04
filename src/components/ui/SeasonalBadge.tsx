"use client";

import { COLOMBIAN_SEASONAL_PRODUCE } from "@/data/colombian-seasons";

export type SeasonalStatus = "peak" | "in_season" | "off_season";

/**
 * Normaliza un string removiendo acentos y convirtiendo a minusculas
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Determina si un item esta en temporada usando fuzzy matching.
 * Busca si el nombre del item contiene o esta contenido en alguno
 * de los productos estacionales.
 */
export function isInSeason(itemName: string, month?: number): SeasonalStatus {
  const currentMonth = month || new Date().getMonth() + 1;
  const normalizedItem = normalize(itemName);

  for (const produce of COLOMBIAN_SEASONAL_PRODUCE) {
    const normalizedProduce = normalize(produce.name);

    // Fuzzy match: uno contiene al otro
    const matches =
      normalizedItem.includes(normalizedProduce) ||
      normalizedProduce.includes(normalizedItem);

    if (!matches) {
      // Buscar por palabras individuales (>= 4 caracteres) para capturar variantes
      const itemWords = normalizedItem
        .split(/\s+/)
        .filter((w) => w.length >= 4);
      const produceWords = normalizedProduce
        .split(/\s+/)
        .filter((w) => w.length >= 4);
      const hasWordMatch = itemWords.some((iw) =>
        produceWords.some((pw) => iw.includes(pw) || pw.includes(iw)),
      );
      if (!hasWordMatch) continue;
    }

    // Encontramos un match, verificar temporada
    if (produce.peak_months.includes(currentMonth)) {
      return "peak";
    }
    if (produce.months.includes(currentMonth)) {
      return "in_season";
    }
    return "off_season";
  }

  return "off_season";
}

interface SeasonalBadgeProps {
  itemName: string;
  month?: number;
  compact?: boolean;
}

/**
 * Badge que muestra si un ingrediente esta en temporada en Colombia.
 * - Verde: "En temporada" (disponible este mes)
 * - Dorado: "Temporada alta" (mejor precio y calidad)
 */
export default function SeasonalBadge({
  itemName,
  month,
  compact = false,
}: SeasonalBadgeProps) {
  const status = isInSeason(itemName, month);

  if (status === "off_season") return null;

  if (status === "peak") {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full font-medium ${
          compact
            ? "text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700"
            : "text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200"
        }`}
        title="Este producto esta en su mejor momento de precio y calidad"
      >
        <span aria-hidden="true">&#x1F525;</span>
        {!compact && "Temporada alta"}
      </span>
    );
  }

  // in_season
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium ${
        compact
          ? "text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700"
          : "text-[10px] px-2 py-0.5 bg-green-100 text-green-700 border border-green-200"
      }`}
      title="Este producto esta en temporada"
    >
      <span aria-hidden="true">&#x1F33F;</span>
      {!compact && "En temporada"}
    </span>
  );
}
