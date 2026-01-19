'use client';

import { UtensilsCrossed, Home, Settings, Calendar, ShoppingCart, BookOpen, Lightbulb, Sun } from 'lucide-react';
import SmartFAB, { FABAction } from './SmartFAB';

type MainSection = 'hoy' | 'recetario' | 'hogar' | 'ajustes';
type RecetarioTab = 'calendar' | 'market' | 'recipes' | 'suggestions';

interface BottomNavigationProps {
  activeSection: MainSection;
  onSectionChange: (section: MainSection) => void;
  fabOpen: boolean;
  onFabToggle: () => void;
  fabActions: FABAction[];
  // Props para tabs secundarios de recetario
  recetarioTab?: RecetarioTab;
  onRecetarioTabChange?: (tab: RecetarioTab) => void;
  pendingSuggestions?: number;
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

// Tabs secundarios del Recetario
const RECETARIO_TABS: { id: RecetarioTab; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar', label: 'Calendario', icon: <Calendar size={20} /> },
  { id: 'market', label: 'Mercado', icon: <ShoppingCart size={20} /> },
  { id: 'recipes', label: 'Recetas', icon: <BookOpen size={20} /> },
  { id: 'suggestions', label: 'Sugerencias', icon: <Lightbulb size={20} /> },
];

export default function BottomNavigation({
  activeSection,
  onSectionChange,
  fabOpen,
  onFabToggle,
  fabActions,
  recetarioTab = 'calendar',
  onRecetarioTabChange,
  pendingSuggestions = 0
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="max-w-lg mx-auto">
        {/* Tabs secundarios del Recetario - Solo visible cuando está activo */}
        {activeSection === 'recetario' && onRecetarioTabChange && (
          <div className="flex border-b border-gray-100 bg-gray-50/80">
            {RECETARIO_TABS.map((tab) => {
              const isActive = recetarioTab === tab.id;
              const showBadge = tab.id === 'suggestions' && pendingSuggestions > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => onRecetarioTabChange(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3.5 px-2
                    transition-all duration-200 relative
                    ${isActive
                      ? 'text-green-700 bg-white'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {/* Indicador activo */}
                  {isActive && (
                    <div className="absolute top-0 left-2 right-2 h-0.5 bg-green-600 rounded-full" />
                  )}
                  {tab.icon}
                  <span className="text-xs font-medium hidden sm:inline">{tab.label}</span>
                  {showBadge && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {pendingSuggestions > 9 ? '9+' : pendingSuggestions}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Navegación principal */}
        <div className="flex items-end justify-around py-2 px-1">
          {/* Hoy */}
          <NavItem
            icon={<Sun size={22} />}
            label="Hoy"
            active={activeSection === 'hoy'}
            onClick={() => onSectionChange('hoy')}
            activeColor="text-orange-600"
            activeBg="bg-orange-50"
          />

          {/* Recetario */}
          <NavItem
            icon={<UtensilsCrossed size={22} />}
            label="Recetario"
            active={activeSection === 'recetario'}
            onClick={() => onSectionChange('recetario')}
            activeColor="text-green-700"
            activeBg="bg-green-50"
          />

          {/* FAB - Center elevated button */}
          <div className="relative -top-4">
            <SmartFAB
              open={fabOpen}
              onToggle={onFabToggle}
              actions={fabActions}
              activeSection={activeSection}
            />
          </div>

          {/* Hogar */}
          <NavItem
            icon={<Home size={22} />}
            label="Hogar"
            active={activeSection === 'hogar'}
            onClick={() => onSectionChange('hogar')}
            activeColor="text-blue-700"
            activeBg="bg-blue-50"
          />

          {/* Ajustes */}
          <NavItem
            icon={<Settings size={22} />}
            label="Ajustes"
            active={activeSection === 'ajustes'}
            onClick={() => onSectionChange('ajustes')}
            activeColor="text-gray-700"
            activeBg="bg-gray-100"
          />
        </div>
      </div>
    </nav>
  );
}
