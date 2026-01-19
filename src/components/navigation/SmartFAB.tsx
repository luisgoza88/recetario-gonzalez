'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, X, Loader2, Sparkles, MessageCircle, ShoppingCart, Calendar, BookOpen, Lightbulb, Home, ClipboardList, Users, Zap } from 'lucide-react';

// Re-export for backwards compatibility
export interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'ai' | 'alert';
  badge?: number;
}

interface SmartFABProps {
  open: boolean;
  onToggle: () => void;
  actions?: FABAction[]; // Legacy - not used anymore
  activeSection: 'hoy' | 'recetario' | 'hogar' | 'ajustes';
  onOpenAICommandCenter?: () => void;
  pendingProposals?: number;
}

// Quick action type for the new design
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
  onOpenAICommandCenter,
  pendingProposals = 0
}: SmartFABProps) {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const LONG_PRESS_DURATION = 500; // ms

  // Get contextual quick actions based on active section
  const getQuickActions = (): QuickAction[] => {
    switch (activeSection) {
      case 'hoy':
        return [
          {
            id: 'suggestions',
            icon: <Sparkles size={20} />,
            label: 'Sugerencias IA',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'suggestions' } }));
            },
            color: 'from-purple-500 to-indigo-500'
          },
          {
            id: 'calendar',
            icon: <Calendar size={20} />,
            label: 'Ver menú',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'calendar' } }));
            },
            color: 'from-blue-500 to-cyan-500'
          },
          {
            id: 'market',
            icon: <ShoppingCart size={20} />,
            label: 'Mercado',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'market' } }));
            },
            color: 'from-green-500 to-emerald-500'
          },
          {
            id: 'hogar',
            icon: <Home size={20} />,
            label: 'Tareas hogar',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'hogar' } }));
            },
            color: 'from-orange-500 to-amber-500'
          }
        ];

      case 'recetario':
        return [
          {
            id: 'ai-suggestion',
            icon: <Sparkles size={20} />,
            label: 'Sugerencia IA',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'suggestions' } }));
            },
            color: 'from-purple-500 to-indigo-500'
          },
          {
            id: 'new-recipe',
            icon: <BookOpen size={20} />,
            label: 'Nueva receta',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'recipes' } }));
              setTimeout(() => window.dispatchEvent(new CustomEvent('openNewRecipe')), 100);
            },
            color: 'from-green-500 to-emerald-500'
          },
          {
            id: 'add-market',
            icon: <ShoppingCart size={20} />,
            label: 'Al mercado',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'market' } }));
              setTimeout(() => window.dispatchEvent(new CustomEvent('openAddMarketItem')), 100);
            },
            color: 'from-blue-500 to-cyan-500'
          },
          {
            id: 'calendar',
            icon: <Calendar size={20} />,
            label: 'Calendario',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'calendar' } }));
            },
            color: 'from-orange-500 to-amber-500'
          }
        ];

      case 'hogar':
        return [
          {
            id: 'quick-routine',
            icon: <Zap size={20} />,
            label: 'Rutina rápida',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('openRoutinePanel'));
            },
            color: 'from-purple-500 to-indigo-500'
          },
          {
            id: 'new-space',
            icon: <Home size={20} />,
            label: 'Nuevo espacio',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('openSpacesPanel'));
            },
            color: 'from-blue-500 to-cyan-500'
          },
          {
            id: 'new-employee',
            icon: <Users size={20} />,
            label: 'Empleado',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('openEmployeesPanel'));
            },
            color: 'from-green-500 to-emerald-500'
          },
          {
            id: 'new-task',
            icon: <ClipboardList size={20} />,
            label: 'Nueva tarea',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('openTaskModal'));
            },
            color: 'from-orange-500 to-amber-500'
          }
        ];

      case 'ajustes':
        return [
          {
            id: 'suggestions',
            icon: <Sparkles size={20} />,
            label: 'Sugerencias IA',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'suggestions' } }));
            },
            color: 'from-purple-500 to-indigo-500'
          },
          {
            id: 'recipes',
            icon: <BookOpen size={20} />,
            label: 'Recetas',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'recetario', tab: 'recipes' } }));
            },
            color: 'from-green-500 to-emerald-500'
          },
          {
            id: 'hogar',
            icon: <Home size={20} />,
            label: 'Tareas hogar',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('appNavigate', { detail: { section: 'hogar' } }));
            },
            color: 'from-blue-500 to-cyan-500'
          }
        ];

      default:
        return [];
    }
  };

  // Long press handlers - long press shows quick actions
  const handlePressStart = useCallback(() => {
    if (showQuickActions) return;

    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowQuickActions(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_DURATION);
  }, [showQuickActions]);

  const handlePressEnd = useCallback(() => {
    // Clear the timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // If it wasn't a long press, open AI Command Center directly
    if (!isLongPress.current && !showQuickActions) {
      if (onOpenAICommandCenter) {
        onOpenAICommandCenter();
      }
    }

    isLongPress.current = false;
  }, [showQuickActions, onOpenAICommandCenter]);

  // Cancel on mouse/touch leave
  const handlePressCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPress.current = false;
  }, []);

  // Close quick actions menu
  const closeQuickActions = useCallback(() => {
    setShowQuickActions(false);
  }, []);

  // Handle quick action click
  const handleQuickActionClick = (action: QuickAction) => {
    action.onClick();
    setShowQuickActions(false);
  };

  const quickActions = getQuickActions();

  return (
    <>
      {/* Backdrop */}
      {showQuickActions && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeQuickActions}
        />
      )}

      {/* FAB Container */}
      <div className="relative z-50">
        {/* Quick Actions Menu - shows on long press */}
        <div
          className={`
            absolute bottom-20 left-1/2 -translate-x-1/2
            flex flex-col-reverse gap-2.5 items-center w-max
            transition-all duration-300 ease-out
            ${showQuickActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-4'}
          `}
        >
          {/* Context Quick Actions */}
          {quickActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleQuickActionClick(action)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl
                font-medium text-sm whitespace-nowrap min-w-[180px]
                bg-gradient-to-r ${action.color} text-white
                shadow-lg
                transition-all duration-200 ease-out
                hover:scale-[1.02] active:scale-[0.98]
                ${showQuickActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
              `}
              style={{
                transitionDelay: showQuickActions ? `${index * 50}ms` : '0ms',
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                {action.icon}
              </span>
              <span className="flex-1 text-left">{action.label}</span>
            </button>
          ))}

          {/* Hint text */}
          <div className={`
            text-white/80 text-xs text-center py-2 px-4 bg-black/20 rounded-full backdrop-blur-sm
            transition-all duration-200
            ${showQuickActions ? 'opacity-100' : 'opacity-0'}
          `}>
            Accesos rápidos
          </div>
        </div>

        {/* Main FAB Button - AI Brain */}
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          className={`
            w-16 h-16 rounded-full
            flex items-center justify-center
            text-white select-none
            transition-all duration-300 ease-out
            bg-gradient-to-br from-emerald-500 to-green-600
            shadow-[0_4px_20px_rgba(16,185,129,0.5)]
            ${showQuickActions
              ? 'scale-110 shadow-[0_4px_30px_rgba(16,185,129,0.6)]'
              : 'hover:scale-105 hover:shadow-[0_4px_25px_rgba(16,185,129,0.6)]'}
            active:scale-95
          `}
          style={{
            boxShadow: '0 4px 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)'
          }}
        >
          {showQuickActions ? (
            <X size={28} strokeWidth={2.5} />
          ) : (
            <Brain size={28} strokeWidth={2} />
          )}

          {/* Glow ring effect when idle */}
          {!showQuickActions && (
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 opacity-0 animate-pulse-slow" />
          )}

          {/* Badge for pending proposals */}
          {!showQuickActions && pendingProposals > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce shadow-lg border-2 border-white">
              {pendingProposals > 9 ? '9+' : pendingProposals}
            </span>
          )}

          {/* Subtle pulsing ring */}
          {!showQuickActions && (
            <span className="absolute inset-[-4px] rounded-full border-2 border-emerald-300/50 animate-ping" />
          )}
        </button>

        {/* AI Label below FAB */}
        {!showQuickActions && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-emerald-600 font-semibold tracking-wide">
              IA
            </span>
          </div>
        )}

        {/* Long press hint - shows briefly on first load */}
        {!showQuickActions && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-400">
              Mantén para accesos rápidos
            </span>
          </div>
        )}
      </div>
    </>
  );
}
