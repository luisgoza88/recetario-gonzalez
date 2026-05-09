import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface MoodHistoryRow {
  mood: string;
  day_of_week: number | null;
  meal_type: string | null;
  feedback_score: number | null;
}

export interface HouseholdMoodPatterns {
  totalMeals: number;
  favoriteMoods: [string, number][];
  moodByDayOfWeek: Record<number, Record<string, number>>;
  bestRatedMoods: { mood: string; avg: number; count: number }[];
}

export async function getHouseholdMoodPatterns(
  householdId: string,
): Promise<HouseholdMoodPatterns | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data } = (await supabase
      .from("household_mood_history")
      .select("mood, day_of_week, meal_type, feedback_score")
      .eq("household_id", householdId)
      .gte(
        "created_at",
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })) as {
      data: MoodHistoryRow[] | null;
    };

    if (!data || data.length === 0) return null;

    // Calcular: frecuencia por mood, mood por dia de semana, mood favorito
    const moodFrequency: Record<string, number> = {};
    const moodByDayOfWeek: Record<number, Record<string, number>> = {};
    const avgScoreByMood: Record<string, { sum: number; count: number }> = {};

    for (const row of data) {
      moodFrequency[row.mood] = (moodFrequency[row.mood] ?? 0) + 1;

      if (row.day_of_week !== null) {
        moodByDayOfWeek[row.day_of_week] =
          moodByDayOfWeek[row.day_of_week] ?? {};
        moodByDayOfWeek[row.day_of_week][row.mood] =
          (moodByDayOfWeek[row.day_of_week][row.mood] ?? 0) + 1;
      }

      if (row.feedback_score !== null) {
        avgScoreByMood[row.mood] = avgScoreByMood[row.mood] ?? {
          sum: 0,
          count: 0,
        };
        avgScoreByMood[row.mood].sum += row.feedback_score;
        avgScoreByMood[row.mood].count += 1;
      }
    }

    return {
      totalMeals: data.length,
      favoriteMoods: Object.entries(moodFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      moodByDayOfWeek,
      bestRatedMoods: Object.entries(avgScoreByMood)
        .map(([mood, { sum, count }]) => ({ mood, avg: sum / count, count }))
        .filter((m) => m.count >= 3)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3),
    };
  } catch (error) {
    logger.error("Error loading household mood patterns", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function formatMoodPatternsForPrompt(
  patterns: HouseholdMoodPatterns | null,
): string {
  if (!patterns) return "";

  const lines: string[] = ["## Patrones de mood del hogar (ultimos 90 dias):"];

  if (patterns.favoriteMoods.length > 0) {
    lines.push(
      `- Moods mas frecuentes: ${patterns.favoriteMoods.map(([m, c]) => `${m} (${c}x)`).join(", ")}`,
    );
  }

  if (patterns.bestRatedMoods.length > 0) {
    lines.push(
      `- Mejor calificados: ${patterns.bestRatedMoods.map((m) => `${m.mood} (${m.avg.toFixed(1)}/5)`).join(", ")}`,
    );
  }

  // Patron de dia de semana (ej: "Viernes: tienden a antojo")
  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
  ];
  for (const [dow, moods] of Object.entries(patterns.moodByDayOfWeek)) {
    const top = Object.entries(moods).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) {
      lines.push(
        `- ${dayNames[parseInt(dow)]}: prefieren ${top[0]} (${top[1]} veces)`,
      );
    }
  }

  return lines.join("\n");
}
