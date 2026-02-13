'use client';

import HomeSetupWizard from './HomeSetupWizard';
import EmployeesPanel from './EmployeesPanel';
import EmployeeDetailModal from './EmployeeDetailModal';
import SpacesPanel from './SpacesPanel';
import ScheduleGenerator from './ScheduleGenerator';
import ScheduleOptimizer from './ScheduleOptimizer';
import DailyDashboard from './DailyDashboard';
import WeeklyCalendar from './WeeklyCalendar';
import QuickRoutines from './QuickRoutines';
import CleaningRating from './CleaningRating';
import EmployeeCheckIn from './EmployeeCheckIn';
import CleaningHistory from './CleaningHistory';
import SuppliesInventory from './SuppliesInventory';
import InspectionMode from './InspectionMode';
import MonthlyReport from './MonthlyReport';
import ScheduleDashboard from './ScheduleDashboard';
import ScheduleTemplateEditor from './ScheduleTemplateEditor';
import { Household, Space, HomeEmployee, ScheduledTask } from '@/types';

export type ActiveModal =
  | { type: 'none' }
  | { type: 'setup' }
  | { type: 'employees' }
  | { type: 'employeeDetail'; employee: HomeEmployee }
  | { type: 'spaces'; initialCategory: 'interior' | 'exterior' }
  | { type: 'scheduleGenerator' }
  | { type: 'optimizer' }
  | { type: 'dailyDashboard' }
  | { type: 'weeklyCalendar' }
  | { type: 'quickRoutines' }
  | { type: 'rating'; task: ScheduledTask }
  | { type: 'checkIn' }
  | { type: 'history' }
  | { type: 'supplies' }
  | { type: 'inspection'; task: ScheduledTask }
  | { type: 'monthlyReport' }
  | { type: 'scheduleDashboard' }
  | { type: 'scheduleEditor' };

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
  if (activeModal.type === 'none') {
    return null;
  }

  if (activeModal.type === 'setup') {
    return <HomeSetupWizard onComplete={onRefreshData} />;
  }

  return (
    <>
      {activeModal.type === 'employees' && (
        <EmployeesPanel
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onUpdate={onRefreshData}
        />
      )}

      {activeModal.type === 'employeeDetail' && (
        <EmployeeDetailModal
          employee={activeModal.employee}
          householdId={household.id}
          spaces={spaces}
          onClose={onClose}
          onUpdate={onRefreshData}
          onDelete={onRefreshData}
        />
      )}

      {activeModal.type === 'spaces' && (
        <SpacesPanel
          householdId={household.id}
          spaces={spaces}
          initialCategory={activeModal.initialCategory}
          onClose={onClose}
          onUpdate={onRefreshData}
        />
      )}

      {activeModal.type === 'scheduleGenerator' && (
        <ScheduleGenerator
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
          onComplete={onRefreshData}
        />
      )}

      {activeModal.type === 'optimizer' && (
        <ScheduleOptimizer
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
          onApplyOptimization={onRefreshData}
        />
      )}

      {activeModal.type === 'dailyDashboard' && (
        <DailyDashboard
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
          onTaskComplete={onRefreshData}
          onOpenRating={(task) => onOpenModal({ type: 'rating', task })}
          onOpenInspection={(task) => onOpenModal({ type: 'inspection', task })}
        />
      )}

      {activeModal.type === 'weeklyCalendar' && (
        <WeeklyCalendar
          householdId={household.id}
          onClose={onClose}
        />
      )}

      {activeModal.type === 'quickRoutines' && (
        <QuickRoutines
          onClose={onClose}
          onStartRoutine={() => {}}
        />
      )}

      {activeModal.type === 'rating' && (
        <CleaningRating
          task={activeModal.task}
          onClose={onClose}
          onSave={() => {
            onClose();
            onRefreshData();
          }}
        />
      )}

      {activeModal.type === 'checkIn' && (
        <EmployeeCheckIn
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onUpdate={onRefreshData}
        />
      )}

      {activeModal.type === 'history' && (
        <CleaningHistory
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
        />
      )}

      {activeModal.type === 'supplies' && (
        <SuppliesInventory
          householdId={household.id}
          onClose={onClose}
        />
      )}

      {activeModal.type === 'inspection' && (
        <InspectionMode
          task={activeModal.task}
          onClose={onClose}
          onComplete={() => {
            onClose();
            onRefreshData();
          }}
        />
      )}

      {activeModal.type === 'monthlyReport' && (
        <MonthlyReport
          householdId={household.id}
          spaces={spaces}
          employees={employees}
          onClose={onClose}
        />
      )}

      {activeModal.type === 'scheduleDashboard' && (
        <ScheduleDashboard
          householdId={household.id}
          employees={employees}
          onClose={onClose}
          onOpenEditor={() => onOpenModal({ type: 'scheduleEditor' })}
        />
      )}

      {activeModal.type === 'scheduleEditor' && (
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
