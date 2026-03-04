import { ReactNode } from "react";

// ==================== STEP TYPES ====================

export type OnboardingStep =
  | "welcome"
  | "profile"
  | "household"
  | "dietary"
  | "cuisine"
  | "goals"
  | "spaces"
  | "employees"
  | "summary"
  | "complete";

export type ProfileType = "admin" | "family" | "employee" | null;

// ==================== DATA TYPES ====================

export interface DietaryPreference {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface CuisineTemplate {
  id: string;
  name: string;
  flag: string;
  description: string;
  popular: string[];
}

export interface GoalOption {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
}

export interface SpaceConfig {
  id: string;
  name: string;
  category: "interior" | "exterior";
  selected: boolean;
}

export interface EmployeeConfig {
  id: string;
  name: string;
  role: string;
  workDays: string[];
}

export interface StepDefinition {
  id: OnboardingStep;
  label: string;
  icon: ReactNode;
}

// ==================== HOOK RETURN TYPES ====================

export interface OnboardingState {
  // Step management
  step: OnboardingStep;
  isLoading: boolean;
  animating: boolean;
  steps: StepDefinition[];
  currentStepIndex: number;

  // Profile
  profileType: ProfileType;
  setProfileType: (type: ProfileType) => void;

  // Household
  householdName: string;
  setHouseholdName: (name: string) => void;
  membersCount: number;
  setMembersCount: (count: number) => void;

  // Dietary
  dietaryPreferences: string[];
  allergies: string;
  setAllergies: (allergies: string) => void;
  toggleDietary: (id: string) => void;

  // Cuisine
  selectedCuisine: string;
  setSelectedCuisine: (cuisine: string) => void;

  // Goals
  selectedGoals: string[];
  toggleGoal: (id: string) => void;

  // Spaces
  spaces: SpaceConfig[];
  customSpace: string;
  setCustomSpace: (space: string) => void;
  toggleSpace: (spaceId: string) => void;
  addCustomSpace: () => void;

  // Employees
  hasEmployees: boolean | null;
  setHasEmployees: (has: boolean | null) => void;
  employees: EmployeeConfig[];
  newEmployee: { name: string; role: string };
  setNewEmployee: (emp: { name: string; role: string }) => void;
  newEmployeeDays: string[];
  toggleEmployeeDay: (day: string) => void;
  addEmployee: () => void;
  removeEmployee: (empId: string) => void;

  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  canProceed: () => boolean;

  // Submit
  setIsLoading: (loading: boolean) => void;
  navigateTo: (step: OnboardingStep) => void;
}
