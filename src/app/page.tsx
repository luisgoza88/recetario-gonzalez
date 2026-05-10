"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { OfflineBadge } from "@/components/ui/OfflineIndicator";
import {
  useRecipes,
  useMarketItems,
  useSuggestionsCount,
  useRefreshAppData,
} from "@/lib/hooks/useAppData";
import Spinner from "@/components/ui/Spinner";

// Loading spinner fallback for dynamic imports
const DynamicLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Spinner size="lg" />
  </div>
);

// Heavy components loaded dynamically to reduce initial JS bundle
const RecetarioSection = dynamic(
  () => import("@/components/sections/RecetarioSection"),
  {
    loading: () => <DynamicLoadingSpinner />,
    ssr: false,
  },
);

const HomeView = dynamic(() => import("@/components/home/HomeView"), {
  loading: () => <DynamicLoadingSpinner />,
  ssr: false,
});

const TodayDashboard = dynamic(
  () => import("@/components/sections/TodayDashboard"),
  {
    loading: () => <DynamicLoadingSpinner />,
    ssr: false,
  },
);

const SettingsView = dynamic(
  () => import("@/components/sections/SettingsView"),
  {
    loading: () => <DynamicLoadingSpinner />,
    ssr: false,
  },
);

const AICommandCenter = dynamic(
  () => import("@/components/ai/AICommandCenter"),
  {
    loading: () => <DynamicLoadingSpinner />,
    ssr: false,
  },
);

const FloatingAIAssistant = dynamic(
  () => import("@/components/FloatingAIAssistant"),
  {
    ssr: false,
  },
);

const ProactiveSuggestionToast = dynamic(
  () =>
    import("@/components/ai/ProactiveSuggestionToast").then(
      (m) => m.ProactiveSuggestionToast,
    ),
  { ssr: false },
);

const YolimaView = dynamic(() => import("@/components/yolima/YolimaView"), {
  loading: () => <DynamicLoadingSpinner />,
  ssr: false,
});
import { useAppStore } from "@/lib/stores/useAppStore";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useProactiveAlerts } from "@/lib/hooks/useProactiveAlerts";
import logger from "@/lib/logger";

export default function Home() {
  // Check if user is employee → render YolimaView (simplified mode)
  const auth = useOptionalAuth();
  const isEmployee = auth?.isEmployee?.() ?? false;

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

  // ─── Proactive alerts ────────────────────────────────────────────────────────
  const { alerts: proactiveAlerts, dismissForHours } = useProactiveAlerts({
    autoGenerateOnMount: !isEmployee,
    refreshIntervalMs: 30 * 60 * 1000,
  });

  // Alerta de mayor prioridad (top 1) para mostrar en el toast
  const topAlert = proactiveAlerts[0] ?? null;
  const [toastDismissedId, setToastDismissedId] = useState<string | null>(null);
  const visibleToast =
    topAlert && topAlert.id !== toastDismissedId ? topAlert : null;

  /** Maneja la accion del toast y navega al destino correcto */
  const handleToastAction = () => {
    if (!visibleToast?.action) return;
    const { type, payload } = visibleToast.action;
    const p = payload as Record<string, string> | undefined;

    if (type === "navigate" && p?.tab) {
      navigateToRecetario(
        p.tab as "calendar" | "market" | "recipes" | "suggestions",
      );
    } else if (type === "add_to_shopping_list") {
      // Navega al mercado; la lista se gestiona alli
      navigateToRecetario("market");
    } else {
      logger.warn("ProactiveSuggestionToast: accion desconocida", {
        type,
        payload,
      });
    }
  };

  // Fetch pending AI proposals count
  useEffect(() => {
    if (!householdId) return;

    const fetchProposals = async () => {
      const { count } = await supabase
        .from("ai_action_queue")
        .select("*", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("status", "pending");

      setPendingAIProposals(count || 0);
    };

    fetchProposals();

    // Subscribe to changes
    const subscription = supabase
      .channel("ai_proposals")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_action_queue",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          fetchProposals();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [householdId]);

  // Navigation from SmartFAB is now handled reactively via Zustand store
  // (navigateTo action). The CustomEvent listener for 'appNavigate' has been removed.

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
          <Spinner size="xl" className="mx-auto mb-4" />
          <p className="text-gray-600">Cargando recetario...</p>
        </div>
      </div>
    );
  }

  // ─── Modo Yolima: vista simplificada para empleados ───
  if (isEmployee) {
    return (
      <ErrorBoundary sectionName="Modo Yolima">
        <YolimaView />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Offline status badge - fixed top right */}
      <div className="fixed top-3 right-3 z-50">
        <OfflineBadge />
      </div>

      {/* Content - pb-32 para dejar espacio para los tabs secundarios */}
      <main className="pb-32">
        {activeSection === "hoy" && (
          <ErrorBoundary sectionName="Dashboard">
            <TodayDashboard
              onNavigateToRecetario={(tab) =>
                navigateToRecetario(
                  tab as
                    | "calendar"
                    | "market"
                    | "recipes"
                    | "suggestions"
                    | undefined,
                )
              }
              onNavigateToHogar={navigateToHogar}
            />
          </ErrorBoundary>
        )}

        {activeSection === "recetario" && (
          <ErrorBoundary sectionName="Recetario">
            <RecetarioSection
              activeTab={recetarioTab}
              onTabChange={setRecetarioTab}
              recipes={recipes}
              marketItems={marketItems}
              pendingSuggestions={pendingSuggestions}
              onUpdate={handleUpdate}
            />
          </ErrorBoundary>
        )}

        {activeSection === "hogar" && (
          <ErrorBoundary sectionName="Hogar">
            <HomeView />
          </ErrorBoundary>
        )}

        {activeSection === "ajustes" && (
          <ErrorBoundary sectionName="Ajustes">
            <SettingsView />
          </ErrorBoundary>
        )}
      </main>

      {/* Proactive AI Suggestion Toast — top-priority alert */}
      {visibleToast && (
        <ProactiveSuggestionToast
          alert={visibleToast}
          onDismiss={() => {
            setToastDismissedId(visibleToast.id);
            dismissForHours(visibleToast.id, 4);
          }}
          onAction={handleToastAction}
        />
      )}

      {/* Floating AI Assistant Chat */}
      <FloatingAIAssistant activeSection={activeSection} />

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
