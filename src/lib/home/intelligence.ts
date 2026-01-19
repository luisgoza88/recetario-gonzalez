/**
 * Home Intelligence Engine
 *
 * This module provides intelligent algorithms for:
 * - Learning task durations from historical data
 * - Calculating employee performance scores
 * - Balancing workload by minutes (not just task count)
 * - Predicting future workload issues
 */

import { supabase } from '@/lib/supabase/client';
import {
  getDefaultTaskDuration,
  DEFAULT_EMPLOYEE_SCORES,
  DEFAULT_WORK_MINUTES_PER_DAY,
  MIN_SAMPLES_FOR_LEARNING,
} from './defaults';

// Types
export interface TaskDurationData {
  taskId: string;
  taskName: string;
  spaceId: string;
  spaceName: string;
  estimatedMinutes: number;
  learnedMinutes: number;
  sampleCount: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface EmployeeScore {
  employeeId: string;
  employeeName: string;
  overallScore: number; // 0-100
  metrics: {
    avgRating: number;        // Average task rating (1-5)
    speedScore: number;       // How fast vs estimated (0-100)
    reliabilityScore: number; // Completion rate (0-100)
    consistencyScore: number; // Low variance = high consistency (0-100)
  };
  totalTasksCompleted: number;
  totalMinutesWorked: number;
}

export interface WorkloadBalance {
  employeeId: string;
  employeeName: string;
  zone: 'interior' | 'exterior';
  assignedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  isUnderloaded: boolean;
  tasks: Array<{
    taskId: string;
    taskName: string;
    minutes: number;
  }>;
}

export interface WorkloadPrediction {
  date: string;
  type: 'overload' | 'underload' | 'imbalance' | 'bottleneck';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedEmployee?: string;
  affectedSpace?: string;
  suggestedAction: string;
}

// Constants
const MIN_SAMPLES_FOR_CONFIDENCE = {
  low: 1,
  medium: 5,
  high: 15
};

const DEFAULT_TASK_MINUTES = 30;
const WORK_HOURS_PER_DAY = 8;
const WORK_MINUTES_PER_DAY = WORK_HOURS_PER_DAY * 60;

/**
 * Calculate learned duration for a task based on historical completion data
 */
export async function calculateLearnedDuration(
  taskId: string,
  spaceId: string
): Promise<TaskDurationData | null> {

  // Get task info
  const { data: task } = await supabase
    .from('space_tasks')
    .select('id, name, estimated_minutes')
    .eq('id', taskId)
    .single();

  if (!task) return null;

  // Get space info
  const { data: space } = await supabase
    .from('spaces')
    .select('id, name')
    .eq('id', spaceId)
    .single();

  // Get historical actual_minutes from schedule_tasks
  const { data: history } = await supabase
    .from('schedule_tasks')
    .select('actual_minutes, rating')
    .eq('task_id', taskId)
    .eq('space_id', spaceId)
    .eq('status', 'completed')
    .not('actual_minutes', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(50); // Use last 50 completions

  const sampleCount = history?.length || 0;
  const estimatedMinutes = task.estimated_minutes || DEFAULT_TASK_MINUTES;

  // Calculate learned duration
  let learnedMinutes = estimatedMinutes;
  if (history && history.length > 0) {
    // Use weighted average: more recent completions have more weight
    let totalWeight = 0;
    let weightedSum = 0;

    history.forEach((h, index) => {
      const weight = 1 / (index + 1); // Decay weight for older entries
      weightedSum += (h.actual_minutes || estimatedMinutes) * weight;
      totalWeight += weight;
    });

    learnedMinutes = Math.round(weightedSum / totalWeight);
  }

  // Determine confidence level
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (sampleCount >= MIN_SAMPLES_FOR_CONFIDENCE.high) {
    confidence = 'high';
  } else if (sampleCount >= MIN_SAMPLES_FOR_CONFIDENCE.medium) {
    confidence = 'medium';
  }

  return {
    taskId,
    taskName: task.name,
    spaceId,
    spaceName: space?.name || 'Unknown',
    estimatedMinutes,
    learnedMinutes,
    sampleCount,
    confidence
  };
}

/**
 * Get learned durations for all tasks in a space
 */
export async function getSpaceTaskDurations(spaceId: string): Promise<TaskDurationData[]> {

  const { data: tasks } = await supabase
    .from('space_tasks')
    .select('id')
    .eq('space_id', spaceId);

  if (!tasks) return [];

  const results: TaskDurationData[] = [];
  for (const task of tasks) {
    const duration = await calculateLearnedDuration(task.id, spaceId);
    if (duration) results.push(duration);
  }

  return results;
}

/**
 * Calculate performance score for an employee
 */
export async function calculateEmployeeScore(
  employeeId: string
): Promise<EmployeeScore | null> {

  // Get employee info
  const { data: employee } = await supabase
    .from('home_employees')
    .select('id, name, zone')
    .eq('id', employeeId)
    .single();

  if (!employee) return null;

  // Get all completed tasks for this employee
  const { data: tasks } = await supabase
    .from('schedule_tasks')
    .select(`
      id,
      actual_minutes,
      rating,
      status,
      space_tasks (
        estimated_minutes
      )
    `)
    .eq('assigned_to', employeeId)
    .order('completed_at', { ascending: false })
    .limit(100);

  if (!tasks || tasks.length === 0) {
    return {
      employeeId,
      employeeName: employee.name,
      overallScore: 50, // Neutral score for new employees
      metrics: {
        avgRating: 0,
        speedScore: 50,
        reliabilityScore: 0,
        consistencyScore: 50
      },
      totalTasksCompleted: 0,
      totalMinutesWorked: 0
    };
  }

  // Calculate metrics
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const tasksWithRating = completedTasks.filter(t => t.rating !== null);
  const tasksWithActualTime = completedTasks.filter(t => t.actual_minutes !== null);

  // 1. Average Rating (1-5 scale)
  const avgRating = tasksWithRating.length > 0
    ? tasksWithRating.reduce((sum, t) => sum + (t.rating || 0), 0) / tasksWithRating.length
    : 0;

  // 2. Speed Score (how close to estimated time)
  let speedScore = 50;
  if (tasksWithActualTime.length > 0) {
    const speedRatios = tasksWithActualTime.map(t => {
      const estimated = (t.space_tasks as { estimated_minutes?: number })?.estimated_minutes || DEFAULT_TASK_MINUTES;
      const actual = t.actual_minutes || estimated;
      return estimated / actual; // > 1 means faster than expected
    });
    const avgSpeedRatio = speedRatios.reduce((a, b) => a + b, 0) / speedRatios.length;
    // Convert to 0-100 scale: 0.5x speed = 0, 1x = 50, 1.5x+ = 100
    speedScore = Math.min(100, Math.max(0, (avgSpeedRatio - 0.5) * 100));
  }

  // 3. Reliability Score (completion rate)
  const reliabilityScore = tasks.length > 0
    ? (completedTasks.length / tasks.length) * 100
    : 0;

  // 4. Consistency Score (low variance in completion times)
  let consistencyScore = 50;
  if (tasksWithActualTime.length >= 3) {
    const times = tasksWithActualTime.map(t => t.actual_minutes || 0);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation
    // Low CV = high consistency: CV of 0 = 100, CV of 1+ = 0
    consistencyScore = Math.max(0, 100 - (cv * 100));
  }

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (avgRating / 5) * 25 +      // 25% weight for ratings
    speedScore * 0.25 +          // 25% weight for speed
    reliabilityScore * 0.30 +    // 30% weight for reliability
    consistencyScore * 0.20      // 20% weight for consistency
  );

  // Total minutes worked
  const totalMinutesWorked = tasksWithActualTime.reduce(
    (sum, t) => sum + (t.actual_minutes || 0), 0
  );

  return {
    employeeId,
    employeeName: employee.name,
    overallScore,
    metrics: {
      avgRating: Math.round(avgRating * 10) / 10,
      speedScore: Math.round(speedScore),
      reliabilityScore: Math.round(reliabilityScore),
      consistencyScore: Math.round(consistencyScore)
    },
    totalTasksCompleted: completedTasks.length,
    totalMinutesWorked
  };
}

/**
 * Calculate workload balance for a specific date
 */
export async function calculateWorkloadBalance(
  householdId: string,
  date: string,
  employeeWorkHours?: Record<string, number> // Optional custom hours per employee
): Promise<WorkloadBalance[]> {

  // Get all employees for this household
  const { data: employees } = await supabase
    .from('home_employees')
    .select('id, name, zone')
    .eq('household_id', householdId)
    .eq('is_active', true);

  if (!employees) return [];

  // Get scheduled tasks for this date
  const { data: scheduledTasks } = await supabase
    .from('schedule_tasks')
    .select(`
      id,
      assigned_to,
      space_tasks (
        id,
        name,
        estimated_minutes
      )
    `)
    .eq('household_id', householdId)
    .eq('scheduled_date', date);

  // Type for space_tasks relation
  type SpaceTaskData = { id: string; name: string; estimated_minutes?: number | null };

  // Get learned durations for better estimates
  const taskDurations: Record<string, number> = {};
  if (scheduledTasks) {
    for (const st of scheduledTasks) {
      // Handle both array and single object cases from Supabase
      const rawTaskData = st.space_tasks;
      const taskData: SpaceTaskData | null = Array.isArray(rawTaskData)
        ? (rawTaskData[0] as SpaceTaskData || null)
        : (rawTaskData as SpaceTaskData | null);
      if (taskData) {
        // Try to get learned duration
        const learned = await calculateLearnedDuration(taskData.id, taskData.id);
        taskDurations[taskData.id] = learned?.learnedMinutes || taskData.estimated_minutes || DEFAULT_TASK_MINUTES;
      }
    }
  }

  // Build workload for each employee
  const workloads: WorkloadBalance[] = employees.map(emp => {
    const empTasks = scheduledTasks?.filter(t => t.assigned_to === emp.id) || [];
    const tasks = empTasks.map(t => {
      // Handle both array and single object cases from Supabase
      const rawTaskData = t.space_tasks;
      const taskData: SpaceTaskData | null = Array.isArray(rawTaskData)
        ? (rawTaskData[0] as SpaceTaskData || null)
        : (rawTaskData as SpaceTaskData | null);
      return {
        taskId: taskData?.id || '',
        taskName: taskData?.name || 'Unknown',
        minutes: taskDurations[taskData?.id || ''] || taskData?.estimated_minutes || DEFAULT_TASK_MINUTES
      };
    });

    const assignedMinutes = tasks.reduce((sum, t) => sum + t.minutes, 0);
    const availableMinutes = employeeWorkHours?.[emp.id]
      ? employeeWorkHours[emp.id] * 60
      : WORK_MINUTES_PER_DAY;

    const utilizationPercent = availableMinutes > 0
      ? Math.round((assignedMinutes / availableMinutes) * 100)
      : 0;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      zone: emp.zone as 'interior' | 'exterior',
      assignedMinutes,
      availableMinutes,
      utilizationPercent,
      isOverloaded: utilizationPercent > 100,
      isUnderloaded: utilizationPercent < 50,
      tasks
    };
  });

  return workloads;
}

/**
 * Smart task assignment that balances by minutes
 */
export async function suggestOptimalAssignment(
  householdId: string,
  date: string,
  unassignedTasks: Array<{ taskId: string; spaceId: string; zone: 'interior' | 'exterior' }>
): Promise<Array<{ taskId: string; suggestedEmployeeId: string; reason: string }>> {

  // Get current workload
  const workloads = await calculateWorkloadBalance(householdId, date);

  // Get employee scores
  const scores: Record<string, EmployeeScore> = {};
  for (const w of workloads) {
    const score = await calculateEmployeeScore(w.employeeId);
    if (score) scores[w.employeeId] = score;
  }

  // Get employee-space assignments for preference
  const { data: spaceAssignments } = await supabase
    .from('employee_space_assignments')
    .select('employee_id, space_id, is_primary, priority_order');

  const suggestions: Array<{ taskId: string; suggestedEmployeeId: string; reason: string }> = [];

  // Create mutable copy of workloads
  const currentMinutes: Record<string, number> = {};
  workloads.forEach(w => { currentMinutes[w.employeeId] = w.assignedMinutes; });

  for (const task of unassignedTasks) {
    // Get learned duration for this task
    const duration = await calculateLearnedDuration(task.taskId, task.spaceId);
    const taskMinutes = duration?.learnedMinutes || DEFAULT_TASK_MINUTES;

    // Find eligible employees
    const eligibleEmployees = workloads.filter(w => {
      // Primary filter: same zone OR has cross-zone assignment
      const sameZone = w.zone === task.zone;
      const hasCrossAssignment = spaceAssignments?.some(
        a => a.employee_id === w.employeeId && a.space_id === task.spaceId
      );
      return sameZone || hasCrossAssignment;
    });

    if (eligibleEmployees.length === 0) continue;

    // Score each eligible employee for this task
    const employeeScores = eligibleEmployees.map(emp => {
      const currentLoad = currentMinutes[emp.employeeId] || 0;
      const newLoad = currentLoad + taskMinutes;
      const loadPercent = newLoad / emp.availableMinutes;

      // Check if primary assignee for this space
      const isPrimary = spaceAssignments?.some(
        a => a.employee_id === emp.employeeId && a.space_id === task.spaceId && a.is_primary
      );

      // Get priority order (lower = better)
      const priorityOrder = spaceAssignments?.find(
        a => a.employee_id === emp.employeeId && a.space_id === task.spaceId
      )?.priority_order || 999;

      // Calculate assignment score
      let score = 0;

      // Favor employees with lower current utilization (balance workload)
      score += (1 - Math.min(loadPercent, 1.5)) * 40; // Max 40 points

      // Favor primary assignees
      if (isPrimary) score += 25;

      // Favor higher priority order
      score += Math.max(0, 20 - priorityOrder * 5);

      // Favor employees with better performance scores
      const empScore = scores[emp.employeeId]?.overallScore || 50;
      score += (empScore / 100) * 15;

      return { employee: emp, score, loadPercent, isPrimary };
    });

    // Sort by score and pick the best
    employeeScores.sort((a, b) => b.score - a.score);
    const best = employeeScores[0];

    // Update current minutes for next iteration
    currentMinutes[best.employee.employeeId] =
      (currentMinutes[best.employee.employeeId] || 0) + taskMinutes;

    // Generate reason
    let reason = '';
    if (best.isPrimary) {
      reason = `Asignado principal de este espacio`;
    } else if (best.loadPercent < 0.7) {
      reason = `Menor carga de trabajo (${Math.round(best.loadPercent * 100)}%)`;
    } else {
      reason = `Mejor balance de equipo`;
    }

    suggestions.push({
      taskId: task.taskId,
      suggestedEmployeeId: best.employee.employeeId,
      reason
    });
  }

  return suggestions;
}

/**
 * Predict workload issues for upcoming dates
 */
export async function predictWorkloadIssues(
  householdId: string,
  startDate: string,
  daysAhead: number = 7
): Promise<WorkloadPrediction[]> {
  const predictions: WorkloadPrediction[] = [];

  const start = new Date(startDate);

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Get workload for this date
    const workloads = await calculateWorkloadBalance(householdId, dateStr);

    // Check for issues
    for (const workload of workloads) {
      // Overload detection
      if (workload.utilizationPercent > 110) {
        predictions.push({
          date: dateStr,
          type: 'overload',
          severity: workload.utilizationPercent > 130 ? 'high' : 'medium',
          message: `${workload.employeeName} tiene ${workload.utilizationPercent}% de carga`,
          affectedEmployee: workload.employeeName,
          suggestedAction: 'Reasignar tareas a otro empleado o reprogramar'
        });
      }

      // Underload detection (potential waste)
      if (workload.utilizationPercent < 40 && workload.tasks.length > 0) {
        predictions.push({
          date: dateStr,
          type: 'underload',
          severity: 'low',
          message: `${workload.employeeName} tiene solo ${workload.utilizationPercent}% de carga`,
          affectedEmployee: workload.employeeName,
          suggestedAction: 'Asignar tareas adicionales o combinar días'
        });
      }
    }

    // Check for imbalance between employees
    if (workloads.length >= 2) {
      const utilizations = workloads.map(w => w.utilizationPercent);
      const maxUtil = Math.max(...utilizations);
      const minUtil = Math.min(...utilizations);

      if (maxUtil - minUtil > 40) {
        const overworked = workloads.find(w => w.utilizationPercent === maxUtil);
        const underworked = workloads.find(w => w.utilizationPercent === minUtil);

        predictions.push({
          date: dateStr,
          type: 'imbalance',
          severity: maxUtil - minUtil > 60 ? 'high' : 'medium',
          message: `Desbalance: ${overworked?.employeeName} (${maxUtil}%) vs ${underworked?.employeeName} (${minUtil}%)`,
          suggestedAction: 'Redistribuir tareas entre empleados'
        });
      }
    }
  }

  // Sort by date and severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  predictions.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return predictions;
}

/**
 * Get summary statistics for the intelligence system
 */
export async function getIntelligenceSummary(householdId: string): Promise<{
  totalLearnedTasks: number;
  avgConfidence: number;
  employeeScores: EmployeeScore[];
  weeklyPredictions: WorkloadPrediction[];
}> {

  // Get all tasks for this household
  const { data: spaces } = await supabase
    .from('spaces')
    .select('id')
    .eq('household_id', householdId);

  let totalLearnedTasks = 0;
  let totalConfidence = 0;

  if (spaces) {
    for (const space of spaces) {
      const durations = await getSpaceTaskDurations(space.id);
      totalLearnedTasks += durations.filter(d => d.sampleCount > 0).length;
      durations.forEach(d => {
        totalConfidence += d.confidence === 'high' ? 1 : d.confidence === 'medium' ? 0.5 : 0.2;
      });
    }
  }

  // Get employee scores
  const { data: employees } = await supabase
    .from('home_employees')
    .select('id')
    .eq('household_id', householdId)
    .eq('is_active', true);

  const employeeScores: EmployeeScore[] = [];
  if (employees) {
    for (const emp of employees) {
      const score = await calculateEmployeeScore(emp.id);
      if (score) employeeScores.push(score);
    }
  }

  // Get weekly predictions
  const today = new Date().toISOString().split('T')[0];
  const weeklyPredictions = await predictWorkloadIssues(householdId, today, 7);

  return {
    totalLearnedTasks,
    avgConfidence: totalLearnedTasks > 0 ? totalConfidence / totalLearnedTasks : 0,
    employeeScores,
    weeklyPredictions
  };
}
