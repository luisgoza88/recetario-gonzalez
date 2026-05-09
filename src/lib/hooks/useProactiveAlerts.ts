"use client";

/**
 * useProactiveAlerts — Fuente unica de verdad para todas las alertas proactivas.
 *
 * Unifica los 3 sistemas previos:
 *   - src/lib/notifications.ts (checkLowStockAndNotify / checkTomorrowMealAndNotify)
 *   - src/lib/ai-notifications.ts (generateProactiveAlerts)
 *   - src/components/ProactiveAlerts.tsx (queries propias a Supabase)
 *
 * Garantias:
 *   - Una sola serie de queries a Supabase por sesion de verificacion.
 *   - Deduplicacion por hash de contenido (mismo item = misma alerta, no 3 veces).
 *   - Cache de 30 min via localStorage (staleTime).
 *   - Cleanup de intervals en el return del useEffect.
 *   - Sin console.log en produccion — usa logger.ts.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  showNotification,
  canNotify,
  requestNotificationPermission,
} from "@/lib/notifications";
import logger from "@/lib/logger";

// ─── Tipos publicos ────────────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  /** Modulo que genero la alerta */
  source:
    | "inventory"
    | "menu"
    | "tasks"
    | "suggestions"
    | "missing_ingredients";
  createdAt: Date;
  action?: {
    label: string;
    /** Identificador opaco — el componente decide como manejarlo */
    type: string;
    payload?: unknown;
  };
}

// ─── Constantes de cache ───────────────────────────────────────────────────────

const CACHE_KEY = "proactive_alerts_cache";
const DISMISSED_KEY = "proactive_alerts_dismissed";
const STALE_AFTER_MS = 30 * 60 * 1000; // 30 min
const CYCLE_START = new Date(2026, 0, 6); // Lunes 6 de Enero 2026

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Hash determinista de un alert para deduplicacion */
function hashAlert(title: string, body: string, source: string): string {
  const str = `${source}:${title}:${body}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return `alert_${Math.abs(hash).toString(36)}`;
}

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  // Limite de 200 IDs para no crecer indefinidamente
  const trimmed = Array.from(ids).slice(-200);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(trimmed));
}

function isCacheValid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { timestamp } = JSON.parse(raw) as { timestamp: number };
    return Date.now() - timestamp < STALE_AFTER_MS;
  } catch {
    return false;
  }
}

function readCache(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const { alerts } = JSON.parse(raw) as {
      alerts: (Omit<Alert, "createdAt"> & { createdAt: string })[];
    };
    return alerts.map((a) => ({ ...a, createdAt: new Date(a.createdAt) }));
  } catch {
    return [];
  }
}

function writeCache(alerts: Alert[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ timestamp: Date.now(), alerts }),
  );
}

/** Calcular dia del ciclo (0-11) excluyendo domingos */
function getDayOfCycle(date: Date): number {
  if (date.getDay() === 0) return -1; // Domingo

  const diffTime = date.getTime() - CYCLE_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return -2;

  let workingDays = 0;
  const tmp = new Date(CYCLE_START);
  while (tmp <= date) {
    if (tmp.getDay() !== 0) workingDays++;
    tmp.setDate(tmp.getDate() + 1);
  }
  return (workingDays - 1) % 12;
}

// ─── Generadores de alertas ────────────────────────────────────────────────────

async function fetchInventoryAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Buscar items agotados en categorias prioritarias
  const { data: lowItems } = await supabase
    .from("market_items")
    .select("id, name, category, inventory!left(current_number)")
    .in("category", [
      "Proteinas Premium",
      "Proteínas Premium",
      "Lácteos",
      "Vegetales",
    ]);

  const zeroItems = (lowItems || []).filter((item) => {
    const qty =
      (item.inventory as { current_number: number }[] | null)?.[0]
        ?.current_number ?? 0;
    return qty === 0;
  });

  if (zeroItems.length > 0) {
    const names = zeroItems.map((i) => i.name);
    const title = "Despensa con faltantes";
    const body = `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` y ${names.length - 3} mas` : ""}`;
    const severity: AlertSeverity = names.length > 5 ? "critical" : "warning";
    const id = hashAlert(title, body, "inventory");

    alerts.push({
      id,
      severity,
      title,
      body,
      source: "inventory",
      createdAt: new Date(),
      action: {
        label: "Ir al mercado",
        type: "navigate",
        payload: { tab: "market" },
      },
    });
  }

  // Verificar stock bajo (items con < 20% de la cantidad requerida)
  const { data: allItems } = await supabase
    .from("market_items")
    .select("id, name, quantity");

  const { data: inventory } = await supabase
    .from("inventory")
    .select("item_id, current_number");

  if (allItems && inventory) {
    const inventoryMap = new Map(
      inventory.map((i) => [i.item_id, i.current_number ?? 0]),
    );

    const lowStock: string[] = [];
    for (const item of allItems) {
      const current = inventoryMap.get(item.id) ?? 0;
      const match = item.quantity?.match(/[\d.]+/);
      const required = match ? parseFloat(match[0]) : 0;
      if (required > 0 && current > 0 && current < required * 0.2) {
        lowStock.push(item.name);
      }
    }

    if (lowStock.length > 0) {
      const title = `Stock bajo (${lowStock.length} items)`;
      const body = lowStock.slice(0, 3).join(", ");
      const id = hashAlert(title, body, "inventory");
      alerts.push({
        id,
        severity: "warning",
        title,
        body,
        source: "inventory",
        createdAt: new Date(),
        action: {
          label: "Ver despensa",
          type: "navigate",
          payload: { tab: "market", mode: "pantry" },
        },
      });
    }
  }

  return alerts;
}

async function fetchMenuAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = new Date();

  // Alerta de preparacion de manana
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowCycle = getDayOfCycle(tomorrow);

  if (tomorrowCycle >= 0) {
    const { data: menu } = await supabase
      .from("day_menu")
      .select(
        `
        breakfast:recipes!day_menu_breakfast_id_fkey(name, ingredients),
        lunch:recipes!day_menu_lunch_id_fkey(name, ingredients),
        dinner:recipes!day_menu_dinner_id_fkey(name, ingredients)
      `,
      )
      .eq("day_number", tomorrowCycle)
      .single();

    if (menu) {
      type RecipeRef = {
        name?: string;
        ingredients?: { name: string }[];
      } | null;
      const lunchRef = menu.lunch as RecipeRef;
      const breakfastRef = menu.breakfast as RecipeRef;
      const dinnerRef = menu.dinner as RecipeRef;

      // Verificar si alguna proteina necesita descongelar
      const allIngredients = [
        ...(lunchRef?.ingredients ?? []),
        ...(breakfastRef?.ingredients ?? []),
        ...(dinnerRef?.ingredients ?? []),
      ];
      const needsDefrost = allIngredients.some((ing) =>
        /pollo|carne|pescado|cerdo|res|camaró/i.test(ing.name),
      );

      if (needsDefrost && lunchRef?.name) {
        const title = "Descongelar proteina para manana";
        const body = `Almuerzo: ${lunchRef.name}. Recuerda sacar del congelador.`;
        const id = hashAlert(title, body, "menu");
        alerts.push({
          id,
          severity: "warning",
          title,
          body,
          source: "menu",
          createdAt: new Date(),
          action: {
            label: "Ver receta",
            type: "navigate",
            payload: { tab: "calendar" },
          },
        });
      }
    }
  }

  return alerts;
}

async function fetchSuggestionAlerts(): Promise<Alert[]> {
  const { count } = await supabase
    .from("adjustment_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (!count || count === 0) return [];

  const title = `${count} sugerencia${count > 1 ? "s" : ""} de ajuste`;
  const body = "La IA tiene recomendaciones para mejorar tus porciones";
  const id = hashAlert(title, body, "suggestions");

  return [
    {
      id,
      severity: "info",
      title,
      body,
      source: "suggestions",
      createdAt: new Date(),
      action: {
        label: "Ver sugerencias",
        type: "navigate",
        payload: { tab: "suggestions" },
      },
    },
  ];
}

/**
 * Ejecuta todas las queries, deduplica y devuelve alerts ordenadas por severidad.
 */
async function generateAlerts(): Promise<Alert[]> {
  const [inventoryAlerts, menuAlerts, suggestionAlerts] = await Promise.all([
    fetchInventoryAlerts(),
    fetchMenuAlerts(),
    fetchSuggestionAlerts(),
  ]);

  const allAlerts = [...inventoryAlerts, ...menuAlerts, ...suggestionAlerts];

  // Deduplicar por id (mismo hash = misma alerta)
  const seen = new Set<string>();
  const unique = allAlerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  // Ordenar: critical > warning > info
  const order: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  unique.sort((a, b) => order[a.severity] - order[b.severity]);

  return unique;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseProactiveAlertsOptions {
  autoGenerateOnMount?: boolean;
  /** Intervalo de refresco en ms. 0 = sin refresco automatico. Default: 30 min */
  refreshIntervalMs?: number;
}

export function useProactiveAlerts(options: UseProactiveAlertsOptions = {}) {
  const { autoGenerateOnMount = true, refreshIntervalMs = STALE_AFTER_MS } =
    options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());
  const [isLoading, setIsLoading] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyDismissed = useCallback(
    (raw: Alert[]) => raw.filter((a) => !dismissed.has(a.id)),
    [dismissed],
  );

  const refresh = useCallback(
    async (force = false) => {
      if (!force && isCacheValid()) {
        const cached = readCache();
        setAlerts(applyDismissed(cached));
        return;
      }

      setIsLoading(true);
      try {
        const fresh = await generateAlerts();
        writeCache(fresh);
        setAlerts(applyDismissed(fresh));

        // Enviar push notification para alertas criticas si el usuario lo permitio
        if (canNotify()) {
          const critical = fresh.filter(
            (a) => a.severity === "critical" && !dismissed.has(a.id),
          );
          for (const alert of critical.slice(0, 2)) {
            showNotification(alert.title, alert.body, {
              tag: `alert-${alert.id}`,
            });
          }
        }
      } catch (err) {
        logger.error("useProactiveAlerts: error generating alerts", {
          error: String(err),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [applyDismissed, dismissed],
  );

  // Pedir permiso de notificaciones push al montar (no bloquea)
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      requestNotificationPermission().catch(() => {
        /* permiso denegado — no hacer nada */
      });
    }
  }, []);

  // Cargar alertas al montar
  useEffect(() => {
    if (autoGenerateOnMount) {
      refresh();
    }
  }, [autoGenerateOnMount, refresh]);

  // Refresco periodico con cleanup garantizado
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;

    intervalRef.current = setInterval(() => {
      refresh();
    }, refreshIntervalMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshIntervalMs, refresh]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAlerts = useCallback(() => setShowAlerts((v) => !v), []);

  // Helper de estilos para compatibilidad con AIChat y FloatingAIAssistant
  const getPriorityColor = useCallback((severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  }, []);

  return {
    alerts,
    dismissed,
    isLoading,
    showAlerts,
    alertCount: alerts.length,
    dismiss,
    refresh: () => refresh(true),
    toggleAlerts,
    setShowAlerts,
    getPriorityColor,
  };
}
