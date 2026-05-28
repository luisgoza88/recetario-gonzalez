"use client";

import { ChevronLeft, ArrowRight, Sparkles } from "lucide-react";
import { useOnboardingState } from "./useOnboardingState";
import { useOnboardingSubmit } from "./useOnboardingSubmit";
import {
  WelcomeStep,
  ProfileStep,
  HouseholdStep,
  DietaryStep,
  CuisineStep,
  GoalsStep,
  SpacesStep,
  EmployeesStep,
  SummaryStep,
  CompleteStep,
} from "./steps";

export default function OnboardingPage() {
  const state = useOnboardingState();
  const { completeOnboarding } = useOnboardingSubmit();

  const handleComplete = () => {
    completeOnboarding({
      householdName: state.householdName,
      membersCount: state.membersCount,
      dietaryPreferences: state.dietaryPreferences,
      allergies: state.allergies,
      selectedCuisine: state.selectedCuisine,
      selectedGoals: state.selectedGoals,
      profileType: state.profileType,
      spaces: state.spaces,
      employees: state.employees,
      setIsLoading: state.setIsLoading,
      navigateTo: state.navigateTo,
    });
  };

  const renderStepContent = () => {
    switch (state.step) {
      case "welcome":
        return <WelcomeStep />;
      case "profile":
        return (
          <ProfileStep
            profileType={state.profileType}
            setProfileType={state.setProfileType}
          />
        );
      case "household":
        return (
          <HouseholdStep
            householdName={state.householdName}
            setHouseholdName={state.setHouseholdName}
            membersCount={state.membersCount}
            setMembersCount={state.setMembersCount}
          />
        );
      case "dietary":
        return (
          <DietaryStep
            dietaryPreferences={state.dietaryPreferences}
            toggleDietary={state.toggleDietary}
            allergies={state.allergies}
            setAllergies={state.setAllergies}
          />
        );
      case "cuisine":
        return (
          <CuisineStep
            selectedCuisine={state.selectedCuisine}
            setSelectedCuisine={state.setSelectedCuisine}
          />
        );
      case "goals":
        return (
          <GoalsStep
            selectedGoals={state.selectedGoals}
            toggleGoal={state.toggleGoal}
          />
        );
      case "spaces":
        return (
          <SpacesStep
            spaces={state.spaces}
            customSpace={state.customSpace}
            setCustomSpace={state.setCustomSpace}
            toggleSpace={state.toggleSpace}
            addCustomSpace={state.addCustomSpace}
          />
        );
      case "employees":
        return (
          <EmployeesStep
            hasEmployees={state.hasEmployees}
            setHasEmployees={state.setHasEmployees}
            employees={state.employees}
            newEmployee={state.newEmployee}
            setNewEmployee={state.setNewEmployee}
            newEmployeeDays={state.newEmployeeDays}
            toggleEmployeeDay={state.toggleEmployeeDay}
            addEmployee={state.addEmployee}
            removeEmployee={state.removeEmployee}
          />
        );
      case "summary":
        return (
          <SummaryStep
            householdName={state.householdName}
            membersCount={state.membersCount}
            selectedCuisine={state.selectedCuisine}
            dietaryPreferences={state.dietaryPreferences}
            selectedGoals={state.selectedGoals}
            profileType={state.profileType}
            spaces={state.spaces}
            employees={state.employees}
          />
        );
      case "complete":
        return <CompleteStep />;
      default:
        return null;
    }
  };

  const isComplete = state.step === "complete";
  const isSummary = state.step === "summary";
  const showSkip = !isComplete && !isSummary;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Top progress: back + segmented bar + counter */}
      {!isComplete && (
        <div className="px-5 pt-12 pb-3">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            {state.currentStepIndex > 0 && (
              <button
                onClick={state.prevStep}
                aria-label="Atrás"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-[var(--ink)] transition-colors hover:bg-stone-200"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div className="flex flex-1 gap-1">
              {state.steps.slice(0, -1).map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i <= state.currentStepIndex
                      ? "bg-[var(--accent)]"
                      : "bg-stone-200"
                  }`}
                />
              ))}
            </div>
            <span className="flex-shrink-0 text-[11px] tabular-nums text-[var(--ink-soft)]">
              {state.currentStepIndex + 1}/{state.steps.length}
            </span>
          </div>
        </div>
      )}

      {/* Content (full-screen step) */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="mx-auto max-w-lg">
          <div
            className={`transition-all duration-200 ${
              state.animating
                ? "translate-x-4 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Bottom action: green --accent "Continuar" + skip */}
      {!isComplete && (
        <div className="sticky bottom-0 bg-[var(--bg)]/90 px-6 pb-8 pt-4 backdrop-blur-lg">
          <div className="mx-auto max-w-lg">
            {isSummary ? (
              <button
                onClick={handleComplete}
                disabled={state.isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-green-200 transition-all hover:brightness-95 disabled:opacity-50"
              >
                {state.isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Empezar a usar Recetario
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={state.nextStep}
                disabled={!state.canProceed()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-green-200 transition-all hover:brightness-95 disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
              >
                Continuar
                <ArrowRight size={16} />
              </button>
            )}

            {showSkip && (
              <button
                onClick={state.skipOnboarding}
                className="mt-2 w-full py-2 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              >
                Saltar configuración
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
