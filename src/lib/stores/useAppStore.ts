import { create } from "zustand";
import type { MainSection, RecetarioTab } from "@/types";

// ============================================
// TIPOS
// ============================================

/** Nombres de modales gestionados por el store */
export type ModalName =
  | "newRecipe"
  | "addMarketItem"
  | "routinePanel"
  | "spacesPanel"
  | "employeesPanel"
  | "taskModal"
  | "mealFeedback";

interface AppState {
  // Navegación principal
  activeSection: MainSection;
  recetarioTab: RecetarioTab;
  showSettings: boolean;

  // FAB (Floating Action Button)
  fabOpen: boolean;

  // Modales abiertos (cada clave es un ModalName, valor true = abierto)
  activeModals: Partial<Record<ModalName, boolean>>;

  // Señal para "ir a hoy" en el calendario (se incrementa para disparar efecto)
  goToTodaySignal: number;
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

  // Navegación genérica (reemplaza CustomEvent 'appNavigate')
  navigateTo: (section: string, tab?: string) => void;

  // Modales (reemplaza CustomEvents de modales huérfanos)
  openModal: (modalName: ModalName) => void;
  closeModal: (modalName: ModalName) => void;

  // Señal para ir a hoy en el calendario (reemplaza CustomEvent 'goToToday')
  triggerGoToToday: () => void;
}

type AppStore = AppState & AppActions;

// ============================================
// STORE
// ============================================
export const useAppStore = create<AppStore>((set) => ({
  // Estado inicial
  activeSection: "hoy",
  recetarioTab: "calendar",
  showSettings: false,
  fabOpen: false,
  activeModals: {},
  goToTodaySignal: 0,

  // Acciones de navegación
  setActiveSection: (section) =>
    set({
      activeSection: section,
      fabOpen: false, // Cerrar FAB al cambiar sección
      showSettings: false, // Cerrar settings al cambiar sección
    }),

  setRecetarioTab: (tab) => set({ recetarioTab: tab }),

  setShowSettings: (show) => set({ showSettings: show }),

  // Acciones del FAB
  setFabOpen: (open) => set({ fabOpen: open }),
  toggleFab: () => set((state) => ({ fabOpen: !state.fabOpen })),

  // Helpers de navegación
  navigateToRecetario: (tab) =>
    set({
      activeSection: "recetario",
      recetarioTab: tab || "calendar",
      fabOpen: false,
      showSettings: false,
    }),

  navigateToHogar: () =>
    set({
      activeSection: "hogar",
      fabOpen: false,
      showSettings: false,
    }),

  navigateToAjustes: () =>
    set({
      activeSection: "ajustes",
      fabOpen: false,
      showSettings: false,
    }),

  // Navegación genérica (reemplaza CustomEvent 'appNavigate' y 'navigateToSection')
  navigateTo: (section, tab) =>
    set((state) => {
      if (section === "recetario" && tab) {
        return {
          activeSection: "recetario" as MainSection,
          recetarioTab: tab as RecetarioTab,
          fabOpen: false,
          showSettings: false,
        };
      }
      if (section === "hogar") {
        return {
          activeSection: "hogar" as MainSection,
          fabOpen: false,
          showSettings: false,
        };
      }
      return {
        activeSection: section as MainSection,
        fabOpen: false,
        showSettings: false,
      };
    }),

  // Modales
  openModal: (modalName) =>
    set((state) => ({
      activeModals: { ...state.activeModals, [modalName]: true },
    })),

  closeModal: (modalName) =>
    set((state) => ({
      activeModals: { ...state.activeModals, [modalName]: false },
    })),

  // Señal para "ir a hoy" en el calendario
  triggerGoToToday: () =>
    set((state) => ({
      goToTodaySignal: state.goToTodaySignal + 1,
    })),
}));

// ============================================
// SELECTORES (para optimizar re-renders)
// ============================================
export const useActiveSection = () =>
  useAppStore((state) => state.activeSection);
export const useRecetarioTab = () => useAppStore((state) => state.recetarioTab);
export const useShowSettings = () => useAppStore((state) => state.showSettings);
export const useFabOpen = () => useAppStore((state) => state.fabOpen);
export const useGoToTodaySignal = () =>
  useAppStore((state) => state.goToTodaySignal);

/** Selector para verificar si un modal está abierto */
export const useIsModalOpen = (modalName: ModalName) =>
  useAppStore((state) => !!state.activeModals[modalName]);

// Acciones individuales
export const useNavigationActions = () =>
  useAppStore((state) => ({
    setActiveSection: state.setActiveSection,
    setRecetarioTab: state.setRecetarioTab,
    setShowSettings: state.setShowSettings,
    navigateToRecetario: state.navigateToRecetario,
    navigateToHogar: state.navigateToHogar,
    navigateToAjustes: state.navigateToAjustes,
    navigateTo: state.navigateTo,
  }));

export const useFabActions = () =>
  useAppStore((state) => ({
    setFabOpen: state.setFabOpen,
    toggleFab: state.toggleFab,
  }));

export const useModalActions = () =>
  useAppStore((state) => ({
    openModal: state.openModal,
    closeModal: state.closeModal,
  }));
