"use client";

import { useCallback } from "react";
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
  const { currentHousehold, refreshMemberships } = useAuth();
  const { onboarding: onboardingAnalytics } = useAnalytics();

  const completeOnboarding = useCallback(
    async (params: SubmitParams) => {
      if (!currentHousehold) return;

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
        // 1. Update household settings
        const settings = {
          members_count: membersCount,
          dietary_preferences: dietaryPreferences,
          allergies: allergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          cuisine_template: selectedCuisine,
          goals: selectedGoals,
          profile_type: profileType,
        };

        await supabase
          .from("households")
          .update({
            name: householdName,
            settings,
            setup_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentHousehold.id);

        // 2. Create spaces (if admin selected spaces)
        if (profileType === "admin") {
          const selectedSpaces = spaces.filter((s) => s.selected);
          if (selectedSpaces.length > 0) {
            await supabase.from("spaces").insert(
              selectedSpaces.map((s) => ({
                household_id: currentHousehold.id,
                custom_name: s.name,
                category: s.category,
              })),
            );
          }
        }

        // 3. Create employees (if any)
        if (employees.length > 0) {
          await supabase.from("home_employees").insert(
            employees.map((e) => ({
              household_id: currentHousehold.id,
              name: e.name,
              role: e.role,
              work_days: e.workDays,
            })),
          );
        }

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
      } finally {
        setIsLoading(false);
      }
    },
    [currentHousehold, refreshMemberships, onboardingAnalytics, router],
  );

  return { completeOnboarding };
}
