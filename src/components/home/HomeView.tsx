"use client";

import { useMemo, useState } from "react";
import {
  Home,
  Sparkles,
  BarChart,
  Camera,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  MoreVertical,
  User,
  Calendar,
} from "lucide-react";
import {
  useHousehold,
  useHouseholdData,
  useToggleTaskStatus,
  useRefreshHomeData,
} from "@/lib/hooks/useHomeData";
import { ScheduledTask, HomeEmployee, Space } from "@/types";
import HomeModals, { type ActiveModal } from "./HomeModals";
import HomeAnalyticsSummary from "./HomeAnalyticsSummary";
import SmartAlerts from "./SmartAlerts";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface HomeViewProps {
  initialHouseholdId?: string;
}

type HomeTab = "hoy" | "semana" | "empleados" | "espacios";

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
function spaceName(space: Space): string {
  return space.custom_name || space.space_type?.name || "Espacio";
}

function spaceIcon(space: Space): string {
  return space.space_type?.icon || (space.category === "exterior" ? "🌳" : "🏠");
}

function avatarColor(zone: HomeEmployee["zone"]): string {
  switch (zone) {
    case "exterior":
      return "bg-green-100 text-green-700";
    case "ambos":
      return "bg-purple-100 text-purple-700";
    case "interior":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function zoneLabel(zone: HomeEmployee["zone"]): string {
  switch (zone) {
    case "exterior":
      return "Exterior";
    case "ambos":
      return "Interior y exterior";
    case "interior":
    default:
      return "Interior";
  }
}

export default function HomeView({ initialHouseholdId }: HomeViewProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: "none" });
  const [tab, setTab] = useState<HomeTab>("hoy");

  const closeModal = () => setActiveModal({ type: "none" });
  const openModal = (modal: ActiveModal) => setActiveModal(modal);

  // Data fetching via TanStack Query
  const { data: household, isLoading: householdLoading } = useHousehold();
  const {
    spaces,
    employees,
    todayTasks,
    pendingTasks,
    isLoading: dataLoading,
  } = useHouseholdData(household?.id);
  const toggleTask = useToggleTaskStatus();
  const refreshData = useRefreshHomeData(household?.id);

  const loading =
    householdLoading || (!!household?.setup_completed && dataLoading);

  // Derived data
  const interiorSpaces = useMemo(
    () => spaces.filter((s) => s.category === "interior"),
    [spaces],
  );
  const exteriorSpaces = useMemo(
    () => spaces.filter((s) => s.category === "exterior"),
    [spaces],
  );

  const completedToday = todayTasks.filter(
    (t) => t.status === "completada",
  ).length;
  const inProgressToday = todayTasks.filter(
    (t) => t.status === "en_progreso",
  ).length;
  const totalToday = todayTasks.length;
  const pendingToday = Math.max(
    totalToday - completedToday - inProgressToday,
    0,
  );
  const progressPercent =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Per-employee stats derived from today's scheduled tasks
  const employeeStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const task of todayTasks) {
      if (!task.employee_id) continue;
      const entry = map.get(task.employee_id) || { total: 0, completed: 0 };
      entry.total += 1;
      if (task.status === "completada") entry.completed += 1;
      map.set(task.employee_id, entry);
    }
    return map;
  }, [todayTasks]);

  // Tasks per space (active scheduled tasks today, by space)
  const tasksPerSpace = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of todayTasks) {
      if (!task.space_id) continue;
      if (task.status === "completada" || task.status === "omitida") continue;
      map.set(task.space_id, (map.get(task.space_id) || 0) + 1);
    }
    return map;
  }, [todayTasks]);

  // Upcoming tasks: not completed, ordered by status (en_progreso first)
  const upcomingTasks = useMemo(() => {
    return [...todayTasks]
      .filter((t) => t.status !== "completada" && t.status !== "omitida")
      .sort((a, b) => {
        const order = (s: ScheduledTask["status"]) =>
          s === "en_progreso" ? 0 : 1;
        return order(a.status) - order(b.status);
      })
      .slice(0, 6);
  }, [todayTasks]);

  const handleToggleTask = (task: ScheduledTask) => {
    toggleTask.mutate({ task });
  };

  const startInspection = () => {
    if (todayTasks.length > 0) {
      openModal({ type: "inspection", task: todayTasks[0] });
    } else {
      openModal({ type: "scheduleGenerator" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" color="blue" className="mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!household || !household.setup_completed) {
    if (activeModal.type !== "setup") {
      return (
        <div className="p-4 max-w-lg mx-auto text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Configura tu Hogar
          </h2>
          <p className="text-gray-600 mb-6">
            Aún no has configurado tu hogar. Inicia el asistente para comenzar.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => openModal({ type: "setup" })}
          >
            Comenzar Configuración
          </Button>
        </div>
      );
    }
  }

  return (
    <div className="min-h-full bg-[var(--bg)] pb-24">
      {/* Header */}
      {household && (
        <header className="px-5 pt-4 pb-3 bg-white border-b border-[var(--border)]">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold tracking-tight text-[var(--ink)] flex items-center gap-2">
                <Home size={22} className="text-blue-700" />
                {household.name}
              </h1>
              <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
                {employees.length > 0
                  ? `${employees.length} ${employees.length === 1 ? "persona" : "personas"}`
                  : "Hogar"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => openModal({ type: "monthlyReport" })}
                className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
                title="Reporte mensual"
                aria-label="Ver reporte mensual"
              >
                <BarChart size={15} className="text-stone-600" />
              </button>
              <button
                onClick={() => openModal({ type: "scheduleGenerator" })}
                className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center hover:bg-blue-800 transition-colors"
                title="Generar horario"
                aria-label="Generar horario"
              >
                <Sparkles size={15} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Tab bar */}
      <div className="px-5 bg-white border-b border-[var(--border)]">
        <div className="flex gap-4">
          {(
            [
              { id: "hoy", label: "Hoy" },
              { id: "semana", label: "Semana" },
              { id: "empleados", label: "Empleados" },
              { id: "espacios", label: "Espacios" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative py-3 text-[13px] font-medium transition-colors ${
                tab === t.id ? "text-[var(--ink)]" : "text-stone-400"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[var(--ink)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Smart Alerts (always visible at top of content) */}
      {household && (
        <div className="px-5 pt-4">
          <SmartAlerts
            householdId={household.id}
            onNavigateToDate={() => openModal({ type: "weeklyCalendar" })}
          />
        </div>
      )}

      {/* ── TAB: HOY ──────────────────────────────────────────────── */}
      {tab === "hoy" && (
        <div className="px-5 py-4 space-y-3">
          {/* Inspection CTA */}
          <button
            onClick={startInspection}
            className="w-full bg-gradient-to-br from-purple-600 to-violet-700 text-white rounded-2xl p-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13.5px] font-semibold">
                Inspeccionar un espacio
              </p>
              <p className="text-[11px] text-white/70">
                IA detecta pendientes con tu cámara
              </p>
            </div>
            <ChevronRight size={16} className="text-white/70" />
          </button>

          {/* Progress card */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  Progreso del día
                </p>
                <p className="text-[24px] font-semibold tracking-tight text-[var(--ink)] mt-0.5 tabular-nums">
                  {completedToday}
                  <span className="text-stone-300 text-[18px]">
                    /{totalToday} tareas
                  </span>
                </p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 relative flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#1d4ed8 ${(progressPercent / 100) * 360}deg, transparent 0)`,
                    mask: "radial-gradient(circle, transparent 60%, black 60%)",
                    WebkitMask:
                      "radial-gradient(circle, transparent 60%, black 60%)",
                  }}
                />
                <span className="text-[12px] font-bold text-blue-700 tabular-nums">
                  {progressPercent}%
                </span>
              </div>
            </div>
            <div
              className="h-2 bg-stone-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de tareas de hoy"
            >
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-green-50 rounded-lg px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">
                  Hechas
                </p>
                <p className="text-[18px] font-semibold text-green-700 tabular-nums">
                  {completedToday}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                  Curso
                </p>
                <p className="text-[18px] font-semibold text-amber-700 tabular-nums">
                  {inProgressToday}
                </p>
              </div>
              <div className="bg-stone-50 rounded-lg px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                  Pend
                </p>
                <p className="text-[18px] font-semibold text-stone-600 tabular-nums">
                  {pendingToday}
                </p>
              </div>
            </div>
          </div>

          {/* Empleados hoy */}
          {employees.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold px-1 pt-2">
                Empleados hoy
              </p>
              <div className="space-y-2">
                {employees.map((emp) => {
                  const stats = employeeStats.get(emp.id);
                  return (
                    <div
                      key={emp.id}
                      className="bg-white rounded-2xl border border-[var(--border)] p-3 flex items-start gap-3"
                    >
                      <button
                        onClick={() =>
                          openModal({ type: "employeeDetail", employee: emp })
                        }
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[14px] shrink-0 ${avatarColor(emp.zone)}`}
                        aria-label={`Ver ${emp.name}`}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() =>
                              openModal({
                                type: "employeeDetail",
                                employee: emp,
                              })
                            }
                            className="text-[14px] font-medium text-[var(--ink)] truncate text-left"
                          >
                            {emp.name}
                          </button>
                          <button
                            onClick={() => openModal({ type: "checkIn" })}
                            className="bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 rounded-full font-medium hover:bg-stone-200 transition-colors shrink-0"
                          >
                            Check-in
                          </button>
                        </div>
                        <p className="text-[11.5px] text-[var(--ink-soft)]">
                          {zoneLabel(emp.zone)}
                        </p>
                        {stats && stats.total > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-500 h-full"
                                style={{
                                  width: `${(stats.completed / stats.total) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-stone-500 tabular-nums">
                              {stats.completed}/{stats.total}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Próximas tareas */}
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold px-1 pt-2">
            Próximas tareas
          </p>
          {upcomingTasks.length > 0 ? (
            <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
              {upcomingTasks.map((task) => {
                const name =
                  task.task_template?.name || task.notes || "Tarea";
                const space = task.space
                  ? spaceName(task.space)
                  : "Sin espacio";
                const icon = task.space ? spaceIcon(task.space) : "📋";
                const empName = task.employee?.name || "Sin asignar";
                return (
                  <div
                    key={task.id}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => handleToggleTask(task)}
                      aria-label={
                        task.status === "completada"
                          ? "Marcar como pendiente"
                          : "Marcar como completada"
                      }
                      className="shrink-0"
                    >
                      {task.status === "completada" ? (
                        <CheckCircle2 size={18} className="text-green-600" />
                      ) : task.status === "en_progreso" ? (
                        <Clock size={18} className="text-blue-600" />
                      ) : (
                        <Circle size={18} className="text-stone-300" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--ink)] truncate">
                        {name}
                      </p>
                      <p className="text-[11.5px] text-[var(--ink-soft)] flex items-center gap-1.5 mt-0.5">
                        <span>{icon}</span> {space} · {empName}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        openModal({ type: "inspection", task })
                      }
                      aria-label="Más opciones"
                      className="shrink-0"
                    >
                      <MoreVertical size={14} className="text-stone-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6 text-center">
              <p className="text-[13px] text-[var(--ink-soft)] mb-3">
                No hay tareas programadas para hoy.
              </p>
              <button
                onClick={() => openModal({ type: "scheduleGenerator" })}
                className="inline-flex items-center gap-2 bg-blue-700 text-white text-[13px] font-medium px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors"
              >
                <Sparkles size={14} /> Generar itinerario
              </button>
            </div>
          )}

          {pendingTasks > 0 && (
            <button
              onClick={() => openModal({ type: "weeklyCalendar" })}
              className="w-full text-[12px] font-medium text-blue-700 py-2"
            >
              {pendingTasks} tarea{pendingTasks > 1 ? "s" : ""} pendiente
              {pendingTasks > 1 ? "s" : ""} en total · Ver calendario
            </button>
          )}
        </div>
      )}

      {/* ── TAB: SEMANA ──────────────────────────────────────────── */}
      {tab === "semana" && (
        <div className="px-5 py-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <p className="font-semibold text-[14px] text-[var(--ink)] flex items-center gap-2">
                <Calendar size={16} className="text-blue-700" />
                Esta semana
              </p>
              <button
                onClick={() => openModal({ type: "weeklyCalendar" })}
                className="text-blue-700 text-[12px] font-medium"
              >
                Ver calendario
              </button>
            </div>
            <button
              onClick={() => openModal({ type: "weeklyCalendar" })}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors text-left"
            >
              <span className="text-[13px] text-[var(--ink-soft)]">
                Vista semanal y mensual de tareas
              </span>
              <ChevronRight size={18} className="text-stone-400" />
            </button>
          </div>

          {/* Weekly analytics summary (preserved component) */}
          {household && (
            <HomeAnalyticsSummary
              householdId={household.id}
              employees={employees}
              onViewDetails={() => openModal({ type: "monthlyReport" })}
              compact
            />
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openModal({ type: "dailyDashboard" })}
              className="bg-white rounded-2xl border border-[var(--border)] p-3.5 text-left hover:bg-stone-50 transition-colors"
            >
              <Calendar size={18} className="text-blue-700 mb-1.5" />
              <p className="text-[13.5px] font-semibold text-[var(--ink)]">
                Dashboard
              </p>
              <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                Vista detallada del día
              </p>
            </button>
            <button
              onClick={() => openModal({ type: "scheduleDashboard" })}
              className="bg-white rounded-2xl border border-[var(--border)] p-3.5 text-left hover:bg-stone-50 transition-colors"
            >
              <Clock size={18} className="text-blue-700 mb-1.5" />
              <p className="text-[13.5px] font-semibold text-[var(--ink)]">
                Horarios
              </p>
              <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                Cronograma del personal
              </p>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: EMPLEADOS ───────────────────────────────────────── */}
      {tab === "empleados" && (
        <div className="px-5 py-4 space-y-3">
          <button
            onClick={() => openModal({ type: "employees" })}
            className="w-full bg-white rounded-2xl border border-[var(--border)] p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
          >
            <span className="text-[13.5px] font-semibold text-[var(--ink)] flex items-center gap-2">
              <User size={16} className="text-blue-700" />
              Gestionar empleados
            </span>
            <Plus size={18} className="text-blue-700" />
          </button>

          {employees.length > 0 ? (
            employees.map((emp) => {
              const stats = employeeStats.get(emp.id);
              const completed = stats?.completed ?? 0;
              const total = stats?.total ?? 0;
              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden"
                >
                  <button
                    onClick={() =>
                      openModal({ type: "employeeDetail", employee: emp })
                    }
                    className="w-full p-4 flex items-start gap-3 text-left hover:bg-stone-50 transition-colors"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center font-semibold text-[18px] shrink-0 ${avatarColor(emp.zone)}`}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--ink)]">
                        {emp.name}
                      </p>
                      <p className="text-[12px] text-[var(--ink-soft)]">
                        {zoneLabel(emp.zone)}
                        {total > 0 ? ` · ${total} tareas hoy` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
                          {emp.work_days?.length || 0} días/sem
                        </span>
                        {emp.hours_per_day ? (
                          <span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-stone-600 font-semibold tabular-nums">
                            {emp.hours_per_day}h/día
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-stone-400 shrink-0 mt-1"
                    />
                  </button>
                  <div className="border-t border-[var(--border)] grid grid-cols-3 divide-x divide-[var(--border)]">
                    <div className="py-2.5 text-center">
                      <p className="text-[16px] font-semibold text-green-700 tabular-nums">
                        {completed}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-stone-500">
                        Hechas
                      </p>
                    </div>
                    <div className="py-2.5 text-center">
                      <p className="text-[16px] font-semibold text-amber-700 tabular-nums">
                        {Math.max(total - completed, 0)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-stone-500">
                        Pend
                      </p>
                    </div>
                    <div className="py-2.5 text-center">
                      <p className="text-[16px] font-semibold text-blue-700 tabular-nums">
                        {total > 0
                          ? `${Math.round((completed / total) * 100)}%`
                          : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-stone-500">
                        Progreso
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6 text-center">
              <User size={28} className="text-stone-300 mx-auto mb-2" />
              <p className="text-[13px] text-[var(--ink-soft)] mb-3">
                Aún no hay empleados registrados.
              </p>
              <button
                onClick={() => openModal({ type: "employees" })}
                className="inline-flex items-center gap-2 bg-blue-700 text-white text-[13px] font-medium px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors"
              >
                <Plus size={14} /> Agregar empleado
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ESPACIOS ────────────────────────────────────────── */}
      {tab === "espacios" && (
        <div className="px-5 py-4 space-y-4">
          {([
            { label: "Interior", list: interiorSpaces, category: "interior" as const },
            { label: "Exterior", list: exteriorSpaces, category: "exterior" as const },
          ]).map((group) => (
            <div key={group.category}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold">
                  {group.label} · {group.list.length}
                </p>
                <button
                  onClick={() =>
                    openModal({ type: "spaces", initialCategory: group.category })
                  }
                  className="text-blue-700 text-[12px] font-medium"
                >
                  Gestionar
                </button>
              </div>
              {group.list.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {group.list.map((space) => {
                    const taskCount = tasksPerSpace.get(space.id) || 0;
                    return (
                      <button
                        key={space.id}
                        onClick={() =>
                          openModal({
                            type: "spaces",
                            initialCategory: group.category,
                          })
                        }
                        className="bg-white rounded-2xl border border-[var(--border)] p-3.5 text-left hover:bg-blue-50 transition-colors active:scale-[0.99]"
                      >
                        <div className="text-[24px] mb-1">
                          {spaceIcon(space)}
                        </div>
                        <p className="text-[13.5px] font-semibold text-[var(--ink)] leading-tight">
                          {spaceName(space)}
                        </p>
                        <p className="text-[11px] text-[var(--ink-soft)] mt-1 tabular-nums">
                          {taskCount} tarea{taskCount === 1 ? "" : "s"} activa
                          {taskCount === 1 ? "" : "s"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  onClick={() =>
                    openModal({ type: "spaces", initialCategory: group.category })
                  }
                  className="w-full bg-white rounded-2xl border border-[var(--border)] border-dashed p-4 text-center hover:bg-stone-50 transition-colors"
                >
                  <Plus size={18} className="text-stone-400 mx-auto mb-1" />
                  <p className="text-[12px] text-[var(--ink-soft)]">
                    Agregar espacio {group.label.toLowerCase()}
                  </p>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {household && (
        <HomeModals
          activeModal={activeModal}
          household={household}
          spaces={spaces}
          employees={employees}
          todayTasks={todayTasks}
          onClose={closeModal}
          onOpenModal={openModal}
          onRefreshData={refreshData}
        />
      )}
    </div>
  );
}
