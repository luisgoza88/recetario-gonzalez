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

const RecipeModal = dynamic(() => import("./RecipeModal"), {
  loading: () => null,
  ssr: false,
});
const MealSwapModal = dynamic(() => import("./MealSwapModal"), {
  loading: () => null,
  ssr: false,
});

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
      await supabase.from("completed_days").delete().eq("date", dateKey);
      setCompletedDays((prev) => {
        const next = new Set(prev);
        next.delete(dateKey);
        return next;
      });
    } else {
      await supabase
        .from("completed_days")
        .upsert({ date: dateKey, completed: true });
      setCompletedDays((prev) => new Set([...prev, dateKey]));
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
            ${isSelected && !isSunday && !hasGenerated ? "bg-green-700 text-white" : ""}
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
            📅 {dayName} {selectedDate.getDate()}{" "}
            {MONTHS[selectedDate.getMonth()]}
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
            📅 {dayName} {selectedDate.getDate()}{" "}
            {MONTHS[selectedDate.getMonth()]}
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

    return (
      <div className="mt-4">
        <div className="bg-green-700 text-white p-4 rounded-t-xl flex justify-between items-center">
          <h3 className="font-semibold">
            📅 {dayName} {selectedDate.getDate()}{" "}
            {MONTHS[selectedDate.getMonth()]}
          </h3>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            Semana {weekNum} • Día {(cycleDay % 6) + 1}
          </span>
        </div>

        {menu.reminder && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
            <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
              <Star size={16} /> RECORDATORIO
            </div>
            <p className="text-orange-800 font-semibold mt-1">
              {menu.reminder}
            </p>
          </div>
        )}

        {breakfast && (
          <MealCard
            type="breakfast"
            label="🍳 DESAYUNO"
            recipe={breakfast}
            expanded={expandedRecipe === breakfast.id}
            onToggle={() =>
              setExpandedRecipe(
                expandedRecipe === breakfast.id ? null : breakfast.id,
              )
            }
            onView={() => setSelectedRecipe(breakfast)}
            onFeedback={() =>
              setFeedbackRecipe({ recipe: breakfast, mealType: "breakfast" })
            }
            onSuggestions={() =>
              setSuggestionsRecipe({ recipe: breakfast, mealType: "breakfast" })
            }
            onSwap={() =>
              openSwapModal("breakfast", breakfast, "static", {
                dayNumber: cycleDay,
              })
            }
          />
        )}

        {lunch && (
          <MealCard
            type="lunch"
            label="🍗 ALMUERZO (5 porciones)"
            recipe={lunch}
            expanded={expandedRecipe === lunch.id}
            onToggle={() =>
              setExpandedRecipe(expandedRecipe === lunch.id ? null : lunch.id)
            }
            onView={() => setSelectedRecipe(lunch)}
            onFeedback={() =>
              setFeedbackRecipe({ recipe: lunch, mealType: "lunch" })
            }
            onSuggestions={() =>
              setSuggestionsRecipe({ recipe: lunch, mealType: "lunch" })
            }
            onSwap={() =>
              openSwapModal("lunch", lunch, "static", {
                dayNumber: cycleDay,
              })
            }
          />
        )}

        {dinner ? (
          <MealCard
            type="dinner"
            label="🐟 CENA (2 porciones)"
            recipe={dinner}
            expanded={expandedRecipe === dinner.id}
            onToggle={() =>
              setExpandedRecipe(expandedRecipe === dinner.id ? null : dinner.id)
            }
            onView={() => setSelectedRecipe(dinner)}
            onFeedback={() =>
              setFeedbackRecipe({ recipe: dinner, mealType: "dinner" })
            }
            onSuggestions={() =>
              setSuggestionsRecipe({ recipe: dinner, mealType: "dinner" })
            }
            onSwap={() =>
              openSwapModal("dinner", dinner, "static", {
                dayNumber: cycleDay,
              })
            }
            isLast
          />
        ) : (
          <div className="bg-white border-l-4 border-gray-400 p-4 rounded-b-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-gray-500 text-sm">🌙 CENA</div>
                <p className="text-gray-400">No hay cena - Salen a comer</p>
              </div>
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
                className="bg-purple-100 text-purple-700 p-2 rounded-lg hover:bg-purple-200 flex items-center gap-2"
                title="Generar receta de cena con IA"
              >
                <Sparkles size={18} />
                <span className="text-sm font-medium">Generar</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ¿Cambio de planes? Genera una receta de cena con IA
            </p>
          </div>
        )}

        <button
          onClick={toggleDayComplete}
          className={`
            w-full p-4 rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 transition-colors
            ${
              isCompleted
                ? "bg-green-50 text-green-700 border-2 border-green-200"
                : "bg-green-700 text-white hover:bg-green-800"
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
      {/* Month Navigation */}
      <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="bg-green-50 text-green-700 p-2 rounded-lg hover:bg-green-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-semibold text-lg">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => changeMonth(1)}
          className="bg-green-50 text-green-700 p-2 rounded-lg hover:bg-green-100"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Generate Weekly Menu Button */}
      <button
        onClick={generateWeeklyMenu}
        disabled={isGenerating || !selectedDate}
        className={`
          w-full p-4 rounded-xl font-semibold mb-4 flex items-center justify-center gap-2 transition-all
          ${
            isGenerating
              ? "bg-indigo-100 text-indigo-400 cursor-wait"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg"
          }
        `}
      >
        {isGenerating ? (
          <>
            <Spinner size="md" /> Generando menú semanal con IA...
          </>
        ) : (
          <>
            <RefreshCw size={20} /> 🔄 Generar Menú Semanal con IA
          </>
        )}
      </button>

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
                  : "bg-green-700 text-white hover:bg-green-800 shadow-sm hover:shadow-md"
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
        📅 Menú estático: ciclo desde <strong>6 Ene 2026</strong> • Menú IA:
        genera semanas personalizadas
      </div>

      {/* Calendar Grid */}
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
          onClose={() => setFeedbackRecipe(null)}
          onSaved={() => {}}
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
}: MealCardProps) {
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
        <div>
          <div className="text-gray-500 text-sm">{label}</div>
          <h4 className="font-semibold text-lg">{recipe.name}</h4>
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
