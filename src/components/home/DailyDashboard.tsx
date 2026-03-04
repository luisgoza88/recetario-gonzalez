"use client";

import { useState } from "react";
import {
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  X,
} from "lucide-react";
import { ScheduledTask, HomeEmployee, Space } from "@/types";
import {
  useDailyTasks,
  useDailyCheckins,
  useToggleDailyTask,
  useStartTask,
} from "@/lib/hooks/useDailyDashboard";
import TaskCard from "./TaskCard";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import Spinner from "@/components/ui/Spinner";

interface DailyDashboardProps {
  householdId: string;
  employees: HomeEmployee[];
  spaces: Space[];
  onClose: () => void;
  onTaskComplete: () => void;
  onOpenInspection: (task: ScheduledTask) => void;
  onOpenRating: (task: ScheduledTask) => void;
}

interface TasksByEmployee {
  employee: HomeEmployee | null;
  tasks: ScheduledTask[];
  totalMinutes: number;
  completedMinutes: number;
  isCheckedIn: boolean;
  checkInTime?: string;
}

export default function DailyDashboard({
  householdId,
  employees,
  spaces,
  onClose,
  onTaskComplete,
  onOpenInspection,
  onOpenRating,
}: DailyDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "completed"
  >("all");

  const dateStr = selectedDate.toISOString().split("T")[0];

  // TanStack Query hooks
  const { data: tasks = [], isLoading: loading } = useDailyTasks(
    householdId,
    dateStr,
  );
  const { data: employeeCheckins = {} } = useDailyCheckins(
    householdId,
    dateStr,
  );
  const toggleTaskMutation = useToggleDailyTask();
  const startTaskMutation = useStartTask();
  useEscapeKey(onClose);

  const toggleTaskStatus = (task: ScheduledTask) => {
    toggleTaskMutation.mutate(
      { task, householdId },
      {
        onSuccess: () => onTaskComplete(),
      },
    );
  };

  const startTask = (task: ScheduledTask) => {
    startTaskMutation.mutate({ task, householdId });
  };

  // Group tasks by employee
  const tasksByEmployee: TasksByEmployee[] = employees.map((emp) => {
    const empTasks = tasks.filter((t) => t.employee_id === emp.id);
    const filtered =
      filterStatus === "all"
        ? empTasks
        : empTasks.filter((t) =>
            filterStatus === "completed"
              ? t.status === "completada"
              : t.status !== "completada",
          );

    return {
      employee: emp,
      tasks: filtered,
      totalMinutes: empTasks.reduce(
        (sum, t) => sum + (t.task_template?.estimated_minutes || 0),
        0,
      ),
      completedMinutes: empTasks
        .filter((t) => t.status === "completada")
        .reduce((sum, t) => sum + (t.task_template?.estimated_minutes || 0), 0),
      isCheckedIn: employeeCheckins[emp.id]?.isCheckedIn || false,
      checkInTime: employeeCheckins[emp.id]?.time,
    };
  });

  const unassignedTasks = tasks.filter((t) => !t.employee_id);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    return date.toLocaleDateString("es-ES", options);
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completada").length;
  const progressPercent =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <span className="font-semibold">Dashboard del Día</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date Navigation */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <p
                  className={`font-semibold capitalize ${isToday ? "text-blue-600" : ""}`}
                >
                  {isToday ? "📅 Hoy" : formatDate(selectedDate)}
                </p>
                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Volver a hoy
                  </button>
                )}
              </div>

              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-gray-200 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} />
                <span className="font-semibold">Progreso del Día</span>
              </div>
              <span className="text-2xl font-bold">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500"
                role="progressbar"
                aria-valuenow={Math.round(progressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso del día"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-blue-100">
              <span>{completedTasks} completadas</span>
              <span>{totalTasks - completedTasks} pendientes</span>
            </div>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {[
              { value: "all", label: "Todas" },
              { value: "pending", label: "Pendientes" },
              { value: "completed", label: "Completadas" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value as typeof filterStatus)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === f.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tasks by Employee */}
          {loading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Spinner size="lg" color="blue" className="mx-auto" />
            </div>
          ) : tasksByEmployee.length === 0 && unassignedTasks.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-600">
                No hay tareas programadas para este día
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksByEmployee.map(
                ({
                  employee,
                  tasks: empTasks,
                  totalMinutes,
                  completedMinutes,
                  isCheckedIn,
                  checkInTime,
                }) => {
                  if (!employee) return null;
                  const isExpanded =
                    expandedEmployee === employee.id ||
                    expandedEmployee === null;
                  const empProgress =
                    totalMinutes > 0
                      ? (completedMinutes / totalMinutes) * 100
                      : 0;

                  return (
                    <div
                      key={employee.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden"
                    >
                      {/* Employee Header */}
                      <button
                        onClick={() =>
                          setExpandedEmployee(
                            expandedEmployee === employee.id
                              ? null
                              : employee.id,
                          )
                        }
                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            employee.zone === "interior"
                              ? "bg-blue-100"
                              : employee.zone === "exterior"
                                ? "bg-green-100"
                                : "bg-purple-100"
                          }`}
                        >
                          <User
                            size={24}
                            className={
                              employee.zone === "interior"
                                ? "text-blue-600"
                                : employee.zone === "exterior"
                                  ? "text-green-600"
                                  : "text-purple-600"
                            }
                          />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {employee.name}
                            </span>
                            {isCheckedIn && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {empTasks.length} tareas •{" "}
                            {Math.round((totalMinutes / 60) * 10) / 10}h
                            estimadas
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(empProgress)}%
                          </div>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all"
                              role="progressbar"
                              aria-valuenow={Math.round(empProgress)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Progreso de ${employee.name}`}
                              style={{ width: `${empProgress}%` }}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Employee Tasks */}
                      {isExpanded && empTasks.length > 0 && (
                        <div className="border-t divide-y">
                          {empTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onToggle={() => toggleTaskStatus(task)}
                              onStart={() => startTask(task)}
                              onInspect={() => onOpenInspection(task)}
                              onRate={() => onOpenRating(task)}
                            />
                          ))}
                        </div>
                      )}

                      {isExpanded && empTasks.length === 0 && (
                        <div className="p-4 text-center text-gray-500 border-t">
                          No hay tareas{" "}
                          {filterStatus === "pending"
                            ? "pendientes"
                            : filterStatus === "completed"
                              ? "completadas"
                              : ""}{" "}
                          para {employee.name}
                        </div>
                      )}
                    </div>
                  );
                },
              )}

              {/* Unassigned Tasks */}
              {unassignedTasks.length > 0 && (
                <div className="bg-amber-50 rounded-xl shadow-sm overflow-hidden border border-amber-200">
                  <div className="p-4 flex items-center gap-3 border-b border-amber-200">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-amber-800">
                        Sin Asignar
                      </span>
                      <p className="text-sm text-amber-600">
                        {unassignedTasks.length} tareas sin empleado
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-amber-200">
                    {unassignedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTaskStatus(task)}
                        onStart={() => startTask(task)}
                        onInspect={() => onOpenInspection(task)}
                        onRate={() => onOpenRating(task)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
