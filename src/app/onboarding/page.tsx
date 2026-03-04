"use client";

import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-200 z-50">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
          style={{
            width: `${((state.currentStepIndex + 1) / state.steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Header with skip */}
      {state.step !== "complete" && (
        <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-40">
          <div className="text-sm text-gray-500">
            {state.currentStepIndex + 1} / {state.steps.length}
          </div>
          {state.step !== "summary" && (
            <button
              onClick={state.skipOnboarding}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Saltar <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Step indicators (mini) */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40">
        {state.steps.slice(0, -1).map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < state.currentStepIndex
                ? "w-6 bg-green-500"
                : i === state.currentStepIndex
                  ? "w-8 bg-green-500"
                  : "w-4 bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-20 pb-32">
        <div
          className={`transition-all duration-200 ${state.animating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
        >
          {renderStepContent()}
        </div>
      </div>

      {/* Navigation buttons */}
      {state.step !== "complete" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200">
          <div className="max-w-lg mx-auto flex gap-3">
            {state.currentStepIndex > 0 && (
              <button
                onClick={state.prevStep}
                className="flex-1 py-4 px-6 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
              >
                <ChevronLeft size={20} />
                Atrás
              </button>
            )}

            {state.step === "summary" ? (
              <button
                onClick={handleComplete}
                disabled={state.isLoading}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/25"
              >
                {state.isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Finalizar configuración
                    <Sparkles size={20} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={state.nextStep}
                disabled={!state.canProceed()}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/25 disabled:shadow-none"
              >
                Continuar
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
