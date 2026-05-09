export type Mood =
  | "nutritivo"
  | "saludable"
  | "antojo"
  | "tradicional"
  | "rapido"
  | "economico"
  | "sorpresa";

export const MOODS: {
  id: Mood;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    id: "nutritivo",
    label: "Nutritivo",
    emoji: "💪",
    description:
      "Alto en proteína y nutrientes, ideal para días activos o niños",
  },
  {
    id: "saludable",
    label: "Saludable",
    emoji: "🥗",
    description: "Bajo en calorías, vegetales protagonistas, modo limpio",
  },
  {
    id: "antojo",
    label: "Antojo",
    emoji: "🤤",
    description:
      "Indulgente, sabroso, sin pensar en calorías - viernes o premio",
  },
  {
    id: "tradicional",
    label: "Tradicional Colombia",
    emoji: "🇨🇴",
    description: "Cocina colombiana de herencia, regional, casera",
  },
  {
    id: "rapido",
    label: "Rápido",
    emoji: "⚡",
    description: "Listo en menos de 25 minutos, ideal para días cortos",
  },
  {
    id: "economico",
    label: "Económico",
    emoji: "💰",
    description: "Costo bajo, ingredientes accesibles, rinde mucho",
  },
  {
    id: "sorpresa",
    label: "Sorpréndeme",
    emoji: "🎲",
    description: "La IA decide basándose en patrones del hogar",
  },
];

export function getMoodLabel(mood: Mood): string {
  return MOODS.find((m) => m.id === mood)?.label ?? mood;
}

export function getMoodEmoji(mood: Mood): string {
  return MOODS.find((m) => m.id === mood)?.emoji ?? "🍽️";
}

export function getMoodDescription(mood: Mood): string {
  return MOODS.find((m) => m.id === mood)?.description ?? "";
}

// Distribución sugerida para una semana
export const DEFAULT_WEEKLY_MOOD_DISTRIBUTION: Partial<Record<Mood, number>> = {
  nutritivo: 2,
  saludable: 2,
  tradicional: 1,
  antojo: 1,
  rapido: 1,
  // Domingo libre
};
