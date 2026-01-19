'use client';

import { BookOpen, ShoppingCart, UtensilsCrossed, Sparkles, Home as HomeIcon, Users, ClipboardList, Zap } from 'lucide-react';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import RecetarioSection from '@/components/sections/RecetarioSection';
import HomeView from '@/components/home/HomeView';
import TodayDashboard from '@/components/sections/TodayDashboard';
import SettingsView from '@/components/sections/SettingsView';
import { FABAction } from '@/components/navigation/SmartFAB';
import { useRecipes, useMarketItems, useSuggestionsCount, useRefreshAppData } from '@/lib/hooks/useAppData';
import { useAppStore } from '@/lib/stores/useAppStore';

export default function Home() {
  // Estado global con Zustand (navegación y UI)
  const {
    activeSection,
    recetarioTab,
    showSettings,
    fabOpen,
    setActiveSection,
    setRecetarioTab,
    setShowSettings,
    setFabOpen,
    toggleFab,
    navigateToRecetario,
    navigateToHogar,
  } = useAppStore();

  // Datos con TanStack Query (cache automático, refetch inteligente)
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: marketItems = [], isLoading: itemsLoading } = useMarketItems();
  const { data: pendingSuggestions = 0 } = useSuggestionsCount();
  const refreshAppData = useRefreshAppData();

  const loading = recipesLoading || itemsLoading;

  const handleUpdate = () => {
    refreshAppData();
  };

  // Acciones del FAB según la sección activa
  const getRecetarioFABActions = (): FABAction[] => [
    {
      id: 'ai-suggestion',
      icon: <Sparkles size={20} />,
      label: 'Sugerencia IA',
      variant: 'ai',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('suggestions');
      }
    },
    {
      id: 'new-recipe',
      icon: <BookOpen size={20} />,
      label: 'Nueva receta',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('recipes');
        setTimeout(() => window.dispatchEvent(new CustomEvent('openNewRecipe')), 100);
      }
    },
    {
      id: 'add-market',
      icon: <ShoppingCart size={20} />,
      label: 'Al mercado',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('market');
        setTimeout(() => window.dispatchEvent(new CustomEvent('openAddMarketItem')), 100);
      }
    },
    {
      id: 'register-meal',
      icon: <UtensilsCrossed size={20} />,
      label: 'Registrar comida',
      onClick: () => {
        setFabOpen(false);
        setRecetarioTab('calendar');
        setTimeout(() => window.dispatchEvent(new CustomEvent('openMealFeedback')), 100);
      }
    }
  ];

  const getHomeFABActions = (): FABAction[] => [
    {
      id: 'quick-routine',
      icon: <Zap size={20} />,
      label: 'Rutina rápida',
      variant: 'ai',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openRoutinePanel'));
      }
    },
    {
      id: 'new-space',
      icon: <HomeIcon size={20} />,
      label: 'Nuevo espacio',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openSpacesPanel'));
      }
    },
    {
      id: 'new-employee',
      icon: <Users size={20} />,
      label: 'Empleado',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openEmployeesPanel'));
      }
    },
    {
      id: 'new-task',
      icon: <ClipboardList size={20} />,
      label: 'Nueva tarea',
      onClick: () => {
        setFabOpen(false);
        window.dispatchEvent(new CustomEvent('openTaskModal'));
      }
    }
  ];

  const getHoyFABActions = (): FABAction[] => [
    {
      id: 'go-suggestions',
      icon: <Sparkles size={20} />,
      label: 'Sugerencias IA',
      variant: 'ai',
      onClick: () => navigateToRecetario('suggestions')
    },
    {
      id: 'go-calendar',
      icon: <UtensilsCrossed size={20} />,
      label: 'Ver menú',
      onClick: () => navigateToRecetario('calendar')
    },
    {
      id: 'go-market',
      icon: <ShoppingCart size={20} />,
      label: 'Mercado',
      onClick: () => navigateToRecetario('market')
    },
    {
      id: 'go-hogar',
      icon: <HomeIcon size={20} />,
      label: 'Tareas hogar',
      onClick: () => navigateToHogar()
    }
  ];

  const getFABActions = (): FABAction[] => {
    switch (activeSection) {
      case 'hoy':
        return getHoyFABActions();
      case 'recetario':
        return getRecetarioFABActions();
      case 'hogar':
        return getHomeFABActions();
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando recetario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Content - pb-32 para dejar espacio para los tabs secundarios */}
      <main className="pb-32">
        {activeSection === 'hoy' && (
          <TodayDashboard
            onNavigateToRecetario={(tab) => navigateToRecetario(tab as 'calendar' | 'market' | 'recipes' | 'suggestions' | undefined)}
            onNavigateToHogar={navigateToHogar}
          />
        )}

        {activeSection === 'recetario' && (
          <RecetarioSection
            activeTab={recetarioTab}
            onTabChange={setRecetarioTab}
            recipes={recipes}
            marketItems={marketItems}
            pendingSuggestions={pendingSuggestions}
            onUpdate={handleUpdate}
          />
        )}

        {activeSection === 'hogar' && (
          <HomeView />
        )}

        {activeSection === 'ajustes' && (
          <SettingsView />
        )}
      </main>

      {/* Bottom Navigation with Smart FAB */}
      <BottomNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        fabOpen={fabOpen}
        onFabToggle={toggleFab}
        fabActions={getFABActions()}
        recetarioTab={recetarioTab}
        onRecetarioTabChange={setRecetarioTab}
        pendingSuggestions={pendingSuggestions}
      />
    </div>
  );
}
