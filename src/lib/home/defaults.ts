/**
 * Default Task Duration Estimates
 *
 * These are baseline estimates used when no historical data exists.
 * Based on industry standards and typical cleaning times for residential spaces.
 * Values are in MINUTES.
 */

// Task duration estimates by task type/keyword
export const DEFAULT_TASK_DURATIONS: Record<string, number> = {
  // Interior - Quick tasks (10-20 min)
  'tender cama': 10,
  'hacer cama': 10,
  'sacar basura': 10,
  'vaciar basura': 10,
  'cambiar toallas': 10,
  'limpiar espejos': 15,
  'limpiar mesa': 15,
  'organizar': 20,
  'recoger': 15,

  // Interior - Medium tasks (20-35 min)
  'barrer': 25,
  'aspirar': 30,
  'trapear': 30,
  'limpiar polvo': 25,
  'limpiar muebles': 25,
  'limpiar ventanas': 35,
  'lavar platos': 25,
  'limpiar mesones': 20,
  'limpiar cocina': 35,

  // Interior - Long tasks (35-60 min)
  'limpiar baño': 45,
  'limpiar sanitario': 20,
  'limpiar ducha': 30,
  'limpiar lavamanos': 15,
  'limpiar electrodomésticos': 40,
  'lavar ropa': 45,
  'planchar': 60,
  'limpiar horno': 45,
  'limpiar nevera': 40,

  // Exterior - Quick tasks (10-20 min)
  'regar plantas': 15,
  'recoger hojas': 20,
  'recoger basura': 15,

  // Exterior - Medium tasks (25-45 min)
  'barrer terraza': 25,
  'barrer patio': 30,
  'limpiar muebles exterior': 30,
  'podar': 45,
  'fertilizar': 30,

  // Exterior - Long tasks (45-90 min)
  'limpiar piscina': 60,
  'aspirar piscina': 45,
  'verificar químicos': 20,
  'limpiar filtros': 30,
  'cortar césped': 90,
  'limpiar garaje': 60,
};

// Fallback duration by space type if no task match
export const DEFAULT_DURATION_BY_SPACE_TYPE: Record<string, number> = {
  // Interior
  'sala': 30,
  'cocina': 35,
  'habitacion': 25,
  'habitación': 25,
  'dormitorio': 25,
  'baño': 35,
  'comedor': 25,
  'estudio': 25,
  'oficina': 25,
  'lavanderia': 40,
  'lavandería': 40,
  'closet': 20,

  // Exterior
  'jardin': 45,
  'jardín': 45,
  'piscina': 50,
  'terraza': 30,
  'balcon': 25,
  'balcón': 25,
  'garaje': 45,
  'patio': 35,
  'entrada': 20,
};

// Default employee work capacity (minutes per day)
export const DEFAULT_WORK_MINUTES_PER_DAY = 480; // 8 hours

// Default employee scores for new employees
export const DEFAULT_EMPLOYEE_SCORES = {
  overallScore: 70, // Start at 70% (good, not perfect)
  avgRating: 4.0,   // Assume good performance
  speedScore: 70,
  reliabilityScore: 80,
  consistencyScore: 70,
};

// Minimum samples needed before trusting learned data
export const MIN_SAMPLES_FOR_LEARNING = {
  low: 1,     // Use learned after 1 completion
  medium: 5,  // Good confidence after 5
  high: 15,   // High confidence after 15
};

/**
 * Get estimated duration for a task
 * Uses keyword matching against our defaults
 */
export function getDefaultTaskDuration(taskName: string, spaceType?: string): number {
  const normalizedTask = taskName.toLowerCase().trim();

  // 1. Try exact match
  if (DEFAULT_TASK_DURATIONS[normalizedTask]) {
    return DEFAULT_TASK_DURATIONS[normalizedTask];
  }

  // 2. Try keyword matching
  for (const [keyword, duration] of Object.entries(DEFAULT_TASK_DURATIONS)) {
    if (normalizedTask.includes(keyword) || keyword.includes(normalizedTask)) {
      return duration;
    }
  }

  // 3. Try space type fallback
  if (spaceType) {
    const normalizedSpace = spaceType.toLowerCase().trim();
    for (const [spaceKey, duration] of Object.entries(DEFAULT_DURATION_BY_SPACE_TYPE)) {
      if (normalizedSpace.includes(spaceKey) || spaceKey.includes(normalizedSpace)) {
        return duration;
      }
    }
  }

  // 4. Ultimate fallback
  return 30; // 30 minutes is a reasonable middle ground
}

/**
 * Get work capacity for an employee
 * Can be customized based on their schedule
 */
export function getEmployeeWorkCapacity(
  workDays?: string[],
  hoursPerDay: number = 8
): { dailyMinutes: number; weeklyMinutes: number } {
  const dailyMinutes = hoursPerDay * 60;
  const daysPerWeek = workDays?.length || 5;

  return {
    dailyMinutes,
    weeklyMinutes: dailyMinutes * daysPerWeek,
  };
}

/**
 * Calculate initial workload balance targets
 * Returns recommended minutes per employee per day
 */
export function calculateBalanceTargets(
  totalTaskMinutes: number,
  employeeCount: number,
  bufferPercent: number = 15 // 15% buffer for unexpected tasks
): { targetPerEmployee: number; maxPerEmployee: number } {
  if (employeeCount === 0) {
    return { targetPerEmployee: 0, maxPerEmployee: 0 };
  }

  const targetPerEmployee = Math.ceil(totalTaskMinutes / employeeCount);
  const maxPerEmployee = Math.ceil(targetPerEmployee * (1 + bufferPercent / 100));

  return { targetPerEmployee, maxPerEmployee };
}

/**
 * Standard task templates with durations
 * Useful for initial setup wizard
 */
export const STANDARD_TASK_TEMPLATES = {
  interior: {
    sala: [
      { name: 'Barrer/Aspirar', minutes: 25, frequency: 'cada_3_dias' },
      { name: 'Trapear', minutes: 30, frequency: 'semanal' },
      { name: 'Limpiar muebles', minutes: 25, frequency: 'semanal' },
      { name: 'Limpiar ventanas', minutes: 35, frequency: 'quincenal' },
    ],
    cocina: [
      { name: 'Limpiar mesones', minutes: 15, frequency: 'diaria' },
      { name: 'Lavar platos', minutes: 25, frequency: 'diaria' },
      { name: 'Barrer/Trapear', minutes: 25, frequency: 'diaria' },
      { name: 'Limpiar electrodomésticos', minutes: 40, frequency: 'semanal' },
      { name: 'Sacar basura', minutes: 10, frequency: 'diaria' },
    ],
    habitacion: [
      { name: 'Tender cama', minutes: 10, frequency: 'diaria' },
      { name: 'Barrer/Aspirar', minutes: 25, frequency: 'cada_3_dias' },
      { name: 'Trapear', minutes: 25, frequency: 'semanal' },
      { name: 'Limpiar polvo', minutes: 20, frequency: 'semanal' },
      { name: 'Organizar', minutes: 20, frequency: 'semanal' },
    ],
    bano: [
      { name: 'Limpiar sanitario', minutes: 20, frequency: 'cada_3_dias' },
      { name: 'Limpiar lavamanos', minutes: 15, frequency: 'cada_3_dias' },
      { name: 'Limpiar ducha', minutes: 30, frequency: 'semanal' },
      { name: 'Trapear', minutes: 20, frequency: 'cada_3_dias' },
      { name: 'Cambiar toallas', minutes: 10, frequency: 'cada_3_dias' },
    ],
  },
  exterior: {
    jardin: [
      { name: 'Regar plantas', minutes: 15, frequency: 'diaria' },
      { name: 'Podar', minutes: 45, frequency: 'quincenal' },
      { name: 'Recoger hojas', minutes: 20, frequency: 'semanal' },
      { name: 'Fertilizar', minutes: 30, frequency: 'mensual' },
    ],
    piscina: [
      { name: 'Verificar químicos', minutes: 20, frequency: 'diaria' },
      { name: 'Limpiar filtros', minutes: 30, frequency: 'semanal' },
      { name: 'Aspirar fondo', minutes: 45, frequency: 'semanal' },
      { name: 'Limpiar bordes', minutes: 25, frequency: 'semanal' },
    ],
    terraza: [
      { name: 'Barrer', minutes: 25, frequency: 'cada_3_dias' },
      { name: 'Limpiar muebles', minutes: 30, frequency: 'semanal' },
      { name: 'Regar plantas', minutes: 15, frequency: 'diaria' },
    ],
  },
};

/**
 * Frequency to days mapping
 */
export const FREQUENCY_TO_DAYS: Record<string, number> = {
  'diaria': 1,
  'cada_2_dias': 2,
  'cada_3_dias': 3,
  'semanal': 7,
  'quincenal': 14,
  'mensual': 30,
};

/**
 * Calculate total weekly minutes for a space based on standard tasks
 */
export function calculateWeeklyMinutesForSpace(spaceType: string): number {
  const normalizedType = spaceType.toLowerCase();

  // Check interior
  for (const [type, tasks] of Object.entries(STANDARD_TASK_TEMPLATES.interior)) {
    if (normalizedType.includes(type)) {
      return tasks.reduce((total, task) => {
        const frequencyDays = FREQUENCY_TO_DAYS[task.frequency] || 7;
        const timesPerWeek = 7 / frequencyDays;
        return total + (task.minutes * timesPerWeek);
      }, 0);
    }
  }

  // Check exterior
  for (const [type, tasks] of Object.entries(STANDARD_TASK_TEMPLATES.exterior)) {
    if (normalizedType.includes(type)) {
      return tasks.reduce((total, task) => {
        const frequencyDays = FREQUENCY_TO_DAYS[task.frequency] || 7;
        const timesPerWeek = 7 / frequencyDays;
        return total + (task.minutes * timesPerWeek);
      }, 0);
    }
  }

  // Default
  return 120; // 2 hours per week as fallback
}
