"use client";

import { useState } from "react";
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
  TrendingUp,
  ChefHat,
  Briefcase,
  Lightbulb,
  X,
  ChevronRight,
  Bell,
  Star,
} from "lucide-react";
import { ScheduledTask } from "@/types";
import ProactiveAlerts from "@/components/ProactiveAlerts";
import EmployeeCompletionBanner from "@/components/yolima/EmployeeCompletionBanner";
import ShareButton from "@/components/ShareButton";
import { formatDayMenuForWhatsApp } from "@/lib/whatsapp-share";
import Spinner from "@/components/ui/Spinner";
import {
  useTodayDashboard,
  useGreeting,
  EmployeeTaskSummary,
} from "@/lib/hooks/useTodayDashboard";
// Sprint 12 (Lazyweb research mayo 2026): NYT Cooking pattern -
// "Cocinada N veces · ⭐ 4.8"
import { useRecipeStats } from "@/lib/hooks/useRecipeStats";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Spinner size="xl" />
      </div>
    );
  }

  const greetingIcon =
    timeOfDay === "morning" ? (
      <Sun className="text-amber-500" size={18} />
    ) : timeOfDay === "afternoon" ? (
      <Sun className="text-orange-500" size={18} />
    ) : (
      <Moon className="text-indigo-500" size={18} />
    );

  const alertCount = pendingSuggestions + lowSupplies;

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32">
      {/* ─── Header (saludo) ───────────────────────────────── */}
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {greetingIcon}
            <span className="text-[13px] text-[var(--ink-soft)] uppercase tracking-wider font-medium">
              {dayOfWeek} · {formattedDate}
            </span>
          </div>
          <button className="relative" aria-label="Notificaciones">
            <Bell size={20} className="text-[var(--ink-soft)]" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </button>
        </div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
          {greeting}, Luis.
        </h1>
        <p className="text-[14px] text-[var(--ink-soft)] mt-1">
          Día del ciclo · Cocina · Familia González
        </p>
      </div>

      <div className="px-5 space-y-4">
        {/* ─── Hoy en la mesa ─────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <ChefHat size={18} className="text-[var(--accent)]" />
              <h2 className="font-semibold text-[15px] text-[var(--ink)]">
                Hoy en la mesa
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {todayMenu && (
                <ShareButton
                  message={formatDayMenuForWhatsApp({
                    breakfast: todayMenu.breakfast?.name,
                    lunch: todayMenu.lunch?.name,
                    dinner: todayMenu.dinner?.name || null,
                  })}
                  title="Compartir menú"
                  variant="icon"
                  className="text-[var(--accent)]"
                />
              )}
              <button
                onClick={() => onNavigateToRecetario("calendar")}
                className="text-[var(--accent)] text-[13px] font-medium flex items-center gap-0.5"
              >
                Calendario <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            <MealRow
              type="breakfast"
              name={todayMenu?.breakfast?.name}
              time="7:30 am"
            />
            <MealRow
              type="lunch"
              name={todayMenu?.lunch?.name}
              time="1:00 pm"
              timesCooked={heroStats?.timesCooked}
              avgRating={heroStats?.avgRating ?? null}
            />
            <MealRow
              type="dinner"
              name={todayMenu?.dinner?.name}
              time="7:30 pm"
              onGenerate={() => onNavigateToRecetario("suggestions")}
            />
          </div>
        </section>

        {/* ─── Hogar hoy ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Home size={18} className="text-blue-700" />
              <h2 className="font-semibold text-[15px] text-[var(--ink)]">
                Hogar hoy
              </h2>
            </div>
            <button
              onClick={onNavigateToHogar}
              className="text-blue-700 text-[13px] font-medium flex items-center gap-0.5"
            >
              Ver todo <ChevronRight size={14} />
            </button>
          </div>

          {employeeSummaries.length === 0 ? (
            <div className="p-6 text-center">
              <Users size={32} className="mx-auto text-stone-300 mb-2" />
              <p className="text-[var(--ink-soft)] text-sm">
                No hay empleados configurados
              </p>
              <button
                onClick={onNavigateToHogar}
                className="mt-2 text-blue-700 text-sm font-medium"
              >
                Configurar hogar
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {employeeSummaries.map((s) => {
                const nextTask = s.tasks
                  .filter((t) => t.status === "pendiente")
                  .slice(0, 1)[0];
                return (
                  <button
                    key={s.employee.id}
                    onClick={() => setSelectedEmployee(s)}
                    className="p-4 w-full text-left active:bg-stone-50 transition-colors flex items-start gap-3"
                  >
                    <EmployeeAvatar
                      name={s.employee.name}
                      zone={s.employee.zone}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-medium text-[var(--ink)] truncate">
                          {s.employee.name}
                        </p>
                        {s.isCheckedIn ? (
                          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{" "}
                            Presente
                          </span>
                        ) : (
                          <span className="bg-stone-100 text-stone-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            Sin registrar
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[var(--ink-soft)] capitalize">
                        {s.employee.zone}
                      </p>
                      {s.totalCount > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all"
                              role="progressbar"
                              aria-valuenow={Math.round(
                                (s.completedCount / s.totalCount) * 100,
                              )}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Progreso de ${s.employee.name}`}
                              style={{
                                width: `${(s.completedCount / s.totalCount) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-stone-500 tabular-nums">
                            {s.completedCount}/{s.totalCount}
                          </span>
                        </div>
                      )}
                      {nextTask && (
                        <div className="flex items-center gap-1.5 mt-2 text-[12px] text-[var(--ink-soft)]">
                          <Clock size={13} className="text-stone-400" />
                          <span className="truncate">
                            Próxima: {nextTask.task_template?.name || "Tarea"}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
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

        {/* ─── Acciones rápidas ──────────────────────────── */}
        <section>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
            Acciones rápidas
          </p>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction
              icon={ShoppingCart}
              label="Mercado"
              color="text-green-700"
              bg="bg-green-50"
              onClick={() => onNavigateToRecetario("market")}
            />
            <QuickAction
              icon={Plus}
              label="Receta"
              color="text-blue-700"
              bg="bg-blue-50"
              onClick={() => onNavigateToRecetario("recipes")}
            />
            <QuickAction
              icon={Lightbulb}
              label="Ideas"
              color="text-purple-700"
              bg="bg-purple-50"
              onClick={() => onNavigateToRecetario("suggestions")}
            />
            <QuickAction
              icon={Briefcase}
              label="Tareas"
              color="text-orange-700"
              bg="bg-orange-50"
              onClick={onNavigateToHogar}
            />
          </div>
        </section>

        {/* ─── Resumen semanal ───────────────────────────── */}
        <section className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            <TrendingUp size={18} className="text-stone-600" />
            <h2 className="font-semibold text-[15px] text-[var(--ink)]">
              Esta semana
            </h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
            <Stat
              value={weeklyStats.mealsCompleted}
              total={weeklyStats.mealsTotal}
              label="Comidas registradas"
              color="text-[var(--accent)]"
            />
            <Stat
              value={weeklyStats.tasksCompleted}
              total={weeklyStats.tasksTotal}
              label="Tareas completadas"
              color="text-blue-700"
            />
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

/* ─── Sub-componentes ─────────────────────────────────────── */

function MealRow({
  type,
  name,
  time,
  onGenerate,
  timesCooked,
  avgRating,
}: {
  type: "breakfast" | "lunch" | "dinner";
  name?: string;
  time: string;
  onGenerate?: () => void;
  timesCooked?: number;
  avgRating?: number | null;
}) {
  const meta = {
    breakfast: {
      Icon: Coffee,
      color: "text-amber-700",
      bg: "bg-amber-50",
      label: "Desayuno",
    },
    lunch: {
      Icon: UtensilsCrossed,
      color: "text-green-700",
      bg: "bg-green-50",
      label: "Almuerzo",
    },
    dinner: {
      Icon: Moon,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      label: "Cena",
    },
  }[type];

  if (!name && type === "dinner" && onGenerate) {
    return (
      <div className="p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
          <Moon size={18} className="text-stone-400" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            Cena
          </p>
          <p className="text-[14px] text-stone-400 italic">Sin definir</p>
        </div>
        <button
          onClick={onGenerate}
          className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1"
        >
          <Sparkles size={12} /> Generar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center gap-3">
      <div
        className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}
      >
        <meta.Icon size={18} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
            {meta.label}
          </p>
          <span className="text-[11px] text-stone-400">·&nbsp; {time}</span>
        </div>
        <p className="text-[14.5px] font-medium text-[var(--ink)] mt-0.5 truncate">
          {name || "Sin definir"}
        </p>
        {name && timesCooked != null && timesCooked > 0 && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-0.5 flex items-center gap-1.5">
            <span>
              Cocinada <strong>{timesCooked}</strong>{" "}
              {timesCooked === 1 ? "vez" : "veces"}
            </span>
            {avgRating != null && (
              <span className="inline-flex items-center gap-0.5">
                <span className="text-stone-300">·</span>
                <Star size={11} className="text-amber-500 fill-amber-500" />
                <strong className="tabular-nums">{avgRating.toFixed(1)}</strong>
              </span>
            )}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-stone-300 flex-shrink-0" />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  color,
  bg,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[var(--border)] rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
    >
      <div
        className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}
      >
        <Icon size={18} className={color} />
      </div>
      <span className="text-[11px] text-[var(--ink)] font-medium">{label}</span>
    </button>
  );
}

function Stat({
  value,
  total,
  label,
  color,
}: {
  value: number;
  total: number;
  label: string;
  color: string;
}) {
  return (
    <div className="p-4 text-center">
      <div
        className={`text-[24px] font-semibold ${color} tracking-tight tabular-nums`}
      >
        {value}
        <span className="text-stone-300 text-[18px]">/{total}</span>
      </div>
      <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{label}</p>
    </div>
  );
}

function EmployeeAvatar({ name, zone }: { name: string; zone?: string }) {
  const colors = {
    interior: "bg-purple-100 text-purple-700",
    exterior: "bg-green-100 text-green-700",
    cocina: "bg-blue-100 text-blue-700",
  };
  const cls =
    colors[zone as keyof typeof colors] ?? "bg-stone-100 text-stone-700";
  return (
    <div
      className={`w-10 h-10 rounded-full ${cls} flex items-center justify-center font-semibold text-[14px] flex-shrink-0`}
    >
      {name.charAt(0)}
    </div>
  );
}
