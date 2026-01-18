'use client';

import { Plus, X } from 'lucide-react';

export interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface DynamicFABProps {
  open: boolean;
  onToggle: () => void;
  actions: FABAction[];
  activeSection: 'hoy' | 'recetario' | 'hogar' | 'ia' | 'ajustes';
}

export default function DynamicFAB({ open, onToggle, actions, activeSection }: DynamicFABProps) {
  const getGradientClass = () => {
    switch (activeSection) {
      case 'hoy': return 'from-orange-500 to-orange-600';
      case 'hogar': return 'from-blue-500 to-blue-700';
      case 'ia': return 'from-purple-500 to-purple-700';
      default: return 'from-green-500 to-green-700';
    }
  };
  const gradientClass = getGradientClass();

  // Solo mostrar FAB en secciones que tienen acciones
  const hasActions = actions.length > 0;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
        />
      )}

      {/* FAB Container */}
      <div className="relative z-50">
        {/* Menu Items - Grid vertical arriba del FAB */}
        {hasActions && (
          <div
            className={`
              absolute bottom-20 left-1/2 -translate-x-1/2
              flex flex-col-reverse gap-3 items-center
              transition-all duration-300
              ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}
          >
            {actions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                }}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
                  ${action.color} text-white font-medium text-sm
                  transition-all duration-300 ease-out whitespace-nowrap
                  hover:scale-105 active:scale-95
                  ${open
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                  }
                `}
                style={{
                  transitionDelay: open ? `${index * 50}ms` : '0ms',
                }}
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={onToggle}
          className={`
            w-14 h-14 rounded-full shadow-lg
            flex items-center justify-center
            bg-gradient-to-br ${gradientClass}
            text-white
            transition-all duration-300
            ${open ? 'rotate-45 scale-110' : ''}
            active:scale-95
          `}
        >
          {open ? <X size={28} /> : <Plus size={28} />}
        </button>
      </div>
    </>
  );
}
