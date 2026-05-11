"use client";

/**
 * WeeklyCardsView — Vista semanal con cards visuales por día
 *
 * Diseño basado en research Lazyweb (Crouton, Blue Apron, Amie):
 * - Cada día = card con foto del lunch (hero), nombre, tiempo, mood, porciones
 * - Patron alternativo al grid mensual D1-D12
 * - Mucho más visual y "apetecible" que el grid de números
 *
 * Sprint 1 del rediseño 2026.
 */

import { useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Check, Clock, Bot } from "lucide-react";
import {
  Recipe,
  GeneratedMenu,
  GeneratedDayMenu,
  GeneratedMeal,
} from "@/types";
import { MoodChip } from "@/components/ui/MoodChip";

interface DayMenu {
  day_number: number;
  breakfast_id: string;
  lunch_id: string;
  dinner_id: string | null;
  reminder: string | null;
}

interface WeeklyCardsViewProps {
  weekStart: Date; // Lunes de la semana visible
  recipes: Recipe[];
  dayMenu: DayMenu[];
  getDayOfCycle: (date: Date) => number;
  getGeneratedMenuForDate: (
    date: Date,
  ) => { menu: GeneratedMenu; dayData: GeneratedDayMenu } | null;
  completedDays: Set<string>;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onJumpToday: () => void;
}

const WEEKDAYS_SHORT = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export default function WeeklyCardsView({
  weekStart,
  recipes,
  dayMenu,
  getDayOfCycle,
  getGeneratedMenuForDate,
  completedDays,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onJumpToday,
}: WeeklyCardsViewProps) {
  const recipeById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  const weekRangeLabel = useMemo(() => {
    const last = days[6];
    if (weekStart.getMonth() === last.getMonth()) {
      return `${weekStart.getDate()} – ${last.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]}`;
    }
    return `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
  }, [weekStart, days]);

  const getLunchForDate = (
    date: Date,
  ): {
    name: string;
    image?: string;
    cookTimeText?: string;
    cookTimeNum?: number;
    moods?: Recipe["moods"];
    isAi: boolean;
    cycleLabel?: string;
  } | null => {
    // Generated menu first (AI)
    const generated = getGeneratedMenuForDate(date);
    if (generated) {
      const lunch: GeneratedMeal | null = generated.dayData.lunch;
      if (lunch) {
        return {
          name: lunch.name,
          // GeneratedMeal no tiene image_url ni cook_time numerico ni moods
          cookTimeText: lunch.cookTime ?? lunch.totalTime,
          isAi: true,
        };
      }
    }
    // Static cycle menu
    const cycleDay = getDayOfCycle(date);
    if (cycleDay < 0) return null;
    const menu = dayMenu.find((m) => m.day_number === cycleDay);
    if (!menu) return null;
    const recipe = recipeById.get(menu.lunch_id);
    if (!recipe) return null;
    return {
      name: recipe.name,
      image: recipe.image_url,
      cookTimeNum: recipe.cook_time ?? recipe.total_time,
      moods: recipe.moods,
      isAi: false,
      cycleLabel: `D${cycleDay + 1}`,
    };
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Week navigator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onPrevWeek}
          aria-label="Semana anterior"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {weekRangeLabel}
          </span>
          <button
            onClick={onJumpToday}
            className="text-[11px] text-orange-600 hover:underline mt-0.5"
          >
            Ir a hoy
          </button>
        </div>
        <button
          onClick={onNextWeek}
          aria-label="Semana siguiente"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Cards list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {days.map((date) => {
          const isToday = date.toDateString() === today.toDateString();
          const isPast = date < today && !isToday;
          const isSelected =
            selectedDate && date.toDateString() === selectedDate.toDateString();
          const dateKey = date.toISOString().split("T")[0];
          const isCompleted = completedDays.has(dateKey);
          const lunch = getLunchForDate(date);
          const dayLabel =
            WEEKDAYS_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1];
          const isSunday = date.getDay() === 0;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(date)}
              disabled={!lunch && !isSunday}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                isSelected
                  ? "bg-orange-50 dark:bg-orange-950/30"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              } ${!lunch && !isSunday ? "opacity-60 cursor-default" : ""} ${
                isToday ? "ring-2 ring-orange-500 ring-inset" : ""
              }`}
            >
              {/* Day pill (left) */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 py-1">
                <span
                  className={`text-[10px] uppercase tracking-wide font-semibold ${
                    isToday
                      ? "text-orange-600"
                      : isPast
                        ? "text-gray-400 dark:text-gray-600"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {dayLabel.slice(0, 3)}
                </span>
                <span
                  className={`text-2xl font-bold leading-tight ${
                    isToday
                      ? "text-orange-600"
                      : isPast
                        ? "text-gray-400 dark:text-gray-600"
                        : "text-gray-900 dark:text-white"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Recipe thumbnail */}
              <div className="flex-shrink-0 relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {lunch?.image ? (
                  <Image
                    src={lunch.image}
                    alt={lunch.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {isSunday ? "🌅" : "🍳"}
                  </div>
                )}
                {isCompleted && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </div>

              {/* Recipe info */}
              <div className="flex-1 min-w-0">
                {lunch ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {lunch.isAi && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                          <Bot size={10} /> IA
                        </span>
                      )}
                      {lunch.cycleLabel && !lunch.isAi && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300">
                          {lunch.cycleLabel}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {lunch.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {lunch.cookTimeNum ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Clock size={11} /> {lunch.cookTimeNum} min
                        </span>
                      ) : lunch.cookTimeText ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Clock size={11} /> {lunch.cookTimeText}
                        </span>
                      ) : null}
                      {lunch.moods && lunch.moods.length > 0 && (
                        <MoodChip mood={lunch.moods[0]} size="sm" />
                      )}
                    </div>
                  </>
                ) : isSunday ? (
                  <>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 mb-1 inline-block">
                      Día libre
                    </span>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                      Domingo · genera menú con IA
                    </h3>
                  </>
                ) : (
                  <h3 className="text-sm text-gray-400 dark:text-gray-600">
                    Sin menú asignado
                  </h3>
                )}
              </div>

              {/* Chevron */}
              <ChevronRight
                size={16}
                className="flex-shrink-0 text-gray-300 dark:text-gray-600"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
