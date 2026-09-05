"use client";

import { useState, useRef, useCallback } from "react";
import {
  Sparkles,
  X,
  Calendar,
  ShoppingCart,
  BookOpen,
  Home,
  ClipboardList,
  Users,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/lib/stores/useAppStore";

export interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "ai" | "alert";
  badge?: number;
}

interface SmartFABProps {
  open: boolean;
  onToggle: () => void;
  actions?: FABAction[];
  activeSection: "hoy" | "recetario" | "hogar" | "ajustes";
  onOpenAssistant?: () => void;
  pendingProposals?: number;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

export default function SmartFAB({
  open,
  onToggle,
  activeSection,
  onOpenAssistant,
  pendingProposals = 0,
}: SmartFABProps) {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const storeOpenModal = useAppStore((s) => s.openModal);

  const getQuickActions = (): QuickAction[] => {
    switch (activeSection) {
      case "hoy":
        return [
          {
            id: "suggestions",
            icon: <Sparkles size={20} />,
            label: "Sugerencias IA",
            onClick: () => navigateTo("recetario", "suggestions"),
            color: "from-purple-500 to-indigo-500",
          },
          {
            id: "calendar",
            icon: <Calendar size={20} />,
            label: "Ver menú",
            onClick: () => navigateTo("recetario", "calendar"),
            color: "from-blue-500 to-cyan-500",
          },
          {
            id: "market",
            icon: <ShoppingCart size={20} />,
            label: "Mercado",
            onClick: () => navigateTo("recetario", "market"),
            color: "from-green-500 to-emerald-500",
          },
          {
            id: "hogar",
            icon: <Home size={20} />,
            label: "Tareas hogar",
            onClick: () => navigateTo("hogar"),
            color: "from-orange-500 to-amber-500",
          },
        ];
      case "recetario":
        return [
          {
            id: "ai-suggestion",
            icon: <Sparkles size={20} />,
            label: "Sugerencia IA",
            onClick: () => navigateTo("recetario", "suggestions"),
            color: "from-purple-500 to-indigo-500",
          },
          {
            id: "new-recipe",
            icon: <BookOpen size={20} />,
            label: "Nueva receta",
            onClick: () => {
              navigateTo("recetario", "recipes");
              setTimeout(() => storeOpenModal("newRecipe"), 100);
            },
            color: "from-green-500 to-emerald-500",
          },
          {
            id: "add-market",
            icon: <ShoppingCart size={20} />,
            label: "Al mercado",
            onClick: () => {
              navigateTo("recetario", "market");
              setTimeout(() => storeOpenModal("addMarketItem"), 100);
            },
            color: "from-blue-500 to-cyan-500",
          },
          {
            id: "calendar",
            icon: <Calendar size={20} />,
            label: "Calendario",
            onClick: () => navigateTo("recetario", "calendar"),
            color: "from-orange-500 to-amber-500",
          },
        ];
      case "hogar":
        return [
          {
            id: "quick-routine",
            icon: <Zap size={20} />,
            label: "Rutina rápida",
            onClick: () => storeOpenModal("routinePanel"),
            color: "from-purple-500 to-indigo-500",
          },
          {
            id: "new-space",
            icon: <Home size={20} />,
            label: "Nuevo espacio",
            onClick: () => storeOpenModal("spacesPanel"),
            color: "from-blue-500 to-cyan-500",
          },
          {
            id: "new-employee",
            icon: <Users size={20} />,
            label: "Empleado",
            onClick: () => storeOpenModal("employeesPanel"),
            color: "from-green-500 to-emerald-500",
          },
          {
            id: "new-task",
            icon: <ClipboardList size={20} />,
            label: "Nueva tarea",
            onClick: () => storeOpenModal("taskModal"),
            color: "from-orange-500 to-amber-500",
          },
        ];
      default:
        return [
          {
            id: "suggestions",
            icon: <Sparkles size={20} />,
            label: "Sugerencias IA",
            onClick: () => navigateTo("recetario", "suggestions"),
            color: "from-purple-500 to-indigo-500",
          },
          {
            id: "recipes",
            icon: <BookOpen size={20} />,
            label: "Recetas",
            onClick: () => navigateTo("recetario", "recipes"),
            color: "from-green-500 to-emerald-500",
          },
          {
            id: "hogar",
            icon: <Home size={20} />,
            label: "Tareas hogar",
            onClick: () => navigateTo("hogar"),
            color: "from-blue-500 to-cyan-500",
          },
        ];
    }
  };

  const handlePressStart = useCallback(() => {
    if (showQuickActions) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowQuickActions(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [showQuickActions]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) {
      if (showQuickActions) setShowQuickActions(false);
      else onOpenAssistant?.();
    }
    isLongPress.current = false;
  }, [showQuickActions, onOpenAssistant]);

  const handleQuickActionClick = (a: QuickAction) => {
    a.onClick();
    setShowQuickActions(false);
  };
  const quickActions = getQuickActions();

  return (
    <>
      {showQuickActions && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setShowQuickActions(false)}
        />
      )}
      <div className="relative z-50">
        <div
          className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2.5 items-center w-max transition-all duration-300 ${showQuickActions ? "opacity-100" : "opacity-0 translate-y-4 pointer-events-none"}`}
        >
          {quickActions.map((a, i) => (
            <button
              key={a.id}
              tabIndex={showQuickActions ? 0 : -1}
              onClick={() => handleQuickActionClick(a)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm bg-gradient-to-r ${a.color} text-white shadow-lg active:scale-[0.98]`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {a.icon}
              </span>
              <span>{a.label}</span>
            </button>
          ))}
          <div className="text-white/80 text-xs py-2 px-4 bg-black/20 rounded-full backdrop-blur-sm">
            Accesos rápidos
          </div>
        </div>
        <button
          aria-label={
            showQuickActions ? "Cerrar accesos rápidos" : "Asistente de IA"
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (showQuickActions) setShowQuickActions(false);
              else onOpenAssistant?.();
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setShowQuickActions(true);
            } else if (event.key === "Escape") setShowQuickActions(false);
          }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            isLongPress.current = false;
          }}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            isLongPress.current = false;
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white select-none transition-all duration-300 bg-gradient-to-br from-purple-600 to-violet-700 shadow-lg shadow-purple-300/50 ${showQuickActions ? "scale-110" : "hover:scale-105"} active:scale-95`}
        >
          {showQuickActions ? (
            <X size={22} strokeWidth={2.5} />
          ) : (
            <Sparkles size={22} />
          )}
          {!showQuickActions && pendingProposals > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white">
              {pendingProposals > 9 ? "9+" : pendingProposals}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
