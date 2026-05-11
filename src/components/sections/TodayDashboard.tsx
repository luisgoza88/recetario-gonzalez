"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Sun,
  Moon,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  Home,
  ShoppingCart,
  Plus,
  AlertCircle,
  TrendingUp,
  ChefHat,
  Briefcase,
  ArrowRight,
  Lightbulb,
  X,
  ChevronRight,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { MoodChip } from "@/components/ui/MoodChip";
import { ScheduledTask, Recipe } from "@/types";
import ProactiveAlerts from "@/components/ProactiveAlerts";
import EmployeeCompletionBanner from "@/components/yolima/EmployeeCompletionBanner";
import ShareButton from "@/components/ShareButton";
import { formatDayMenuForWhatsApp } from "@/lib/whatsapp-share";
import Spinner from "@/components/ui/Spinner";
import { SkeletonTodayHero, Skeleton } from "@/components/ui/Skeleton";
import {
  useTodayDashboard,
  useGreeting,
  getMealLabel,
  EmployeeTaskSummary,
} from "@/lib/hooks/useTodayDashboard";
// Sprint 12 (Lazyweb research mayo 2026): NYT Cooking pattern -
// "Cocinada N veces · ⭐ 4.8" en hero
import { useRecipeStats } from "@/lib/hooks/useRecipeStats";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import { Star } from "lucide-react";

interface TodayDashboardProps {
  onNavigateToRecetario: (tab?: string) => void;
  onNavigateToHogar: () => void;
}

export default function TodayDashboard({
  onNavigateToRecetario,
  onNavigateToHogar,
}: TodayDashboardProps) {
  // Estado local para modales
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeTaskSummary | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);

  // Hooks extraídos para datos
  const {
    todayMenu,
    employeeSummaries,
    pendingSuggestions,
    lowSupplies,
    weeklyStats,
    loading,
  } = useTodayDashboard();

  const { greeting, timeOfDay, dayOfWeek, formattedDate } = useGreeting();

  // Sprint 12: stats de la comida principal del dia (lunch primary)
  const householdId = useHouseholdId();
  const heroMealForStats =
    todayMenu?.lunch ?? todayMenu?.dinner ?? todayMenu?.breakfast;
  const heroStats = useRecipeStats(heroMealForStats?.id, householdId);

  // Íconos basados en hora del día
  const getGreetingIcon = () => {
    if (timeOfDay === "morning")
      return <Sun className="text-yellow-500" size={24} />;
    if (timeOfDay === "afternoon")
      return <Sun className="text-orange-500" size={24} />;
    return <Moon className="text-indigo-500" size={24} />;
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case "breakfast":
        return <Coffee size={18} className="text-amber-600" />;
      case "lunch":
        return <UtensilsCrossed size={18} className="text-green-600" />;
      case "dinner":
        return <Moon size={18} className="text-indigo-600" />;
      default:
        return <UtensilsCrossed size={18} />;
    }
  };

  if (loading) {
    // Sprint 8 (Lazyweb): skeleton screens en vez de spinner solo.
    // Mejor percepcion de performance - el usuario ve la estructura.
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <SkeletonTodayHero />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header con saludo */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {getGreetingIcon()}
                <h1 className="text-xl font-bold text-gray-800">{greeting}</h1>
              </div>
              <p className="text-gray-500 text-sm mt-1 capitalize">
                {dayOfWeek}, {formattedDate}
              </p>
            </div>
            {(pendingSuggestions > 0 || lowSupplies > 0) && (
              <div className="relative">
                <AlertCircle size={24} className="text-orange-500" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {pendingSuggestions + lowSupplies}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Sprint 3 - Today Hero (Lazyweb research: NYT Cooking + FitOn pattern):
            Hero gigante con foto del LUNCH (comida principal) + chips de info +
            acciones primarias. Separa visualmente la comida principal del
            resto del dia. */}
        {(() => {
          const heroMeal: Recipe | undefined =
            todayMenu?.lunch ?? todayMenu?.dinner ?? todayMenu?.breakfast;
          const heroLabel = todayMenu?.lunch
            ? "Hoy almuerzas"
            : todayMenu?.dinner
              ? "Hoy cenas"
              : todayMenu?.breakfast
                ? "Hoy desayunas"
                : null;

          if (!heroMeal || !heroLabel) {
            return (
              <section className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 rounded-3xl p-6 text-center border border-orange-100 dark:border-orange-900/50">
                <ChefHat size={48} className="mx-auto mb-3 text-orange-400" />
                <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                  Sin menú definido para hoy
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Configura tu menú o genera uno con IA
                </p>
                <button
                  onClick={() => onNavigateToRecetario("calendar")}
                  className="bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Ir al calendario
                </button>
              </section>
            );
          }

          const cookTime = heroMeal.cook_time ?? heroMeal.total_time;
          const mood = heroMeal.moods?.[0];

          return (
            <section className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
              {/* Hero photo (4:3) */}
              <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
                {heroMeal.image_url ? (
                  <Image
                    src={heroMeal.image_url}
                    alt={heroMeal.name}
                    fill
                    sizes="(max-width: 512px) 100vw, 512px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon
                      size={48}
                      className="text-orange-300 dark:text-orange-700"
                    />
                  </div>
                )}
                {/* Share button overlay */}
                {todayMenu && (
                  <div className="absolute top-3 right-3">
                    <ShareButton
                      message={formatDayMenuForWhatsApp({
                        breakfast: todayMenu.breakfast?.name,
                        lunch: todayMenu.lunch?.name,
                        dinner: todayMenu.dinner?.name || null,
                      })}
                      title="Compartir menú del día"
                      variant="icon"
                      className="bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-full p-2 text-gray-700 dark:text-gray-300 shadow-md"
                    />
                  </div>
                )}
              </div>

              {/* Info + actions */}
              <div className="p-5">
                <p className="text-xs uppercase tracking-wider font-bold text-orange-600 mb-1">
                  {heroLabel}
                </p>
                <h2 className="font-display text-3xl font-semibold text-gray-900 dark:text-white leading-tight mb-2">
                  {heroMeal.name}
                </h2>

                {/* Sprint 12: NYT Cooking pattern - "Cocinada N veces" */}
                {heroStats && heroStats.timesCooked > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <span>
                      Cocinada <strong>{heroStats.timesCooked}</strong>{" "}
                      {heroStats.timesCooked === 1 ? "vez" : "veces"}
                    </span>
                    {heroStats.avgRating !== null && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Star
                            size={11}
                            className="text-amber-500 fill-amber-500"
                          />
                          <strong>{heroStats.avgRating.toFixed(1)}</strong>
                        </span>
                      </>
                    )}
                    {heroStats.wouldRepeatPct !== null &&
                      heroStats.wouldRepeatPct >= 50 && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {heroStats.wouldRepeatPct}% repetiría
                          </span>
                        </>
                      )}
                  </p>
                )}

                {/* Chips: tiempo, mood */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {cookTime && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <Clock size={12} /> {cookTime} min
                    </span>
                  )}
                  {mood && <MoodChip mood={mood} size="sm" />}
                  {heroMeal.difficulty && (
                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                      {heroMeal.difficulty}
                    </span>
                  )}
                </div>

                {/* Acciones primarias */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onNavigateToRecetario("calendar")}
                    className="w-full h-12 rounded-xl bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
                  >
                    <Play size={18} fill="currentColor" />
                    Empezar a cocinar
                  </button>
                  <button
                    onClick={() => onNavigateToRecetario("market")}
                    className="w-full h-11 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ShoppingCart size={16} />
                    Ver lista de mercado
                  </button>
                </div>
              </div>

              {/* Otros tiempos del dia (compactos) */}
              {(todayMenu?.breakfast ||
                todayMenu?.dinner ||
                todayMenu?.lunch) && (
                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {todayMenu?.breakfast && heroMeal !== todayMenu.breakfast && (
                    <CompactMealRow
                      label="Desayuno"
                      meal={todayMenu.breakfast}
                      icon={<Coffee size={16} className="text-amber-600" />}
                      onClick={() => onNavigateToRecetario("calendar")}
                    />
                  )}
                  {todayMenu?.dinner && heroMeal !== todayMenu.dinner && (
                    <CompactMealRow
                      label="Cena"
                      meal={todayMenu.dinner}
                      icon={<Moon size={16} className="text-indigo-600" />}
                      onClick={() => onNavigateToRecetario("calendar")}
                    />
                  )}
                  {!todayMenu?.dinner && (
                    <button
                      onClick={() => onNavigateToRecetario("suggestions")}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Moon size={16} className="text-indigo-600" />
                        <div className="text-left">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                            Cena
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No hay cena · genera con IA
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-950/40 px-2.5 py-1 rounded-full">
                        <Sparkles size={12} /> Generar
                      </span>
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })()}

        {/* Hogar Hoy */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b">
            <div className="flex items-center gap-2">
              <Home size={20} className="text-blue-700" />
              <h2 className="font-semibold text-blue-800">Hogar Hoy</h2>
            </div>
            <button
              onClick={onNavigateToHogar}
              className="text-blue-600 text-sm flex items-center gap-1 hover:text-blue-700"
            >
              Ver todo <ArrowRight size={16} />
            </button>
          </div>

          {employeeSummaries.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">
                No hay empleados configurados
              </p>
              <button
                onClick={onNavigateToHogar}
                className="mt-2 text-blue-600 text-sm hover:underline"
              >
                Configurar hogar
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {employeeSummaries.map((summary) => (
                <button
                  key={summary.employee.id}
                  className="p-4 w-full text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee(summary)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          summary.employee.zone === "interior"
                            ? "bg-purple-100 text-purple-700"
                            : summary.employee.zone === "exterior"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {summary.employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {summary.employee.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {summary.employee.zone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {summary.isCheckedIn ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> Presente
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                          Sin registrar
                        </span>
                      )}
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </div>

                  {summary.totalCount > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            role="progressbar"
                            aria-valuenow={Math.round(
                              (summary.completedCount / summary.totalCount) *
                                100,
                            )}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Progreso de ${summary.employee.name}`}
                            style={{
                              width: `${(summary.completedCount / summary.totalCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {summary.completedCount}/{summary.totalCount}
                        </span>
                      </div>

                      {/* Próxima tarea pendiente */}
                      {summary.tasks
                        .filter((t) => t.status === "pendiente")
                        .slice(0, 1)
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <Clock size={14} className="text-gray-400" />
                            <span>
                              Próxima: {task.task_template?.name || "Tarea"}
                            </span>
                          </div>
                        ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      Sin tareas hoy
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Estado del empleado (Modo Yolima) */}
        <EmployeeCompletionBanner />

        {/* IA Proactiva - Alertas Inteligentes */}
        <ProactiveAlerts
          onNavigateToMarket={() => onNavigateToRecetario("market")}
          onNavigateToSuggestions={() => onNavigateToRecetario("suggestions")}
        />

        {/* Acciones Rápidas */}
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => onNavigateToRecetario("market")}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <ShoppingCart size={24} className="text-green-600" />
              <span className="text-xs text-gray-600">Mercado</span>
            </button>
            <button
              onClick={() => onNavigateToRecetario("recipes")}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Plus size={24} className="text-blue-600" />
              <span className="text-xs text-gray-600">Receta</span>
            </button>
            <button
              onClick={() => onNavigateToRecetario("suggestions")}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Lightbulb size={24} className="text-purple-600" />
              <span className="text-xs text-gray-600">Sugerencias</span>
            </button>
            <button
              onClick={onNavigateToHogar}
              className="bg-white rounded-xl p-4 shadow-sm border flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Briefcase size={24} className="text-orange-600" />
              <span className="text-xs text-gray-600">Tareas</span>
            </button>
          </div>
        </section>

        {/* Resumen Semanal */}
        <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
            <TrendingUp size={20} className="text-gray-600" />
            <h2 className="font-semibold text-gray-700">Resumen Semanal</h2>
          </div>

          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {weeklyStats.mealsCompleted}
                <span className="text-gray-400 text-lg">
                  /{weeklyStats.mealsTotal}
                </span>
              </div>
              <p className="text-xs text-gray-500">Comidas registradas</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {weeklyStats.tasksCompleted}
                <span className="text-gray-400 text-lg">
                  /{weeklyStats.tasksTotal}
                </span>
              </div>
              <p className="text-xs text-gray-500">Tareas completadas</p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal de detalle de tarea */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div
              className={`px-4 py-4 border-b ${
                selectedTask.status === "completada"
                  ? "bg-green-50"
                  : selectedTask.status === "en_progreso"
                    ? "bg-blue-50"
                    : "bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedTask.status === "completada" ? (
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                      <CheckCircle2 size={24} className="text-green-600" />
                    </div>
                  ) : selectedTask.status === "en_progreso" ? (
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                      <Clock size={24} className="text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Circle size={24} className="text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Detalle de Tarea
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedTask.status === "completada"
                          ? "bg-green-200 text-green-700"
                          : selectedTask.status === "en_progreso"
                            ? "bg-blue-200 text-blue-700"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {selectedTask.status === "completada"
                        ? "Completada"
                        : selectedTask.status === "en_progreso"
                          ? "En progreso"
                          : "Pendiente"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-2 rounded-full hover:bg-white/50"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Nombre de la tarea */}
              <div>
                <h4 className="text-xl font-bold text-gray-800">
                  {selectedTask.task_template?.name || "Tarea"}
                </h4>
                {selectedTask.task_template?.description && (
                  <p className="text-gray-500 mt-1">
                    {selectedTask.task_template.description}
                  </p>
                )}
              </div>

              {/* Información del espacio */}
              {selectedTask.space && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-2">
                    Espacio
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center text-2xl">
                      {selectedTask.space.space_type?.icon || "🏠"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {selectedTask.space.custom_name ||
                          selectedTask.space.space_type?.name ||
                          "Sin nombre"}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {selectedTask.space.category || "interior"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información adicional */}
              <div className="grid grid-cols-2 gap-3">
                {/* Fecha programada */}
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-medium">Fecha</p>
                  <p className="font-semibold text-blue-800">
                    {new Date(
                      selectedTask.scheduled_date + "T12:00:00",
                    ).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>

                {/* Duración estimada */}
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-600 font-medium">
                    Duración est.
                  </p>
                  <p className="font-semibold text-purple-800">
                    {selectedTask.task_template?.estimated_minutes
                      ? `${selectedTask.task_template.estimated_minutes} min`
                      : "No definida"}
                  </p>
                </div>

                {/* Frecuencia */}
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-amber-600 font-medium">
                    Frecuencia
                  </p>
                  <p className="font-semibold text-amber-800 capitalize">
                    {selectedTask.task_template?.frequency || "No definida"}
                  </p>
                </div>

                {/* Prioridad */}
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-red-600 font-medium">Prioridad</p>
                  <p className="font-semibold text-red-800 capitalize">
                    {selectedTask.task_template?.priority || "Normal"}
                  </p>
                </div>
              </div>

              {/* Notas */}
              {selectedTask.notes && (
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-xs text-yellow-600 uppercase font-medium mb-1">
                    Notas
                  </p>
                  <p className="text-gray-700">{selectedTask.notes}</p>
                </div>
              )}

              {/* Información de completado */}
              {selectedTask.status === "completada" &&
                selectedTask.completed_at && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-xs text-green-600 uppercase font-medium mb-1">
                      Completada
                    </p>
                    <p className="text-green-800 font-medium">
                      {new Date(selectedTask.completed_at).toLocaleDateString(
                        "es-CO",
                        {
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedTask(null)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de tareas del empleado */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden animate-slide-up">
            {/* Header del modal */}
            <div
              className={`px-4 py-4 border-b flex items-center justify-between ${
                selectedEmployee.employee.zone === "interior"
                  ? "bg-purple-50"
                  : selectedEmployee.employee.zone === "exterior"
                    ? "bg-green-50"
                    : "bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${
                    selectedEmployee.employee.zone === "interior"
                      ? "bg-purple-200 text-purple-700"
                      : selectedEmployee.employee.zone === "exterior"
                        ? "bg-green-200 text-green-700"
                        : "bg-blue-200 text-blue-700"
                  }`}
                >
                  {selectedEmployee.employee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {selectedEmployee.employee.name}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {selectedEmployee.employee.zone} •{" "}
                    {selectedEmployee.isCheckedIn
                      ? "Presente"
                      : "Sin registrar"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 rounded-full hover:bg-white/50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Resumen */}
              <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedEmployee.completedCount}
                  </p>
                  <p className="text-xs text-gray-500">Completadas</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-orange-600">
                    {selectedEmployee.totalCount -
                      selectedEmployee.completedCount}
                  </p>
                  <p className="text-xs text-gray-500">Pendientes</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-gray-600">
                    {selectedEmployee.totalCount}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>

              {/* Lista de tareas */}
              <h4 className="font-medium text-gray-700 mb-3">Tareas de Hoy</h4>
              {selectedEmployee.tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2
                    size={40}
                    className="mx-auto text-gray-300 mb-2"
                  />
                  <p className="text-gray-500">
                    No hay tareas programadas para hoy
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEmployee.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 hover:shadow-md transition-all ${
                        task.status === "completada"
                          ? "bg-green-50 border-green-200"
                          : task.status === "en_progreso"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {task.status === "completada" ? (
                        <CheckCircle2
                          size={20}
                          className="text-green-600 mt-0.5 flex-shrink-0"
                        />
                      ) : task.status === "en_progreso" ? (
                        <Clock
                          size={20}
                          className="text-blue-600 mt-0.5 flex-shrink-0"
                        />
                      ) : (
                        <Circle
                          size={20}
                          className="text-gray-400 mt-0.5 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium ${
                            task.status === "completada"
                              ? "text-green-800 line-through"
                              : "text-gray-800"
                          }`}
                        >
                          {task.task_template?.name || "Tarea"}
                        </p>
                        {task.space && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <span>{task.space.space_type?.icon || "🏠"}</span>
                            {task.space.custom_name ||
                              task.space.space_type?.name ||
                              "Espacio"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            task.status === "completada"
                              ? "bg-green-200 text-green-700"
                              : task.status === "en_progreso"
                                ? "bg-blue-200 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {task.status === "completada"
                            ? "Hecho"
                            : task.status === "en_progreso"
                              ? "En curso"
                              : "Pendiente"}
                        </span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  onNavigateToHogar();
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Ir a Hogar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Sub-componentes (Sprint 3 - Today Hero)
// =====================================================

interface CompactMealRowProps {
  label: string;
  meal: Recipe;
  icon: React.ReactNode;
  onClick: () => void;
}

function CompactMealRow({ label, meal, icon, onClick }: CompactMealRowProps) {
  const cookTime = meal.cook_time ?? meal.total_time;
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
    >
      {/* Thumbnail compact */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex-shrink-0">
        {meal.image_url ? (
          <Image
            src={meal.image_url}
            alt={meal.name}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
          {icon} {label}
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {meal.name}
        </p>
      </div>

      {cookTime && (
        <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-0.5 flex-shrink-0">
          <Clock size={11} /> {cookTime}m
        </span>
      )}
      <ChevronRight
        size={16}
        className="text-gray-300 dark:text-gray-600 flex-shrink-0"
      />
    </button>
  );
}
