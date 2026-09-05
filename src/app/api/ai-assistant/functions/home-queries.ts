import { householdDate } from "@/lib/menu-date";
import { createAIClient } from "@/lib/ai-assistant/db";
import { logger } from "@/lib/logger";

async function getSupabase() {
  return createAIClient();
}

export async function getTodayTasks() {
  try {
    const supabase = await getSupabase();
    const today = householdDate(new Date());

    const { data: tasks, error } = await supabase
      .from("scheduled_tasks")
      .select(
        "id, status, task_template_id, employee_id, scheduled_date, created_at, task_template:task_templates(name, category, estimated_minutes)",
      )
      .eq("scheduled_date", today)
      .order("created_at");

    // Fetch employee names separately to avoid ambiguity
    const employeeNames: Record<string, string> = {};
    if (tasks && tasks.length > 0) {
      const empIds = [
        ...new Set(tasks.map((t) => t.employee_id).filter(Boolean)),
      ];
      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from("home_employees")
          .select("id, name")
          .throwOnError()
          .in("id", empIds as string[]);
        emps?.forEach((e) => {
          employeeNames[e.id] = e.name;
        });
      }
    }

    if (error) {
      logger.error("Error fetching tasks", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { message: "No hay tareas programadas para hoy", tasks: [] };
    }

    if (!tasks || tasks.length === 0) {
      return { message: "No hay tareas programadas para hoy", tasks: [] };
    }

    return {
      message: `${tasks.length} tareas para hoy`,
      tasks: tasks.map((t) => ({
        id: t.id,
        task: t.task_template?.name || "Tarea",
        employee:
          (t.employee_id ? employeeNames[t.employee_id] : undefined) ||
          "Sin asignar",
        status: t.status || "pendiente",
        category: t.task_template?.category || "general",
        estimated_minutes: t.task_template?.estimated_minutes,
      })),
    };
  } catch (err) {
    logger.error("getTodayTasks error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { message: "No hay tareas programadas para hoy", tasks: [] };
  }
}

export async function getEmployeeSchedule(
  employeeName: string,
  _period: string = "today",
) {
  const supabase = await getSupabase();
  const { data: employee } = await supabase
    .from("home_employees")
    .select("id, name")
    .throwOnError()
    .ilike("name", `%${employeeName}%`)
    .single();

  if (!employee) {
    return { error: `No se encontró empleado "${employeeName}"` };
  }

  const today = householdDate(new Date());

  const { data: tasks } = await supabase
    .from("scheduled_tasks")
    .select(
      "*, task_template:task_templates(name, category, estimated_minutes)",
    )
    .throwOnError()
    .eq("employee_id", employee.id)
    .eq("scheduled_date", today)
    .order("created_at");

  return {
    employee: employee.name,
    date: today,
    tasks:
      tasks?.map((t) => ({
        id: t.id,
        task: t.task_template?.name || "Tarea",
        status: t.status,
        category: t.task_template?.category || "general",
        estimated_minutes: t.task_template?.estimated_minutes,
      })) || [],
  };
}

export async function getTasksSummary() {
  try {
    const supabase = await getSupabase();
    const today = householdDate(new Date());

    const { data: tasks, error } = await supabase
      .from("scheduled_tasks")
      .select("status, employee_id")
      .eq("scheduled_date", today);

    if (error || !tasks || tasks.length === 0) {
      return {
        message: "No hay tareas programadas para hoy",
        total: 0,
        completed: 0,
        in_progress: 0,
        pending: 0,
        progress_percent: 0,
      };
    }

    const completed = tasks.filter((t) => t.status === "completada").length;
    const inProgress = tasks.filter((t) => t.status === "en_progreso").length;
    const pending = tasks.filter((t) => t.status === "pendiente").length;
    const total = tasks.length;

    return {
      message: `${completed}/${total} tareas completadas`,
      total,
      completed,
      in_progress: inProgress,
      pending,
      progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  } catch (err) {
    logger.error("getTasksSummary error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      message: "No hay tareas programadas para hoy",
      total: 0,
      completed: 0,
      progress_percent: 0,
    };
  }
}

export async function listSpaces(householdId?: string) {
  try {
    const supabase = await getSupabase();
    let query = supabase
      .from("spaces")
      .select(`*, space_type:space_types(name, icon, category)`)
      .order("custom_name");

    if (householdId) {
      query = query.eq("household_id", householdId);
    }

    const { data: spaces, error } = await query;

    if (error) {
      logger.error("Error listing spaces", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: "Error al obtener espacios",
        spaces: [],
      };
    }

    return {
      success: true,
      count: spaces?.length || 0,
      spaces:
        spaces?.map((s) => ({
          id: s.id,
          name: s.custom_name,
          type: s.space_type?.name || "Desconocido",
          icon: s.space_type?.icon || "🏠",
          category: s.category,
          usage_level: s.usage_level,
          has_bathroom: s.has_bathroom,
          area_sqm: s.area_sqm,
          notes: s.notes,
        })) || [],
    };
  } catch (err) {
    logger.error("listSpaces error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al obtener espacios", spaces: [] };
  }
}

export async function getSpaceDetails(spaceId?: string, spaceName?: string) {
  try {
    const supabase = await getSupabase();
    let query = supabase
      .from("spaces")
      .select(
        `*, space_type:space_types(id, name, icon, category, default_tasks)`,
      );

    if (spaceId) {
      query = query.eq("id", spaceId);
    } else if (spaceName) {
      query = query.ilike("custom_name", `%${spaceName}%`);
    } else {
      return { success: false, message: "Se requiere space_id o space_name" };
    }

    const { data: space, error } = await query.single();

    if (error || !space) {
      return { success: false, message: "Espacio no encontrado" };
    }

    return {
      success: true,
      space: {
        id: space.id,
        name: space.custom_name,
        type: space.space_type?.name || "Desconocido",
        type_id: space.space_type_id,
        icon: space.space_type?.icon || "🏠",
        category: space.category,
        usage_level: space.usage_level,
        has_bathroom: space.has_bathroom,
        area_sqm: space.area_sqm,
        characteristics: space.characteristics,
        notes: space.notes,
        default_tasks: space.space_type?.default_tasks || [],
      },
    };
  } catch (err) {
    logger.error("getSpaceDetails error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al obtener detalles del espacio" };
  }
}

export async function listEmployees(
  householdId?: string,
  activeOnly: boolean = true,
) {
  try {
    const supabase = await getSupabase();
    let query = supabase.from("home_employees").select("*").order("name");

    if (householdId) {
      query = query.eq("household_id", householdId);
    }
    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data: employees, error } = await query;

    if (error) {
      logger.error("Error listing employees", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: "Error al obtener empleados",
        employees: [],
      };
    }

    return {
      success: true,
      count: employees?.length || 0,
      employees:
        employees?.map((e) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          zone: e.zone,
          work_days: e.work_days,
          hours_per_day: e.hours_per_day,
          phone: e.phone,
          active: e.active,
          notes: e.notes,
        })) || [],
    };
  } catch (err) {
    logger.error("listEmployees error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      message: "Error al obtener empleados",
      employees: [],
    };
  }
}

export async function getEmployeeDetails(
  employeeId?: string,
  employeeName?: string,
) {
  try {
    const supabase = await getSupabase();
    let query = supabase.from("home_employees").select("*");

    if (employeeId) {
      query = query.eq("id", employeeId);
    } else if (employeeName) {
      query = query.ilike("name", `%${employeeName}%`);
    } else {
      return {
        success: false,
        message: "Se requiere employee_id o employee_name",
      };
    }

    const { data: employee, error } = await query.single();

    if (error || !employee) {
      return { success: false, message: "Empleado no encontrado" };
    }

    return {
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        zone: employee.zone,
        work_days: employee.work_days,
        hours_per_day: employee.hours_per_day,
        phone: employee.phone,
        active: employee.active,
        notes: employee.notes,
      },
    };
  } catch (err) {
    logger.error("getEmployeeDetails error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      message: "Error al obtener detalles del empleado",
    };
  }
}

export async function listTaskTemplates(
  employeeId?: string,
  _weekNumber?: number,
  category?: string,
  householdId?: string,
) {
  try {
    const supabase = await getSupabase();
    let query = supabase
      .from("task_templates")
      .select(
        `*, employee:home_employees(id, name), space:spaces(id, custom_name)`,
      )
      .eq("is_active", true)
      .order("name");

    if (householdId) query = query.eq("household_id", householdId);
    if (employeeId) query = query.eq("assigned_employee_id", employeeId);
    if (category) query = query.eq("category", category);

    const { data: templates, error } = await query;

    if (error) {
      logger.error("Error listing task templates", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: "Error al obtener plantillas",
        templates: [],
      };
    }

    return {
      success: true,
      count: templates?.length || 0,
      templates:
        templates?.map((t) => ({
          id: t.id,
          task_name: t.name,
          description: t.description,
          employee:
            (t.employee as unknown as { name: string } | null)?.name ||
            "Sin asignar",
          space: (t.space as unknown as { custom_name: string } | null)
            ?.custom_name,
          frequency: t.frequency,
          estimated_minutes: t.estimated_minutes,
          priority: t.priority,
          category: t.category,
        })) || [],
    };
  } catch (err) {
    logger.error("listTaskTemplates error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      message: "Error al obtener plantillas",
      templates: [],
    };
  }
}
