import { createAIClient } from "@/lib/ai-assistant/db";
import { logger } from "@/lib/logger";

async function getSupabase() {
  return createAIClient();
}

interface TaskTemplateSeed {
  id: string;
  space_id: string | null;
  assigned_employee_id: string | null;
  frequency: string;
  frequency_days: number | null;
  created_at: string | null;
}

function diffInDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function diffInMonths(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function shouldScheduleTemplate(
  template: TaskTemplateSeed,
  targetDate: Date,
): boolean {
  const anchor = template.created_at
    ? new Date(template.created_at)
    : targetDate;
  const anchorDate = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate(),
  );
  const target = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  const daysSinceAnchor = diffInDays(anchorDate, target);
  if (daysSinceAnchor < 0) return false;

  if (template.frequency_days && template.frequency_days > 0) {
    return daysSinceAnchor % template.frequency_days === 0;
  }

  switch (template.frequency) {
    case "diaria":
      return true;
    case "semanal":
      return daysSinceAnchor % 7 === 0;
    case "quincenal":
      return daysSinceAnchor % 14 === 0;
    case "mensual":
      return target.getDate() === anchorDate.getDate();
    case "trimestral":
      return (
        target.getDate() === anchorDate.getDate() &&
        diffInMonths(anchorDate, target) % 3 === 0
      );
    default:
      return false;
  }
}

export async function completeTask(taskName: string, _employeeName?: string) {
  const supabase = await getSupabase();
  const today = new Date().toISOString().split("T")[0];

  // First try scheduled_tasks (unified system)
  const { data: scheduledTasks } = await supabase
    .from("scheduled_tasks")
    .select("id, task_template:task_templates(name)")
    .eq("scheduled_date", today)
    .neq("status", "completada");

  // Filter by name match (task name is in the template)
  const matched = scheduledTasks?.find((t) => {
    const templateName = t.task_template?.name || "";
    return templateName.toLowerCase().includes(taskName.toLowerCase());
  });

  if (!matched) {
    return { success: false, message: `No se encontró la tarea "${taskName}"` };
  }

  const templateName = matched.task_template?.name || taskName;

  await supabase
    .from("scheduled_tasks")
    .update({ status: "completada", completed_at: new Date().toISOString() })
    .eq("id", matched.id);

  return {
    success: true,
    message: `Tarea "${templateName}" marcada como completada`,
  };
}

export async function addQuickTask(
  taskName: string,
  employeeName?: string,
  category?: string,
  householdId?: string,
) {
  const supabase = await getSupabase();
  const today = new Date().toISOString().split("T")[0];

  if (!householdId) {
    return {
      success: false,
      message: "household_id es requerido para crear tareas rápidas",
    };
  }

  let employeeId = null;
  if (employeeName) {
    const { data: emp } = await supabase
      .from("home_employees")
      .select("id")
      .ilike("name", `%${employeeName}%`)
      .single();
    employeeId = emp?.id;
  }

  // Create a task template for this quick task
  const { data: template } = await supabase
    .from("task_templates")
    .insert({
      household_id: householdId,
      name: taskName,
      category: category || "general",
      frequency: "diaria",
      estimated_minutes: 60,
      priority: "normal",
      assigned_employee_id: employeeId,
      is_active: false, // Quick tasks don't repeat
    })
    .select("id")
    .single();

  // Create the scheduled task
  const { error } = await supabase.from("scheduled_tasks").insert({
    household_id: householdId,
    task_template_id: template?.id,
    employee_id: employeeId,
    scheduled_date: today,
    status: "pendiente",
  });

  if (error) {
    return { success: false, message: "No se pudo crear la tarea" };
  }

  return {
    success: true,
    message: `Tarea "${taskName}" creada para hoy${employeeName ? ` (asignada a ${employeeName})` : ""}`,
    affectedTables: ["task_templates", "scheduled_tasks"],
  };
}

export async function createSpace(
  householdId: string,
  name: string,
  spaceType: string,
  category?: string,
  usageLevel?: string,
  hasBathroom?: boolean,
  areaSqm?: number,
  notes?: string,
) {
  try {
    const supabase = await getSupabase();
    const { data: typeData } = await supabase
      .from("space_types")
      .select("id, category")
      .ilike("name", `%${spaceType}%`)
      .single();

    const spaceTypeId = typeData?.id;
    const derivedCategory = category || typeData?.category || "common_area";

    const { data: newSpace, error } = await supabase
      .from("spaces")
      .insert({
        household_id: householdId,
        space_type_id: spaceTypeId,
        custom_name: name,
        category: derivedCategory,
        usage_level: usageLevel || "medium",
        has_bathroom: hasBathroom || false,
        area_sqm: areaSqm,
        notes,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating space", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al crear espacio: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Espacio "${name}" creado exitosamente`,
      space: {
        id: newSpace.id,
        name: newSpace.custom_name,
        type: spaceType,
        category: derivedCategory,
      },
      previousState: null,
      newState: newSpace,
      affectedTables: ["spaces"],
      affectedRecordIds: [newSpace.id],
    };
  } catch (err) {
    logger.error("createSpace error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al crear espacio" };
  }
}

export async function updateSpace(
  spaceId: string,
  updates: {
    name?: string;
    category?: string;
    usageLevel?: string;
    hasBathroom?: boolean;
    areaSqm?: number;
    notes?: string;
  },
) {
  try {
    const supabase = await getSupabase();
    const { data: previousSpace } = await supabase
      .from("spaces")
      .select("*")
      .eq("id", spaceId)
      .single();

    if (!previousSpace) {
      return { success: false, message: "Espacio no encontrado" };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.custom_name = updates.name;
    if (updates.category) updateData.category = updates.category;
    if (updates.usageLevel) updateData.usage_level = updates.usageLevel;
    if (typeof updates.hasBathroom === "boolean")
      updateData.has_bathroom = updates.hasBathroom;
    if (updates.areaSqm) updateData.area_sqm = updates.areaSqm;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data: updatedSpace, error } = await supabase
      .from("spaces")
      .update(updateData)
      .eq("id", spaceId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating space", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al actualizar: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Espacio "${updatedSpace.custom_name}" actualizado`,
      space: { id: updatedSpace.id, name: updatedSpace.custom_name },
      previousState: previousSpace,
      newState: updatedSpace,
      affectedTables: ["spaces"],
      affectedRecordIds: [spaceId],
    };
  } catch (err) {
    logger.error("updateSpace error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al actualizar espacio" };
  }
}

export async function deleteSpace(spaceId: string, confirm: boolean) {
  if (!confirm) {
    return {
      success: false,
      message: "Debe confirmar la eliminación estableciendo confirm: true",
      requires_confirmation: true,
    };
  }

  try {
    const supabase = await getSupabase();
    const { data: previousSpace } = await supabase
      .from("spaces")
      .select("*")
      .eq("id", spaceId)
      .single();

    if (!previousSpace) {
      return { success: false, message: "Espacio no encontrado" };
    }

    const { error } = await supabase.from("spaces").delete().eq("id", spaceId);

    if (error) {
      logger.error("Error deleting space", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, message: `Error al eliminar: ${error.message}` };
    }

    return {
      success: true,
      message: `Espacio "${previousSpace.custom_name}" eliminado`,
      previousState: previousSpace,
      newState: null,
      affectedTables: ["spaces"],
      affectedRecordIds: [spaceId],
    };
  } catch (err) {
    logger.error("deleteSpace error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al eliminar espacio" };
  }
}

export async function createEmployee(
  householdId: string,
  name: string,
  role: string,
  zone?: string,
  workDays?: string[],
  hoursPerDay?: number,
  schedule?: string,
  phone?: string,
  notes?: string,
) {
  try {
    const supabase = await getSupabase();
    const { data: newEmployee, error } = await supabase
      .from("home_employees")
      .insert({
        household_id: householdId,
        name,
        role,
        zone,
        work_days: workDays || [],
        hours_per_day: hoursPerDay,
        schedule,
        phone,
        notes,
        active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating employee", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al crear empleado: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Empleado "${name}" registrado exitosamente`,
      employee: {
        id: newEmployee.id,
        name: newEmployee.name,
        role: newEmployee.role,
      },
      previousState: null,
      newState: newEmployee,
      affectedTables: ["home_employees"],
      affectedRecordIds: [newEmployee.id],
    };
  } catch (err) {
    logger.error("createEmployee error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al crear empleado" };
  }
}

export async function updateEmployee(
  employeeId: string,
  updates: {
    name?: string;
    role?: string;
    zone?: string;
    workDays?: string[];
    hoursPerDay?: number;
    schedule?: string;
    phone?: string;
    notes?: string;
    active?: boolean;
  },
) {
  try {
    const supabase = await getSupabase();
    const { data: previousEmployee } = await supabase
      .from("home_employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (!previousEmployee) {
      return { success: false, message: "Empleado no encontrado" };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.role) updateData.role = updates.role;
    if (updates.zone !== undefined) updateData.zone = updates.zone;
    if (updates.workDays) updateData.work_days = updates.workDays;
    if (updates.hoursPerDay) updateData.hours_per_day = updates.hoursPerDay;
    if (updates.schedule !== undefined) updateData.schedule = updates.schedule;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (typeof updates.active === "boolean") updateData.active = updates.active;

    const { data: updatedEmployee, error } = await supabase
      .from("home_employees")
      .update(updateData)
      .eq("id", employeeId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating employee", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al actualizar: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Empleado "${updatedEmployee.name}" actualizado`,
      employee: { id: updatedEmployee.id, name: updatedEmployee.name },
      previousState: previousEmployee,
      newState: updatedEmployee,
      affectedTables: ["home_employees"],
      affectedRecordIds: [employeeId],
    };
  } catch (err) {
    logger.error("updateEmployee error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al actualizar empleado" };
  }
}

export async function deleteEmployee(
  employeeId: string,
  hardDelete: boolean = false,
  confirm: boolean = false,
) {
  const supabase = await getSupabase();
  if (!confirm) {
    return {
      success: false,
      message: "Debe confirmar la eliminación estableciendo confirm: true",
      requires_confirmation: true,
    };
  }

  try {
    const { data: previousEmployee } = await supabase
      .from("home_employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (!previousEmployee) {
      return { success: false, message: "Empleado no encontrado" };
    }

    if (hardDelete) {
      const { error } = await supabase
        .from("home_employees")
        .delete()
        .eq("id", employeeId);
      if (error) {
        logger.error("Error deleting employee", {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          success: false,
          message: `Error al eliminar: ${error.message}`,
        };
      }
      return {
        success: true,
        message: `Empleado "${previousEmployee.name}" eliminado permanentemente`,
        previousState: previousEmployee,
        newState: null,
        affectedTables: ["home_employees"],
        affectedRecordIds: [employeeId],
      };
    } else {
      const { data: updatedEmployee, error } = await supabase
        .from("home_employees")
        .update({ active: false })
        .eq("id", employeeId)
        .select()
        .single();
      if (error) {
        logger.error("Error deactivating employee", {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          success: false,
          message: `Error al desactivar: ${error.message}`,
        };
      }
      return {
        success: true,
        message: `Empleado "${previousEmployee.name}" desactivado`,
        previousState: previousEmployee,
        newState: updatedEmployee,
        affectedTables: ["home_employees"],
        affectedRecordIds: [employeeId],
      };
    }
  } catch (err) {
    logger.error("deleteEmployee error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al eliminar empleado" };
  }
}

export async function createTaskTemplate(
  employeeName: string,
  taskName: string,
  _weekNumber: number,
  _dayOfWeek: number,
  _timeStart: string,
  _timeEnd: string,
  category: string,
  _isSpecial: boolean = false,
  description?: string,
  householdId?: string,
  frequency: string = "semanal",
  estimatedMinutes: number = 30,
  priority: string = "normal",
  spaceId?: string,
) {
  const supabase = await getSupabase();
  try {
    const { data: employee } = await supabase
      .from("home_employees")
      .select("id, name")
      .ilike("name", `%${employeeName}%`)
      .single();

    if (!employee) {
      return {
        success: false,
        message: `Empleado "${employeeName}" no encontrado`,
      };
    }

    const { data: newTemplate, error } = await supabase
      .from("task_templates")
      .insert({
        household_id: householdId,
        name: taskName,
        description,
        frequency,
        estimated_minutes: estimatedMinutes,
        priority,
        category,
        assigned_employee_id: employee.id,
        space_id: spaceId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating task template", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al crear plantilla: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Plantilla "${taskName}" creada para ${employee.name} (${frequency})`,
      template: {
        id: newTemplate.id,
        task_name: taskName,
        employee: employee.name,
      },
      previousState: null,
      newState: newTemplate,
      affectedTables: ["task_templates"],
      affectedRecordIds: [newTemplate.id],
    };
  } catch (err) {
    logger.error("createTaskTemplate error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al crear plantilla de tarea" };
  }
}

export async function updateTaskTemplate(
  templateId: string,
  updates: {
    taskName?: string;
    employeeName?: string;
    category?: string;
    description?: string;
    frequency?: string;
    estimatedMinutes?: number;
    priority?: string;
    spaceId?: string;
    isActive?: boolean;
  },
) {
  const supabase = await getSupabase();
  try {
    const { data: previousTemplate } = await supabase
      .from("task_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (!previousTemplate) {
      return { success: false, message: "Plantilla no encontrada" };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.taskName) updateData.name = updates.taskName;
    if (updates.category) updateData.category = updates.category;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.frequency) updateData.frequency = updates.frequency;
    if (updates.estimatedMinutes)
      updateData.estimated_minutes = updates.estimatedMinutes;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.spaceId) updateData.space_id = updates.spaceId;
    if (typeof updates.isActive === "boolean")
      updateData.is_active = updates.isActive;

    if (updates.employeeName) {
      const { data: employee } = await supabase
        .from("home_employees")
        .select("id")
        .ilike("name", `%${updates.employeeName}%`)
        .single();
      if (employee) {
        updateData.assigned_employee_id = employee.id;
      }
    }

    const { data: updatedTemplate, error } = await supabase
      .from("task_templates")
      .update(updateData)
      .eq("id", templateId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating task template", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al actualizar: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `Plantilla "${updatedTemplate.name}" actualizada`,
      template: { id: updatedTemplate.id, task_name: updatedTemplate.name },
      previousState: previousTemplate,
      newState: updatedTemplate,
      affectedTables: ["task_templates"],
      affectedRecordIds: [templateId],
    };
  } catch (err) {
    logger.error("updateTaskTemplate error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al actualizar plantilla" };
  }
}

export async function deleteTaskTemplate(templateId: string, confirm: boolean) {
  const supabase = await getSupabase();
  if (!confirm) {
    return {
      success: false,
      message: "Debe confirmar la eliminación estableciendo confirm: true",
      requires_confirmation: true,
    };
  }

  try {
    const { data: previousTemplate } = await supabase
      .from("task_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (!previousTemplate) {
      return { success: false, message: "Plantilla no encontrada" };
    }

    const { error } = await supabase
      .from("task_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      logger.error("Error deleting task template", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, message: `Error al eliminar: ${error.message}` };
    }

    return {
      success: true,
      message: `Plantilla "${previousTemplate.name}" eliminada`,
      previousState: previousTemplate,
      newState: null,
      affectedTables: ["task_templates"],
      affectedRecordIds: [templateId],
    };
  } catch (err) {
    logger.error("deleteTaskTemplate error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al eliminar plantilla" };
  }
}

export async function rescheduleTask(
  taskId: string,
  newDate?: string,
  _newTimeStart?: string,
  _newTimeEnd?: string,
  newEmployeeName?: string,
) {
  try {
    const supabase = await getSupabase();
    const { data: previousTask } = await supabase
      .from("scheduled_tasks")
      .select("*, task_template:task_templates(name)")
      .eq("id", taskId)
      .single();

    if (!previousTask) {
      return { success: false, message: "Tarea no encontrada" };
    }

    const updateData: Record<string, unknown> = {};
    if (newDate) updateData.scheduled_date = newDate;

    if (newEmployeeName) {
      const { data: employee } = await supabase
        .from("home_employees")
        .select("id")
        .ilike("name", `%${newEmployeeName}%`)
        .single();
      if (employee) {
        updateData.employee_id = employee.id;
      }
    }

    const { data: updatedTask, error } = await supabase
      .from("scheduled_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select("*, task_template:task_templates(name)")
      .single();

    if (error) {
      logger.error("Error rescheduling task", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: `Error al reprogramar: ${error.message}`,
      };
    }

    const taskName =
      (updatedTask.task_template as unknown as { name: string } | null)?.name ||
      "Tarea";

    return {
      success: true,
      message: `Tarea "${taskName}" reprogramada`,
      task: {
        id: updatedTask.id,
        task_name: taskName,
        date: updatedTask.scheduled_date,
      },
      previousState: previousTask,
      newState: updatedTask,
      affectedTables: ["scheduled_tasks"],
      affectedRecordIds: [taskId],
    };
  } catch (err) {
    logger.error("rescheduleTask error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al reprogramar tarea" };
  }
}

export async function generateTasksForDate(
  dateStr: string,
  householdId?: string,
) {
  try {
    const supabase = await getSupabase();

    if (!householdId) {
      return {
        success: false,
        message: "household_id es requerido para generar tareas",
      };
    }

    const targetDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) {
      return {
        success: false,
        message: "Formato de fecha inválido. Usa YYYY-MM-DD",
      };
    }

    const { count: existingCount } = await supabase
      .from("scheduled_tasks")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("scheduled_date", dateStr);

    if ((existingCount || 0) > 0) {
      return {
        success: true,
        message: `Ya existen tareas para ${dateStr}`,
        tasks_created: 0,
      };
    }

    const { data: templates, error: templatesError } = await supabase
      .from("task_templates")
      .select(
        "id, space_id, assigned_employee_id, frequency, frequency_days, created_at",
      )
      .eq("household_id", householdId)
      .eq("is_active", true);

    if (templatesError) {
      logger.error("Error loading task templates", {
        error:
          templatesError instanceof Error
            ? templatesError.message
            : String(templatesError),
      });
      return {
        success: false,
        message: `Error al cargar plantillas: ${templatesError.message}`,
      };
    }

    const applicable = ((templates || []) as TaskTemplateSeed[]).filter(
      (template) => shouldScheduleTemplate(template, targetDate),
    );

    if (applicable.length === 0) {
      return {
        success: true,
        message: `No hay plantillas aplicables para ${dateStr}`,
        tasks_created: 0,
      };
    }

    const rows = applicable.map((template) => ({
      household_id: householdId,
      task_template_id: template.id,
      space_id: template.space_id,
      employee_id: template.assigned_employee_id,
      scheduled_date: dateStr,
      status: "pendiente" as const,
    }));

    const { error: insertError } = await supabase
      .from("scheduled_tasks")
      .insert(rows);

    if (insertError) {
      logger.error("Error inserting generated tasks", {
        error:
          insertError instanceof Error
            ? insertError.message
            : String(insertError),
      });
      return {
        success: false,
        message: `Error al insertar tareas: ${insertError.message}`,
      };
    }

    const tasksCreated = rows.length;

    return {
      success: true,
      message: `${tasksCreated} tareas generadas para ${dateStr}`,
      tasks_created: tasksCreated,
    };
  } catch (err) {
    logger.error("generateTasksForDate error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Error al generar tareas" };
  }
}
