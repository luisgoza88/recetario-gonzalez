"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useAnalytics } from "@/lib/analytics/useAnalytics";
import type {
  OnboardingStep,
  ProfileType,
  SpaceConfig,
  EmployeeConfig,
} from "./types";

interface SubmitParams {
  householdName: string;
  membersCount: number;
  dietaryPreferences: string[];
  allergies: string;
  selectedCuisine: string;
  selectedGoals: string[];
  profileType: ProfileType;
  spaces: SpaceConfig[];
  employees: EmployeeConfig[];
  setIsLoading: (loading: boolean) => void;
  navigateTo: (step: OnboardingStep) => void;
}

export function useOnboardingSubmit() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    currentHousehold,
    refreshMemberships,
    isAuthenticated,
  } = useAuth();
  const { onboarding: onboardingAnalytics } = useAnalytics();

  const completeOnboarding = useCallback(
    async (params: SubmitParams) => {
      setError(null);
      if (!isAuthenticated) {
        router.replace("/auth/login?redirect=%2Fonboarding");
        return;
      }

      const {
        householdName,
        membersCount,
        dietaryPreferences,
        allergies,
        selectedCuisine,
        selectedGoals,
        profileType,
        spaces,
        employees,
        setIsLoading,
        navigateTo,
      } = params;

      setIsLoading(true);
      try {
        const { data: householdId, error: saveError } = await supabase.rpc(
          "complete_household_onboarding",
          {
            p_household_id: currentHousehold?.id ?? null,
            p_config: {
              name: householdName,
              members_count: membersCount,
              restrictions: dietaryPreferences.filter(
                (value) => value !== "none",
              ),
              allergies: allergies
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean),
              cuisine_template: selectedCuisine,
              goals: selectedGoals,
              profile_type: profileType,
              spaces:
                profileType === "admin"
                  ? spaces
                      .filter((s) => s.selected)
                      .map((s) => ({ name: s.name, category: s.category }))
                  : [],
              employees: employees.map((e) => ({
                name: e.name,
                role: e.role,
                workDays: e.workDays,
              })),
            },
          },
        );
        if (saveError || !householdId)
          throw new Error(
            saveError?.message || "No se guardó la configuración",
          );
        await refreshMemberships(householdId);

        // 4. Track onboarding completion for analytics
        onboardingAnalytics.completed(
          profileType || "admin",
          membersCount,
          dietaryPreferences,
          [selectedCuisine],
        );

        // Refresh data
        await refreshMemberships();

        // Show complete step
        navigateTo("complete");
        setTimeout(() => {
          router.push("/");
        }, 2500);
      } catch (error) {
        console.error("Error completing onboarding:", error);
        setError(
          "No se pudo guardar la configuración. Tus datos siguen aquí; vuelve a intentarlo.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentHousehold,
      refreshMemberships,
        isAuthenticated,
      onboardingAnalytics,
      router,
    ],
  );

  return { completeOnboarding, error };
}
