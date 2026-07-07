"use client";

import { useMemo } from "react";
import { useRecipes, useMarketItems, useSuggestionsCount } from "./useAppData";
import {
  useTodayMenu,
  useTodayTasks,
  useTodayAlerts,
  useGreeting,
} from "./useTodayDashboard";
import { useProactiveAlerts } from "./useProactiveAlerts";
import { useAppStore } from "@/lib/stores/useAppStore";
import type { ModalName } from "@/lib/stores/useAppStore";
import {
  Sparkles,
  ShoppingCart,
  UtensilsCrossed,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChefHat,
  Package,
  Users,
  Home,
  Calendar,
  Zap,
  TrendingUp,
  Coffee,
  Sun,
  Moon,
} from "lucide-react";
import React from "react";

type ActiveSection = "hoy" | "recetario" | "hogar" | "ajustes";

export interface SmartAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  variant: "ai" | "alert" | "success" | "default";
  priority: number; // Higher = more important, shown first
  onClick: () => void;
  badge?: number;
}

interface SmartFABContextResult {
  actions: SmartAction[];
  contextInfo: {
    timeOfDay: "morning" | "afternoon" | "evening";
    greeting: string;
    hour: number;
    hasUrgentItems: boolean;
    completionRate: number;
  };
  isLoading: boolean;
}

export function useSmartFABContext(
  activeSection: ActiveSection,
): SmartFABContextResult {
  // Store actions (replaces orphan CustomEvent dispatches)
  const navigateTo = useAppStore((state) => state.navigateTo);
  const storeOpenModal = useAppStore((state) => state.openModal);

  // Get all contextual data
  const { menu, loading: menuLoading } = useTodayMenu();
  const { summaries: employeeSummaries, loading: tasksLoading } =
    useTodayTasks();
  const { pendingSuggestions, lowSupplies } = useTodayAlerts();
  const { greeting, timeOfDay, hour } = useGreeting();
  const { alerts } = useProactiveAlerts({ autoGenerateOnMount: true });

  const { data: recipes = [] } = useRecipes();
  const { data: marketItems = [] } = useMarketItems();
  const { data: suggestionsCount = 0 } = useSuggestionsCount();

  // Calculate derived metrics
  const inventoryMetrics = useMemo(() => {
    const lowStock = marketItems.filter(
      (item) =>
        item.currentNumber !== undefined &&
        item.currentNumber <= 1 &&
        item.currentNumber > 0,
    );
    const outOfStock = marketItems.filter(
      (item) => item.currentNumber !== undefined && item.currentNumber === 0,
    );
    const needsShopping = marketItems.filter((item) => !item.checked).length;

    return {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      needsShoppingCount: needsShopping,
      criticalItems: outOfStock.slice(0, 3).map((i) => i.name),
    };
  }, [marketItems]);

  const taskMetrics = useMemo(() => {
    const totalTasks = employeeSummaries.reduce(
      (sum, e) => sum + e.totalCount,
      0,
    );
    const completedTasks = employeeSummaries.reduce(
      (sum, e) => sum + e.completedCount,
      0,
    );
    const pendingTasks = totalTasks - completedTasks;
    const checkedInEmployees = employeeSummaries.filter(
      (e) => e.isCheckedIn,
    ).length;
    const totalEmployees = employeeSummaries.length;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      checkedInEmployees,
      totalEmployees,
      hasUncheckedEmployees:
        checkedInEmployees < totalEmployees && totalEmployees > 0,
    };
  }, [employeeSummaries]);

  // Generate smart actions based on context
  const actions = useMemo((): SmartAction[] => {
    const smartActions: SmartAction[] = [];

    // ========================================
    // SECTION: HOY (Today Dashboard)
    // ========================================
    if (activeSection === "hoy") {
      // Time-based meal suggestions
      if (hour >= 6 && hour < 10 && menu?.breakfast) {
        smartActions.push({
          id: "prepare-breakfast",
          icon: React.createElement(Coffee, { size: 18 }),
          label: "Desayuno",
          sublabel: menu.breakfast.name,
          variant: "ai",
          priority: 90,
          onClick: () => navigateTo("recetario", "calendar"),
        });
      }

      if (hour >= 10 && hour < 13 && menu?.lunch) {
        const prepTime = menu.lunch.prep_time || 30;
        smartActions.push({
          id: "prepare-lunch",
          icon: React.createElement(ChefHat, { size: 18 }),
          label: `Preparar almuerzo`,
          sublabel: `${menu.lunch.name} (${prepTime} min)`,
          variant: "ai",
          priority: 95,
          onClick: () => navigateTo("recetario", "calendar"),
        });
      }

      if (hour >= 16 && hour < 19 && menu?.dinner) {
        smartActions.push({
          id: "prepare-dinner",
          icon: React.createElement(Moon, { size: 18 }),
          label: "Preparar cena",
          sublabel: menu.dinner.name,
          variant: "ai",
          priority: 95,
          onClick: () => navigateTo("recetario", "calendar"),
        });
      }

      // Task status
      if (taskMetrics.pendingTasks > 0) {
        smartActions.push({
          id: "pending-tasks",
          icon: React.createElement(Clock, { size: 18 }),
          label: `${taskMetrics.pendingTasks} tareas pendientes`,
          sublabel: `${taskMetrics.completionRate}% completado`,
          variant: taskMetrics.completionRate < 50 ? "alert" : "default",
          priority: taskMetrics.completionRate < 30 ? 85 : 60,
          badge: taskMetrics.pendingTasks,
          onClick: () => navigateTo("hogar"),
        });
      }

      // Employee check-in status
      if (taskMetrics.hasUncheckedEmployees && hour >= 7 && hour < 12) {
        smartActions.push({
          id: "employee-checkin",
          icon: React.createElement(Users, { size: 18 }),
          label: "Check-in pendiente",
          sublabel: `${taskMetrics.checkedInEmployees}/${taskMetrics.totalEmployees} empleados`,
          variant: "alert",
          priority: 80,
          onClick: () => navigateTo("hogar"),
        });
      }

      // Evening summary
      if (hour >= 19 && hour < 22 && taskMetrics.totalTasks > 0) {
        smartActions.push({
          id: "daily-summary",
          icon: React.createElement(TrendingUp, { size: 18 }),
          label: "Resumen del día",
          sublabel: `${taskMetrics.completionRate}% completado`,
          variant: taskMetrics.completionRate >= 80 ? "success" : "default",
          priority: 70,
          onClick: () => navigateTo("hogar"),
        });
      }

      // Quick navigation actions
      smartActions.push({
        id: "view-menu",
        icon: React.createElement(Calendar, { size: 18 }),
        label: "Ver menú completo",
        variant: "default",
        priority: 40,
        onClick: () => navigateTo("recetario", "calendar"),
      });

      smartActions.push({
        id: "go-market",
        icon: React.createElement(ShoppingCart, { size: 18 }),
        label: "Lista de compras",
        variant: "default",
        priority: 35,
        onClick: () => navigateTo("recetario", "market"),
      });
    }

    // ========================================
    // SECTION: RECETARIO
    // ========================================
    if (activeSection === "recetario") {
      // AI Suggestions (always top if available)
      if (suggestionsCount > 0) {
        smartActions.push({
          id: "ai-suggestions",
          icon: React.createElement(Sparkles, { size: 18 }),
          label: "Sugerencias IA",
          sublabel: `${suggestionsCount} pendientes`,
          variant: "ai",
          priority: 100,
          badge: suggestionsCount,
          onClick: () => navigateTo("recetario", "suggestions"),
        });
      } else {
        smartActions.push({
          id: "generate-suggestion",
          icon: React.createElement(Sparkles, { size: 18 }),
          label: "Generar sugerencia IA",
          sublabel: "Receta con lo que tengas",
          variant: "ai",
          priority: 90,
          onClick: () => navigateTo("recetario", "suggestions"),
        });
      }

      // Inventory alerts
      if (inventoryMetrics.outOfStockCount > 0) {
        smartActions.push({
          id: "out-of-stock",
          icon: React.createElement(AlertTriangle, { size: 18 }),
          label: "Items agotados",
          sublabel: inventoryMetrics.criticalItems.join(", "),
          variant: "alert",
          priority: 85,
          badge: inventoryMetrics.outOfStockCount,
          onClick: () => navigateTo("recetario", "market"),
        });
      } else if (inventoryMetrics.lowStockCount > 0) {
        smartActions.push({
          id: "low-stock",
          icon: React.createElement(Package, { size: 18 }),
          label: "Stock bajo",
          sublabel: `${inventoryMetrics.lowStockCount} items`,
          variant: "default",
          priority: 60,
          badge: inventoryMetrics.lowStockCount,
          onClick: () => navigateTo("recetario", "market"),
        });
      }

      // Recipe actions
      smartActions.push({
        id: "new-recipe",
        icon: React.createElement(ChefHat, { size: 18 }),
        label: "Nueva receta",
        variant: "default",
        priority: 50,
        onClick: () => storeOpenModal("newRecipe"),
      });

      smartActions.push({
        id: "add-to-market",
        icon: React.createElement(ShoppingCart, { size: 18 }),
        label: "Agregar al mercado",
        variant: "default",
        priority: 45,
        onClick: () => storeOpenModal("addMarketItem"),
      });

      // Meal feedback
      if (hour >= 12 && hour < 15) {
        smartActions.push({
          id: "lunch-feedback",
          icon: React.createElement(UtensilsCrossed, { size: 18 }),
          label: "Registrar almuerzo",
          variant: "default",
          priority: 55,
          onClick: () => storeOpenModal("mealFeedback"),
        });
      } else if (hour >= 19 && hour < 22) {
        smartActions.push({
          id: "dinner-feedback",
          icon: React.createElement(UtensilsCrossed, { size: 18 }),
          label: "Registrar cena",
          variant: "default",
          priority: 55,
          onClick: () => storeOpenModal("mealFeedback"),
        });
      }
    }

    // ========================================
    // SECTION: HOGAR
    // ========================================
    if (activeSection === "hogar") {
      // Smart routine based on time
      if (hour >= 7 && hour < 12) {
        smartActions.push({
          id: "morning-routine",
          icon: React.createElement(Sun, { size: 18 }),
          label: "Rutina matutina",
          sublabel: "Tareas de la mañana",
          variant: "ai",
          priority: 95,
          onClick: () => storeOpenModal("routinePanel"),
        });
      } else if (hour >= 14 && hour < 18) {
        smartActions.push({
          id: "afternoon-routine",
          icon: React.createElement(Zap, { size: 18 }),
          label: "Rutina rápida",
          sublabel: "Limpieza express",
          variant: "ai",
          priority: 95,
          onClick: () => storeOpenModal("routinePanel"),
        });
      }

      // Task completion status
      if (taskMetrics.completionRate >= 80 && taskMetrics.totalTasks > 0) {
        smartActions.push({
          id: "tasks-almost-done",
          icon: React.createElement(CheckCircle, { size: 18 }),
          label: "Casi terminamos",
          sublabel: `${taskMetrics.completedTasks}/${taskMetrics.totalTasks} tareas`,
          variant: "success",
          priority: 80,
          onClick: () => {}, // Just informative
        });
      } else if (taskMetrics.pendingTasks > 5) {
        smartActions.push({
          id: "many-pending",
          icon: React.createElement(AlertTriangle, { size: 18 }),
          label: `${taskMetrics.pendingTasks} tareas pendientes`,
          sublabel: "Ver detalle",
          variant: "alert",
          priority: 85,
          badge: taskMetrics.pendingTasks,
          onClick: () => storeOpenModal("taskModal"),
        });
      }

      // Management actions
      smartActions.push({
        id: "new-space",
        icon: React.createElement(Home, { size: 18 }),
        label: "Nuevo espacio",
        variant: "default",
        priority: 50,
        onClick: () => storeOpenModal("spacesPanel"),
      });

      smartActions.push({
        id: "new-employee",
        icon: React.createElement(Users, { size: 18 }),
        label: "Gestionar empleados",
        variant: "default",
        priority: 45,
        onClick: () => storeOpenModal("employeesPanel"),
      });

      smartActions.push({
        id: "new-task",
        icon: React.createElement(Clock, { size: 18 }),
        label: "Nueva tarea",
        variant: "default",
        priority: 40,
        onClick: () => storeOpenModal("taskModal"),
      });
    }

    // ========================================
    // CROSS-SECTION: Proactive Alerts (unified — Alert type from useProactiveAlerts)
    // ========================================
    alerts.slice(0, 2).forEach((alert) => {
      const isCritical = alert.severity === "critical";
      smartActions.push({
        id: `alert-${alert.id}`,
        icon: isCritical
          ? React.createElement(AlertTriangle, { size: 18 })
          : React.createElement(Sparkles, { size: 18 }),
        label:
          alert.title.length > 25
            ? alert.title.substring(0, 25) + "..."
            : alert.title,
        variant: isCritical ? "alert" : "ai",
        priority: isCritical ? 98 : 75,
        onClick: () => {
          if (alert.action) {
            const payload = alert.action.payload as
              { tab?: string; section?: string } | undefined;
            if (payload?.section) navigateTo(payload.section, payload.tab);
            else if (payload?.tab) navigateTo("recetario", payload.tab);
          }
        },
      });
    });

    // Sort by priority (highest first) and take top 5
    return smartActions.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [
    activeSection,
    hour,
    menu,
    taskMetrics,
    inventoryMetrics,
    suggestionsCount,
    alerts,
    navigateTo,
    storeOpenModal,
  ]);

  const isLoading = menuLoading || tasksLoading;

  return {
    actions,
    contextInfo: {
      timeOfDay,
      greeting,
      hour,
      hasUrgentItems:
        inventoryMetrics.outOfStockCount > 0 || taskMetrics.pendingTasks > 5,
      completionRate: taskMetrics.completionRate,
    },
    isLoading,
  };
}
