import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { YOLIMA_SCHEDULE, JOHN_SCHEDULE, WeekSchedule } from '@/data/schedule-seed';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Aplanar la estructura anidada de WeekSchedule[] a una lista plana
function flattenSchedule(schedule: WeekSchedule[]) {
  const flatTasks: Array<{
    week: number;
    dayOfWeek: number;
    timeStart: string;
    timeEnd: string;
    taskName: string;
    description?: string;
    isSpecial: boolean;
    category: string;
    orderIndex: number;
  }> = [];

  for (const week of schedule) {
    for (const day of week.days) {
      let orderIndex = 0;
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
          orderIndex: orderIndex++
        });
      }
    }
  }

  return flatTasks;
}

export async function POST() {
  try {
    // 1. Verificar/crear empleados
    const employees = [
      { name: 'Yolima', zone: 'interior', schedule: YOLIMA_SCHEDULE },
      { name: 'John', zone: 'exterior', schedule: JOHN_SCHEDULE }
    ];

    const employeeIds: Record<string, string> = {};

    for (const emp of employees) {
      // Buscar empleado existente
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('name', emp.name)
        .single();

      if (existing) {
        employeeIds[emp.name] = existing.id;
      } else {
        // Crear empleado
        const { data: newEmp, error } = await supabase
          .from('employees')
          .insert({
            name: emp.name,
            zone: emp.zone,
            active: true
          })
          .select('id')
          .single();

        if (error) {
          console.error(`Error creating employee ${emp.name}:`, error);
          return NextResponse.json({ error: `Failed to create employee ${emp.name}` }, { status: 500 });
        }

        employeeIds[emp.name] = newEmp.id;
      }
    }

    // 2. Limpiar plantillas existentes
    await supabase
      .from('schedule_templates')
      .delete()
      .in('employee_id', Object.values(employeeIds));

    // 3. Aplanar y convertir schedules
    const yolimaTasks = flattenSchedule(YOLIMA_SCHEDULE);
    const johnTasks = flattenSchedule(JOHN_SCHEDULE);

    // 4. Insertar plantillas de Yolima
    let yolimaCount = 0;
    for (const task of yolimaTasks) {
      const { error } = await supabase
        .from('schedule_templates')
        .insert({
          employee_id: employeeIds['Yolima'],
          week_number: task.week,
          day_of_week: task.dayOfWeek,
          time_start: task.timeStart,
          time_end: task.timeEnd,
          task_name: task.taskName,
          task_description: task.description || null,
          is_special: task.isSpecial || false,
          category: task.category,
          order_index: task.orderIndex || 0
        });

      if (error) {
        console.error('Error inserting Yolima task:', error);
      } else {
        yolimaCount++;
      }
    }

    // 5. Insertar plantillas de John
    let johnCount = 0;
    for (const task of johnTasks) {
      const { error } = await supabase
        .from('schedule_templates')
        .insert({
          employee_id: employeeIds['John'],
          week_number: task.week,
          day_of_week: task.dayOfWeek,
          time_start: task.timeStart,
          time_end: task.timeEnd,
          task_name: task.taskName,
          task_description: task.description || null,
          is_special: task.isSpecial || false,
          category: task.category,
          order_index: task.orderIndex || 0
        });

      if (error) {
        console.error('Error inserting John task:', error);
      } else {
        johnCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule templates imported successfully',
      stats: {
        yolimaTasks: yolimaCount,
        johnTasks: johnCount,
        totalTasks: yolimaCount + johnCount,
        employees: employeeIds
      }
    });

  } catch (error) {
    console.error('Seed schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Obtener estadísticas de las plantillas
    const { data: templates, count } = await supabase
      .from('schedule_templates')
      .select('*', { count: 'exact' });

    const { data: employees } = await supabase
      .from('employees')
      .select('id, name, zone');

    // Agrupar por empleado
    const byEmployee: Record<string, number> = {};
    templates?.forEach(t => {
      const emp = employees?.find(e => e.id === t.employee_id);
      const name = emp?.name || 'Unknown';
      byEmployee[name] = (byEmployee[name] || 0) + 1;
    });

    // Agrupar por semana
    const byWeek: Record<number, number> = {};
    templates?.forEach(t => {
      byWeek[t.week_number] = (byWeek[t.week_number] || 0) + 1;
    });

    return NextResponse.json({
      totalTemplates: count,
      byEmployee,
      byWeek,
      employees: employees?.map(e => ({ id: e.id, name: e.name, zone: e.zone }))
    });

  } catch (error) {
    console.error('Get schedule stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
