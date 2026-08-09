"use client";

import { useState, useEffect, useCallback } from "react";
import { LogOut, CheckCircle2, Lightbulb } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import type { Recipe, ThermomixRecipe } from "@/types";
import MealCard, { type MealCardMeal } from "./MealCard";
import TaskChecklist from "./TaskChecklist";
import PhotoCapture from "./PhotoCapture";
import DayProgress from "./DayProgress";
import RecipeModal from "@/components/RecipeModal";
import ThermomixView from "@/components/ThermomixView";
import { findThermomixRecipe } from "@/data/thermomix-recipes";
import { attachThermomixQualityWarnings } from "@/lib/thermomix-validation";

// =====================================================
// Types
// =====================================================

interface TodayMenuData {
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe | null;
  dayNumber: number;
  reminder?: string | null;
}

interface DailyCompletionState {
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
  tasks: string[];
  preparations: string[];
  photos: string[];
  notes: string;
}

// =====================================================
// Helper: get default preparations based on day reminder
// =====================================================

function extractPreparations(reminder: string | null): string[] {
  if (!reminder) return [];

  const preps: string[] = [];
  const lower = reminder.toLowerCase();

  // Common preparations from the menu data
  const knownPreps = [
    "Hogao",
    "Chimichurri",
    "Tzatziki",
    "Salsa Verde",
    "Caldo",
    "Arroz",
    "Guacamole",
    "Batata",
  ];

  for (const prep of knownPreps) {
    if (lower.includes(prep.toLowerCase())) {
      preps.push(prep);
    }
  }

  return preps;
}

// =====================================================
// Helper: get cleaning tasks for today
// =====================================================

function getDefaultCleaningTasks(): string[] {
  const dayOfWeek = new Date().getDay();

  // Rotate cleaning tasks based on day of week
  const dailyTasks = [
    "Cocina - limpiar mesones",
    "Barrer áreas comunes",
    "Lavar platos",
  ];

  const rotatingTasks: Record<number, string[]> = {
    1: ["Sala - aspirar", "Baños - desinfectar"], // Monday
    2: ["Habitaciones - tender camas", "Cocina - limpieza profunda"], // Tuesday
    3: ["Baños - limpieza completa", "Pisos - trapear"], // Wednesday
    4: ["Ventanas - limpiar", "Cocina - organizar alacena"], // Thursday
    5: ["Sala - sacudir muebles", "Lavandería - lavar ropa"], // Friday
    6: ["Limpieza general rápida"], // Saturday
    0: [], // Sunday (free)
  };

  return [...dailyTasks, ...(rotatingTasks[dayOfWeek] || [])];
}

// =====================================================
// Helper: convert Recipe to MealCardMeal
// =====================================================

function recipeToMealCard(
  recipe: Recipe | undefined | null,
): MealCardMeal | null {
  if (!recipe) return null;

  const hasThermomix = !!findThermomixRecipe(recipe.name);

  return {
    name: recipe.name,
    prepTime: recipe.prep_time ? `${recipe.prep_time} min` : undefined,
    totalTime: recipe.total_time
      ? `${recipe.total_time} min`
      : recipe.cook_time
        ? `${(recipe.prep_time || 0) + recipe.cook_time} min`
        : undefined,
    thermomix: hasThermomix,
    steps: recipe.steps,
  };
}

// =====================================================
// Main Component
// =====================================================

export default function YolimaView() {
  const { user, signOut } = useAuth();
  const householdId = useHouseholdId();

  // Today's info
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayName = today.toLocaleDateString("es-CO", { weekday: "long" });
  const dateFormatted = today.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
  });

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayMenu, setTodayMenu] = useState<TodayMenuData | null>(null);
  const [completion, setCompletion] = useState<DailyCompletionState>({
    meals: { breakfast: false, lunch: false, dinner: false },
    tasks: [],
    preparations: [],
    photos: [],
    notes: "",
  });
  const [cleaningTasks] = useState<string[]>(getDefaultCleaningTasks);
  const [preparations, setPreparations] = useState<string[]>([]);
  const [dayCompleted, setDayCompleted] = useState(false);

  // Modal states
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [thermomixRecipe, setThermomixRecipe] =
    useState<ThermomixRecipe | null>(null);

  // Greeting
  const hour = today.getHours();
  const userName = user?.full_name?.split(" ")[0] || "Yolima";
  const greeting =
    hour < 12
      ? "¡Buenos días"
      : hour < 18
        ? "¡Buenas tardes"
        : "¡Buenas noches";

  // =====================================================
  // Load today's menu from DB
  // =====================================================

  const loadTodayMenu = useCallback(async () => {
    try {
      // Calculate day in cycle (same logic as useTodayDashboard)
      const startDate = new Date("2025-01-06");
      const diffDays = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let sundays = 0;
      const tempDate = new Date(startDate);
      while (tempDate <= today) {
        if (tempDate.getDay() === 0) sundays++;
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const effectiveDays = diffDays - sundays;
      const dayNumber = ((effectiveDays % 12) + 12) % 12;

      const { data: menuData, error: menuError } = await supabase
        .from("day_menu")
        .select(
          `
          *,
          breakfast:recipes!day_menu_breakfast_id_fkey(*),
          lunch:recipes!day_menu_lunch_id_fkey(*),
          dinner:recipes!day_menu_dinner_id_fkey(*)
        `,
        )
        .eq("day_number", dayNumber)
        .single();

      if (menuError) {
        console.error("Error loading menu:", menuError);
        return;
      }

      if (menuData) {
        const menu: TodayMenuData = {
          breakfast: menuData.breakfast,
          lunch: menuData.lunch,
          dinner: menuData.dinner,
          dayNumber,
          reminder: menuData.reminder,
        };
        setTodayMenu(menu);

        // Extract preparations from reminder
        const preps = extractPreparations(menuData.reminder);
        setPreparations(preps);
      }
    } catch (err) {
      console.error("Error loading today menu:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // Load existing completion for today
  // =====================================================

  const loadExistingCompletion = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        date: todayStr,
        ...(householdId ? { household_id: householdId } : {}),
      });

      const res = await fetch(`/api/daily-completion?${params.toString()}`);
      const json = await res.json();

      if (json.data) {
        setCompletion({
          meals: json.data.meals_completed || {
            breakfast: false,
            lunch: false,
            dinner: false,
          },
          tasks: json.data.tasks_completed || [],
          preparations: json.data.preparations_completed || [],
          photos: json.data.photo_urls || [],
          notes: json.data.notes || "",
        });
        setDayCompleted(!!json.data.completed_at);
      }
    } catch (err) {
      console.error("Error loading completion:", err);
    }
  }, [todayStr, householdId]);

  // =====================================================
  // Save completion to API
  // =====================================================

  const saveCompletion = useCallback(
    async (newCompletion: DailyCompletionState, markComplete = false) => {
      try {
        setSaving(true);
        await fetch("/api/daily-completion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: todayStr,
            household_id: householdId,
            employee_id: user?.id,
            meals_completed: newCompletion.meals,
            tasks_completed: newCompletion.tasks,
            preparations_completed: newCompletion.preparations,
            photo_urls: newCompletion.photos,
            notes: newCompletion.notes,
            started_at: new Date().toISOString(),
            completed_at: markComplete ? new Date().toISOString() : null,
          }),
        });
      } catch (err) {
        console.error("Error saving completion:", err);
      } finally {
        setSaving(false);
      }
    },
    [todayStr, householdId, user?.id],
  );

  // =====================================================
  // Effects
  // =====================================================

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadTodayMenu(), loadExistingCompletion()]);
      setLoading(false);
    }
    init();
  }, [loadTodayMenu, loadExistingCompletion]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      saveCompletion(completion, dayCompleted);
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completion, dayCompleted]);

  // =====================================================
  // Handlers
  // =====================================================

  const toggleMeal = (meal: "breakfast" | "lunch" | "dinner") => {
    setCompletion((prev) => ({
      ...prev,
      meals: { ...prev.meals, [meal]: !prev.meals[meal] },
    }));
  };

  const toggleTask = (task: string) => {
    setCompletion((prev) => {
      const tasks = prev.tasks.includes(task)
        ? prev.tasks.filter((t) => t !== task)
        : [...prev.tasks, task];
      return { ...prev, tasks };
    });
  };

  const togglePreparation = (prep: string) => {
    setCompletion((prev) => {
      const preparations = prev.preparations.includes(prep)
        ? prev.preparations.filter((p) => p !== prep)
        : [...prev.preparations, prep];
      return { ...prev, preparations };
    });
  };

  const handlePhotoAdded = (url: string) => {
    setCompletion((prev) => ({
      ...prev,
      photos: [...prev.photos, url],
    }));
  };

  const handleDayCompleted = async () => {
    const confirmed = window.confirm(
      "¿Marcar el día como completado? ✅\n\nEsto notificará al administrador.",
    );
    if (!confirmed) return;

    setDayCompleted(true);
    await saveCompletion(completion, true);
  };

  const handleViewRecipe = (recipe: Recipe | undefined | null) => {
    if (recipe) setSelectedRecipe(recipe);
  };

  const handleStartThermomix = (recipe: Recipe | undefined | null) => {
    if (!recipe) return;
    const tmRecipe = findThermomixRecipe(recipe.name);
    if (tmRecipe) {
      setThermomixRecipe(attachThermomixQualityWarnings(tmRecipe));
    }
  };

  // =====================================================
  // Calculate progress
  // =====================================================

  const totalItems =
    (todayMenu?.breakfast ? 1 : 0) +
    (todayMenu?.lunch ? 1 : 0) +
    (todayMenu?.dinner ? 1 : 0) +
    preparations.length +
    cleaningTasks.length;

  const completedItems =
    (completion.meals.breakfast && todayMenu?.breakfast ? 1 : 0) +
    (completion.meals.lunch && todayMenu?.lunch ? 1 : 0) +
    (completion.meals.dinner && todayMenu?.dinner ? 1 : 0) +
    completion.preparations.length +
    completion.tasks.length;

  const progressPercent =
    totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[var(--accent-soft)] to-[var(--bg)]">
        <div className="text-center">
          <Spinner size="xl" color="green" className="mx-auto mb-4" />
          <p className="text-[15px] text-[var(--ink-soft)]">
            Cargando tu día...
          </p>
        </div>
      </div>
    );
  }

  const userInitial = userName.charAt(0).toUpperCase();

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--accent-soft)] to-[var(--bg)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[18px] flex-shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[18px] font-semibold tracking-tight text-[var(--ink)]">
                {greeting}, {userName}!
              </p>
              <p className="text-[12.5px] text-[var(--ink-soft)] capitalize">
                {dayName} · {dateFormatted}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {saving ? (
                <Spinner size="sm" color="gray" />
              ) : (
                <span className="bg-green-100 text-green-700 text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />{" "}
                  Presente
                </span>
              )}
              <button
                onClick={signOut}
                className="p-2 rounded-xl text-[var(--ink-soft)] hover:bg-stone-100 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Day Progress */}
          <div className="mt-4">
            <DayProgress
              percent={progressPercent}
              completed={completedItems}
              total={totalItems}
            />
          </div>
        </div>
      </div>

      {/* Main content - single scrollable view */}
      <div className="max-w-lg mx-auto px-5 py-4 space-y-5 pb-32">
        {/* Meals */}
        <section>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
            Comidas que preparar
          </p>
          <div className="space-y-2">
            <MealCard
              kind="breakfast"
              label="Desayuno"
              meal={recipeToMealCard(todayMenu?.breakfast)}
              isCompleted={completion.meals.breakfast}
              onToggleComplete={() => toggleMeal("breakfast")}
              onViewRecipe={() => handleViewRecipe(todayMenu?.breakfast)}
              onStartThermomix={() =>
                handleStartThermomix(todayMenu?.breakfast)
              }
            />

            <MealCard
              kind="lunch"
              label="Almuerzo"
              meal={recipeToMealCard(todayMenu?.lunch)}
              isCompleted={completion.meals.lunch}
              onToggleComplete={() => toggleMeal("lunch")}
              onViewRecipe={() => handleViewRecipe(todayMenu?.lunch)}
              onStartThermomix={() => handleStartThermomix(todayMenu?.lunch)}
            />

            <MealCard
              kind="dinner"
              label="Cena"
              meal={recipeToMealCard(todayMenu?.dinner)}
              isCompleted={completion.meals.dinner}
              onToggleComplete={() => toggleMeal("dinner")}
              onViewRecipe={() => handleViewRecipe(todayMenu?.dinner)}
              onStartThermomix={() => handleStartThermomix(todayMenu?.dinner)}
            />
          </div>
        </section>

        {/* Preparations */}
        {preparations.length > 0 && (
          <TaskChecklist
            title="Preparaciones base"
            items={preparations}
            completedItems={completion.preparations}
            onToggle={togglePreparation}
            variant="square"
          />
        )}

        {/* Reminder note from the menu */}
        {todayMenu?.reminder && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2.5">
            <Lightbulb
              size={16}
              className="text-amber-700 mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 mb-0.5">
                Recordatorio
              </p>
              <p className="text-[13px] text-amber-900 leading-snug">
                {todayMenu.reminder}
              </p>
            </div>
          </div>
        )}

        {/* Cleaning Tasks */}
        <TaskChecklist
          title="Tareas de limpieza"
          items={cleaningTasks}
          completedItems={completion.tasks}
          onToggle={toggleTask}
        />

        {/* Photo Capture */}
        <section>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
            Fotos del plato
          </p>
          <PhotoCapture
            date={todayStr}
            householdId={householdId || null}
            existingPhotos={completion.photos}
            onPhotoAdded={handlePhotoAdded}
          />
        </section>

        {/* Day Completed Button */}
        {!dayCompleted ? (
          <button
            onClick={handleDayCompleted}
            className="w-full py-3.5 bg-[var(--accent)] text-white rounded-xl text-[14px] font-semibold
                       active:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Terminé mi día
          </button>
        ) : (
          <div className="bg-[var(--accent-soft)] border border-green-300 rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-[var(--accent)] mb-1">
              <CheckCircle2 size={20} />
              <p className="text-[16px] font-semibold">¡Día completado!</p>
            </div>
            <p className="text-[13px] text-[var(--ink-soft)]">
              Buen trabajo, {userName}. Descansa bien.
            </p>
          </div>
        )}
      </div>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {/* Thermomix View */}
      {thermomixRecipe && (
        <div className="fixed inset-0 z-[100] bg-white">
          <ThermomixView
            recipe={thermomixRecipe}
            onClose={() => setThermomixRecipe(null)}
          />
        </div>
      )}
    </div>
  );
}
