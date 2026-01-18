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
  activeSection: 'recetario' | 'hogar' | 'ia' | 'ajustes';
}

export default function DynamicFAB({ open, onToggle, actions, activeSection }: DynamicFABProps) {
  // Posiciones para el menú radial (semicírculo arriba)
  const getItemPosition = (index: number, total: number) => {
    // Distribuir en semicírculo de -80° a -100° (arriba)
    const startAngle = -150; // grados
    const endAngle = -30;
    const angleRange = endAngle - startAngle;
    const angle = startAngle + (angleRange / (total - 1)) * index;
    const radians = (angle * Math.PI) / 180;
    const radius = 90; // distancia del centro

    return {
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius,
    };
  };

  const gradientClass = activeSection === 'hogar'
    ? 'from-blue-500 to-blue-700'
    : 'from-green-500 to-green-700';

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onToggle}
        />
      )}

      {/* FAB Container */}
      <div className="relative">
        {/* Radial Menu Items */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
          {actions.map((action, index) => {
            const pos = getItemPosition(index, actions.length);
            return (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  onToggle();
                }}
                className={`
                  absolute flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
                  ${action.color} text-white font-medium text-sm
                  transition-all duration-300 ease-out whitespace-nowrap
                  ${open
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-0 pointer-events-none'
                  }
                `}
                style={{
                  transform: open
                    ? `translate(${pos.x}px, ${pos.y}px)`
                    : 'translate(0, 0)',
                  transitionDelay: open ? `${index * 50}ms` : '0ms',
                }}
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>

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
            z-50 relative
          `}
        >
          {open ? <X size={28} /> : <Plus size={28} />}
        </button>
      </div>
    </>
  );
}
