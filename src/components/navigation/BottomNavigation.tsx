'use client';

import { UtensilsCrossed, Home, Bot, Settings } from 'lucide-react';
import DynamicFAB, { FABAction } from './DynamicFAB';

type MainSection = 'recetario' | 'hogar' | 'ia' | 'ajustes';

interface BottomNavigationProps {
  activeSection: MainSection;
  onSectionChange: (section: MainSection) => void;
  fabOpen: boolean;
  onFabToggle: () => void;
  fabActions: FABAction[];
  pendingAlerts?: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  activeColor: string;
  activeBg: string;
}

function NavItem({ icon, label, active, onClick, badge, activeColor, activeBg }: NavItemProps) {
  const showBadge = typeof badge === 'number' && badge > 0;

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center py-2 px-3 rounded-xl
        transition-all duration-200 min-w-[64px]
        ${active ? `${activeColor} ${activeBg}` : 'text-gray-500'}
      `}
    >
      <div className="relative">
        {icon}
        {showBadge && (
          <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
}

export default function BottomNavigation({
  activeSection,
  onSectionChange,
  fabOpen,
  onFabToggle,
  fabActions,
  pendingAlerts = 0
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-end justify-between py-2">
          {/* Recetario */}
          <NavItem
            icon={<UtensilsCrossed size={24} />}
            label="Recetario"
            active={activeSection === 'recetario'}
            onClick={() => onSectionChange('recetario')}
            activeColor="text-green-700"
            activeBg="bg-green-50"
          />

          {/* Hogar */}
          <NavItem
            icon={<Home size={24} />}
            label="Hogar"
            active={activeSection === 'hogar'}
            onClick={() => onSectionChange('hogar')}
            activeColor="text-blue-700"
            activeBg="bg-blue-50"
          />

          {/* FAB - Center elevated button */}
          <div className="relative -top-4">
            <DynamicFAB
              open={fabOpen}
              onToggle={onFabToggle}
              actions={fabActions}
              activeSection={activeSection}
            />
          </div>

          {/* IA */}
          <NavItem
            icon={<Bot size={24} />}
            label="IA"
            active={activeSection === 'ia'}
            onClick={() => onSectionChange('ia')}
            activeColor="text-purple-700"
            activeBg="bg-purple-50"
          />

          {/* Ajustes */}
          <NavItem
            icon={<Settings size={24} />}
            label="Ajustes"
            active={activeSection === 'ajustes'}
            onClick={() => onSectionChange('ajustes')}
            badge={pendingAlerts}
            activeColor="text-gray-700"
            activeBg="bg-gray-100"
          />
        </div>
      </div>
    </nav>
  );
}
