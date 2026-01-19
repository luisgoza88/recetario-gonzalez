import { create } from 'zustand';
import type { MainSection, RecetarioTab } from '@/types';

// ============================================
// TIPOS
// ============================================
interface AppState {
  // Navegación principal
  activeSection: MainSection;
  recetarioTab: RecetarioTab;
  showSettings: boolean;

  // FAB (Floating Action Button)
  fabOpen: boolean;
}

interface AppActions {
  // Navegación
  setActiveSection: (section: MainSection) => void;
  setRecetarioTab: (tab: RecetarioTab) => void;
  setShowSettings: (show: boolean) => void;

  // FAB
  setFabOpen: (open: boolean) => void;
  toggleFab: () => void;

  // Navegación combinada (helper)
  navigateToRecetario: (tab?: RecetarioTab) => void;
  navigateToHogar: () => void;
  navigateToAjustes: () => void;
}

type AppStore = AppState & AppActions;

// ============================================
// STORE
// ============================================
export const useAppStore = create<AppStore>((set) => ({
  // Estado inicial
  activeSection: 'hoy',
  recetarioTab: 'calendar',
  showSettings: false,
  fabOpen: false,

  // Acciones de navegación
  setActiveSection: (section) => set({
    activeSection: section,
    fabOpen: false,      // Cerrar FAB al cambiar sección
    showSettings: false  // Cerrar settings al cambiar sección
  }),

  setRecetarioTab: (tab) => set({ recetarioTab: tab }),

  setShowSettings: (show) => set({ showSettings: show }),

  // Acciones del FAB
  setFabOpen: (open) => set({ fabOpen: open }),
  toggleFab: () => set((state) => ({ fabOpen: !state.fabOpen })),

  // Helpers de navegación
  navigateToRecetario: (tab) => set({
    activeSection: 'recetario',
    recetarioTab: tab || 'calendar',
    fabOpen: false,
    showSettings: false
  }),

  navigateToHogar: () => set({
    activeSection: 'hogar',
    fabOpen: false,
    showSettings: false
  }),

  navigateToAjustes: () => set({
    activeSection: 'ajustes',
    fabOpen: false,
    showSettings: false
  }),
}));

// ============================================
// SELECTORES (para optimizar re-renders)
// ============================================
export const useActiveSection = () => useAppStore((state) => state.activeSection);
export const useRecetarioTab = () => useAppStore((state) => state.recetarioTab);
export const useShowSettings = () => useAppStore((state) => state.showSettings);
export const useFabOpen = () => useAppStore((state) => state.fabOpen);

// Acciones individuales
export const useNavigationActions = () => useAppStore((state) => ({
  setActiveSection: state.setActiveSection,
  setRecetarioTab: state.setRecetarioTab,
  setShowSettings: state.setShowSettings,
  navigateToRecetario: state.navigateToRecetario,
  navigateToHogar: state.navigateToHogar,
  navigateToAjustes: state.navigateToAjustes,
}));

export const useFabActions = () => useAppStore((state) => ({
  setFabOpen: state.setFabOpen,
  toggleFab: state.toggleFab,
}));
