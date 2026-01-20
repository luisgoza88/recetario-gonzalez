'use client';

import { useState, useEffect } from 'react';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import RecetarioSection from '@/components/sections/RecetarioSection';
import HomeView from '@/components/home/HomeView';
import TodayDashboard from '@/components/sections/TodayDashboard';
import SettingsView from '@/components/sections/SettingsView';
import AICommandCenter from '@/components/ai/AICommandCenter';
import { useRecipes, useMarketItems, useSuggestionsCount, useRefreshAppData } from '@/lib/hooks/useAppData';
import { useAppStore } from '@/lib/stores/useAppStore';
import { useHouseholdId } from '@/lib/stores/useHouseholdStore';
import { supabase } from '@/lib/supabase/client';

export default function Home() {
  // Estado global con Zustand (navegación y UI)
  const {
    activeSection,
    recetarioTab,
    fabOpen,
    setActiveSection,
    setRecetarioTab,
    toggleFab,
    navigateToRecetario,
    navigateToHogar,
  } = useAppStore();

  // AI Command Center state
  const [showAICommandCenter, setShowAICommandCenter] = useState(false);
  const [pendingAIProposals, setPendingAIProposals] = useState(0);
  const householdId = useHouseholdId();

  // Fetch pending AI proposals count
  useEffect(() => {
    if (!householdId) return;

    const fetchProposals = async () => {
      const { count } = await supabase
        .from('ai_action_queue')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('status', 'pending');

      setPendingAIProposals(count || 0);
    };

    fetchProposals();

    // Subscribe to changes
    const subscription = supabase
      .channel('ai_proposals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_action_queue',
        filter: `household_id=eq.${householdId}`
      }, () => {
        fetchProposals();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [householdId]);

  // Listen for navigation events from SmartFAB quick actions
  useEffect(() => {
    const handleAppNavigate = (e: CustomEvent<{ section: string; tab?: string }>) => {
      const { section, tab } = e.detail;

      if (section === 'recetario' && tab) {
        navigateToRecetario(tab as 'calendar' | 'market' | 'recipes' | 'suggestions');
      } else if (section === 'hogar') {
        navigateToHogar();
      } else {
        setActiveSection(section as 'hoy' | 'recetario' | 'hogar' | 'ajustes');
      }
    };

    window.addEventListener('appNavigate' as keyof WindowEventMap, handleAppNavigate as EventListener);
    return () => {
      window.removeEventListener('appNavigate' as keyof WindowEventMap, handleAppNavigate as EventListener);
    };
  }, [navigateToRecetario, navigateToHogar, setActiveSection]);

  // Datos con TanStack Query (cache automático, refetch inteligente)
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: marketItems = [], isLoading: itemsLoading } = useMarketItems();
  const { data: pendingSuggestions = 0 } = useSuggestionsCount();
  const refreshAppData = useRefreshAppData();

  const loading = recipesLoading || itemsLoading;

  const handleUpdate = () => {
    refreshAppData();
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

      {/* AI Command Center Overlay - fullscreen above everything */}
      {showAICommandCenter && (
        <div className="fixed inset-0 z-[100] bg-gray-50">
          <AICommandCenter
            onClose={() => setShowAICommandCenter(false)}
            householdId={householdId || undefined}
          />
        </div>
      )}

      {/* Bottom Navigation with AI FAB */}
      <BottomNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        fabOpen={fabOpen}
        onFabToggle={toggleFab}
        fabActions={[]} // No longer used - SmartFAB handles its own actions
        recetarioTab={recetarioTab}
        onRecetarioTabChange={setRecetarioTab}
        pendingSuggestions={pendingSuggestions}
        onOpenAICommandCenter={() => setShowAICommandCenter(true)}
        pendingAIProposals={pendingAIProposals}
      />
    </div>
  );
}
