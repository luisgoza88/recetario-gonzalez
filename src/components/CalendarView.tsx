"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Star,
  MessageSquare,
  Sparkles,
  WifiOff,
  RefreshCw,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Archive,
  ArrowLeftRight,
  ShoppingCart,
  Coffee,
  UtensilsCrossed,
  Moon,
  Timer,
  Flame,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  Recipe,
  Ingredient,
  MealType,
  GeneratedMenu,
  GeneratedDayMenu,
  GeneratedMeal,
} from "@/types";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import { cacheDayMenus, getCachedDayMenus } from "@/lib/indexedDB";
import logger from "@/lib/logger";
import { useGoToTodaySignal } from "@/lib/stores/useAppStore";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import dynamic from "next/dynamic";
import FeedbackModal from "./FeedbackModal";
import SmartSuggestions from "./SmartSuggestions";
import { MoodChip } from "@/components/ui/MoodChip";
import { MoodSelector } from "./MoodSelector";
import { Mood } from "@/lib/moods";

const RecipeModal = dynamic(() => import("./RecipeModal"), {
  loading: () => null,
  ssr: false,
});
const MealSwapModal = dynamic(() => import("./MealSwapModal"), {
  loading: () => null,
  ssr: false,
});
// Sprint 1 (Lazyweb design research mayo 2026): vista alternativa
// con cards visuales por dia (patron Crouton/Blue Apron/Amie).
import WeeklyCardsView from "./WeeklyCardsView";

interface CalendarViewProps {
  recipes: Recipe[];
}

interface DayMenu {
  day_number: number;
  breakfast_id: string;
  lunch_id: string;
  dinner_id: string | null;
  reminder: string | null;
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const CYCLE_START = new Date(2026, 0, 6); // Lunes 6 de Enero 2026

// =====================================================
// Helper: Get Monday of the week for a given date
// =====================================================
function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function CalendarView({ recipes }: CalendarViewProps) {
  const goToTodaySignal = useGoToTodaySignal();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Sprint 1 (mayo 2026): toggle entre vista mensual (grid clasico)
  // y vista semanal (cards visuales con foto, recomendado por research)
  const [viewMode, setViewMode] = useState<"month" | "week">(() => {
    if (typeof window === "undefined") return "week";
    return (
      (localStorage.getItem("calendar-view-mode") as "month" | "week") ?? "week"
    );
  });
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dayMenu, setDayMenu] = useState<DayMenu[]>([]);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [feedbackRecipe, setFeedbackRecipe] = useState<{
    recipe: Recipe;
    mealType: MealType;
  } | null>(null);
  const [suggestionsRecipe, setSuggestionsRecipe] = useState<{
    recipe: Recipe;
    mealType: MealType;
  } | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const isOnline = useOnlineStatus();

  // --- Meal swap state ---
  const toast = useToast();
  const [swapModal, setSwapModal] = useState<{
    isOpen: boolean;
    mealType: "breakfast" | "lunch" | "dinner";
    currentRecipe?: Recipe;
    menuSource: "static" | "generated";
    dayNumber?: number;
    generatedMenuId?: string;
    generatedWeekStart?: string;
    generatedDateKey?: string;
  }>({
    isOpen: false,
    mealType: "breakfast",
    menuSource: "static",
  });

  // --- Mood state for meal regeneration ---
  const [moodPopover, setMoodPopover] = useState<{
    mealKey: string; // e.g. "2026-05-09-breakfast"
    selectedMood?: Mood;
  } | null>(null);

  // --- Generative menu state ---
  const [generatedMenus, setGeneratedMenus] = useState<
    Map<string, GeneratedMenu>
  >(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expandedGeneratedMeal, setExpandedGeneratedMeal] = useState<
    string | null
  >(null);
  const [isGeneratingShoppingList, setIsGeneratingShoppingList] =
    useState(false);

  // =====================================================
  // Cycle day calculation (legacy static menu)
  // =====================================================
  const getDayOfCycle = useCallback((date: Date): number => {
    if (date.getDay() === 0) return -1; // Domingo
    const diffTime = date.getTime() - CYCLE_START.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return -2;
    let workingDays = 0;
    const tempDate = new Date(CYCLE_START);
    while (tempDate <= date) {
      if (tempDate.getDay() !== 0) workingDays++;
      tempDate.setDate(tempDate.getDate() + 1);
    }
    workingDays--;
    return workingDays % 12;
  }, []);

  const getMenuForDate = useCallback(
    (date: Date) => {
      const cycleDay = getDayOfCycle(date);
      if (cycleDay < 0) return null;
      return dayMenu.find((m) => m.day_number === cycleDay);
    },
    [dayMenu, getDayOfCycle],
  );

  // =====================================================
  // Check if a date has a generated menu
  // =====================================================
  const getGeneratedMenuForDate = useCallback(
    (date: Date): { menu: GeneratedMenu; dayData: GeneratedDayMenu } | null => {
      const dateStr = date.toISOString().split("T")[0];
      const weekMonday = getWeekMonday(date);
      const menu = generatedMenus.get(weekMonday);
      if (!menu || !Array.isArray(menu.menu_data)) return null;
      const dayData = menu.menu_data.find((d) => d.date === dateStr);
      if (!dayData) return null;
      return { menu, dayData };
    },
    [generatedMenus],
  );

  // =====================================================
  // Load data
  // =====================================================
  const loadMenu = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("day_menu")
        .select("*")
        .order("day_number");
      if (data && !error) {
        setDayMenu(data);
        setIsFromCache(false);
        await cacheDayMenus(data.map((m) => ({ ...m, cachedAt: Date.now() })));
        return;
      }
    } catch {
      logger.warn("Network error loading menu, trying cache");
    }
    try {
      const cached = await getCachedDayMenus();
      if (cached.length > 0) {
        setDayMenu(cached);
        setIsFromCache(true);
      }
    } catch (cacheError) {
      console.error("Cache error:", cacheError);
    }
  }, []);

  const loadGeneratedMenus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("generated_menus")
        .select("*")
        .in("status", ["draft", "approved", "active"])
        .order("week_start_date", { ascending: false })
        .limit(8);

      if (data && !error) {
        const menuMap = new Map<string, GeneratedMenu>();
        for (const menu of data) {
          menuMap.set(menu.week_start_date, menu as GeneratedMenu);
        }
        setGeneratedMenus(menuMap);
      }
    } catch {
      logger.warn("Could not load generated menus");
    }
  }, []);

  const loadCompletedDays = useCallback(async () => {
    const { data } = await supabase
      .from("completed_days")
      .select("date")
      .eq("completed", true);
    if (data) setCompletedDays(new Set(data.map((d) => d.date)));
  }, []);

  useEffect(() => {
    loadMenu();
    loadCompletedDays();
    loadGeneratedMenus();

    const today = new Date();
    const cycleDay = getDayOfCycle(today);
    if (cycleDay >= 0 || today.getDay() !== 0) {
      setSelectedDate(today);
    }
  }, [loadMenu, loadCompletedDays, loadGeneratedMenus, getDayOfCycle]);

  // React to "go to today" signal from Zustand store (replaces CustomEvent 'goToToday')
  useEffect(() => {
    if (goToTodaySignal === 0) return; // Skip initial mount
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }, [goToTodaySignal]);

  // =====================================================
  // Generate weekly menu
  // =====================================================
  const generateWeeklyMenu = async () => {
    if (!selectedDate) return;
    const weekMonday = getWeekMonday(selectedDate);

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/generate-weekly-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: weekMonday,
          preferences: {
            excludeRecent: 3,
            style: "colombiana casera con variaciones internacionales",
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error generando menú");
      }

      // Update local state
      setGeneratedMenus((prev) => {
        const next = new Map(prev);
        next.set(weekMonday, data.menu as GeneratedMenu);
        return next;
      });
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Error desconocido",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const approveMenu = async (menuId: string) => {
    try {
      const res = await fetch("/api/generated-menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, action: "approve" }),
      });
      const data = await res.json();
      if (data.success && data.menu) {
        setGeneratedMenus((prev) => {
          const next = new Map(prev);
          next.set(data.menu.week_start_date, data.menu as GeneratedMenu);
          return next;
        });
      }
    } catch (error) {
      console.error("Error approving menu:", error);
      toast.error("No se pudo aprobar el menú. Intenta de nuevo.");
    }
  };

  const archiveMenu = async (menuId: string, weekStart: string) => {
    try {
      const res = await fetch("/api/generated-menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId, action: "archive" }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedMenus((prev) => {
          const next = new Map(prev);
          next.delete(weekStart);
          return next;
        });
      }
    } catch (error) {
      console.error("Error archiving menu:", error);
      toast.error("No se pudo archivar el menú. Intenta de nuevo.");
    }
  };

  // =====================================================
  // Generate shopping list from current week's generated menu
  // =====================================================
  const generateShoppingList = async () => {
    if (!selectedDate) return;
    const weekMonday = getWeekMonday(selectedDate);
    const generatedMenu = generatedMenus.get(weekMonday);
    if (!generatedMenu) return;

    setIsGeneratingShoppingList(true);
    try {
      const res = await fetch("/api/generate-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: generatedMenu.id,
          weekStartDate: weekMonday,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error generando lista");
      }

      const itemCount = data.list?.items?.length ?? data.list?.total_items ?? 0;
      toast.success(
        `Lista de compras generada con ${itemCount} items. Ve a Mercado para verla.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error generando lista",
      );
    } finally {
      setIsGeneratingShoppingList(false);
    }
  };

  // =====================================================
  // Meal Swap handlers
  // =====================================================
  const openSwapModal = (
    mealType: "breakfast" | "lunch" | "dinner",
    currentRecipe: Recipe | undefined,
    menuSource: "static" | "generated",
    options?: {
      dayNumber?: number;
      generatedMenuId?: string;
      generatedWeekStart?: string;
      generatedDateKey?: string;
    },
  ) => {
    setSwapModal({
      isOpen: true,
      mealType,
      currentRecipe,
      menuSource,
      dayNumber: options?.dayNumber,
      generatedMenuId: options?.generatedMenuId,
      generatedWeekStart: options?.generatedWeekStart,
      generatedDateKey: options?.generatedDateKey,
    });
  };

  const handleSwapRecipe = async (newRecipe: Recipe) => {
    try {
      if (
        swapModal.menuSource === "static" &&
        swapModal.dayNumber !== undefined
      ) {
        // Update the static day_menu table
        const column =
          swapModal.mealType === "breakfast"
            ? "breakfast_id"
            : swapModal.mealType === "lunch"
              ? "lunch_id"
              : "dinner_id";

        const { error } = await supabase
          .from("day_menu")
          .update({ [column]: newRecipe.id })
          .eq("day_number", swapModal.dayNumber);

        if (error) {
          toast.error("Error al cambiar receta: " + error.message);
          return;
        }

        // Update local state
        setDayMenu((prev) =>
          prev.map((m) =>
            m.day_number === swapModal.dayNumber
              ? { ...m, [column]: newRecipe.id }
              : m,
          ),
        );

        toast.success(
          `${newRecipe.name} asignada como ${swapModal.mealType === "breakfast" ? "desayuno" : swapModal.mealType === "lunch" ? "almuerzo" : "cena"}`,
        );
      } else if (
        swapModal.menuSource === "generated" &&
        swapModal.generatedMenuId &&
        swapModal.generatedWeekStart &&
        swapModal.generatedDateKey
      ) {
        // Update generated menu JSONB
        const weekStart = swapModal.generatedWeekStart;
        const menu = generatedMenus.get(weekStart);
        if (!menu) {
          toast.error("Menu generado no encontrado");
          return;
        }

        // Deep clone menu_data and update the specific meal
        const updatedMenuData: GeneratedDayMenu[] = menu.menu_data.map(
          (day) => {
            if (day.date !== swapModal.generatedDateKey) return day;

            const newMeal: GeneratedMeal = {
              name: newRecipe.name,
              description: newRecipe.description,
              ingredients: newRecipe.ingredients.map((ing) => ({
                name: ing.name,
                total: ing.total || "",
                luis: ing.luis,
                mariana: ing.mariana,
              })),
              steps: newRecipe.steps,
              tips: newRecipe.tips,
            };

            return {
              ...day,
              [swapModal.mealType]: newMeal,
            };
          },
        );

        const { error } = await supabase
          .from("generated_menus")
          .update({
            menu_data: updatedMenuData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", swapModal.generatedMenuId);

        if (error) {
          toast.error("Error al cambiar receta: " + error.message);
          return;
        }

        // Update local state
        setGeneratedMenus((prev) => {
          const next = new Map(prev);
          const existing = next.get(weekStart);
          if (existing) {
            next.set(weekStart, {
              ...existing,
              menu_data: updatedMenuData,
            });
          }
          return next;
        });

        toast.success(
          `${newRecipe.name} asignada como ${swapModal.mealType === "breakfast" ? "desayuno" : swapModal.mealType === "lunch" ? "almuerzo" : "cena"}`,
        );
      }
    } catch (err) {
      toast.error("Error inesperado al cambiar receta");
      console.error("Swap error:", err);
    }
  };

  // =====================================================
  // Navigation
  // =====================================================
  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(null);
    setExpandedRecipe(null);
    setExpandedGeneratedMeal(null);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setExpandedRecipe(null);
    setExpandedGeneratedMeal(null);
    setTimeout(() => {
      const dayDetail = document.getElementById("day-detail");
      if (dayDetail)
        dayDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const toggleDayComplete = async () => {
    if (!selectedDate) return;
    const dateKey = selectedDate.toISOString().split("T")[0];
    const isCompleted = completedDays.has(dateKey);
    if (isCompleted) {
      // Optimista: des-marcar el día de inmediato
      setCompletedDays((prev) => {
        const next = new Set(prev);
        next.delete(dateKey);
        return next;
      });
      try {
        const { error } = await supabase
          .from("completed_days")
          .delete()
          .eq("date", dateKey);
        if (error) throw error;
      } catch (error) {
        console.error("Error updating completed day:", error);
        toast.error("No se pudo actualizar el día. Intenta de nuevo.");
        // Rollback: volver a marcar el día como completado
        setCompletedDays((prev) => new Set([...prev, dateKey]));
      }
    } else {
      // Optimista: marcar el día como completado de inmediato
      setCompletedDays((prev) => new Set([...prev, dateKey]));

      try {
        const { error } = await supabase
          .from("completed_days")
          .upsert({ date: dateKey, completed: true });
        if (error) throw error;
      } catch (error) {
        console.error("Error updating completed day:", error);
        toast.error(
          "No se pudo marcar el día como completado. Intenta de nuevo.",
        );
        // Rollback: des-marcar el día
        setCompletedDays((prev) => {
          const next = new Set(prev);
          next.delete(dateKey);
          return next;
        });
        return;
      }

      // Auto-prompt feedback for the first meal of the day
      // unless the user already skipped feedback for this date
      const skipKey = `feedback-skipped-${dateKey}`;
      const alreadySkipped =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(skipKey) === "1";

      if (!alreadySkipped) {
        setTimeout(() => {
          // Try static menu first
          const menu = getMenuForDate(selectedDate);
          if (menu) {
            const firstRecipe =
              getRecipeById(menu.breakfast_id) ||
              getRecipeById(menu.lunch_id) ||
              (menu.dinner_id ? getRecipeById(menu.dinner_id) : undefined);
            const firstMeal = firstRecipe
              ? menu.breakfast_id === firstRecipe.id
                ? "breakfast"
                : menu.lunch_id === firstRecipe.id
                  ? "lunch"
                  : "dinner"
              : null;
            if (firstRecipe && firstMeal) {
              setFeedbackRecipe({
                recipe: firstRecipe,
                mealType: firstMeal as MealType,
              });
              return;
            }
          }
          // Try generated menu
          const genInfo = getGeneratedMenuForDate(selectedDate);
          if (genInfo) {
            const meal =
              genInfo.dayData.breakfast ||
              genInfo.dayData.lunch ||
              genInfo.dayData.dinner;
            const mealType = genInfo.dayData.breakfast
              ? "breakfast"
              : genInfo.dayData.lunch
                ? "lunch"
                : "dinner";
            if (meal) {
              setFeedbackRecipe({
                recipe: generatedMealToRecipe(meal, mealType as MealType),
                mealType: mealType as MealType,
              });
            }
          }
        }, 800);
      }
    }
  };

  const getRecipeById = (id: string) => recipes.find((r) => r.id === id);

  // =====================================================
  // Calendar grid rendering
  // =====================================================
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const today = new Date();
    const days = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const cycleDay = getDayOfCycle(date);
      const hasStaticMenu = cycleDay >= 0;
      const isSunday = date.getDay() === 0;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected =
        selectedDate && date.toDateString() === selectedDate.toDateString();
      const dateKey = date.toISOString().split("T")[0];
      const isCompleted = completedDays.has(dateKey);
      const generatedInfo = getGeneratedMenuForDate(date);
      const hasGenerated = !!generatedInfo;
      const isSelectable = hasStaticMenu || isSunday || hasGenerated;

      days.push(
        <button
          key={day}
          onClick={() => isSelectable && selectDate(date)}
          disabled={!isSelectable}
          className={`
            aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-all
            ${isSunday && !hasGenerated && !isSelected ? "bg-purple-50 text-purple-500 font-medium hover:bg-purple-100 border border-purple-200" : ""}
            ${hasGenerated && !isSelected ? "bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 border border-indigo-200" : ""}
            ${hasStaticMenu && !hasGenerated && !isSelected ? "bg-green-50 text-green-700 font-semibold hover:bg-green-100" : ""}
            ${!hasStaticMenu && !isSunday && !hasGenerated ? "text-gray-300" : ""}
            ${isToday ? "ring-2 ring-green-700" : ""}
            ${isSelected && hasGenerated ? "bg-indigo-600 text-white" : ""}
            ${isSelected && isSunday && !hasGenerated ? "bg-purple-600 text-white" : ""}
            ${isSelected && !isSunday && !hasGenerated ? "bg-orange-500 text-white" : ""}
          `}
        >
          <span>{day}</span>
          {hasGenerated && (
            <span
              className={`text-[0.5rem] ${isSelected ? "opacity-80" : "opacity-70"}`}
            >
              <Bot size={8} className="inline" /> IA
            </span>
          )}
          {hasStaticMenu && !hasGenerated && (
            <span
              className={`text-[0.6rem] ${isSelected ? "opacity-80" : "opacity-70"}`}
            >
              D{cycleDay + 1}
            </span>
          )}
          {isSunday && !hasStaticMenu && !hasGenerated && (
            <span
              className={`text-[0.5rem] ${isSelected ? "opacity-80" : "opacity-70"}`}
            >
              IA
            </span>
          )}
          {isCompleted && (
            <Check
              size={10}
              className={`absolute bottom-1 ${isSelected ? "text-white" : "text-green-600"}`}
            />
          )}
        </button>,
      );
    }
    return days;
  };

  // =====================================================
  // Day detail: Generated menu
  // =====================================================
  const renderGeneratedDayDetail = (
    menu: GeneratedMenu,
    dayData: GeneratedDayMenu,
  ) => {
    if (!selectedDate) return null;
    const dayName = WEEKDAYS[selectedDate.getDay()];
    const dateKey = selectedDate.toISOString().split("T")[0];
    const isCompleted = completedDays.has(dateKey);
    const isDraft = menu.status === "draft";

    return (
      <div className="mt-4">
        {/* Day Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-xl flex justify-between items-center">
          <h3 className="font-semibold">
            {dayName} {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
          </h3>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <Bot size={14} />
            Menú IA {isDraft ? "(Borrador)" : ""}
          </span>
        </div>

        {/* Draft banner */}
        {isDraft && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 flex items-center justify-between">
            <div className="text-amber-800 text-sm">
              <strong>Borrador</strong> — Revisa y aprueba el menú para
              activarlo.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => menu.id && approveMenu(menu.id)}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
              >
                <ThumbsUp size={14} /> Aprobar
              </button>
              <button
                onClick={() =>
                  menu.id && archiveMenu(menu.id, menu.week_start_date)
                }
                className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-1"
              >
                <ThumbsDown size={14} /> Descartar
              </button>
            </div>
          </div>
        )}

        {/* Meals */}
        {dayData.breakfast && (
          <GeneratedMealCard
            type="breakfast"
            label="🍳 DESAYUNO"
            meal={dayData.breakfast}
            expanded={expandedGeneratedMeal === `${dateKey}-breakfast`}
            onToggle={() =>
              setExpandedGeneratedMeal(
                expandedGeneratedMeal === `${dateKey}-breakfast`
                  ? null
                  : `${dateKey}-breakfast`,
              )
            }
            onFeedback={() => {
              const fakeRecipe: Recipe = generatedMealToRecipe(
                dayData.breakfast!,
                "breakfast",
              );
              setFeedbackRecipe({ recipe: fakeRecipe, mealType: "breakfast" });
            }}
            onSwap={() =>
              openSwapModal(
                "breakfast",
                generatedMealToRecipe(dayData.breakfast!, "breakfast"),
                "generated",
                {
                  generatedMenuId: menu.id,
                  generatedWeekStart: menu.week_start_date,
                  generatedDateKey: dateKey,
                },
              )
            }
          />
        )}

        {dayData.lunch && (
          <GeneratedMealCard
            type="lunch"
            label="🍗 ALMUERZO (5 porciones)"
            meal={dayData.lunch}
            expanded={expandedGeneratedMeal === `${dateKey}-lunch`}
            onToggle={() =>
              setExpandedGeneratedMeal(
                expandedGeneratedMeal === `${dateKey}-lunch`
                  ? null
                  : `${dateKey}-lunch`,
              )
            }
            onFeedback={() => {
              const fakeRecipe: Recipe = generatedMealToRecipe(
                dayData.lunch!,
                "lunch",
              );
              setFeedbackRecipe({ recipe: fakeRecipe, mealType: "lunch" });
            }}
            onSwap={() =>
              openSwapModal(
                "lunch",
                generatedMealToRecipe(dayData.lunch!, "lunch"),
                "generated",
                {
                  generatedMenuId: menu.id,
                  generatedWeekStart: menu.week_start_date,
                  generatedDateKey: dateKey,
                },
              )
            }
          />
        )}

        {dayData.dinner ? (
          <GeneratedMealCard
            type="dinner"
            label="🌙 CENA (ligera)"
            meal={dayData.dinner}
            expanded={expandedGeneratedMeal === `${dateKey}-dinner`}
            onToggle={() =>
              setExpandedGeneratedMeal(
                expandedGeneratedMeal === `${dateKey}-dinner`
                  ? null
                  : `${dateKey}-dinner`,
              )
            }
            onFeedback={() => {
              const fakeRecipe: Recipe = generatedMealToRecipe(
                dayData.dinner!,
                "dinner",
              );
              setFeedbackRecipe({ recipe: fakeRecipe, mealType: "dinner" });
            }}
            onSwap={() =>
              openSwapModal(
                "dinner",
                generatedMealToRecipe(dayData.dinner!, "dinner"),
                "generated",
                {
                  generatedMenuId: menu.id,
                  generatedWeekStart: menu.week_start_date,
                  generatedDateKey: dateKey,
                },
              )
            }
            isLast
          />
        ) : (
          <div className="bg-white border-l-4 border-gray-400 p-4 rounded-b-xl">
            <div className="text-gray-500 text-sm">🌙 CENA</div>
            <p className="text-gray-400">No hay cena — Salen a comer 🍽️</p>
          </div>
        )}

        {/* Complete Day Button */}
        <button
          onClick={toggleDayComplete}
          className={`
            w-full p-4 rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 transition-colors
            ${
              isCompleted
                ? "bg-green-50 text-green-700 border-2 border-green-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }
          `}
        >
          {isCompleted ? (
            <>
              <Check size={20} /> Día completado
            </>
          ) : (
            <>☐ Marcar día como completado</>
          )}
        </button>
      </div>
    );
  };

  // =====================================================
  // Day detail: Sunday (free day)
  // =====================================================
  const renderSundayDetail = () => {
    if (!selectedDate || selectedDate.getDay() !== 0) return null;
    const dayName = WEEKDAYS[selectedDate.getDay()];

    return (
      <div className="mt-4">
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-4 rounded-t-xl flex justify-between items-center">
          <h3 className="font-semibold">
            {dayName} {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
          </h3>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <Sparkles size={14} /> Día Libre
          </span>
        </div>
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
          <div className="flex items-center gap-2 text-purple-700 text-sm font-medium">
            <Sparkles size={16} /> DÍA SIN MENÚ PROGRAMADO
          </div>
          <p className="text-purple-800 mt-1">
            ¿Quieres cocinar hoy? Genera recetas con IA basadas en tus
            ingredientes disponibles.
          </p>
        </div>
        <div className="bg-white p-4 space-y-3">
          {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
            const icons = {
              breakfast: "🍳 DESAYUNO",
              lunch: "🍗 ALMUERZO",
              dinner: "🌙 CENA",
            };
            const colors = {
              breakfast: "orange",
              lunch: "green",
              dinner: "blue",
            };
            return (
              <div
                key={meal}
                className={`flex justify-between items-center p-3 bg-${colors[meal]}-50 rounded-xl border border-${colors[meal]}-100`}
              >
                <div>
                  <span
                    className={`text-${colors[meal]}-600 text-sm font-medium`}
                  >
                    {icons[meal]}
                  </span>
                  <p className="text-gray-600 text-sm">Sin planificar</p>
                </div>
                <button
                  onClick={() =>
                    setSuggestionsRecipe({
                      recipe: {
                        id: `generate-${meal}`,
                        name: `Generar ${meal}`,
                        type: meal,
                        ingredients: [],
                        steps: [],
                      },
                      mealType: meal,
                    })
                  }
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
                >
                  <Sparkles size={16} /> Generar con IA
                </button>
              </div>
            );
          })}
        </div>
        <div className="bg-gray-100 p-3 rounded-b-xl text-center text-sm text-gray-500">
          💡 La IA generará recetas usando los ingredientes de tu inventario
        </div>
      </div>
    );
  };

  // =====================================================
  // Day detail: Static menu (legacy)
  // =====================================================
  const renderStaticDayDetail = () => {
    if (!selectedDate) return null;
    if (selectedDate.getDay() === 0) return renderSundayDetail();

    const menu = getMenuForDate(selectedDate);
    if (!menu) return null;

    const cycleDay = getDayOfCycle(selectedDate);
    const weekNum = cycleDay < 6 ? 1 : 2;
    const dayName = WEEKDAYS[selectedDate.getDay()];
    const dateKey = selectedDate.toISOString().split("T")[0];
    const isCompleted = completedDays.has(dateKey);

    const breakfast = getRecipeById(menu.breakfast_id);
    const lunch = getRecipeById(menu.lunch_id);
    const dinner = menu.dinner_id ? getRecipeById(menu.dinner_id) : null;

    const dayLabel = `${dayName} ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} · Semana ${weekNum} · Día ${(cycleDay % 6) + 1}`;

    return (
      <div className="px-1 py-4 space-y-3">
        {/* Eyebrow + Cambiar */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            {dayLabel}
          </p>
          <button
            onClick={() =>
              openSwapModal("breakfast", breakfast, "static", {
                dayNumber: cycleDay,
              })
            }
            className="text-[11px] text-[var(--accent)] font-semibold flex items-center gap-1 uppercase tracking-wider"
          >
            <RefreshCw size={11} /> Cambiar
          </button>
        </div>

        {breakfast && (
          <DayMealCard
            meal="breakfast"
            recipe={breakfast}
            time="7:30 am"
            onOpen={() => setSelectedRecipe(breakfast)}
            onSwap={() =>
              openSwapModal("breakfast", breakfast, "static", {
                dayNumber: cycleDay,
              })
            }
            onFeedback={() =>
              setFeedbackRecipe({ recipe: breakfast, mealType: "breakfast" })
            }
          />
        )}

        {lunch && (
          <DayMealCard
            meal="lunch"
            recipe={lunch}
            time="1:00 pm"
            onOpen={() => setSelectedRecipe(lunch)}
            onSwap={() =>
              openSwapModal("lunch", lunch, "static", {
                dayNumber: cycleDay,
              })
            }
            onFeedback={() =>
              setFeedbackRecipe({ recipe: lunch, mealType: "lunch" })
            }
          />
        )}

        {dinner ? (
          <DayMealCard
            meal="dinner"
            recipe={dinner}
            time="7:30 pm"
            onOpen={() => setSelectedRecipe(dinner)}
            onSwap={() =>
              openSwapModal("dinner", dinner, "static", {
                dayNumber: cycleDay,
              })
            }
            onFeedback={() =>
              setFeedbackRecipe({ recipe: dinner, mealType: "dinner" })
            }
          />
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-5 text-center">
            <Moon size={20} className="text-stone-400 mx-auto mb-2" />
            <p className="text-[14px] font-medium text-stone-600">
              Sin cena programada
            </p>
            <p className="text-[12px] text-stone-400 mt-0.5">
              Salen a comer fuera
            </p>
            <button
              onClick={() =>
                setSuggestionsRecipe({
                  recipe: {
                    id: "generate-dinner",
                    name: "Generar cena",
                    type: "dinner",
                    ingredients: [],
                    steps: [],
                  },
                  mealType: "dinner",
                })
              }
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[12px] font-medium hover:bg-purple-100"
            >
              <Sparkles size={12} /> Sugerir una cena
            </button>
          </div>
        )}

        {menu.reminder && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle
              size={14}
              className="text-amber-600 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold mb-0.5">
                Recordatorio
              </p>
              <p className="text-[12.5px] text-amber-900 leading-snug">
                {menu.reminder}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={toggleDayComplete}
          className={`
            w-full p-4 rounded-2xl font-semibold mt-1 flex items-center justify-center gap-2 transition-colors
            ${
              isCompleted
                ? "bg-[var(--accent-soft)] text-[var(--accent)] border-2 border-green-200"
                : "bg-[var(--accent)] text-white hover:opacity-90"
            }
          `}
        >
          {isCompleted ? (
            <>
              <Check size={20} /> Día completado
            </>
          ) : (
            <>☐ Marcar día como completado</>
          )}
        </button>
      </div>
    );
  };

  // =====================================================
  // Main day detail router
  // =====================================================
  const renderDayDetail = () => {
    if (!selectedDate) return null;

    // Check for generated menu first (takes priority)
    const generatedInfo = getGeneratedMenuForDate(selectedDate);
    if (generatedInfo) {
      return renderGeneratedDayDetail(
        generatedInfo.menu,
        generatedInfo.dayData,
      );
    }

    // Sunday without generated menu
    if (selectedDate.getDay() === 0) {
      return renderSundayDetail();
    }

    // Fallback to static menu
    return renderStaticDayDetail();
  };

  // =====================================================
  // Render
  // =====================================================
  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header rediseñado */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
            Calendario
          </h1>
          <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
            Ciclo de 12 días · Familia González
          </p>
        </div>
        <button
          onClick={generateWeeklyMenu}
          disabled={isGenerating || !selectedDate}
          className="text-[var(--accent)] text-[13px] font-medium flex items-center gap-1 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Spinner size="sm" /> Generando…
            </>
          ) : (
            <>
              <Sparkles size={14} /> Generar
            </>
          )}
        </button>
      </div>

      {/* Generate error */}
      {generateError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
          ❌ {generateError}
        </div>
      )}

      {/* Active generated menus indicator */}
      {generatedMenus.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-3 rounded-lg mb-4 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={16} />
            <span>
              <strong>{generatedMenus.size}</strong> menú(s) generado(s)
              activo(s)
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from(generatedMenus.values()).map((menu) => (
              <span
                key={menu.week_start_date}
                className={`px-2 py-0.5 rounded-full text-xs ${
                  menu.status === "draft"
                    ? "bg-amber-100 text-amber-700"
                    : menu.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {menu.status === "draft" ? "📝" : "✅"}{" "}
                {menu.week_start_date.slice(5)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Generate Shopping List Button — only visible when the selected week has a generated menu */}
      {selectedDate && generatedMenus.has(getWeekMonday(selectedDate)) && (
        <button
          onClick={generateShoppingList}
          disabled={isGeneratingShoppingList}
          className={`
              w-full p-3 rounded-xl font-semibold mb-4 flex items-center justify-center gap-2 transition-all text-sm
              ${
                isGeneratingShoppingList
                  ? "bg-green-100 text-green-400 cursor-wait"
                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-sm hover:shadow-md"
              }
            `}
        >
          {isGeneratingShoppingList ? (
            <>
              <Spinner size="sm" /> Generando lista de compras...
            </>
          ) : (
            <>
              <ShoppingCart size={18} /> Generar lista de compras para esta
              semana
            </>
          )}
        </button>
      )}

      {/* Offline Indicator */}
      {(!isOnline || isFromCache) && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <WifiOff size={16} />
          <span>
            {!isOnline
              ? "Sin conexión - Mostrando datos guardados"
              : "Datos cacheados - Actualiza cuando tengas conexión"}
          </span>
        </div>
      )}

      {/* Cycle Info */}
      <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
        Menú estático: ciclo desde <strong>6 Ene 2026</strong> • Menú IA: genera
        semanas personalizadas
      </div>

      {/* View toggle: Semana (cards visuales) vs Mes (grid clasico) */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => {
              setViewMode("week");
              if (typeof window !== "undefined") {
                localStorage.setItem("calendar-view-mode", "week");
              }
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "week"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => {
              setViewMode("month");
              if (typeof window !== "undefined") {
                localStorage.setItem("calendar-view-mode", "month");
              }
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "month"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Strip semanal (rediseño): L M X J V S con dots de comidas planeadas */}
      <div className="bg-white rounded-2xl border border-[var(--border)] px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[12px] text-[var(--ink-soft)] font-medium tabular-nums">
            {(() => {
              const end = new Date(weekStart);
              end.setDate(end.getDate() + 5);
              return `${weekStart.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)}`;
            })()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }}
              className="p-1 rounded hover:bg-stone-100"
              aria-label="Semana anterior"
            >
              <ChevronLeft size={14} className="text-stone-500" />
            </button>
            <button
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                setWeekStart(d);
              }}
              className="p-1 rounded hover:bg-stone-100"
              aria-label="Semana siguiente"
            >
              <ChevronRight size={14} className="text-stone-500" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {["L", "M", "X", "J", "V", "S"].map((dayShort, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const isSel =
              !!selectedDate &&
              date.toDateString() === selectedDate.toDateString();
            const genInfo = getGeneratedMenuForDate(date);
            const staticMenu = getMenuForDate(date);
            const hasBreakfast = !!(
              genInfo?.dayData.breakfast || staticMenu?.breakfast_id
            );
            const hasLunch = !!(genInfo?.dayData.lunch || staticMenu?.lunch_id);
            const hasDinner = !!(
              genInfo?.dayData.dinner || staticMenu?.dinner_id
            );
            return (
              <button
                key={i}
                onClick={() => selectDate(date)}
                className={`py-2 rounded-lg flex flex-col items-center transition-all ${
                  isSel
                    ? "bg-[var(--accent)] text-white"
                    : "bg-stone-50 hover:bg-stone-100 text-[var(--ink)]"
                }`}
              >
                <span
                  className={`text-[10px] uppercase ${isSel ? "text-white/80" : "text-[var(--ink-soft)]"}`}
                >
                  {dayShort}
                </span>
                <span className="text-[16px] font-semibold tracking-tight mt-0.5 tabular-nums">
                  {date.getDate()}
                </span>
                <div className="flex gap-0.5 mt-1">
                  {hasBreakfast && (
                    <span
                      className={`w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-amber-400"}`}
                    />
                  )}
                  {hasLunch && (
                    <span
                      className={`w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-green-400"}`}
                    />
                  )}
                  {hasDinner && (
                    <span
                      className={`w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-indigo-400"}`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "week" ? (
        <WeeklyCardsView
          weekStart={weekStart}
          recipes={recipes}
          dayMenu={dayMenu}
          getDayOfCycle={getDayOfCycle}
          getGeneratedMenuForDate={getGeneratedMenuForDate}
          completedDays={completedDays}
          selectedDate={selectedDate}
          onSelectDate={(date) => selectDate(date)}
          onPrevWeek={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
          }}
          onNextWeek={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
          }}
          onJumpToday={() => {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            d.setHours(0, 0, 0, 0);
            setWeekStart(d);
            selectDate(new Date());
          }}
        />
      ) : (
        <>
          {/* Month Navigation (vista clasica mensual) */}
          <div className="flex justify-between items-center px-4 py-3 bg-white rounded-2xl border border-[var(--border)] mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-stone-100"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={20} className="text-stone-500" />
            </button>
            <h2 className="font-semibold text-[15px] text-[var(--ink)]">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-lg hover:bg-stone-100"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={20} className="text-stone-500" />
            </button>
          </div>

          {/* Calendar Grid (vista clasica mensual) */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 font-semibold mb-2">
              <div>Lu</div>
              <div>Ma</div>
              <div>Mi</div>
              <div>Ju</div>
              <div>Vi</div>
              <div>Sá</div>
              <div>Do</div>
            </div>
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-50 border-2 border-green-700 rounded" />
              <span>Estático</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-50 border-2 border-indigo-600 rounded" />
              <span>IA Generado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-50 border border-purple-300 rounded" />
              <span>Domingo</span>
            </div>
          </div>
        </>
      )}

      {/* Day Detail */}
      <div id="day-detail">{renderDayDetail()}</div>

      {/* Modals */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {feedbackRecipe && selectedDate && (
        <FeedbackModal
          date={selectedDate.toISOString().split("T")[0]}
          mealType={feedbackRecipe.mealType}
          recipe={feedbackRecipe.recipe}
          onClose={() => {
            // Mark as skipped so the auto-prompt doesn't fire again this session
            const dateKey = selectedDate.toISOString().split("T")[0];
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(`feedback-skipped-${dateKey}`, "1");
            }
            setFeedbackRecipe(null);
          }}
          onSaved={() => setFeedbackRecipe(null)}
        />
      )}

      {suggestionsRecipe && (
        <SmartSuggestions
          recipe={suggestionsRecipe.recipe}
          allRecipes={recipes}
          mealType={suggestionsRecipe.mealType}
          onSelectAlternative={(recipe) => {
            setSelectedRecipe(recipe);
            setSuggestionsRecipe(null);
          }}
          onClose={() => setSuggestionsRecipe(null)}
        />
      )}

      <MealSwapModal
        isOpen={swapModal.isOpen}
        onClose={() => setSwapModal((prev) => ({ ...prev, isOpen: false }))}
        mealType={swapModal.mealType}
        currentRecipe={swapModal.currentRecipe}
        onSwap={handleSwapRecipe}
      />
    </div>
  );
}

// =====================================================
// Helper: Convert GeneratedMeal to Recipe type (for FeedbackModal)
// =====================================================
function generatedMealToRecipe(
  meal: GeneratedMeal,
  type: "breakfast" | "lunch" | "dinner",
): Recipe {
  return {
    id: `generated-${Date.now()}`,
    name: meal.name,
    type,
    ingredients: (meal.ingredients || []).map((ing) => ({
      name: ing.name,
      total: ing.total,
      luis: ing.luis,
      mariana: ing.mariana,
    })),
    steps: meal.steps || [],
    description: meal.description,
    tips: meal.tips,
    source: "ai_generated",
  };
}

// =====================================================
// Day Meal Card (rediseño visual — desayuno/almuerzo/cena)
// =====================================================
interface DayMealCardProps {
  meal: "breakfast" | "lunch" | "dinner";
  recipe: Recipe;
  time: string;
  onOpen: () => void;
  onSwap: () => void;
  onFeedback: () => void;
}

function DayMealCard({
  meal,
  recipe,
  time,
  onOpen,
  onSwap,
  onFeedback,
}: DayMealCardProps) {
  const meta = {
    breakfast: {
      color: "amber",
      label: "Desayuno",
      Icon: Coffee,
      tint: "from-amber-100 to-orange-50",
    },
    lunch: {
      color: "green",
      label: "Almuerzo",
      Icon: UtensilsCrossed,
      tint: "from-green-100 to-lime-50",
    },
    dinner: {
      color: "indigo",
      label: "Cena",
      Icon: Moon,
      tint: "from-indigo-100 to-violet-50",
    },
  }[meal];

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={onOpen}
        className="w-full active:scale-[0.99] transition-transform text-left"
      >
        <div
          className={`h-28 w-full bg-gradient-to-br ${meta.tint} relative overflow-hidden flex items-end p-3`}
        >
          {recipe.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <span className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-[0.15em] text-stone-500/70">
              {recipe.name}
            </span>
          )}
        </div>
        <div className="p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <meta.Icon size={12} className={`text-${meta.color}-700`} />
            <span
              className={`text-[10px] uppercase tracking-wider text-${meta.color}-700 font-semibold`}
            >
              {meta.label}
            </span>
            <span className="text-[10px] text-stone-400">·&nbsp; {time}</span>
          </div>
          <p className="text-[15px] font-semibold text-[var(--ink)] leading-tight">
            {recipe.name}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-[var(--ink-soft)] flex items-center gap-1 tabular-nums">
              <Timer size={11} />
              {totalTime} min
            </span>
            <span className="text-[11px] text-[var(--ink-soft)] flex items-center gap-1 tabular-nums">
              <Flame size={11} />
              {recipe.nutrition?.calories ?? 0} kcal
            </span>
            {recipe.nutrition?.protein != null && (
              <span className="text-[11px] text-[var(--ink-soft)] tabular-nums">
                {recipe.nutrition.protein}g prot
              </span>
            )}
            {recipe.difficulty && (
              <span className="ml-auto text-[10px] uppercase tracking-wider text-stone-400 font-medium">
                {recipe.difficulty}
              </span>
            )}
          </div>
        </div>
      </button>
      {/* Acciones rápidas (preservan swap/feedback existentes) */}
      <div className="flex items-center gap-2 px-3.5 pb-3.5">
        <button
          onClick={onSwap}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-stone-50 hover:bg-stone-100 text-[12px] font-medium text-[var(--ink)]"
          title="Cambiar receta"
        >
          <ArrowLeftRight size={13} /> Cambiar
        </button>
        <button
          onClick={onFeedback}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-[12px] font-medium text-amber-700"
          title="Dar feedback"
        >
          <MessageSquare size={13} />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Generated Meal Card (for AI menus)
// =====================================================
interface GeneratedMealCardProps {
  type: "breakfast" | "lunch" | "dinner";
  label: string;
  meal: GeneratedMeal;
  expanded: boolean;
  onToggle: () => void;
  onFeedback: () => void;
  onSwap: () => void;
  isLast?: boolean;
}

function GeneratedMealCard({
  type,
  label,
  meal,
  expanded,
  onToggle,
  onFeedback,
  onSwap,
  isLast,
}: GeneratedMealCardProps) {
  const borderColor = {
    breakfast: "border-orange-500",
    lunch: "border-green-700",
    dinner: "border-blue-700",
  }[type];

  return (
    <div
      className={`bg-white border-l-4 ${borderColor} p-4 ${isLast ? "rounded-b-xl" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-gray-500 text-sm">{label}</div>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Bot size={10} /> IA
            </span>
          </div>
          <h4 className="font-semibold text-lg">{meal.name}</h4>
          {meal.description && (
            <p className="text-sm text-gray-500 mt-0.5">{meal.description}</p>
          )}
          {meal.totalTime && (
            <p className="text-xs text-gray-400 mt-1">⏱ {meal.totalTime}</p>
          )}
        </div>
        <button
          onClick={onSwap}
          className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 shrink-0 ml-2"
          title="Cambiar receta"
        >
          <ArrowLeftRight size={18} />
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={onToggle}
          className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-full text-sm hover:bg-gray-200"
        >
          {expanded ? "Ocultar receta ▲" : "Ver receta ▼"}
        </button>
        <button
          onClick={onFeedback}
          className="bg-yellow-100 text-yellow-700 py-2 px-3 rounded-full text-sm hover:bg-yellow-200"
          title="Dar feedback"
        >
          <MessageSquare size={16} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <GeneratedMealDetail meal={meal} />
        </div>
      )}
    </div>
  );
}

// =====================================================
// Generated Meal Detail (ingredients + steps)
// =====================================================
function GeneratedMealDetail({ meal }: { meal: GeneratedMeal }) {
  return (
    <>
      {/* Preparations used */}
      {meal.usedPreparations && meal.usedPreparations.length > 0 && (
        <div className="mb-3 p-2 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">
            🫕 Preparaciones: {meal.usedPreparations.join(", ")}
          </p>
        </div>
      )}

      {/* Ingredients */}
      <div className="space-y-2">
        {(meal.ingredients || []).map((ing, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{ing.name}</span>
              {ing.available && (
                <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">
                  ✓ Disponible
                </span>
              )}
              {ing.available === false && (
                <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded">
                  Comprar
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-1">
              <div>
                <span className="text-gray-400">Total:</span> {ing.total}
              </div>
              <div>
                <span className="text-gray-400">Luis:</span> {ing.luis}
              </div>
              <div>
                <span className="text-gray-400">Mariana:</span> {ing.mariana}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Steps */}
      <ol className="mt-4 list-decimal pl-5 space-y-1 text-sm">
        {(meal.steps || []).map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      {/* Tips */}
      {meal.tips && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          💡 {meal.tips}
        </div>
      )}
    </>
  );
}

// =====================================================
// Static MealCard (original, for legacy menu)
// =====================================================
interface MealCardProps {
  type: "breakfast" | "lunch" | "dinner";
  label: string;
  recipe: Recipe;
  expanded: boolean;
  onToggle: () => void;
  onView: () => void;
  onFeedback: () => void;
  onSuggestions: () => void;
  onSwap: () => void;
  isLast?: boolean;
  mealKey?: string;
  activeMoodKey?: string | null;
  onMoodToggle?: (key: string) => void;
  onMoodChange?: (mood: Mood | undefined) => void;
  currentMood?: Mood;
}

function MealCard({
  type,
  label,
  recipe,
  expanded,
  onToggle,
  onView,
  onFeedback,
  onSuggestions,
  onSwap,
  isLast,
  mealKey,
  activeMoodKey,
  onMoodToggle,
  onMoodChange,
  currentMood,
}: MealCardProps) {
  const borderColor = {
    breakfast: "border-orange-500",
    lunch: "border-green-700",
    dinner: "border-blue-700",
  }[type];

  const showMoodSelector = mealKey && activeMoodKey === mealKey;

  return (
    <div
      className={`bg-white border-l-4 ${borderColor} p-4 ${isLast ? "rounded-b-xl" : ""}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-gray-500 text-sm">{label}</div>
          <h4 className="font-semibold text-lg">{recipe.name}</h4>
          {/* Mood chips */}
          {recipe.moods && recipe.moods.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {recipe.moods.map((mood) => (
                <MoodChip key={mood} mood={mood} size="sm" />
              ))}
            </div>
          )}
          {/* Mood selector toggle */}
          {mealKey && onMoodToggle && (
            <button
              onClick={() => onMoodToggle(mealKey)}
              className="mt-1 text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
              aria-expanded={!!showMoodSelector}
            >
              {currentMood ? `Mood: ${currentMood}` : "Cambiar mood"}
              {showMoodSelector ? " ▲" : " ▼"}
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onSwap}
            className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200"
            title="Cambiar receta"
          >
            <ArrowLeftRight size={18} />
          </button>
          <button
            onClick={onSuggestions}
            className="bg-purple-100 text-purple-700 p-2 rounded-lg hover:bg-purple-200"
            title="Verificar ingredientes"
          >
            <Sparkles size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={onToggle}
          className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-full text-sm hover:bg-gray-200"
        >
          {expanded ? "Ocultar receta ▲" : "Ver receta ▼"}
        </button>
        <button
          onClick={onView}
          className="bg-green-100 text-green-700 py-2 px-4 rounded-full text-sm hover:bg-green-200"
        >
          Abrir
        </button>
        <button
          onClick={onFeedback}
          className="bg-yellow-100 text-yellow-700 py-2 px-3 rounded-full text-sm hover:bg-yellow-200"
          title="Dar feedback"
        >
          <MessageSquare size={16} />
        </button>
      </div>

      {/* Inline Mood Selector */}
      {showMoodSelector && onMoodChange && (
        <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-xs text-indigo-700 font-medium mb-2">
            Selecciona el mood para regenerar esta comida:
          </p>
          <MoodSelector
            selected={currentMood}
            onChange={onMoodChange}
            showDescription
          />
          {currentMood && (
            <button
              onClick={() => onSuggestions()}
              className="mt-2 w-full bg-indigo-600 text-white text-xs py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1"
            >
              <Sparkles size={12} /> Regenerar con mood &quot;{currentMood}
              &quot;
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <RecipeDetail recipe={recipe} />
        </div>
      )}
    </div>
  );
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const ingredients = recipe.ingredients as Ingredient[];
  const hasTotal = ingredients[0]?.total;

  return (
    <>
      <div className="space-y-2">
        {ingredients.map((ing, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-sm mb-1">{ing.name}</div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
              {hasTotal && (
                <div>
                  <span className="text-gray-400">Total:</span>{" "}
                  {ing.total || ""}
                </div>
              )}
              <div>
                <span className="text-gray-400">Grande:</span> {ing.luis}
              </div>
              <div>
                <span className="text-gray-400">Pequeña:</span> {ing.mariana}
              </div>
            </div>
          </div>
        ))}
      </div>
      <ol className="mt-4 list-decimal pl-5 space-y-1 text-sm">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </>
  );
}
