import { FunctionDeclaration, Type } from '@google/genai';

/**
 * Gemini function declarations for the AI assistant.
 * Defines the tools available to the AI model.
 */
export const functionDeclarations: FunctionDeclaration[] = [
  // ============================================
  // CONSULTAS - Recetario
  // ============================================
  {
    name: 'get_today_menu',
    description: 'Obtiene el menú programado para hoy (desayuno, almuerzo, cena)',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_week_menu',
    description: 'Obtiene el menú completo de la semana',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_recipe_details',
    description: 'Obtiene los detalles completos de una receta específica incluyendo ingredientes, pasos de preparación y tiempo',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: 'Nombre de la receta a consultar' }
      },
      required: ['recipe_name']
    }
  },
  {
    name: 'search_recipes',
    description: 'Busca recetas por nombre o ingrediente',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'Término de búsqueda (nombre de receta o ingrediente)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_inventory',
    description: 'Obtiene el inventario actual de ingredientes disponibles',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_shopping_list',
    description: 'Obtiene la lista de compras pendientes (items no marcados)',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_missing_ingredients',
    description: 'Obtiene los ingredientes que faltan para preparar una receta específica comparando con el inventario actual',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: 'Nombre de la receta para verificar ingredientes' }
      },
      required: ['recipe_name']
    }
  },
  {
    name: 'suggest_recipe',
    description: 'Sugiere una receta basada en los ingredientes disponibles en el inventario',
    parameters: {
      type: Type.OBJECT,
      properties: {
        preferences: { type: Type.STRING, description: 'Preferencias opcionales (ej: "algo ligero", "con pollo")' },
        meal_type: { type: Type.STRING, description: 'Tipo de comida (desayuno, almuerzo, cena)' }
      },
      required: []
    }
  },
  // CONSULTAS - Hogar
  {
    name: 'get_today_tasks',
    description: 'Obtiene las tareas programadas para hoy de todos los empleados',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_employee_schedule',
    description: 'Obtiene el horario de un empleado específico para hoy o esta semana',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_name: { type: Type.STRING, description: 'Nombre del empleado (ej: Yolima, John)' },
        period: { type: Type.STRING, description: 'Período a consultar (today o week)' }
      },
      required: ['employee_name']
    }
  },
  {
    name: 'get_tasks_summary',
    description: 'Obtiene un resumen del progreso de tareas (completadas, pendientes, porcentaje)',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  // ============================================
  // ACCIONES - Recetario
  // ============================================
  {
    name: 'add_to_shopping_list',
    description: 'Agrega un item a la lista de compras',
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING, description: 'Nombre del item a agregar' },
        quantity: { type: Type.STRING, description: 'Cantidad (ej: "2 kg", "500g", "3 unidades")' }
      },
      required: ['item_name']
    }
  },
  {
    name: 'add_missing_to_shopping',
    description: 'Agrega todos los ingredientes faltantes de una receta a la lista de compras',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: 'Nombre de la receta' }
      },
      required: ['recipe_name']
    }
  },
  {
    name: 'mark_shopping_item',
    description: 'Marca o desmarca un item de la lista de compras',
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING, description: 'Nombre del item' },
        checked: { type: Type.BOOLEAN, description: 'true para marcar como comprado, false para desmarcar' }
      },
      required: ['item_name', 'checked']
    }
  },
  {
    name: 'swap_menu_recipe',
    description: 'Cambia la receta de un día específico del menú por otra receta',
    parameters: {
      type: Type.OBJECT,
      properties: {
        day_number: { type: Type.NUMBER, description: 'Número del día del ciclo (1-12)' },
        meal_type: { type: Type.STRING, description: 'Tipo de comida: breakfast, lunch o dinner' },
        new_recipe_name: { type: Type.STRING, description: 'Nombre de la nueva receta' }
      },
      required: ['day_number', 'meal_type', 'new_recipe_name']
    }
  },
  {
    name: 'update_inventory',
    description: 'Actualiza la cantidad de un ingrediente en el inventario',
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING, description: 'Nombre del ingrediente' },
        quantity: { type: Type.NUMBER, description: 'Nueva cantidad' },
        action: { type: Type.STRING, description: 'Acción: "set" para establecer valor, "add" para sumar, "subtract" para restar' }
      },
      required: ['item_name', 'quantity']
    }
  },
  // ACCIONES - Hogar
  {
    name: 'complete_task',
    description: 'Marca una tarea como completada',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task_name: { type: Type.STRING, description: 'Nombre o descripción de la tarea' },
        employee_name: { type: Type.STRING, description: 'Nombre del empleado (opcional)' }
      },
      required: ['task_name']
    }
  },
  {
    name: 'add_quick_task',
    description: 'Agrega una tarea rápida para hoy',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task_name: { type: Type.STRING, description: 'Nombre de la tarea' },
        employee_name: { type: Type.STRING, description: 'Nombre del empleado asignado' },
        category: { type: Type.STRING, description: 'Categoría (limpieza, cocina, lavandería, etc.)' }
      },
      required: ['task_name']
    }
  },
  // ============================================
  // REPORTES Y ANÁLISIS
  // ============================================
  {
    name: 'get_weekly_report',
    description: 'Genera un reporte semanal con resumen de tareas completadas, comidas preparadas y estado del inventario',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_low_inventory_alerts',
    description: 'Obtiene alertas de ingredientes con bajo inventario que necesitan reponerse',
    parameters: {
      type: Type.OBJECT,
      properties: {
        threshold: { type: Type.NUMBER, description: 'Cantidad mínima para considerar bajo (default: 2)' }
      },
      required: []
    }
  },
  {
    name: 'get_upcoming_meals',
    description: 'Obtiene las próximas comidas programadas para los siguientes días',
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.NUMBER, description: 'Número de días a consultar (default: 3)' }
      },
      required: []
    }
  },
  // ============================================
  // UTILIDADES
  // ============================================
  {
    name: 'get_current_date_info',
    description: 'Obtiene información de la fecha actual (día, semana del ciclo, etc.)',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'calculate_portions',
    description: 'Calcula las cantidades de ingredientes ajustadas para un número específico de porciones',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: 'Nombre de la receta' },
        portions: { type: Type.NUMBER, description: 'Número de porciones deseadas' }
      },
      required: ['recipe_name', 'portions']
    }
  },
  {
    name: 'get_preparation_tips',
    description: 'Obtiene consejos y preparaciones previas necesarias para las comidas del día',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  // ============================================
  // AGENTE MULTI-PASO
  // ============================================
  {
    name: 'execute_multi_step_task',
    description: `Ejecuta una tarea compleja que requiere múltiples pasos. Usa esto para:
- Planificar el menú semanal basado en inventario
- Preparar todo para una receta (verificar ingredientes, agregar faltantes, ajustar porciones)
- Generar reporte completo del hogar (inventario, tareas, menú)
- Organizar la lista de compras basada en el menú de la semana
La función ejecutará automáticamente todos los pasos necesarios y reportará el progreso.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        task_type: {
          type: Type.STRING,
          description: 'Tipo de tarea: "prepare_recipe", "weekly_planning", "shopping_optimization", "full_report", "menu_from_inventory"'
        },
        params: {
          type: Type.OBJECT,
          description: 'Parámetros específicos de la tarea (ej: {recipe_name: "Arroz con pollo"} para prepare_recipe)'
        }
      },
      required: ['task_type']
    }
  },
  {
    name: 'smart_shopping_list',
    description: 'Genera una lista de compras inteligente basada en el menú de los próximos días y el inventario actual',
    parameters: {
      type: Type.OBJECT,
      properties: {
        days_ahead: { type: Type.NUMBER, description: 'Número de días a planificar (default: 7)' }
      },
      required: []
    }
  },
  // ============================================
  // CRUD - ESPACIOS DEL HOGAR
  // ============================================
  {
    name: 'list_spaces',
    description: 'Obtiene la lista de todos los espacios configurados en el hogar (cocina, baños, habitaciones, etc.)',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_space_details',
    description: 'Obtiene los detalles completos de un espacio específico',
    parameters: {
      type: Type.OBJECT,
      properties: {
        space_id: { type: Type.STRING, description: 'ID del espacio' },
        space_name: { type: Type.STRING, description: 'Nombre del espacio (alternativa a space_id)' }
      },
      required: []
    }
  },
  {
    name: 'create_space',
    description: 'Crea un nuevo espacio en el hogar. Requiere confirmación del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nombre del espacio (ej: "Cocina principal", "Baño master")' },
        space_type: { type: Type.STRING, description: 'Tipo de espacio: kitchen, bedroom, bathroom, living_room, dining_room, garage, garden, laundry, office, storage, other' },
        category: { type: Type.STRING, description: 'Categoría: common_area, private, service, outdoor' },
        usage_level: { type: Type.STRING, description: 'Nivel de uso: high, medium, low' },
        has_bathroom: { type: Type.BOOLEAN, description: 'Si el espacio tiene baño incluido (para habitaciones)' },
        area_sqm: { type: Type.NUMBER, description: 'Área en metros cuadrados (opcional)' },
        notes: { type: Type.STRING, description: 'Notas adicionales sobre el espacio' }
      },
      required: ['name', 'space_type']
    }
  },
  {
    name: 'update_space',
    description: 'Actualiza la información de un espacio existente. Requiere confirmación del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        space_id: { type: Type.STRING, description: 'ID del espacio a actualizar' },
        name: { type: Type.STRING, description: 'Nuevo nombre del espacio' },
        category: { type: Type.STRING, description: 'Nueva categoría' },
        usage_level: { type: Type.STRING, description: 'Nuevo nivel de uso' },
        has_bathroom: { type: Type.BOOLEAN, description: 'Si tiene baño' },
        area_sqm: { type: Type.NUMBER, description: 'Nueva área' },
        notes: { type: Type.STRING, description: 'Nuevas notas' }
      },
      required: ['space_id']
    }
  },
  {
    name: 'delete_space',
    description: 'Elimina un espacio del hogar. ACCIÓN CRÍTICA: requiere confirmación explícita y no se puede deshacer fácilmente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        space_id: { type: Type.STRING, description: 'ID del espacio a eliminar' },
        confirm: { type: Type.BOOLEAN, description: 'Confirmación explícita de eliminación' }
      },
      required: ['space_id', 'confirm']
    }
  },
  // ============================================
  // CRUD - EMPLEADOS DEL HOGAR
  // ============================================
  {
    name: 'list_employees',
    description: 'Obtiene la lista de todos los empleados del hogar',
    parameters: {
      type: Type.OBJECT,
      properties: {
        active_only: { type: Type.BOOLEAN, description: 'Solo mostrar empleados activos (default: true)' }
      },
      required: []
    }
  },
  {
    name: 'get_employee_details',
    description: 'Obtiene los detalles completos de un empleado específico',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_id: { type: Type.STRING, description: 'ID del empleado' },
        employee_name: { type: Type.STRING, description: 'Nombre del empleado (alternativa a employee_id)' }
      },
      required: []
    }
  },
  {
    name: 'create_employee',
    description: 'Registra un nuevo empleado en el hogar. Requiere confirmación del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nombre completo del empleado' },
        role: { type: Type.STRING, description: 'Rol: empleada_domestica, niñera, jardinero, conductor, cocinero, cuidador, mantenimiento, seguridad, otro' },
        zone: { type: Type.STRING, description: 'Zona de trabajo principal' },
        work_days: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Días de trabajo: ["lunes", "martes", ...]' },
        hours_per_day: { type: Type.NUMBER, description: 'Horas de trabajo por día' },
        schedule: { type: Type.STRING, description: 'Horario (ej: "8:00 AM - 4:00 PM")' },
        phone: { type: Type.STRING, description: 'Teléfono de contacto' },
        notes: { type: Type.STRING, description: 'Notas adicionales' }
      },
      required: ['name', 'role']
    }
  },
  {
    name: 'update_employee',
    description: 'Actualiza la información de un empleado. Requiere confirmación del usuario.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_id: { type: Type.STRING, description: 'ID del empleado a actualizar' },
        name: { type: Type.STRING, description: 'Nuevo nombre' },
        role: { type: Type.STRING, description: 'Nuevo rol' },
        zone: { type: Type.STRING, description: 'Nueva zona' },
        work_days: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Nuevos días de trabajo' },
        hours_per_day: { type: Type.NUMBER, description: 'Nuevas horas por día' },
        schedule: { type: Type.STRING, description: 'Nuevo horario' },
        phone: { type: Type.STRING, description: 'Nuevo teléfono' },
        notes: { type: Type.STRING, description: 'Nuevas notas' },
        active: { type: Type.BOOLEAN, description: 'Estado activo/inactivo' }
      },
      required: ['employee_id']
    }
  },
  {
    name: 'delete_employee',
    description: 'Elimina o desactiva un empleado. ACCIÓN CRÍTICA: requiere confirmación explícita.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_id: { type: Type.STRING, description: 'ID del empleado' },
        hard_delete: { type: Type.BOOLEAN, description: 'Eliminar permanentemente (false = solo desactivar)' },
        confirm: { type: Type.BOOLEAN, description: 'Confirmación explícita' }
      },
      required: ['employee_id', 'confirm']
    }
  },
  // ============================================
  // CRUD - TAREAS AVANZADAS
  // ============================================
  {
    name: 'list_task_templates',
    description: 'Obtiene la lista de plantillas de tareas recurrentes del hogar',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_id: { type: Type.STRING, description: 'Filtrar por empleado (opcional)' },
        week_number: { type: Type.NUMBER, description: 'Filtrar por semana del ciclo 1-4 (opcional)' },
        category: { type: Type.STRING, description: 'Filtrar por categoría (opcional)' }
      },
      required: []
    }
  },
  {
    name: 'create_task_template',
    description: 'Crea una nueva plantilla de tarea recurrente. Requiere confirmación.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_name: { type: Type.STRING, description: 'Nombre del empleado asignado' },
        task_name: { type: Type.STRING, description: 'Nombre de la tarea' },
        week_number: { type: Type.NUMBER, description: 'Semana del ciclo (1-4)' },
        day_of_week: { type: Type.NUMBER, description: 'Día de la semana (0=domingo, 1=lunes, ..., 6=sábado)' },
        time_start: { type: Type.STRING, description: 'Hora de inicio (formato HH:MM)' },
        time_end: { type: Type.STRING, description: 'Hora de fin (formato HH:MM)' },
        category: { type: Type.STRING, description: 'Categoría: cocina, limpieza, lavanderia, perros, piscina, jardin, etc.' },
        is_special: { type: Type.BOOLEAN, description: 'Si es una tarea especial (★)' },
        description: { type: Type.STRING, description: 'Descripción detallada (opcional)' }
      },
      required: ['employee_name', 'task_name', 'week_number', 'day_of_week', 'time_start', 'time_end', 'category']
    }
  },
  {
    name: 'update_task_template',
    description: 'Actualiza una plantilla de tarea existente. Requiere confirmación.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        template_id: { type: Type.STRING, description: 'ID de la plantilla a actualizar' },
        task_name: { type: Type.STRING, description: 'Nuevo nombre de la tarea' },
        employee_name: { type: Type.STRING, description: 'Nuevo empleado asignado' },
        time_start: { type: Type.STRING, description: 'Nueva hora de inicio' },
        time_end: { type: Type.STRING, description: 'Nueva hora de fin' },
        category: { type: Type.STRING, description: 'Nueva categoría' },
        is_special: { type: Type.BOOLEAN, description: 'Si es tarea especial' },
        description: { type: Type.STRING, description: 'Nueva descripción' }
      },
      required: ['template_id']
    }
  },
  {
    name: 'delete_task_template',
    description: 'Elimina una plantilla de tarea recurrente. ACCIÓN CRÍTICA.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        template_id: { type: Type.STRING, description: 'ID de la plantilla a eliminar' },
        confirm: { type: Type.BOOLEAN, description: 'Confirmación explícita' }
      },
      required: ['template_id', 'confirm']
    }
  },
  {
    name: 'reschedule_task',
    description: 'Reprograma una tarea para otro horario o día. Requiere confirmación.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task_id: { type: Type.STRING, description: 'ID de la instancia de tarea' },
        new_date: { type: Type.STRING, description: 'Nueva fecha (formato YYYY-MM-DD)' },
        new_time_start: { type: Type.STRING, description: 'Nueva hora de inicio (HH:MM)' },
        new_time_end: { type: Type.STRING, description: 'Nueva hora de fin (HH:MM)' },
        new_employee_name: { type: Type.STRING, description: 'Nuevo empleado (opcional)' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'generate_tasks_for_date',
    description: 'Genera las tareas programadas para una fecha específica basándose en las plantillas',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: 'Fecha para generar tareas (formato YYYY-MM-DD)' }
      },
      required: ['date']
    }
  },
  // ============================================
  // CRUD - RECETAS
  // ============================================
  {
    name: 'create_recipe',
    description: 'Crea una nueva receta en el recetario. Requiere confirmación.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nombre de la receta' },
        type: { type: Type.STRING, description: 'Tipo de comida: breakfast, lunch o dinner' },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING, description: 'Nombre del ingrediente' },
              quantity_luis: { type: Type.STRING, description: 'Cantidad para Luis (3 porciones)' },
              quantity_mariana: { type: Type.STRING, description: 'Cantidad para Mariana (2 porciones)' }
            }
          },
          description: 'Lista de ingredientes con cantidades para Luis y Mariana'
        },
        steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Pasos de preparación' },
        prep_time: { type: Type.NUMBER, description: 'Tiempo de preparación en minutos' },
        cook_time: { type: Type.NUMBER, description: 'Tiempo de cocción en minutos' },
        difficulty: { type: Type.STRING, description: 'Dificultad: fácil, media o difícil' },
        description: { type: Type.STRING, description: 'Descripción breve de la receta' },
        tips: { type: Type.STRING, description: 'Consejos de preparación' }
      },
      required: ['name', 'type', 'ingredients', 'steps']
    }
  },
  {
    name: 'update_recipe',
    description: 'Actualiza una receta existente. Requiere confirmación.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_id: { type: Type.STRING, description: 'ID de la receta a actualizar' },
        name: { type: Type.STRING, description: 'Nuevo nombre' },
        type: { type: Type.STRING, description: 'Nuevo tipo de comida' },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING, description: 'Nombre del ingrediente' },
              quantity_luis: { type: Type.STRING, description: 'Cantidad para Luis' },
              quantity_mariana: { type: Type.STRING, description: 'Cantidad para Mariana' }
            }
          },
          description: 'Nueva lista de ingredientes'
        },
        steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Nuevos pasos' },
        prep_time: { type: Type.NUMBER, description: 'Nuevo tiempo de preparación' },
        cook_time: { type: Type.NUMBER, description: 'Nuevo tiempo de cocción' },
        difficulty: { type: Type.STRING, description: 'Nueva dificultad' },
        description: { type: Type.STRING, description: 'Nueva descripción' },
        tips: { type: Type.STRING, description: 'Nuevos consejos' }
      },
      required: ['recipe_id']
    }
  },
  {
    name: 'delete_recipe',
    description: 'Elimina una receta del recetario. ACCIÓN CRÍTICA: no se puede deshacer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_id: { type: Type.STRING, description: 'ID de la receta a eliminar' },
        confirm: { type: Type.BOOLEAN, description: 'Confirmación explícita de eliminación' }
      },
      required: ['recipe_id', 'confirm']
    }
  },
  // ============================================
  // INVENTARIO AVANZADO
  // ============================================
  {
    name: 'bulk_update_inventory',
    description: 'Actualiza múltiples items del inventario de una vez. ACCIÓN CRÍTICA.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        updates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item_name: { type: Type.STRING, description: 'Nombre del item' },
              quantity: { type: Type.NUMBER, description: 'Cantidad' },
              action: { type: Type.STRING, description: 'Acción: set, add, subtract' }
            }
          },
          description: 'Lista de actualizaciones: [{item_name, quantity, action}]'
        },
        confirm: { type: Type.BOOLEAN, description: 'Confirmación explícita' }
      },
      required: ['updates', 'confirm']
    }
  },
  {
    name: 'scan_receipt_items',
    description: 'Procesa una lista de items de un ticket de compra y actualiza el inventario',
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Nombre del producto' },
              quantity: { type: Type.NUMBER, description: 'Cantidad' },
              unit: { type: Type.STRING, description: 'Unidad (kg, g, unidades, etc.)' }
            }
          },
          description: 'Lista de items del ticket: [{name, quantity, unit}]'
        }
      },
      required: ['items']
    }
  },
  {
    name: 'reset_inventory_to_default',
    description: 'Reinicia todo el inventario a valores predeterminados. ACCIÓN CRÍTICA.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirm: { type: Type.BOOLEAN, description: 'Confirmación explícita' }
      },
      required: ['confirm']
    }
  }
];
