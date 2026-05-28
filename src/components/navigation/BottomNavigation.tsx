"use client";

import {
  UtensilsCrossed,
  Home,
  Settings,
  Calendar,
  ShoppingCart,
  BookOpen,
  Lightbulb,
  Sun,
} from "lucide-react";
import SmartFAB, { FABAction } from "./SmartFAB";

type MainSection = "hoy" | "recetario" | "hogar" | "ajustes";
type RecetarioTab = "calendar" | "market" | "recipes" | "suggestions";

interface BottomNavigationProps {
  activeSection: MainSection;
  onSectionChange: (section: MainSection) => void;
  fabOpen: boolean;
  onFabToggle: () => void;
  fabActions: FABAction[];
  recetarioTab?: RecetarioTab;
  onRecetarioTabChange?: (tab: RecetarioTab) => void;
  pendingSuggestions?: number;
  onOpenAICommandCenter?: () => void;
  pendingAIProposals?: number;
}

const SECTION_ACCENTS: Record<
  MainSection,
  { activeClass: string; bgClass: string }
> = {
  hoy: { activeClass: "text-orange-600", bgClass: "bg-orange-50" },
  recetario: {
    activeClass: "text-[var(--accent)]",
    bgClass: "bg-[var(--accent-soft)]",
  },
  hogar: { activeClass: "text-blue-700", bgClass: "bg-blue-50" },
  ajustes: { activeClass: "text-stone-700", bgClass: "bg-stone-100" },
};

const RECETARIO_TABS: {
  id: RecetarioTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "calendar", label: "Calendario", icon: <Calendar size={16} /> },
  { id: "market", label: "Mercado", icon: <ShoppingCart size={16} /> },
  { id: "recipes", label: "Recetas", icon: <BookOpen size={16} /> },
  { id: "suggestions", label: "Sugerencias", icon: <Lightbulb size={16} /> },
];

export default function BottomNavigation({
  activeSection,
  onSectionChange,
  fabOpen,
  onFabToggle,
  fabActions,
  recetarioTab = "calendar",
  onRecetarioTabChange,
  pendingSuggestions = 0,
  onOpenAICommandCenter,
  pendingAIProposals = 0,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--border)] z-50"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      {activeSection === "recetario" && onRecetarioTabChange && (
        <div
          className="flex border-b border-[var(--border)] bg-stone-50"
          role="tablist"
        >
          {RECETARIO_TABS.map((tab) => {
            const isActive = recetarioTab === tab.id;
            const showBadge =
              tab.id === "suggestions" && pendingSuggestions > 0;
            return (
              <button
                key={tab.id}
                onClick={() => onRecetarioTabChange(tab.id)}
                role="tab"
                aria-selected={isActive}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 relative transition-colors ${
                  isActive ? "text-[var(--accent)] bg-white" : "text-stone-500"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-3 right-3 h-0.5 bg-[var(--accent)] rounded-full" />
                )}
                <div className="relative">
                  {tab.icon}
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {pendingSuggestions > 9 ? "9+" : pendingSuggestions}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="flex items-end justify-around px-2 pt-2 pb-1 relative"
        role="tablist"
      >
        <NavTab
          icon={<Sun size={20} />}
          label="Hoy"
          active={activeSection === "hoy"}
          onClick={() => onSectionChange("hoy")}
          accent={SECTION_ACCENTS.hoy}
        />
        <NavTab
          icon={<UtensilsCrossed size={20} />}
          label="Recetario"
          active={activeSection === "recetario"}
          onClick={() => onSectionChange("recetario")}
          accent={SECTION_ACCENTS.recetario}
        />
        <div className="relative -mt-7">
          <SmartFAB
            open={fabOpen}
            onToggle={onFabToggle}
            actions={fabActions}
            activeSection={activeSection}
            onOpenAICommandCenter={onOpenAICommandCenter}
            pendingProposals={pendingAIProposals}
          />
        </div>
        <NavTab
          icon={<Home size={20} />}
          label="Hogar"
          active={activeSection === "hogar"}
          onClick={() => onSectionChange("hogar")}
          accent={SECTION_ACCENTS.hogar}
        />
        <NavTab
          icon={<Settings size={20} />}
          label="Ajustes"
          active={activeSection === "ajustes"}
          onClick={() => onSectionChange("ajustes")}
          accent={SECTION_ACCENTS.ajustes}
        />
      </div>
    </nav>
  );
}

function NavTab({
  icon,
  label,
  active,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  accent: { activeClass: string; bgClass: string };
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[58px] transition-colors ${active ? `${accent.activeClass} ${accent.bgClass}` : "text-stone-400"}`}
    >
      {icon}
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </button>
  );
}
