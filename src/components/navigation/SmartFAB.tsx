'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Sparkles, AlertTriangle, ShoppingCart, Check } from 'lucide-react';
import { useProactiveAlerts } from '@/lib/hooks/useProactiveAlerts';

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
  actions: FABAction[];
  activeSection: 'hoy' | 'recetario' | 'hogar' | 'ia' | 'ajustes';
}

export default function SmartFAB({ open, onToggle, actions, activeSection }: SmartFABProps) {
  const { alerts, handleAlertAction } = useProactiveAlerts();
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // Convert alerts to FAB actions
  const alertActions: FABAction[] = alerts.slice(0, 2).map(alert => ({
    id: `alert-${alert.id}`,
    icon: alert.priority === 'high' ? <AlertTriangle size={18} /> : <Sparkles size={18} />,
    label: alert.title.length > 30 ? alert.title.substring(0, 30) + '...' : alert.title,
    variant: 'alert' as const,
    onClick: () => {
      if (alert.actionable) {
        handleAlertAction(alert, (action) => {
          // Execute the action
          executeSmartAction(action);
        });
      }
    }
  }));

  // Combine alert actions with regular actions
  const allActions = [...alertActions, ...actions];

  const executeSmartAction = async (action: string) => {
    // Handle AI-powered quick actions
    switch (action) {
      case 'add_to_shopping':
        // Add items to shopping list
        setShowSuccess('Agregado a la lista');
        setTimeout(() => setShowSuccess(null), 2000);
        break;
      case 'view_low_inventory':
        window.dispatchEvent(new CustomEvent('navigateToMarket', { detail: { tab: 'inventory' } }));
        break;
      default:
        console.log('Smart action:', action);
    }
    onToggle(); // Close FAB after action
  };

  // Get gradient based on section
  const getGradientClass = () => {
    switch (activeSection) {
      case 'hoy': return 'from-emerald-500 to-emerald-600';
      case 'hogar': return 'from-teal-500 to-teal-600';
      default: return 'from-green-600 to-green-700';
    }
  };

  const getActionStyle = (variant?: 'default' | 'ai' | 'alert') => {
    switch (variant) {
      case 'ai':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
      case 'alert':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      default:
        return 'bg-white text-gray-700 border border-gray-200 shadow-sm';
    }
  };

  // Don't show FAB in ajustes
  if (activeSection === 'ajustes') return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce-in">
          <Check size={16} />
          <span className="text-sm font-medium">{showSuccess}</span>
        </div>
      )}

      {/* FAB Container */}
      <div className="relative z-50">
        {/* Menu Items */}
        <div
          className={`
            absolute bottom-16 left-1/2 -translate-x-1/2
            flex flex-col-reverse gap-2 items-center
            transition-all duration-300 ease-out
            ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-4'}
          `}
        >
          {allActions.map((action, index) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`
                flex items-center gap-2.5 px-4 py-2.5 rounded-full
                font-medium text-sm whitespace-nowrap
                transition-all duration-200 ease-out
                hover:scale-105 active:scale-95
                shadow-lg
                ${getActionStyle(action.variant)}
                ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
              `}
              style={{
                transitionDelay: open ? `${index * 40}ms` : '0ms',
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {action.icon}
              </span>
              <span>{action.label}</span>
              {action.badge && action.badge > 0 && (
                <span className="ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {action.badge > 9 ? '9+' : action.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main FAB Button */}
        <button
          onClick={onToggle}
          className={`
            w-14 h-14 rounded-full shadow-xl
            flex items-center justify-center
            bg-gradient-to-br ${getGradientClass()}
            text-white
            transition-all duration-300 ease-out
            ${open ? 'rotate-45 scale-110 shadow-2xl' : 'hover:scale-105'}
            active:scale-95
          `}
        >
          {open ? <X size={26} strokeWidth={2.5} /> : <Plus size={26} strokeWidth={2.5} />}

          {/* Alert badge on FAB */}
          {!open && alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {alerts.length > 9 ? '9+' : alerts.length}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
