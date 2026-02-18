import { NextRequest, NextResponse } from 'next/server';
import type { WeekSchedule } from '@/data/schedule-seed';
import { requireAuth } from '@/lib/api/auth';
import { createAuthenticatedClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { TaskFrequency, TaskPriority } from '@/types';

const SEED_TAG = '[SEED-SCHEDULE]';
const CYCLE_DAYS = 28;

interface FlatSeedTask {
  week: number;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  taskName: string;
  description?: string;
  isSpecial: boolean;
  category: string;
}

interface GroupedTemplate {
  taskName: string;
  category: string;
  descriptions: string[];
  isSpecial: boolean;
  occurrences: number[];
  durations: number[];
}

function flattenSchedule(schedule: WeekSchedule[]): FlatSeedTask[] {
  const flatTasks: FlatSeedTask[] = [];

  for (const week of schedule) {
    for (const day of week.days) {
      for (const task of day.tasks) {
        flatTasks.push({
          week: week.weekNumber,
          dayOfWeek: day.dayOfWeek,
          timeStart: task.timeStart,
          timeEnd: task.timeEnd,
          taskName: task.taskName,
          description: task.description,
          isSpecial: task.isSpecial,
          category: task.category,
        });
      }
    }
  }

  return flatTasks;
}

function getDayOffset(dayOfWeek: number): number {
  const dayMap: Record<number, number> = {
    1: 0, // lunes
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    0: 6, // domingo
  };
  return dayMap[dayOfWeek] ?? 0;
}

function getOccurrenceIndex(week: number, dayOfWeek: number): number {
  return (week - 1) * 7 + getDayOffset(dayOfWeek);
}

function parseClockToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return (h * 60) + m;
}

function getDurationMinutes(start: string, end: string): number {
  const startMin = parseClockToMinutes(start);
  const endMin = parseClockToMinutes(end);
  const diff = endMin - startMin;
  return diff > 0 ? diff : 30;
}

function inferFrequencyDays(occurrences: number[]): number {
  const unique = Array.from(new Set(occurrences)).sort((a, b) => a - b);

  if (unique.length <= 1) {
    return CYCLE_DAYS;
  }

  const diffs: number[] = [];
  for (let i = 1; i < unique.length; i++) {
    diffs.push(unique[i] - unique[i - 1]);
  }

  // Include cycle wrap-around distance
  diffs.push((CYCLE_DAYS - unique[unique.length - 1]) + unique[0]);

  const avg = Math.round(diffs.reduce((sum, d) => sum + d, 0) / diffs.length);
  return Math.max(1, avg);
}

function mapFrequency(frequencyDays: number): TaskFrequency {
  if (frequencyDays <= 1) return 'diaria';
  if (frequencyDays <= 7) return 'semanal';
  if (frequencyDays <= 14) return 'quincenal';
  if (frequencyDays <= 31) return 'mensual';
  return 'personalizada';
}

function mapWorkDays(schedule: WeekSchedule[]): string[] {
  const dayNameByNumber: Record<number, string> = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
  };

  const days = new Set<string>();
  for (const week of schedule) {
    for (const day of week.days) {
      if (day.tasks.length > 0) {
        days.add(dayNameByNumber[day.dayOfWeek] || 'lunes');
      }
    }
  }

  return Array.from(days);
}

function groupTasksIntoTemplates(tasks: FlatSeedTask[]): GroupedTemplate[] {
  const groups = new Map<string, GroupedTemplate>();

  for (const task of tasks) {
    const key = `${task.taskName}::${task.category}`;
    if (!groups.has(key)) {
      groups.set(key, {
        taskName: task.taskName,
        category: task.category,
        descriptions: [],
        isSpecial: false,
        occurrences: [],
        durations: [],
      });
    }

    const group = groups.get(key)!;
    group.isSpecial = group.isSpecial || !!task.isSpecial;
    if (task.description) {
      group.descriptions.push(task.description);
    }
    group.occurrences.push(getOccurrenceIndex(task.week, task.dayOfWeek));
    group.durations.push(getDurationMinutes(task.timeStart, task.timeEnd));
  }

  return Array.from(groups.values());
}

async function resolveHouseholdId(
  userId: string,
  requestedHouseholdId?: string
): Promise<string | null> {
  const supabase = await createAuthenticatedClient();

  if (requestedHouseholdId) {
    const { data: membership } = await supabase
      .from('household_memberships')
      .select('household_id')
      .eq('user_id', userId)
      .eq('household_id', requestedHouseholdId)
      .eq('is_active', true)
      .maybeSingle();

    if (membership?.household_id) {
      return membership.household_id;
    }
  }

  const { data: fallbackMembership } = await supabase
    .from('household_memberships')
    .select('household_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackMembership?.household_id) {
    return fallbackMembership.household_id;
  }

  const { data: ownedHousehold } = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return ownedHousehold?.id || null;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createAuthenticatedClient();

  try {
    const body = await request.json().catch(() => ({}));
    const requestedHouseholdId = typeof body.householdId === 'string' ? body.householdId : undefined;
    const replaceExisting = body.replaceExisting !== false;

    const householdId = await resolveHouseholdId(auth.userId, requestedHouseholdId);
    if (!householdId) {
      return NextResponse.json(
        { error: 'No se encontró un hogar activo para este usuario' },
        { status: 400 }
      );
    }

    const { YOLIMA_SCHEDULE, JOHN_SCHEDULE } = await import('@/data/schedule-seed');
    const seedEmployees = [
      { name: 'Yolima', zone: 'interior' as const, schedule: YOLIMA_SCHEDULE },
      { name: 'John', zone: 'exterior' as const, schedule: JOHN_SCHEDULE },
    ];

    const employeeIds: Record<string, string> = {};

    // 1) Ensure employees exist in home_employees
    for (const emp of seedEmployees) {
      const { data: existing } = await supabase
        .from('home_employees')
        .select('id')
        .eq('household_id', householdId)
        .ilike('name', emp.name)
        .maybeSingle();

      if (existing?.id) {
        employeeIds[emp.name] = existing.id;
        continue;
      }

      const { data: created, error } = await supabase
        .from('home_employees')
        .insert({
          household_id: householdId,
          name: emp.name,
          zone: emp.zone,
          role: 'empleado',
          work_days: mapWorkDays(emp.schedule),
          hours_per_day: 8,
          active: true,
        })
        .select('id')
        .single();

      if (error || !created?.id) {
        logger.error(`Error creating employee ${emp.name}`, { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
          { error: `No se pudo crear empleado: ${emp.name}` },
          { status: 500 }
        );
      }

      employeeIds[emp.name] = created.id;
    }

    // 2) Optionally remove previous seeded templates for this household
    if (replaceExisting) {
      const { data: oldSeeded } = await supabase
        .from('task_templates')
        .select('id')
        .eq('household_id', householdId)
        .ilike('description', `${SEED_TAG}%`);

      const seededIds = (oldSeeded || []).map(t => t.id);
      if (seededIds.length > 0) {
        await supabase
          .from('scheduled_tasks')
          .delete()
          .in('task_template_id', seededIds);

        await supabase
          .from('task_templates')
          .delete()
          .in('id', seededIds);
      }
    }

    // 3) Build unified templates from 4-week schedule
    const templatesToInsert: Array<{
      household_id: string;
      name: string;
      description: string;
      frequency: TaskFrequency;
      frequency_days: number;
      estimated_minutes: number;
      priority: TaskPriority;
      category: string;
      assigned_employee_id: string;
      is_active: boolean;
    }> = [];

    const statsByEmployee: Record<string, number> = {};

    for (const emp of seedEmployees) {
      const flat = flattenSchedule(emp.schedule);
      const grouped = groupTasksIntoTemplates(flat);
      const employeeId = employeeIds[emp.name];

      for (const g of grouped) {
        const frequencyDays = inferFrequencyDays(g.occurrences);
        const frequency = mapFrequency(frequencyDays);
        const avgDuration = Math.round(
          g.durations.reduce((sum, d) => sum + d, 0) / Math.max(1, g.durations.length)
        );

        const firstDescription = g.descriptions[0] ? ` | ${g.descriptions[0]}` : '';

        templatesToInsert.push({
          household_id: householdId,
          name: g.taskName,
          description: `${SEED_TAG} | Seed 4 semanas${firstDescription}`,
          frequency,
          frequency_days: frequencyDays,
          estimated_minutes: Math.max(10, avgDuration),
          priority: g.isSpecial ? 'alta' : 'normal',
          category: g.category,
          assigned_employee_id: employeeId,
          is_active: true,
        });
      }

      statsByEmployee[emp.name] = grouped.length;
    }

    if (templatesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('task_templates')
        .insert(templatesToInsert);

      if (insertError) {
        logger.error('Error inserting seed templates', { error: insertError instanceof Error ? insertError.message : String(insertError) });
        return NextResponse.json(
          { error: 'No se pudieron insertar las plantillas del seed' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Plantillas de cronograma importadas al sistema unificado',
      householdId,
      stats: {
        totalTemplates: templatesToInsert.length,
        byEmployee: statsByEmployee,
        employees: employeeIds,
      }
    });

  } catch (error) {
    logger.error('Seed schedule error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createAuthenticatedClient();

  try {
    const { searchParams } = new URL(request.url);
    const requestedHouseholdId = searchParams.get('householdId') || undefined;

    const householdId = await resolveHouseholdId(auth.userId, requestedHouseholdId);
    if (!householdId) {
      return NextResponse.json(
        { error: 'No se encontró un hogar activo para este usuario' },
        { status: 400 }
      );
    }

    const { data: templates, count } = await supabase
      .from('task_templates')
      .select('id, frequency, assigned_employee_id, employee:home_employees(id, name)', { count: 'exact' })
      .eq('household_id', householdId)
      .ilike('description', `${SEED_TAG}%`);

    const { data: employees } = await supabase
      .from('home_employees')
      .select('id, name, zone')
      .eq('household_id', householdId)
      .in('name', ['Yolima', 'John']);

    const byEmployee: Record<string, number> = {};
    const byFrequency: Record<string, number> = {};

    templates?.forEach((t) => {
      const empName = (t.employee as { name?: string } | null)?.name || 'Sin asignar';
      byEmployee[empName] = (byEmployee[empName] || 0) + 1;

      const freq = t.frequency || 'personalizada';
      byFrequency[freq] = (byFrequency[freq] || 0) + 1;
    });

    return NextResponse.json({
      householdId,
      totalSeededTemplates: count || 0,
      byEmployee,
      byFrequency,
      employees: employees?.map(e => ({ id: e.id, name: e.name, zone: e.zone })) || []
    });

  } catch (error) {
    logger.error('Get schedule stats error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
