"use client";

import dynamic from "next/dynamic";
import { Household, Space, HomeEmployee, ScheduledTask } from "@/types";

// Loading spinner fallback for dynamic imports
const ModalLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
  </div>
);

// All modal components loaded dynamically to reduce initial bundle
const HomeSetupWizard = dynamic(() => import("./HomeSetupWizard"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const EmployeesPanel = dynamic(() => import("./EmployeesPanel"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const EmployeeDetailModal = dynamic(() => import("./EmployeeDetailModal"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const SpacesPanel = dynamic(() => import("./SpacesPanel"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const ScheduleGenerator = dynamic(() => import("./ScheduleGenerator"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const ScheduleOptimizer = dynamic(() => import("./ScheduleOptimizer"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const DailyDashboard = dynamic(() => import("./DailyDashboard"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const WeeklyCalendar = dynamic(() => import("./WeeklyCalendar"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const QuickRoutines = dynamic(() => import("./QuickRoutines"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const CleaningRating = dynamic(() => import("./CleaningRating"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const EmployeeCheckIn = dynamic(() => import("./EmployeeCheckIn"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const CleaningHistory = dynamic(() => import("./CleaningHistory"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const SuppliesInventory = dynamic(() => import("./SuppliesInventory"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const InspectionMode = dynamic(() => import("./InspectionMode"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const MonthlyReport = dynamic(() => import("./MonthlyReport"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const ScheduleDashboard = dynamic(() => import("./ScheduleDashboard"), {
  loading: () => <ModalLoadingSpinner />,
  ssr: false,
});

const ScheduleTemplateEditor = dynamic(
  () => import("./ScheduleTemplateEditor"),
  {
    loading: () => <ModalLoadingSpinner />,
    ssr: false,
  },
);

export type ActiveModal =
  | { type: "none" }
  | { type: "setup" }
  | { type: "employees" }
  | { type: "employeeDetail"; employee: HomeEmployee }
  | { type: "spaces"; initialCategory: "interior" | "exterior" }
  | { type: "scheduleGenerator" }
  | { type: "optimizer" }
  | { type: "dailyDashboard" }
  | { type: "weeklyCalendar" }
  | { type: "quickRoutines" }
  | { type: "rating"; task: ScheduledTask }
  | { type: "checkIn" }
  | { type: "history" }
  | { type: "supplies" }
  | { type: "inspection"; task: ScheduledTask }
  | { type: "monthlyReport" }
  | { type: "scheduleDashboard" }
  | { type: "scheduleEditor" };

interface HomeModalsProps {
  activeModal: ActiveModal;
  household: Household;
  spaces: Space[];
  employees: HomeEmployee[];
  todayTasks: ScheduledTask[];
  onClose: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  onRefreshData: () => void;
}

export default function HomeModals({
  activeModal,
  household,
  spaces,
  employees,
  todayTasks,
  onClose,
  onOpenModal,
  onRefreshData,
}: HomeModalsProps) {
  if (activeModal.type === "none") {
    return null;
  }

  if (activeModal.type === "setup") {
    return <HomeSetupWizard onComplete={onRefreshData} />;
  }

  return (
    <>
      {activeModal.type === "employees" && (
        <EmployeesPanel
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onUpdate={onRefreshData}
        />
      )}

      {activeModal.type === "employeeDetail" && (
        <EmployeeDetailModal
          employee={activeModal.employee}
          householdId={household.id}
          spaces={spaces}
          onClose={onClose}
          onUpdate={onRefreshData}
          onDelete={onRefreshData}
        />
      )}

      {activeModal.type === "spaces" && (
        <SpacesPanel
          householdId={household.id}
          spaces={spaces}
          initialCategory={activeModal.initialCategory}
          onClose={onClose}
          onUpdate={onRefreshData}
        />
      )}

      {activeModal.type === "scheduleGenerator" && (
        <ScheduleGenerator
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
          onComplete={onRefreshData}
        />
      )}

      {activeModal.type === "optimizer" && (
        <ScheduleOptimizer
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
          onApplyOptimization={onRefreshData}
        />
      )}

      {activeModal.type === "dailyDashboard" && (
        <DailyDashboard
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
          onTaskComplete={onRefreshData}
          onOpenRating={(task) => onOpenModal({ type: "rating", task })}
          onOpenInspection={(task) => onOpenModal({ type: "inspection", task })}
        />
      )}

      {activeModal.type === "weeklyCalendar" && (
        <WeeklyCalendar householdId={household.id} onClose={onClose} />
      )}

      {activeModal.type === "quickRoutines" && (
        <QuickRoutines onClose={onClose} onStartRoutine={() => {}} />
      )}

      {activeModal.type === "rating" && (
        <CleaningRating
          task={activeModal.task}
          onClose={onClose}
          onSave={() => {
            onClose();
            onRefreshData();
          }}
        />
      )}

      {activeModal.type === "checkIn" && (
        <EmployeeCheckIn
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onUpdate={onRefreshData}
        />
      )}

      {activeModal.type === "history" && (
        <CleaningHistory
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
        />
      )}

      {activeModal.type === "supplies" && (
        <SuppliesInventory householdId={household.id} onClose={onClose} />
      )}

      {activeModal.type === "inspection" && (
        <InspectionMode
          task={activeModal.task}
          onClose={onClose}
          onComplete={() => {
            onClose();
            onRefreshData();
          }}
        />
      )}

      {activeModal.type === "monthlyReport" && (
        <MonthlyReport
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
        />
      )}

      {activeModal.type === "scheduleDashboard" && (
        <ScheduleDashboard
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onOpenEditor={() => onOpenModal({ type: "scheduleEditor" })}
        />
      )}

      {activeModal.type === "scheduleEditor" && (
        <ScheduleTemplateEditor
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onSave={() => {
            // Recargar datos despues de guardar
          }}
        />
      )}
    </>
  );
}
