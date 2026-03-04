"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  Sparkles,
  Leaf,
  Globe,
  Target,
  ClipboardList,
  Check,
} from "lucide-react";
import { createElement } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/lib/analytics/useAnalytics";
import type {
  OnboardingStep,
  ProfileType,
  SpaceConfig,
  EmployeeConfig,
  StepDefinition,
  OnboardingState,
} from "./types";
import { DEFAULT_SPACES } from "./constants";

export function useOnboardingState(): OnboardingState {
  const router = useRouter();
  const { currentHousehold } = useAuth();
  const { onboarding: onboardingAnalytics } = useAnalytics();

  // Step management
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Profile selection
  const [profileType, setProfileType] = useState<ProfileType>(null);

  // Household config
  const [householdName, setHouseholdName] = useState("");
  const [membersCount, setMembersCount] = useState(4);

  // Dietary preferences
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([
    "none",
  ]);
  const [allergies, setAllergies] = useState<string>("");

  // Cuisine template
  const [selectedCuisine, setSelectedCuisine] = useState<string>("colombiana");

  // Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    "meal-planning",
    "shopping",
  ]);

  // Spaces config
  const [spaces, setSpaces] = useState<SpaceConfig[]>(DEFAULT_SPACES);
  const [customSpace, setCustomSpace] = useState("");

  // Employees config
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(null);
  const [employees, setEmployees] = useState<EmployeeConfig[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: "Empleada doméstica",
  });
  const [newEmployeeDays, setNewEmployeeDays] = useState<string[]>([
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
  ]);

  // Define steps based on profile
  const steps: StepDefinition[] = useMemo(() => {
    const baseSteps: StepDefinition[] = [
      {
        id: "welcome",
        label: "Bienvenida",
        icon: createElement(Sparkles, { size: 18 }),
      },
      {
        id: "profile",
        label: "Perfil",
        icon: createElement(Users, { size: 18 }),
      },
      {
        id: "household",
        label: "Hogar",
        icon: createElement(Home, { size: 18 }),
      },
      {
        id: "dietary",
        label: "Dieta",
        icon: createElement(Leaf, { size: 18 }),
      },
      {
        id: "cuisine",
        label: "Cocina",
        icon: createElement(Globe, { size: 18 }),
      },
      {
        id: "goals",
        label: "Objetivos",
        icon: createElement(Target, { size: 18 }),
      },
    ];

    if (profileType === "admin") {
      baseSteps.push(
        {
          id: "spaces",
          label: "Espacios",
          icon: createElement(Home, { size: 18 }),
        },
        {
          id: "employees",
          label: "Empleados",
          icon: createElement(Users, { size: 18 }),
        },
      );
    }

    baseSteps.push(
      {
        id: "summary",
        label: "Resumen",
        icon: createElement(ClipboardList, { size: 18 }),
      },
      {
        id: "complete",
        label: "Listo",
        icon: createElement(Check, { size: 18 }),
      },
    );

    return baseSteps;
  }, [profileType]);

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  // Check if already completed onboarding
  useEffect(() => {
    if (currentHousehold?.setup_completed) {
      router.push("/");
    }
  }, [currentHousehold, router]);

  // Initialize with household name if exists
  useEffect(() => {
    if (currentHousehold?.name) {
      setHouseholdName(currentHousehold.name);
    }
  }, [currentHousehold]);

  // Track onboarding started (only once on mount)
  useEffect(() => {
    onboardingAnalytics.started();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation with animation
  const navigateTo = useCallback((nextStep: OnboardingStep) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 200);
  }, []);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      onboardingAnalytics.stepCompleted(
        step,
        currentStepIndex + 1,
        steps.length,
      );
      navigateTo(steps[nextIndex].id);
    }
  }, [currentStepIndex, steps, step, onboardingAnalytics, navigateTo]);

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      navigateTo(steps[prevIndex].id);
    }
  }, [currentStepIndex, steps, navigateTo]);

  const skipOnboarding = useCallback(() => {
    onboardingAnalytics.skipped(step);
    localStorage.setItem("onboarding_skipped", "true");
    router.push("/");
  }, [step, onboardingAnalytics, router]);

  // Dietary preferences toggle
  const toggleDietary = useCallback((id: string) => {
    if (id === "none") {
      setDietaryPreferences(["none"]);
    } else {
      setDietaryPreferences((prev) => {
        const withoutNone = prev.filter((p) => p !== "none");
        if (prev.includes(id)) {
          const result = withoutNone.filter((p) => p !== id);
          return result.length === 0 ? ["none"] : result;
        }
        return [...withoutNone, id];
      });
    }
  }, []);

  // Goals toggle
  const toggleGoal = useCallback((id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }, []);

  // Space management
  const toggleSpace = useCallback((spaceId: string) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === spaceId ? { ...s, selected: !s.selected } : s)),
    );
  }, []);

  const addCustomSpace = useCallback(() => {
    if (!customSpace.trim()) return;
    setSpaces((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customSpace.trim(),
        category: "interior",
        selected: true,
      },
    ]);
    setCustomSpace("");
  }, [customSpace]);

  // Employee management
  const addEmployee = useCallback(() => {
    if (!newEmployee.name.trim()) return;
    setEmployees((prev) => [
      ...prev,
      {
        id: `emp-${Date.now()}`,
        name: newEmployee.name.trim(),
        role: newEmployee.role,
        workDays: newEmployeeDays,
      },
    ]);
    setNewEmployee({ name: "", role: "Empleada doméstica" });
    setNewEmployeeDays(["lunes", "martes", "miercoles", "jueves", "viernes"]);
  }, [newEmployee, newEmployeeDays]);

  const removeEmployee = useCallback((empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
  }, []);

  const toggleEmployeeDay = useCallback((day: string) => {
    setNewEmployeeDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }, []);

  // Can proceed to next step?
  const canProceed = useCallback(() => {
    switch (step) {
      case "profile":
        return profileType !== null;
      case "household":
        return householdName.trim().length > 0;
      case "dietary":
        return dietaryPreferences.length > 0;
      case "cuisine":
        return selectedCuisine !== "";
      case "goals":
        return selectedGoals.length > 0;
      case "employees":
        return hasEmployees !== null;
      default:
        return true;
    }
  }, [
    step,
    profileType,
    householdName,
    dietaryPreferences,
    selectedCuisine,
    selectedGoals,
    hasEmployees,
  ]);

  return {
    step,
    isLoading,
    animating,
    steps,
    currentStepIndex,

    profileType,
    setProfileType,

    householdName,
    setHouseholdName,
    membersCount,
    setMembersCount,

    dietaryPreferences,
    allergies,
    setAllergies,
    toggleDietary,

    selectedCuisine,
    setSelectedCuisine,

    selectedGoals,
    toggleGoal,

    spaces,
    customSpace,
    setCustomSpace,
    toggleSpace,
    addCustomSpace,

    hasEmployees,
    setHasEmployees,
    employees,
    newEmployee,
    setNewEmployee,
    newEmployeeDays,
    toggleEmployeeDay,
    addEmployee,
    removeEmployee,

    nextStep,
    prevStep,
    skipOnboarding,
    canProceed,

    setIsLoading,
    navigateTo,
  };
}
