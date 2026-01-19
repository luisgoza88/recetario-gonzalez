import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, base64ToGeminiFormat } from '@/lib/gemini/client';
import { FunctionDeclaration, Type } from '@google/genai';
import {
  getFunctionRiskLevel,
  shouldAutoApprove,
  createAuditLog,
  completeAuditLog,
  createProposal,
  functionCallToProposedAction,
  generateSessionId,
  generateProposalSummary,
  AI_RISK_LEVELS,
} from '@/lib/ai/ai-command-service';
import { AIProposedAction, AIRiskLevel } from '@/types';

// Types for messages with images
interface MessageWithImage {
  role: string;
  content: string;
  image?: string; // Base64 image data
}

// Types for AI Command Center integration
interface ExecutionContext {
  householdId: string;
  userId?: string;
  sessionId: string;
}

interface ExecutionResult {
  result: unknown;
  auditLogId?: string;
  canUndo: boolean;
  riskLevel: AIRiskLevel;
}

interface ProposalResponse {
  type: 'proposal';
  proposalId: string;
  summary: string;
  actions: AIProposedAction[];
  riskLevel: AIRiskLevel;
  expiresAt: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// DEFINICIÓN DE FUNCIONES PARA GEMINI
// ============================================

const functionDeclarations: FunctionDeclaration[] = [
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
        work_days: { type: Type.ARRAY, description: 'Días de trabajo: ["lunes", "martes", ...]' },
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
        work_days: { type: Type.ARRAY, description: 'Nuevos días de trabajo' },
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
        ingredients: { type: Type.ARRAY, description: 'Lista de ingredientes con cantidades para Luis y Mariana' },
        steps: { type: Type.ARRAY, description: 'Pasos de preparación' },
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
        ingredients: { type: Type.ARRAY, description: 'Nueva lista de ingredientes' },
        steps: { type: Type.ARRAY, description: 'Nuevos pasos' },
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

// ============================================
// IMPLEMENTACIÓN DE FUNCIONES
// ============================================

async function getTodayMenu() {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Viernes o Sábado

    const { data: menu, error } = await supabase
      .from('day_menu')
      .select(`
        *,
        breakfast:recipes!day_menu_breakfast_id_fkey(name, prep_time),
        lunch:recipes!day_menu_lunch_id_fkey(name, prep_time),
        dinner:recipes!day_menu_dinner_id_fkey(name, prep_time)
      `)
      .eq('day_number', cycleDay)
      .single();

    if (error || !menu) {
      console.error('Error fetching menu:', error);
      return {
        message: 'No hay menú programado para hoy',
        date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
        cycle_day: cycleDay,
        breakfast: 'No programado',
        lunch: 'No programado',
        dinner: isWeekend ? 'Sin cena (salen a comer)' : 'No programado'
      };
    }

    return {
      date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
      cycle_day: cycleDay,
      breakfast: menu.breakfast?.name || 'No programado',
      lunch: menu.lunch?.name || 'No programado',
      dinner: isWeekend ? 'Sin cena (salen a comer)' : (menu.dinner?.name || 'No programado')
    };
  } catch (err) {
    console.error('getTodayMenu error:', err);
    return {
      message: 'No se pudo obtener el menú de hoy',
      breakfast: 'Error al cargar',
      lunch: 'Error al cargar',
      dinner: 'Error al cargar'
    };
  }
}

async function getWeekMenu() {
  const { data: menus } = await supabase
    .from('day_menu')
    .select(`
      day_number,
      breakfast:recipes!day_menu_breakfast_id_fkey(name),
      lunch:recipes!day_menu_lunch_id_fkey(name),
      dinner:recipes!day_menu_dinner_id_fkey(name)
    `)
    .order('day_number')
    .limit(7);

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return menus?.map((m: any, i: number) => ({
    day: days[i] || `Día ${m.day_number}`,
    breakfast: m.breakfast?.name || '-',
    lunch: m.lunch?.name || '-',
    dinner: m.dinner?.name || 'Sin cena'
  })) || [];
}

async function searchRecipes(query: string) {
  // Buscar con ilike primero
  let { data: recipes } = await supabase
    .from('recipes')
    .select('name, prep_time, category, portions, ingredients')
    .or(`name.ilike.%${query}%,ingredients.cs.{${query}}`);

  // Si no hay resultados, hacer búsqueda más amplia
  if (!recipes || recipes.length === 0) {
    const { data: allRecipes } = await supabase
      .from('recipes')
      .select('name, prep_time, category, portions, ingredients');

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    // Variantes comunes de ingredientes/platos
    const variants: Record<string, string[]> = {
      'pasta': ['espagueti', 'spaghetti', 'fettuccine', 'penne', 'macarrones', 'tallarines'],
      'bolognesa': ['boloñesa', 'bolonesa', 'carne molida', 'ragu', 'ragú'],
      'pollo': ['chicken', 'gallina', 'pechuga'],
      'carne': ['res', 'beef', 'ternera', 'bistec'],
      'arroz': ['rice', 'risotto'],
      'ensalada': ['salad', 'verde'],
      'sopa': ['crema', 'caldo'],
      'pescado': ['fish', 'salmon', 'atún', 'tilapia'],
    };

    recipes = allRecipes?.filter(r => {
      const nameLower = r.name.toLowerCase();
      const ingredientsStr = JSON.stringify(r.ingredients).toLowerCase();

      for (const term of searchTerms) {
        // Coincidencia directa
        if (nameLower.includes(term) || ingredientsStr.includes(term)) return true;

        // Buscar variantes
        for (const [key, alts] of Object.entries(variants)) {
          if (term.includes(key) || key.includes(term)) {
            if (alts.some(alt => nameLower.includes(alt) || ingredientsStr.includes(alt))) {
              return true;
            }
          }
          if (alts.some(alt => term.includes(alt))) {
            if (nameLower.includes(key) || ingredientsStr.includes(key)) {
              return true;
            }
          }
        }
      }
      return false;
    }) || [];
  }

  return recipes?.slice(0, 8).map(r => ({
    name: r.name,
    prep_time: r.prep_time,
    category: r.category,
    ingredient_count: Array.isArray(r.ingredients) ? r.ingredients.length : 0
  })) || [];
}

async function getRecipeDetails(recipeName: string) {
  // Primero intentar búsqueda exacta/parcial
  let { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .ilike('name', `%${recipeName}%`)
    .single();

  // Si no encuentra, buscar con términos individuales (fuzzy)
  if (!recipe) {
    const searchTerms = recipeName.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    // Buscar recetas que contengan alguno de los términos
    const { data: recipes } = await supabase
      .from('recipes')
      .select('*');

    if (recipes && recipes.length > 0) {
      // Calcular score de coincidencia para cada receta
      const scored = recipes.map(r => {
        const nameLower = r.name.toLowerCase();
        let score = 0;

        for (const term of searchTerms) {
          if (nameLower.includes(term)) score += 2;
          // También buscar variantes comunes
          const variants: Record<string, string[]> = {
            'pasta': ['espagueti', 'spaghetti', 'fettuccine', 'penne', 'macarrones'],
            'bolognesa': ['boloñesa', 'bolonesa', 'carne molida', 'ragu'],
            'pollo': ['chicken', 'gallina'],
            'carne': ['res', 'beef', 'ternera'],
            'arroz': ['rice'],
          };

          for (const [key, alts] of Object.entries(variants)) {
            if (term.includes(key) || key.includes(term)) {
              for (const alt of alts) {
                if (nameLower.includes(alt)) score += 1;
              }
            }
          }
        }

        return { recipe: r, score };
      });

      // Ordenar por score y tomar el mejor
      scored.sort((a, b) => b.score - a.score);
      if (scored[0]?.score > 0) {
        recipe = scored[0].recipe;
      }
    }
  }

  if (!recipe) {
    // No encontramos la receta - indicar al modelo que use conocimiento general
    // También obtener el inventario para que pueda verificar ingredientes
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*, market_item:market_items(name)')
      .gt('current_number', 0);

    const availableIngredients = inventory?.map(i => (i.market_item as { name?: string })?.name).filter(Boolean) || [];

    return {
      recipe_not_found: true,
      requested_recipe: recipeName,
      instruction: `La receta "${recipeName}" no está en la base de datos. DEBES usar tu conocimiento culinario general para ayudar al usuario. Proporciona los ingredientes típicos de esta receta y los pasos de preparación. Verifica qué ingredientes tiene el usuario usando la lista de inventario disponible.`,
      user_inventory: availableIngredients,
      action_required: 'Usa tu conocimiento general de cocina para dar la receta completa. Indica qué ingredientes de la lista tiene el usuario (✅) y cuáles le faltan (❌). Ofrece agregar los faltantes a la lista de compras.'
    };
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

  return {
    name: recipe.name,
    category: recipe.category,
    prep_time: recipe.prep_time,
    portions: recipe.portions || 5,
    description: recipe.description || '',
    ingredients: ingredients.map((ing: { name?: string; amount?: string } | string) =>
      typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ing}`.trim()
    ),
    steps: steps.length > 0 ? steps : ['No hay pasos detallados disponibles'],
    tips: recipe.tips || null
  };
}

async function getMissingIngredients(recipeName: string) {
  // Obtener receta
  const { data: recipe } = await supabase
    .from('recipes')
    .select('name, ingredients')
    .ilike('name', `%${recipeName}%`)
    .single();

  if (!recipe) {
    return { error: `No se encontró la receta "${recipeName}"` };
  }

  // Obtener inventario
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name)')
    .gt('current_number', 0);

  const availableItems = inventory?.map(i => i.market_item?.name?.toLowerCase()) || [];
  const recipeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  const missing: string[] = [];
  const available: string[] = [];

  for (const ing of recipeIngredients) {
    const ingName = typeof ing === 'string' ? ing : ing.name || '';
    const normalized = ingName.toLowerCase();

    const found = availableItems.some(item =>
      item?.includes(normalized) || normalized.includes(item || '')
    );

    if (found) {
      available.push(ingName);
    } else {
      missing.push(ingName);
    }
  }

  return {
    recipe: recipe.name,
    total_ingredients: recipeIngredients.length,
    available_count: available.length,
    missing_count: missing.length,
    missing_ingredients: missing,
    available_ingredients: available,
    can_prepare: missing.length === 0,
    coverage_percent: Math.round((available.length / recipeIngredients.length) * 100)
  };
}

async function getInventory() {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*, market_item:market_items(name, category)')
      .gt('current_number', 0)
      .limit(50);

    if (error) {
      console.error('Error fetching inventory:', error);
      return { message: 'No se pudo obtener el inventario', items: [], by_category: {} };
    }

    if (!data || data.length === 0) {
      return { message: 'El inventario está vacío', items: [], by_category: {} };
    }

    const items: string[] = [];
    const grouped: Record<string, string[]> = {};

    data.forEach(item => {
      const name = item.market_item?.name || 'Item';
      const cat = item.market_item?.category || 'Otros';
      const qty = item.current_number || 0;

      items.push(name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(`${name} (${qty})`);
    });

    return {
      message: `${data.length} ingredientes disponibles`,
      total: data.length,
      items,
      by_category: grouped
    };
  } catch (err) {
    console.error('getInventory error:', err);
    return { message: 'No se pudo obtener el inventario', items: [], by_category: {} };
  }
}

async function getShoppingList() {
  try {
    const { data, error } = await supabase
      .from('market_checklist')
      .select('*, market_item:market_items(name, category)')
      .eq('checked', false)
      .limit(30);

    if (error) {
      console.error('Error fetching shopping list:', error);
      return { message: 'No hay items en la lista de compras', items: [] };
    }

    if (!data || data.length === 0) {
      return { message: 'La lista de compras está vacía', items: [] };
    }

    const items = data.map(item => ({
      name: item.market_item?.name || 'Item',
      category: item.market_item?.category || 'Otros'
    }));

    // Agrupar por categoría
    const byCategory: Record<string, string[]> = {};
    items.forEach(item => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item.name);
    });

    return {
      message: `${items.length} items pendientes`,
      total: items.length,
      items,
      by_category: byCategory
    };
  } catch (err) {
    console.error('getShoppingList error:', err);
    return { message: 'No hay items en la lista de compras', items: [] };
  }
}

async function suggestRecipe(preferences?: string) {
  // Obtener inventario disponible
  const { data: inventory } = await supabase
    .from('inventory')
    .select('market_item:market_items(name)')
    .gt('current_number', 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableIngredients = inventory?.map((i: any) => i.market_item?.name).filter(Boolean) || [];

  // Obtener recetas
  const { data: recipes } = await supabase
    .from('recipes')
    .select('name, ingredients, prep_time, category');

  if (!recipes || recipes.length === 0) {
    return { suggestion: 'No hay recetas disponibles' };
  }

  // Encontrar la receta con más ingredientes disponibles
  let bestMatch = { recipe: recipes[0], matchCount: 0 };

  for (const recipe of recipes) {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    let matchCount = 0;

    for (const ing of ingredients) {
      const ingName = typeof ing === 'string' ? ing : ing.name || '';
      if (availableIngredients.some(ai =>
        ai?.toLowerCase().includes(ingName.toLowerCase()) ||
        ingName.toLowerCase().includes(ai?.toLowerCase() || '')
      )) {
        matchCount++;
      }
    }

    if (matchCount > bestMatch.matchCount) {
      bestMatch = { recipe, matchCount };
    }
  }

  return {
    suggestion: bestMatch.recipe.name,
    prep_time: bestMatch.recipe.prep_time,
    category: bestMatch.recipe.category,
    ingredients_available: bestMatch.matchCount,
    total_ingredients: Array.isArray(bestMatch.recipe.ingredients) ? bestMatch.recipe.ingredients.length : 0
  };
}

async function getTodayTasks() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: tasks, error } = await supabase
      .from('daily_task_instances')
      .select('*, employee:home_employees(name)')
      .eq('date', today)
      .order('time_start');

    if (error) {
      console.error('Error fetching tasks:', error);
      return { message: 'No hay tareas programadas para hoy', tasks: [] };
    }

    if (!tasks || tasks.length === 0) {
      return { message: 'No hay tareas programadas para hoy', tasks: [] };
    }

    return {
      message: `${tasks.length} tareas para hoy`,
      tasks: tasks.map(t => ({
        task: t.task_name || 'Tarea',
        employee: t.employee?.name || 'Sin asignar',
        time: `${t.time_start || '?'} - ${t.time_end || '?'}`,
        status: t.status || 'pending',
        category: t.category || 'general'
      }))
    };
  } catch (err) {
    console.error('getTodayTasks error:', err);
    return { message: 'No hay tareas programadas para hoy', tasks: [] };
  }
}

async function getEmployeeSchedule(employeeName: string, period: string = 'today') {
  // Buscar empleado
  const { data: employee } = await supabase
    .from('home_employees')
    .select('id, name')
    .ilike('name', `%${employeeName}%`)
    .single();

  if (!employee) {
    // Intentar en tabla employees
    const { data: emp2 } = await supabase
      .from('employees')
      .select('id, name')
      .ilike('name', `%${employeeName}%`)
      .single();

    if (!emp2) {
      return { error: `No se encontró empleado "${employeeName}"` };
    }
  }

  const empId = employee?.id;
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('daily_task_instances')
    .select('*')
    .eq('employee_id', empId)
    .eq('date', today)
    .order('time_start');

  return {
    employee: employee?.name || employeeName,
    date: today,
    tasks: tasks?.map(t => ({
      time: `${t.time_start?.substring(0,5)} - ${t.time_end?.substring(0,5)}`,
      task: t.task_name,
      status: t.status,
      category: t.category
    })) || []
  };
}

async function getTasksSummary() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: tasks, error } = await supabase
      .from('daily_task_instances')
      .select('status, employee_id')
      .eq('date', today);

    if (error || !tasks || tasks.length === 0) {
      return {
        message: 'No hay tareas programadas para hoy',
        total: 0,
        completed: 0,
        in_progress: 0,
        pending: 0,
        progress_percent: 0
      };
    }

    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const total = tasks.length;

    return {
      message: `${completed}/${total} tareas completadas`,
      total,
      completed,
      in_progress: inProgress,
      pending,
      progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  } catch (err) {
    console.error('getTasksSummary error:', err);
    return {
      message: 'No hay tareas programadas para hoy',
      total: 0,
      completed: 0,
      progress_percent: 0
    };
  }
}

// ============================================
// CRUD - ESPACIOS DEL HOGAR
// ============================================

async function listSpaces(householdId?: string) {
  try {
    let query = supabase
      .from('spaces')
      .select(`
        *,
        space_type:space_types(name, icon, category)
      `)
      .order('custom_name');

    if (householdId) {
      query = query.eq('household_id', householdId);
    }

    const { data: spaces, error } = await query;

    if (error) {
      console.error('Error listing spaces:', error);
      return { success: false, message: 'Error al obtener espacios', spaces: [] };
    }

    return {
      success: true,
      count: spaces?.length || 0,
      spaces: spaces?.map(s => ({
        id: s.id,
        name: s.custom_name,
        type: s.space_type?.name || 'Desconocido',
        icon: s.space_type?.icon || '🏠',
        category: s.category,
        usage_level: s.usage_level,
        has_bathroom: s.has_bathroom,
        area_sqm: s.area_sqm,
        notes: s.notes
      })) || []
    };
  } catch (err) {
    console.error('listSpaces error:', err);
    return { success: false, message: 'Error al obtener espacios', spaces: [] };
  }
}

async function getSpaceDetails(spaceId?: string, spaceName?: string) {
  try {
    let query = supabase
      .from('spaces')
      .select(`
        *,
        space_type:space_types(id, name, icon, category, default_tasks)
      `);

    if (spaceId) {
      query = query.eq('id', spaceId);
    } else if (spaceName) {
      query = query.ilike('custom_name', `%${spaceName}%`);
    } else {
      return { success: false, message: 'Se requiere space_id o space_name' };
    }

    const { data: space, error } = await query.single();

    if (error || !space) {
      return { success: false, message: 'Espacio no encontrado' };
    }

    return {
      success: true,
      space: {
        id: space.id,
        name: space.custom_name,
        type: space.space_type?.name || 'Desconocido',
        type_id: space.space_type_id,
        icon: space.space_type?.icon || '🏠',
        category: space.category,
        usage_level: space.usage_level,
        has_bathroom: space.has_bathroom,
        area_sqm: space.area_sqm,
        attributes: space.attributes,
        notes: space.notes,
        default_tasks: space.space_type?.default_tasks || []
      }
    };
  } catch (err) {
    console.error('getSpaceDetails error:', err);
    return { success: false, message: 'Error al obtener detalles del espacio' };
  }
}

async function createSpace(
  householdId: string,
  name: string,
  spaceType: string,
  category?: string,
  usageLevel?: string,
  hasBathroom?: boolean,
  areaSqm?: number,
  notes?: string
) {
  try {
    // Buscar el space_type_id
    const { data: typeData } = await supabase
      .from('space_types')
      .select('id, category')
      .ilike('name', `%${spaceType}%`)
      .single();

    const spaceTypeId = typeData?.id;
    const derivedCategory = category || typeData?.category || 'common_area';

    const { data: newSpace, error } = await supabase
      .from('spaces')
      .insert({
        household_id: householdId,
        space_type_id: spaceTypeId,
        custom_name: name,
        category: derivedCategory,
        usage_level: usageLevel || 'medium',
        has_bathroom: hasBathroom || false,
        area_sqm: areaSqm,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating space:', error);
      return { success: false, message: `Error al crear espacio: ${error.message}` };
    }

    return {
      success: true,
      message: `Espacio "${name}" creado exitosamente`,
      space: {
        id: newSpace.id,
        name: newSpace.custom_name,
        type: spaceType,
        category: derivedCategory
      },
      previousState: null,
      newState: newSpace,
      affectedTables: ['spaces'],
      affectedRecordIds: [newSpace.id]
    };
  } catch (err) {
    console.error('createSpace error:', err);
    return { success: false, message: 'Error al crear espacio' };
  }
}

async function updateSpace(
  spaceId: string,
  updates: {
    name?: string;
    category?: string;
    usageLevel?: string;
    hasBathroom?: boolean;
    areaSqm?: number;
    notes?: string;
  }
) {
  try {
    // Obtener estado anterior
    const { data: previousSpace } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (!previousSpace) {
      return { success: false, message: 'Espacio no encontrado' };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.custom_name = updates.name;
    if (updates.category) updateData.category = updates.category;
    if (updates.usageLevel) updateData.usage_level = updates.usageLevel;
    if (typeof updates.hasBathroom === 'boolean') updateData.has_bathroom = updates.hasBathroom;
    if (updates.areaSqm) updateData.area_sqm = updates.areaSqm;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data: updatedSpace, error } = await supabase
      .from('spaces')
      .update(updateData)
      .eq('id', spaceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating space:', error);
      return { success: false, message: `Error al actualizar: ${error.message}` };
    }

    return {
      success: true,
      message: `Espacio "${updatedSpace.custom_name}" actualizado`,
      space: {
        id: updatedSpace.id,
        name: updatedSpace.custom_name
      },
      previousState: previousSpace,
      newState: updatedSpace,
      affectedTables: ['spaces'],
      affectedRecordIds: [spaceId]
    };
  } catch (err) {
    console.error('updateSpace error:', err);
    return { success: false, message: 'Error al actualizar espacio' };
  }
}

async function deleteSpace(spaceId: string, confirm: boolean) {
  if (!confirm) {
    return {
      success: false,
      message: 'Debe confirmar la eliminación estableciendo confirm: true',
      requires_confirmation: true
    };
  }

  try {
    // Obtener estado anterior
    const { data: previousSpace } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (!previousSpace) {
      return { success: false, message: 'Espacio no encontrado' };
    }

    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', spaceId);

    if (error) {
      console.error('Error deleting space:', error);
      return { success: false, message: `Error al eliminar: ${error.message}` };
    }

    return {
      success: true,
      message: `Espacio "${previousSpace.custom_name}" eliminado`,
      previousState: previousSpace,
      newState: null,
      affectedTables: ['spaces'],
      affectedRecordIds: [spaceId]
    };
  } catch (err) {
    console.error('deleteSpace error:', err);
    return { success: false, message: 'Error al eliminar espacio' };
  }
}

// ============================================
// CRUD - EMPLEADOS DEL HOGAR
// ============================================

async function listEmployees(householdId?: string, activeOnly: boolean = true) {
  try {
    let query = supabase
      .from('home_employees')
      .select('*')
      .order('name');

    if (householdId) {
      query = query.eq('household_id', householdId);
    }
    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data: employees, error } = await query;

    if (error) {
      console.error('Error listing employees:', error);
      return { success: false, message: 'Error al obtener empleados', employees: [] };
    }

    return {
      success: true,
      count: employees?.length || 0,
      employees: employees?.map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        zone: e.zone,
        work_days: e.work_days,
        hours_per_day: e.hours_per_day,
        schedule: e.schedule,
        phone: e.phone,
        active: e.active,
        notes: e.notes
      })) || []
    };
  } catch (err) {
    console.error('listEmployees error:', err);
    return { success: false, message: 'Error al obtener empleados', employees: [] };
  }
}

async function getEmployeeDetails(employeeId?: string, employeeName?: string) {
  try {
    let query = supabase
      .from('home_employees')
      .select('*');

    if (employeeId) {
      query = query.eq('id', employeeId);
    } else if (employeeName) {
      query = query.ilike('name', `%${employeeName}%`);
    } else {
      return { success: false, message: 'Se requiere employee_id o employee_name' };
    }

    const { data: employee, error } = await query.single();

    if (error || !employee) {
      return { success: false, message: 'Empleado no encontrado' };
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
        schedule: employee.schedule,
        phone: employee.phone,
        active: employee.active,
        notes: employee.notes
      }
    };
  } catch (err) {
    console.error('getEmployeeDetails error:', err);
    return { success: false, message: 'Error al obtener detalles del empleado' };
  }
}

async function createEmployee(
  householdId: string,
  name: string,
  role: string,
  zone?: string,
  workDays?: string[],
  hoursPerDay?: number,
  schedule?: string,
  phone?: string,
  notes?: string
) {
  try {
    const { data: newEmployee, error } = await supabase
      .from('home_employees')
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
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return { success: false, message: `Error al crear empleado: ${error.message}` };
    }

    return {
      success: true,
      message: `Empleado "${name}" registrado exitosamente`,
      employee: {
        id: newEmployee.id,
        name: newEmployee.name,
        role: newEmployee.role
      },
      previousState: null,
      newState: newEmployee,
      affectedTables: ['home_employees'],
      affectedRecordIds: [newEmployee.id]
    };
  } catch (err) {
    console.error('createEmployee error:', err);
    return { success: false, message: 'Error al crear empleado' };
  }
}

async function updateEmployee(
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
  }
) {
  try {
    // Obtener estado anterior
    const { data: previousEmployee } = await supabase
      .from('home_employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (!previousEmployee) {
      return { success: false, message: 'Empleado no encontrado' };
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
    if (typeof updates.active === 'boolean') updateData.active = updates.active;

    const { data: updatedEmployee, error } = await supabase
      .from('home_employees')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return { success: false, message: `Error al actualizar: ${error.message}` };
    }

    return {
      success: true,
      message: `Empleado "${updatedEmployee.name}" actualizado`,
      employee: {
        id: updatedEmployee.id,
        name: updatedEmployee.name
      },
      previousState: previousEmployee,
      newState: updatedEmployee,
      affectedTables: ['home_employees'],
      affectedRecordIds: [employeeId]
    };
  } catch (err) {
    console.error('updateEmployee error:', err);
    return { success: false, message: 'Error al actualizar empleado' };
  }
}

async function deleteEmployee(employeeId: string, hardDelete: boolean = false, confirm: boolean = false) {
  if (!confirm) {
    return {
      success: false,
      message: 'Debe confirmar la eliminación estableciendo confirm: true',
      requires_confirmation: true
    };
  }

  try {
    // Obtener estado anterior
    const { data: previousEmployee } = await supabase
      .from('home_employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (!previousEmployee) {
      return { success: false, message: 'Empleado no encontrado' };
    }

    if (hardDelete) {
      // Eliminación permanente
      const { error } = await supabase
        .from('home_employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        console.error('Error deleting employee:', error);
        return { success: false, message: `Error al eliminar: ${error.message}` };
      }

      return {
        success: true,
        message: `Empleado "${previousEmployee.name}" eliminado permanentemente`,
        previousState: previousEmployee,
        newState: null,
        affectedTables: ['home_employees'],
        affectedRecordIds: [employeeId]
      };
    } else {
      // Solo desactivar (soft delete)
      const { data: updatedEmployee, error } = await supabase
        .from('home_employees')
        .update({ active: false })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) {
        console.error('Error deactivating employee:', error);
        return { success: false, message: `Error al desactivar: ${error.message}` };
      }

      return {
        success: true,
        message: `Empleado "${previousEmployee.name}" desactivado`,
        previousState: previousEmployee,
        newState: updatedEmployee,
        affectedTables: ['home_employees'],
        affectedRecordIds: [employeeId]
      };
    }
  } catch (err) {
    console.error('deleteEmployee error:', err);
    return { success: false, message: 'Error al eliminar empleado' };
  }
}

// ============================================
// CRUD - TAREAS AVANZADAS
// ============================================

async function listTaskTemplates(
  employeeId?: string,
  weekNumber?: number,
  category?: string
) {
  try {
    let query = supabase
      .from('schedule_templates')
      .select(`
        *,
        employee:employees(id, name)
      `)
      .order('week_number')
      .order('day_of_week')
      .order('time_start');

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (weekNumber) {
      query = query.eq('week_number', weekNumber);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error listing task templates:', error);
      return { success: false, message: 'Error al obtener plantillas', templates: [] };
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return {
      success: true,
      count: templates?.length || 0,
      templates: templates?.map(t => ({
        id: t.id,
        task_name: t.task_name,
        employee: t.employee?.name || 'Sin asignar',
        week_number: t.week_number,
        day_of_week: t.day_of_week,
        day_name: dayNames[t.day_of_week],
        time: `${t.time_start?.substring(0, 5)} - ${t.time_end?.substring(0, 5)}`,
        category: t.category,
        is_special: t.is_special,
        description: t.task_description
      })) || []
    };
  } catch (err) {
    console.error('listTaskTemplates error:', err);
    return { success: false, message: 'Error al obtener plantillas', templates: [] };
  }
}

async function createTaskTemplate(
  employeeName: string,
  taskName: string,
  weekNumber: number,
  dayOfWeek: number,
  timeStart: string,
  timeEnd: string,
  category: string,
  isSpecial: boolean = false,
  description?: string
) {
  try {
    // Buscar empleado por nombre
    const { data: employee } = await supabase
      .from('employees')
      .select('id, name')
      .ilike('name', `%${employeeName}%`)
      .single();

    if (!employee) {
      return { success: false, message: `Empleado "${employeeName}" no encontrado` };
    }

    const { data: newTemplate, error } = await supabase
      .from('schedule_templates')
      .insert({
        employee_id: employee.id,
        task_name: taskName,
        week_number: weekNumber,
        day_of_week: dayOfWeek,
        time_start: timeStart,
        time_end: timeEnd,
        category,
        is_special: isSpecial,
        task_description: description
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task template:', error);
      return { success: false, message: `Error al crear plantilla: ${error.message}` };
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return {
      success: true,
      message: `Plantilla "${taskName}" creada para ${employee.name} los ${dayNames[dayOfWeek]} de la semana ${weekNumber}`,
      template: {
        id: newTemplate.id,
        task_name: taskName,
        employee: employee.name
      },
      previousState: null,
      newState: newTemplate,
      affectedTables: ['schedule_templates'],
      affectedRecordIds: [newTemplate.id]
    };
  } catch (err) {
    console.error('createTaskTemplate error:', err);
    return { success: false, message: 'Error al crear plantilla de tarea' };
  }
}

async function updateTaskTemplate(
  templateId: string,
  updates: {
    taskName?: string;
    employeeName?: string;
    timeStart?: string;
    timeEnd?: string;
    category?: string;
    isSpecial?: boolean;
    description?: string;
  }
) {
  try {
    // Obtener estado anterior
    const { data: previousTemplate } = await supabase
      .from('schedule_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!previousTemplate) {
      return { success: false, message: 'Plantilla no encontrada' };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.taskName) updateData.task_name = updates.taskName;
    if (updates.timeStart) updateData.time_start = updates.timeStart;
    if (updates.timeEnd) updateData.time_end = updates.timeEnd;
    if (updates.category) updateData.category = updates.category;
    if (typeof updates.isSpecial === 'boolean') updateData.is_special = updates.isSpecial;
    if (updates.description !== undefined) updateData.task_description = updates.description;

    // Si se especifica nuevo empleado, buscarlo
    if (updates.employeeName) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .ilike('name', `%${updates.employeeName}%`)
        .single();

      if (employee) {
        updateData.employee_id = employee.id;
      }
    }

    const { data: updatedTemplate, error } = await supabase
      .from('schedule_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task template:', error);
      return { success: false, message: `Error al actualizar: ${error.message}` };
    }

    return {
      success: true,
      message: `Plantilla "${updatedTemplate.task_name}" actualizada`,
      template: {
        id: updatedTemplate.id,
        task_name: updatedTemplate.task_name
      },
      previousState: previousTemplate,
      newState: updatedTemplate,
      affectedTables: ['schedule_templates'],
      affectedRecordIds: [templateId]
    };
  } catch (err) {
    console.error('updateTaskTemplate error:', err);
    return { success: false, message: 'Error al actualizar plantilla' };
  }
}

async function deleteTaskTemplate(templateId: string, confirm: boolean) {
  if (!confirm) {
    return {
      success: false,
      message: 'Debe confirmar la eliminación estableciendo confirm: true',
      requires_confirmation: true
    };
  }

  try {
    // Obtener estado anterior
    const { data: previousTemplate } = await supabase
      .from('schedule_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!previousTemplate) {
      return { success: false, message: 'Plantilla no encontrada' };
    }

    const { error } = await supabase
      .from('schedule_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting task template:', error);
      return { success: false, message: `Error al eliminar: ${error.message}` };
    }

    return {
      success: true,
      message: `Plantilla "${previousTemplate.task_name}" eliminada`,
      previousState: previousTemplate,
      newState: null,
      affectedTables: ['schedule_templates'],
      affectedRecordIds: [templateId]
    };
  } catch (err) {
    console.error('deleteTaskTemplate error:', err);
    return { success: false, message: 'Error al eliminar plantilla' };
  }
}

async function rescheduleTask(
  taskId: string,
  newDate?: string,
  newTimeStart?: string,
  newTimeEnd?: string,
  newEmployeeName?: string
) {
  try {
    // Obtener estado anterior
    const { data: previousTask } = await supabase
      .from('daily_task_instances')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!previousTask) {
      return { success: false, message: 'Tarea no encontrada' };
    }

    const updateData: Record<string, unknown> = {};
    if (newDate) updateData.date = newDate;
    if (newTimeStart) updateData.time_start = newTimeStart;
    if (newTimeEnd) updateData.time_end = newTimeEnd;

    // Si se especifica nuevo empleado, buscarlo
    if (newEmployeeName) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .ilike('name', `%${newEmployeeName}%`)
        .single();

      if (employee) {
        updateData.employee_id = employee.id;
      } else {
        // Intentar en home_employees
        const { data: homeEmp } = await supabase
          .from('home_employees')
          .select('id')
          .ilike('name', `%${newEmployeeName}%`)
          .single();

        if (homeEmp) {
          updateData.employee_id = homeEmp.id;
        }
      }
    }

    const { data: updatedTask, error } = await supabase
      .from('daily_task_instances')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error rescheduling task:', error);
      return { success: false, message: `Error al reprogramar: ${error.message}` };
    }

    return {
      success: true,
      message: `Tarea "${updatedTask.task_name}" reprogramada`,
      task: {
        id: updatedTask.id,
        task_name: updatedTask.task_name,
        date: updatedTask.date,
        time: `${updatedTask.time_start?.substring(0, 5)} - ${updatedTask.time_end?.substring(0, 5)}`
      },
      previousState: previousTask,
      newState: updatedTask,
      affectedTables: ['daily_task_instances'],
      affectedRecordIds: [taskId]
    };
  } catch (err) {
    console.error('rescheduleTask error:', err);
    return { success: false, message: 'Error al reprogramar tarea' };
  }
}

async function generateTasksForDate(dateStr: string) {
  try {
    // Llamar a la función RPC que genera las tareas
    const { data, error } = await supabase.rpc('generate_daily_tasks', {
      target_date: dateStr
    });

    if (error) {
      console.error('Error generating tasks:', error);
      return { success: false, message: `Error al generar tareas: ${error.message}` };
    }

    const tasksCreated = data || 0;

    if (tasksCreated === 0) {
      return {
        success: true,
        message: `Ya existen tareas para ${dateStr} o no hay plantillas aplicables`,
        tasks_created: 0
      };
    }

    return {
      success: true,
      message: `${tasksCreated} tareas generadas para ${dateStr}`,
      tasks_created: tasksCreated
    };
  } catch (err) {
    console.error('generateTasksForDate error:', err);
    return { success: false, message: 'Error al generar tareas' };
  }
}

// ============================================
// CRUD - RECETAS
// ============================================

interface RecipeIngredient {
  name: string;
  luis: string;
  mariana: string;
  total?: string;
}

async function createRecipe(
  name: string,
  type: 'breakfast' | 'lunch' | 'dinner',
  ingredients: RecipeIngredient[],
  steps: string[],
  prepTime?: number,
  cookTime?: number,
  difficulty?: string,
  description?: string,
  tips?: string
) {
  try {
    // Calcular tiempo total
    const totalTime = (prepTime || 0) + (cookTime || 0);

    const { data: newRecipe, error } = await supabase
      .from('recipes')
      .insert({
        name,
        type,
        ingredients,
        steps,
        prep_time: prepTime,
        cook_time: cookTime,
        total_time: totalTime || null,
        difficulty: difficulty || 'media',
        description,
        tips,
        source: 'manual'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recipe:', error);
      return { success: false, message: `Error al crear receta: ${error.message}` };
    }

    return {
      success: true,
      message: `Receta "${name}" creada exitosamente`,
      recipe: {
        id: newRecipe.id,
        name: newRecipe.name,
        type: newRecipe.type
      },
      previousState: null,
      newState: newRecipe,
      affectedTables: ['recipes'],
      affectedRecordIds: [newRecipe.id]
    };
  } catch (err) {
    console.error('createRecipe error:', err);
    return { success: false, message: 'Error al crear receta' };
  }
}

async function updateRecipe(
  recipeId: string,
  updates: {
    name?: string;
    type?: string;
    ingredients?: RecipeIngredient[];
    steps?: string[];
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    description?: string;
    tips?: string;
  }
) {
  try {
    // Obtener estado anterior
    const { data: previousRecipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (!previousRecipe) {
      return { success: false, message: 'Receta no encontrada' };
    }

    const updateData: Record<string, unknown> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.type) updateData.type = updates.type;
    if (updates.ingredients) updateData.ingredients = updates.ingredients;
    if (updates.steps) updateData.steps = updates.steps;
    if (updates.prepTime) updateData.prep_time = updates.prepTime;
    if (updates.cookTime) updateData.cook_time = updates.cookTime;
    if (updates.difficulty) updateData.difficulty = updates.difficulty;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tips !== undefined) updateData.tips = updates.tips;

    // Recalcular tiempo total si se actualizó algún tiempo
    if (updates.prepTime || updates.cookTime) {
      const prep = updates.prepTime || previousRecipe.prep_time || 0;
      const cook = updates.cookTime || previousRecipe.cook_time || 0;
      updateData.total_time = prep + cook;
    }

    const { data: updatedRecipe, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating recipe:', error);
      return { success: false, message: `Error al actualizar: ${error.message}` };
    }

    return {
      success: true,
      message: `Receta "${updatedRecipe.name}" actualizada`,
      recipe: {
        id: updatedRecipe.id,
        name: updatedRecipe.name
      },
      previousState: previousRecipe,
      newState: updatedRecipe,
      affectedTables: ['recipes'],
      affectedRecordIds: [recipeId]
    };
  } catch (err) {
    console.error('updateRecipe error:', err);
    return { success: false, message: 'Error al actualizar receta' };
  }
}

async function deleteRecipe(recipeId: string, confirm: boolean) {
  if (!confirm) {
    return {
      success: false,
      message: 'Debe confirmar la eliminación estableciendo confirm: true',
      requires_confirmation: true
    };
  }

  try {
    // Obtener estado anterior
    const { data: previousRecipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (!previousRecipe) {
      return { success: false, message: 'Receta no encontrada' };
    }

    // Verificar si la receta está en uso en el menú
    const { data: menuUsage } = await supabase
      .from('day_menu')
      .select('day_number')
      .or(`breakfast_id.eq.${recipeId},lunch_id.eq.${recipeId},dinner_id.eq.${recipeId}`);

    if (menuUsage && menuUsage.length > 0) {
      return {
        success: false,
        message: `No se puede eliminar: la receta está en uso en ${menuUsage.length} día(s) del menú`,
        menu_days: menuUsage.map(m => m.day_number)
      };
    }

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId);

    if (error) {
      console.error('Error deleting recipe:', error);
      return { success: false, message: `Error al eliminar: ${error.message}` };
    }

    return {
      success: true,
      message: `Receta "${previousRecipe.name}" eliminada`,
      previousState: previousRecipe,
      newState: null,
      affectedTables: ['recipes'],
      affectedRecordIds: [recipeId]
    };
  } catch (err) {
    console.error('deleteRecipe error:', err);
    return { success: false, message: 'Error al eliminar receta' };
  }
}

// ============================================
// INVENTARIO AVANZADO
// ============================================

interface InventoryUpdate {
  item_name: string;
  quantity: number;
  action?: 'set' | 'add' | 'subtract';
}

async function bulkUpdateInventory(updates: InventoryUpdate[], confirm: boolean) {
  if (!confirm) {
    return {
      success: false,
      message: 'Debe confirmar la actualización masiva estableciendo confirm: true',
      requires_confirmation: true
    };
  }

  try {
    const results: Array<{
      item: string;
      success: boolean;
      previousQuantity?: number;
      newQuantity?: number;
      error?: string;
    }> = [];

    const previousStates: Record<string, unknown>[] = [];
    const newStates: Record<string, unknown>[] = [];
    const affectedIds: string[] = [];

    for (const update of updates) {
      // Buscar el item
      const { data: item } = await supabase
        .from('market_items')
        .select('id, name')
        .ilike('name', `%${update.item_name}%`)
        .single();

      if (!item) {
        results.push({
          item: update.item_name,
          success: false,
          error: 'Item no encontrado'
        });
        continue;
      }

      // Obtener cantidad actual
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('item_id', item.id)
        .single();

      const previousQuantity = inventory?.current_number || 0;
      previousStates.push({ item_id: item.id, quantity: previousQuantity });

      let newQuantity: number;
      const action = update.action || 'set';

      switch (action) {
        case 'add':
          newQuantity = previousQuantity + update.quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, previousQuantity - update.quantity);
          break;
        default:
          newQuantity = update.quantity;
      }

      // Actualizar inventario
      const { error: updateError } = await supabase
        .from('inventory')
        .upsert({
          item_id: item.id,
          current_number: newQuantity
        });

      if (updateError) {
        results.push({
          item: item.name,
          success: false,
          error: updateError.message
        });
      } else {
        results.push({
          item: item.name,
          success: true,
          previousQuantity,
          newQuantity
        });
        newStates.push({ item_id: item.id, quantity: newQuantity });
        affectedIds.push(item.id);
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      message: `${successCount} de ${updates.length} items actualizados`,
      results,
      previousState: previousStates,
      newState: newStates,
      affectedTables: ['inventory'],
      affectedRecordIds: affectedIds
    };
  } catch (err) {
    console.error('bulkUpdateInventory error:', err);
    return { success: false, message: 'Error al actualizar inventario' };
  }
}

interface ReceiptItem {
  name: string;
  quantity: number;
  unit?: string;
}

async function scanReceiptItems(items: ReceiptItem[]) {
  try {
    const updates: InventoryUpdate[] = items.map(item => ({
      item_name: item.name,
      quantity: item.quantity,
      action: 'add' as const
    }));

    // Usar la función de actualización masiva
    return await bulkUpdateInventory(updates, true);
  } catch (err) {
    console.error('scanReceiptItems error:', err);
    return { success: false, message: 'Error al procesar items del ticket' };
  }
}

async function resetInventoryToDefault(confirm: boolean) {
  if (!confirm) {
    return {
      success: false,
      message: 'Debe confirmar el reinicio estableciendo confirm: true',
      requires_confirmation: true
    };
  }

  try {
    // Obtener estado anterior de todo el inventario
    const { data: previousInventory } = await supabase
      .from('inventory')
      .select('*, item:market_items(name)');

    // Obtener valores por defecto de market_items
    const { data: defaultValues } = await supabase
      .from('market_items')
      .select('id, default_quantity');

    // Actualizar cada item a su valor por defecto
    for (const item of defaultValues || []) {
      await supabase
        .from('inventory')
        .upsert({
          item_id: item.id,
          current_number: item.default_quantity || 0
        });
    }

    // Obtener nuevo estado
    const { data: newInventory } = await supabase
      .from('inventory')
      .select('*, item:market_items(name)');

    return {
      success: true,
      message: `Inventario reiniciado a valores predeterminados (${defaultValues?.length || 0} items)`,
      previousState: previousInventory,
      newState: newInventory,
      affectedTables: ['inventory'],
      affectedRecordIds: (defaultValues || []).map(i => i.id)
    };
  } catch (err) {
    console.error('resetInventoryToDefault error:', err);
    return { success: false, message: 'Error al reiniciar inventario' };
  }
}

async function addToShoppingList(itemName: string, quantity?: string) {
  // Buscar si el item existe
  const { data: existingItem } = await supabase
    .from('market_items')
    .select('id')
    .ilike('name', `%${itemName}%`)
    .single();

  if (existingItem) {
    // Agregar a checklist
    await supabase
      .from('market_checklist')
      .upsert({ item_id: existingItem.id, checked: false })
      .select();

    return { success: true, message: `"${itemName}" agregado a la lista de compras` };
  }

  // Crear item nuevo como custom
  const { data: newItem } = await supabase
    .from('market_items')
    .insert({
      name: itemName,
      category: 'Otros',
      unit: quantity || 'unidad',
      is_custom: true
    })
    .select()
    .single();

  if (newItem) {
    await supabase
      .from('market_checklist')
      .insert({ item_id: newItem.id, checked: false });

    return { success: true, message: `"${itemName}" creado y agregado a la lista` };
  }

  return { success: false, message: 'No se pudo agregar el item' };
}

async function markShoppingItem(itemName: string, checked: boolean) {
  const { data: item } = await supabase
    .from('market_items')
    .select('id')
    .ilike('name', `%${itemName}%`)
    .single();

  if (!item) {
    return { success: false, message: `No se encontró "${itemName}" en la lista` };
  }

  await supabase
    .from('market_checklist')
    .update({ checked })
    .eq('item_id', item.id);

  return {
    success: true,
    message: checked ? `"${itemName}" marcado como comprado` : `"${itemName}" desmarcado`
  };
}

async function addMissingToShopping(recipeName: string) {
  const missingResult = await getMissingIngredients(recipeName);

  if ('error' in missingResult) {
    return missingResult;
  }

  if (missingResult.missing_count === 0) {
    return {
      success: true,
      message: `¡Tienes todos los ingredientes para ${missingResult.recipe}!`,
      added: []
    };
  }

  const added: string[] = [];
  for (const ingredient of missingResult.missing_ingredients) {
    const result = await addToShoppingList(ingredient);
    if (result.success) {
      added.push(ingredient);
    }
  }

  return {
    success: true,
    message: `Se agregaron ${added.length} ingredientes a la lista de compras`,
    added,
    recipe: missingResult.recipe
  };
}

async function swapMenuRecipe(dayNumber: number, mealType: string, newRecipeName: string) {
  // Validar día
  if (dayNumber < 1 || dayNumber > 12) {
    return { success: false, message: 'El día debe estar entre 1 y 12' };
  }

  // Validar tipo de comida
  const validMealTypes = ['breakfast', 'lunch', 'dinner'];
  if (!validMealTypes.includes(mealType)) {
    return { success: false, message: 'Tipo de comida debe ser: breakfast, lunch o dinner' };
  }

  // Buscar la receta nueva
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, name')
    .ilike('name', `%${newRecipeName}%`)
    .single();

  if (!recipe) {
    return { success: false, message: `No se encontró la receta "${newRecipeName}"` };
  }

  // Actualizar el menú
  const updateField = `${mealType}_id`;
  const { error } = await supabase
    .from('day_menu')
    .update({ [updateField]: recipe.id })
    .eq('day_number', dayNumber);

  if (error) {
    return { success: false, message: 'Error al actualizar el menú' };
  }

  const mealTypeSpanish: Record<string, string> = {
    breakfast: 'desayuno',
    lunch: 'almuerzo',
    dinner: 'cena'
  };

  return {
    success: true,
    message: `✅ ${mealTypeSpanish[mealType]} del día ${dayNumber} cambiado a "${recipe.name}"`
  };
}

async function updateInventory(itemName: string, quantity: number, action: string = 'set') {
  // Buscar el item
  const { data: item } = await supabase
    .from('market_items')
    .select('id, name')
    .ilike('name', `%${itemName}%`)
    .single();

  if (!item) {
    return { success: false, message: `No se encontró "${itemName}" en el inventario` };
  }

  // Obtener cantidad actual
  const { data: currentInv } = await supabase
    .from('inventory')
    .select('current_number')
    .eq('item_id', item.id)
    .single();

  let newQuantity = quantity;
  const currentQty = currentInv?.current_number || 0;

  if (action === 'add') {
    newQuantity = currentQty + quantity;
  } else if (action === 'subtract') {
    newQuantity = Math.max(0, currentQty - quantity);
  }

  // Actualizar o insertar
  const { error } = await supabase
    .from('inventory')
    .upsert({
      item_id: item.id,
      current_number: newQuantity,
      current_quantity: `${newQuantity}`
    }, { onConflict: 'item_id' });

  if (error) {
    return { success: false, message: 'Error al actualizar el inventario' };
  }

  return {
    success: true,
    message: `✅ ${item.name}: ${currentQty} → ${newQuantity}`,
    item: item.name,
    previous: currentQty,
    current: newQuantity
  };
}

async function completeTask(taskName: string, employeeName?: string) {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('daily_task_instances')
    .select('id, task_name')
    .eq('date', today)
    .ilike('task_name', `%${taskName}%`);

  const { data: tasks } = await query;

  if (!tasks || tasks.length === 0) {
    return { success: false, message: `No se encontró la tarea "${taskName}"` };
  }

  await supabase
    .from('daily_task_instances')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', tasks[0].id);

  return { success: true, message: `Tarea "${tasks[0].task_name}" marcada como completada` };
}

async function addQuickTask(taskName: string, employeeName?: string, category?: string) {
  const today = new Date().toISOString().split('T')[0];

  // Buscar empleado si se especificó
  let employeeId = null;
  if (employeeName) {
    const { data: emp } = await supabase
      .from('home_employees')
      .select('id')
      .ilike('name', `%${employeeName}%`)
      .single();

    employeeId = emp?.id;
  }

  const { error } = await supabase
    .from('daily_task_instances')
    .insert({
      date: today,
      task_name: taskName,
      employee_id: employeeId,
      time_start: '09:00',
      time_end: '10:00',
      category: category || 'general',
      status: 'pending',
      is_special: false
    });

  if (error) {
    return { success: false, message: 'No se pudo crear la tarea' };
  }

  return {
    success: true,
    message: `Tarea "${taskName}" creada para hoy${employeeName ? ` (asignada a ${employeeName})` : ''}`
  };
}

function getCurrentDateInfo() {
  const now = new Date();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayOfWeek = now.getDay();
  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;

  return {
    date: now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    day_name: dayNames[dayOfWeek],
    time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    week_number: Math.ceil((now.getDate() - now.getDay() + 1) / 7),
    cycle_day: cycleDay,
    is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
    has_dinner: dayOfWeek !== 5 && dayOfWeek !== 6 // No cena viernes/sábado
  };
}

async function getWeeklyReport() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Tareas de la semana
  const { data: tasks } = await supabase
    .from('scheduled_tasks')
    .select('status')
    .gte('scheduled_date', weekStart.toISOString().split('T')[0])
    .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

  const total = tasks?.length || 0;
  const completed = tasks?.filter(t => t.status === 'completada').length || 0;
  const pending = tasks?.filter(t => t.status === 'pendiente').length || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Inventario bajo
  const { data: lowInventory } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name)')
    .lte('current_number', 2)
    .gt('current_number', 0);

  // Items sin stock
  const { data: outOfStock } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name)')
    .eq('current_number', 0);

  return {
    period: `${weekStart.toLocaleDateString('es-ES')} - ${weekEnd.toLocaleDateString('es-ES')}`,
    tasks: {
      total,
      completed,
      pending,
      completion_rate: completionRate
    },
    inventory: {
      low_stock_count: lowInventory?.length || 0,
      low_stock_items: lowInventory?.slice(0, 5).map(i => i.market_item?.name) || [],
      out_of_stock_count: outOfStock?.length || 0,
      out_of_stock_items: outOfStock?.slice(0, 5).map(i => i.market_item?.name) || []
    },
    summary: `Semana con ${completionRate}% de tareas completadas. ${
      (lowInventory?.length || 0) > 0 ? `Hay ${lowInventory?.length} items con bajo inventario.` : 'Inventario en buen estado.'
    }`
  };
}

async function getLowInventoryAlerts(threshold: number = 2) {
  const { data } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name, category)')
    .lte('current_number', threshold)
    .order('current_number');

  const grouped: Record<string, Array<{ name: string; quantity: number }>> = {};

  data?.forEach(item => {
    const cat = item.market_item?.category || 'Otros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      name: item.market_item?.name || 'Item',
      quantity: item.current_number
    });
  });

  const totalAlerts = data?.length || 0;
  const criticalCount = data?.filter(i => i.current_number === 0).length || 0;

  return {
    total_alerts: totalAlerts,
    critical_count: criticalCount,
    low_count: totalAlerts - criticalCount,
    by_category: grouped,
    message: totalAlerts === 0
      ? '✅ No hay alertas de inventario'
      : `⚠️ ${criticalCount} items agotados, ${totalAlerts - criticalCount} items bajos`
  };
}

async function getUpcomingMeals(days: number = 3) {
  const today = new Date();
  const meals: Array<{
    date: string;
    day_name: string;
    breakfast: string;
    lunch: string;
    dinner: string;
  }> = [];

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;

    const { data: menu } = await supabase
      .from('day_menu')
      .select(`
        breakfast:recipes!day_menu_breakfast_id_fkey(name),
        lunch:recipes!day_menu_lunch_id_fkey(name),
        dinner:recipes!day_menu_dinner_id_fkey(name)
      `)
      .eq('day_number', cycleDay)
      .single();

    meals.push({
      date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      day_name: dayNames[dayOfWeek],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      breakfast: (menu?.breakfast as any)?.name || 'No programado',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lunch: (menu?.lunch as any)?.name || 'No programado',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dinner: (dayOfWeek === 5 || dayOfWeek === 6) ? 'Sin cena (sale a comer)' : ((menu?.dinner as any)?.name || 'No programado')
    });
  }

  return {
    days: meals,
    tip: meals.length > 0 ? `Próximas ${meals.length} días de menú` : 'No hay menú disponible'
  };
}

async function calculatePortions(recipeName: string, portions: number) {
  const { data: recipe } = await supabase
    .from('recipes')
    .select('name, portions, ingredients')
    .ilike('name', `%${recipeName}%`)
    .single();

  if (!recipe) {
    return { error: `No se encontró la receta "${recipeName}"` };
  }

  const originalPortions = recipe.portions || 5;
  const multiplier = portions / originalPortions;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  const adjustedIngredients = ingredients.map((ing: { name?: string; amount?: string } | string) => {
    if (typeof ing === 'string') {
      // Intentar extraer número del string
      const match = ing.match(/^([\d.]+)\s*(.+)$/);
      if (match) {
        const newAmount = (parseFloat(match[1]) * multiplier).toFixed(1);
        return `${newAmount} ${match[2]}`;
      }
      return ing;
    }
    // Es objeto con amount y name
    const amount = ing.amount || '';
    const numMatch = amount.match(/([\d.]+)/);
    if (numMatch) {
      const newAmount = (parseFloat(numMatch[1]) * multiplier).toFixed(1);
      return `${newAmount}${amount.replace(numMatch[1], '')} ${ing.name}`;
    }
    return `${amount} ${ing.name}`;
  });

  return {
    recipe: recipe.name,
    original_portions: originalPortions,
    requested_portions: portions,
    multiplier: multiplier.toFixed(2),
    adjusted_ingredients: adjustedIngredients
  };
}

async function getPreparationTips() {
  // Obtener menú de hoy
  const today = new Date();
  const dayOfWeek = today.getDay();
  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;

  const { data: menu } = await supabase
    .from('day_menu')
    .select(`
      breakfast:recipes!day_menu_breakfast_id_fkey(name, prep_time, ingredients),
      lunch:recipes!day_menu_lunch_id_fkey(name, prep_time, ingredients),
      dinner:recipes!day_menu_dinner_id_fkey(name, prep_time, ingredients)
    `)
    .eq('day_number', cycleDay)
    .single();

  const tips: string[] = [];
  const meals = [
    { name: 'Desayuno', data: menu?.breakfast, time: '7:00 AM' },
    { name: 'Almuerzo', data: menu?.lunch, time: '12:00 PM' },
    { name: 'Cena', data: menu?.dinner, time: '7:00 PM' }
  ];

  meals.forEach(meal => {
    if (meal.data && typeof meal.data === 'object' && 'name' in meal.data) {
      const prepTime = (meal.data as { prep_time?: number }).prep_time || 30;
      const ingredients = (meal.data as { ingredients?: unknown[] }).ingredients || [];

      // Buscar ingredientes que requieren descongelar
      const needsDefrost = Array.isArray(ingredients) && ingredients.some((ing: unknown) => {
        const ingStr = typeof ing === 'string' ? ing : (ing as { name?: string })?.name || '';
        return /pollo|carne|pescado|cerdo|res/i.test(ingStr);
      });

      if (needsDefrost) {
        tips.push(`🧊 Descongelar proteína para ${meal.name} (${(meal.data as { name?: string }).name})`);
      }

      if (prepTime > 45) {
        tips.push(`⏰ ${meal.name} requiere ${prepTime} min de preparación - planifica con tiempo`);
      }
    }
  });

  if (tips.length === 0) {
    tips.push('✅ No hay preparaciones especiales necesarias para hoy');
  }

  return {
    date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    tips,
    menu_summary: meals.map(m => ({
      meal: m.name,
      recipe: m.data && typeof m.data === 'object' && 'name' in m.data ? (m.data as { name: string }).name : 'No programado'
    }))
  };
}

// ============================================
// AGENTE MULTI-PASO
// ============================================

interface MultiStepResult {
  task_type: string;
  steps_completed: string[];
  results: Record<string, unknown>;
  summary: string;
  next_suggestions?: string[];
  use_general_knowledge?: boolean;
  instruction?: string;
}

async function executeMultiStepTask(
  taskType: string,
  params: Record<string, unknown> = {}
): Promise<MultiStepResult> {
  const stepsCompleted: string[] = [];
  const results: Record<string, unknown> = {};

  switch (taskType) {
    case 'prepare_recipe': {
      // Paso 1: Obtener detalles de la receta
      const recipeName = params.recipe_name as string;
      if (!recipeName) {
        return {
          task_type: taskType,
          steps_completed: [],
          results: { error: 'Se requiere el nombre de la receta' },
          summary: 'Error: falta el nombre de la receta'
        };
      }

      const recipeDetails = await getRecipeDetails(recipeName);
      stepsCompleted.push('✅ Buscar receta en base de datos');
      results.recipe = recipeDetails;

      // Si la receta no existe, indicar que use conocimiento general
      if ('recipe_not_found' in recipeDetails && recipeDetails.recipe_not_found) {
        stepsCompleted.push('📚 Receta no encontrada - usar conocimiento culinario general');

        // Obtener inventario para comparar
        const inventory = await getInventory();
        stepsCompleted.push('✅ Obtener inventario disponible');
        results.inventory = inventory;

        return {
          task_type: taskType,
          steps_completed: stepsCompleted,
          results,
          summary: `La receta "${recipeName}" no está en la base de datos, pero puedo ayudarte usando mi conocimiento culinario.`,
          use_general_knowledge: true,
          instruction: `IMPORTANTE: Debes usar tu conocimiento general de cocina para dar los ingredientes y pasos de "${recipeName}". Compara con el inventario del usuario y marca ✅ lo que tiene y ❌ lo que le falta. Ofrece agregar faltantes a la lista de compras.`,
          next_suggestions: [
            'Dame los ingredientes y pasos',
            'Agrega lo que me falta a la lista',
            'Buscar una receta similar en el sistema'
          ]
        };
      }

      // Paso 2: Verificar ingredientes (solo si la receta existe)
      const missingCheck = await getMissingIngredients(recipeName);
      stepsCompleted.push('✅ Verificar ingredientes en inventario');
      results.ingredients_check = missingCheck;

      // Paso 3: Si hay faltantes, agregarlos a la lista
      const missingCount = ('missing_count' in missingCheck ? missingCheck.missing_count : 0) || 0;
      if (missingCount && missingCount > 0) {
        const addResult = await addMissingToShopping(recipeName);
        stepsCompleted.push('✅ Agregar faltantes a lista de compras');
        results.shopping_added = addResult;
      }

      // Paso 4: Obtener tips de preparación
      const tips = await getPreparationTips();
      stepsCompleted.push('✅ Generar consejos de preparación');
      results.tips = tips;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Receta "${recipeName}" preparada. ${
          missingCount > 0
            ? `Se agregaron ${missingCount} ingredientes a la lista de compras.`
            : 'Tienes todos los ingredientes.'
        }`,
        next_suggestions: [
          'Ver pasos de preparación detallados',
          'Ajustar porciones',
          'Ver sustituciones disponibles'
        ]
      };
    }

    case 'weekly_planning': {
      // Paso 1: Obtener menú de la semana
      const weekMenu = await getWeekMenu();
      stepsCompleted.push('✅ Obtener menú de la semana');
      results.menu = weekMenu;

      // Paso 2: Obtener inventario actual
      const inventory = await getInventory();
      stepsCompleted.push('✅ Revisar inventario actual');
      results.inventory = inventory;

      // Paso 3: Generar lista de compras inteligente
      const shoppingList = await smartShoppingList(7);
      stepsCompleted.push('✅ Generar lista de compras para la semana');
      results.shopping_list = shoppingList;

      // Paso 4: Alertas de inventario bajo
      const alerts = await getLowInventoryAlerts(2);
      stepsCompleted.push('✅ Verificar alertas de inventario');
      results.alerts = alerts;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Planificación semanal completada. ${
          'total_items' in shoppingList ? `${shoppingList.total_items} items necesarios para comprar.` : ''
        } ${
          'critical_count' in alerts && alerts.critical_count > 0
            ? `⚠️ ${alerts.critical_count} items agotados.`
            : ''
        }`,
        next_suggestions: [
          'Ver menú detallado por día',
          'Ajustar recetas del menú',
          'Exportar lista de compras'
        ]
      };
    }

    case 'shopping_optimization': {
      // Paso 1: Obtener lista de compras actual
      const currentList = await getShoppingList();
      stepsCompleted.push('✅ Obtener lista de compras actual');
      results.current_list = currentList;

      // Paso 2: Obtener alertas de bajo inventario
      const alerts = await getLowInventoryAlerts(3);
      stepsCompleted.push('✅ Identificar items con bajo stock');
      results.low_stock = alerts;

      // Paso 3: Analizar próximas comidas
      const upcomingMeals = await getUpcomingMeals(5);
      stepsCompleted.push('✅ Analizar comidas de los próximos 5 días');
      results.upcoming = upcomingMeals;

      // Paso 4: Generar lista optimizada
      const smartList = await smartShoppingList(5);
      stepsCompleted.push('✅ Generar lista optimizada');
      results.optimized_list = smartList;

      const currentCount = 'total' in currentList ? currentList.total : (currentList.items?.length || 0);

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Lista de compras optimizada. ${currentCount} items actuales, ${
          'total_items' in smartList ? smartList.total_items : 0
        } items recomendados para los próximos 5 días.`,
        next_suggestions: [
          'Ver items por categoría',
          'Agregar items adicionales',
          'Ver tiendas recomendadas por categoría'
        ]
      };
    }

    case 'full_report': {
      // Paso 1: Info de fecha actual
      const dateInfo = getCurrentDateInfo();
      stepsCompleted.push('✅ Obtener información del día');
      results.date = dateInfo;

      // Paso 2: Menú de hoy
      const todayMenu = await getTodayMenu();
      stepsCompleted.push('✅ Obtener menú de hoy');
      results.today_menu = todayMenu;

      // Paso 3: Tareas del día
      const tasks = await getTodayTasks();
      stepsCompleted.push('✅ Obtener tareas del día');
      results.tasks = tasks;

      // Paso 4: Resumen de tareas
      const tasksSummary = await getTasksSummary();
      stepsCompleted.push('✅ Calcular progreso de tareas');
      results.tasks_summary = tasksSummary;

      // Paso 5: Alertas de inventario
      const inventoryAlerts = await getLowInventoryAlerts(2);
      stepsCompleted.push('✅ Revisar alertas de inventario');
      results.inventory_alerts = inventoryAlerts;

      // Paso 6: Tips de preparación
      const prepTips = await getPreparationTips();
      stepsCompleted.push('✅ Generar consejos del día');
      results.tips = prepTips;

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Reporte completo del hogar para ${dateInfo.day_name} ${dateInfo.date}. ${
          'progress_percent' in tasksSummary ? `Tareas: ${tasksSummary.progress_percent}% completadas.` : ''
        } ${
          'critical_count' in inventoryAlerts && inventoryAlerts.critical_count > 0
            ? `⚠️ ${inventoryAlerts.critical_count} items de inventario agotados.`
            : '✅ Inventario en buen estado.'
        }`,
        next_suggestions: [
          'Ver detalle de tareas pendientes',
          'Ver recetas de hoy',
          'Actualizar inventario'
        ]
      };
    }

    case 'menu_from_inventory': {
      // Paso 1: Obtener inventario completo
      const inventory = await getInventory();
      stepsCompleted.push('✅ Analizar inventario disponible');
      results.inventory = inventory;

      // Paso 2: Sugerir recetas basadas en inventario
      const suggestions: Array<{ name: string; prep_time?: string; category?: string; match_percent: number }> = [];

      // Obtener todas las recetas
      const { data: recipes } = await supabase
        .from('recipes')
        .select('name, ingredients, prep_time, category')
        .limit(30);

      // Obtener items del inventario
      const { data: invItems } = await supabase
        .from('inventory')
        .select('market_item:market_items(name)')
        .gt('current_number', 0);

      const availableItems = invItems?.map(i => (i.market_item as { name?: string })?.name?.toLowerCase()) || [];

      // Calcular match para cada receta
      for (const recipe of recipes || []) {
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        let matchCount = 0;

        for (const ing of ingredients) {
          const ingName = typeof ing === 'string' ? ing : (ing as { name?: string }).name || '';
          if (availableItems.some(ai =>
            ai?.includes(ingName.toLowerCase()) ||
            ingName.toLowerCase().includes(ai || '')
          )) {
            matchCount++;
          }
        }

        const matchPercent = ingredients.length > 0
          ? Math.round((matchCount / ingredients.length) * 100)
          : 0;

        if (matchPercent >= 60) {
          suggestions.push({
            name: recipe.name,
            prep_time: recipe.prep_time,
            category: recipe.category,
            match_percent: matchPercent
          });
        }
      }

      // Ordenar por match_percent
      suggestions.sort((a, b) => b.match_percent - a.match_percent);
      stepsCompleted.push('✅ Calcular compatibilidad de recetas');
      results.suggestions = suggestions.slice(0, 10);

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Encontradas ${suggestions.length} recetas compatibles con tu inventario actual. Las mejores opciones tienen ${suggestions[0]?.match_percent || 0}% de ingredientes disponibles.`,
        next_suggestions: [
          'Ver detalles de la receta recomendada',
          'Agregar ingredientes faltantes a la lista',
          'Ver otras opciones'
        ]
      };
    }

    default:
      return {
        task_type: taskType,
        steps_completed: [],
        results: { error: `Tipo de tarea no reconocido: ${taskType}` },
        summary: `Error: tipo de tarea "${taskType}" no válido. Usa: prepare_recipe, weekly_planning, shopping_optimization, full_report, menu_from_inventory`
      };
  }
}

async function smartShoppingList(daysAhead: number = 7): Promise<{
  total_items: number;
  by_category: Record<string, Array<{ item: string; for_recipes: string[]; urgency: string }>>;
  priority_items: string[];
  estimated_meals: number;
  summary: string;
}> {
  // Paso 1: Obtener menú para los próximos días
  const today = new Date();
  const dayOfWeek = today.getDay();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipesNeeded: Map<string, any> = new Map();

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dow = date.getDay();
    const cycleDay = ((dow === 0 ? 7 : dow) - 1) % 12 + 1;

    const { data: menu } = await supabase
      .from('day_menu')
      .select(`
        breakfast:recipes!day_menu_breakfast_id_fkey(name, ingredients),
        lunch:recipes!day_menu_lunch_id_fkey(name, ingredients),
        dinner:recipes!day_menu_dinner_id_fkey(name, ingredients)
      `)
      .eq('day_number', cycleDay)
      .single();

    if (menu) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [menu.breakfast, menu.lunch, menu.dinner].forEach((recipe: any) => {
        if (recipe && recipe.name) {
          if (!recipesNeeded.has(recipe.name)) {
            recipesNeeded.set(recipe.name, {
              ...recipe,
              count: 1
            });
          } else {
            const existing = recipesNeeded.get(recipe.name);
            existing.count++;
          }
        }
      });
    }
  }

  // Paso 2: Extraer todos los ingredientes necesarios
  const ingredientsNeeded: Map<string, { forRecipes: string[]; totalNeeded: number }> = new Map();

  for (const [recipeName, recipe] of recipesNeeded) {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    for (const ing of ingredients) {
      const ingName = typeof ing === 'string' ? ing : (ing as { name?: string }).name || '';
      const normalized = ingName.toLowerCase().trim();

      if (!ingredientsNeeded.has(normalized)) {
        ingredientsNeeded.set(normalized, { forRecipes: [], totalNeeded: 0 });
      }
      const data = ingredientsNeeded.get(normalized)!;
      if (!data.forRecipes.includes(recipeName)) {
        data.forRecipes.push(recipeName);
      }
      data.totalNeeded += recipe.count;
    }
  }

  // Paso 3: Comparar con inventario
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name, category)')
    .gt('current_number', 0);

  const availableMap: Map<string, { quantity: number; category: string }> = new Map();
  inventory?.forEach(item => {
    const name = (item.market_item as { name?: string })?.name?.toLowerCase() || '';
    const category = (item.market_item as { category?: string })?.category || 'Otros';
    availableMap.set(name, { quantity: item.current_number, category });
  });

  // Paso 4: Identificar faltantes
  const byCategory: Record<string, Array<{ item: string; for_recipes: string[]; urgency: string }>> = {};
  const priorityItems: string[] = [];

  for (const [ingredient, data] of ingredientsNeeded) {
    // Buscar si está disponible
    let found = false;
    let category = 'Otros';

    for (const [invName, invData] of availableMap) {
      if (invName.includes(ingredient) || ingredient.includes(invName)) {
        found = true;
        category = invData.category;
        break;
      }
    }

    if (!found) {
      // Determinar categoría del item faltante
      const { data: marketItem } = await supabase
        .from('market_items')
        .select('category')
        .ilike('name', `%${ingredient}%`)
        .single();

      category = marketItem?.category || 'Otros';

      if (!byCategory[category]) {
        byCategory[category] = [];
      }

      const urgency = data.totalNeeded >= 3 ? 'alta' : data.totalNeeded >= 2 ? 'media' : 'baja';

      byCategory[category].push({
        item: ingredient,
        for_recipes: data.forRecipes,
        urgency
      });

      if (urgency === 'alta') {
        priorityItems.push(ingredient);
      }
    }
  }

  // Contar total
  let totalItems = 0;
  for (const items of Object.values(byCategory)) {
    totalItems += items.length;
  }

  return {
    total_items: totalItems,
    by_category: byCategory,
    priority_items: priorityItems,
    estimated_meals: recipesNeeded.size,
    summary: totalItems === 0
      ? `¡Excelente! Tienes todos los ingredientes para las próximas ${daysAhead} días.`
      : `Necesitas ${totalItems} items para ${recipesNeeded.size} comidas en los próximos ${daysAhead} días. ${priorityItems.length > 0 ? `Prioridad alta: ${priorityItems.slice(0, 3).join(', ')}.` : ''}`
  };
}

// ============================================
// EJECUTOR DE FUNCIONES CON LOGGING
// ============================================

/**
 * Captura el estado previo antes de ejecutar una función de modificación
 */
async function capturePreState(
  functionName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  try {
    switch (functionName) {
      case 'swap_menu_recipe': {
        const dayNumber = args.day_number as number;
        const mealType = args.meal_type as string;
        const { data } = await supabase
          .from('day_menu')
          .select(`
            *,
            breakfast:recipes!day_menu_breakfast_id_fkey(id, name),
            lunch:recipes!day_menu_lunch_id_fkey(id, name),
            dinner:recipes!day_menu_dinner_id_fkey(id, name)
          `)
          .eq('day_number', dayNumber)
          .single();
        return data ? { day_menu: data, mealType, dayNumber } : null;
      }
      case 'update_inventory': {
        const itemName = args.item_name as string;
        const { data: item } = await supabase
          .from('market_items')
          .select('id, name')
          .ilike('name', `%${itemName}%`)
          .single();
        if (!item) return null;
        const { data: inv } = await supabase
          .from('inventory')
          .select('*')
          .eq('item_id', item.id)
          .single();
        return inv ? { inventory: inv, item } : { item, inventory: null };
      }
      case 'mark_shopping_item': {
        const itemName = args.item_name as string;
        const { data: item } = await supabase
          .from('market_items')
          .select('id, name')
          .ilike('name', `%${itemName}%`)
          .single();
        if (!item) return null;
        const { data: checklist } = await supabase
          .from('market_checklist')
          .select('*')
          .eq('item_id', item.id)
          .single();
        return checklist ? { market_checklist: checklist, item } : null;
      }
      case 'complete_task': {
        const taskName = args.task_name as string;
        const today = new Date().toISOString().split('T')[0];
        const { data: task } = await supabase
          .from('daily_task_instances')
          .select('*')
          .eq('date', today)
          .ilike('task_name', `%${taskName}%`)
          .single();
        return task ? { daily_task_instances: task } : null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error capturing pre-state for ${functionName}:`, error);
    return null;
  }
}

/**
 * Captura el estado posterior después de ejecutar una función
 */
async function capturePostState(
  functionName: string,
  args: Record<string, unknown>,
  preState: Record<string, unknown> | null
): Promise<Record<string, unknown> | null> {
  // Reutiliza la misma lógica de capturePreState para obtener el nuevo estado
  return capturePreState(functionName, args);
}

/**
 * Determina las tablas afectadas por una función
 */
function getAffectedTables(functionName: string): string[] {
  const tableMap: Record<string, string[]> = {
    swap_menu_recipe: ['day_menu'],
    update_inventory: ['inventory'],
    mark_shopping_item: ['market_checklist'],
    add_to_shopping_list: ['market_checklist', 'market_items'],
    add_missing_to_shopping: ['market_checklist', 'market_items'],
    complete_task: ['daily_task_instances'],
    add_quick_task: ['daily_task_instances'],
  };
  return tableMap[functionName] || [];
}

/**
 * Ejecuta una función con logging completo (para funciones de riesgo bajo/medio)
 */
async function executeFunctionWithLogging(
  name: string,
  args: Record<string, unknown>,
  context: ExecutionContext
): Promise<ExecutionResult> {
  const riskLevel = await getFunctionRiskLevel(name);

  // Las funciones de solo lectura (get_*) no necesitan logging completo
  if (name.startsWith('get_') || name.startsWith('search_') || name.startsWith('suggest_') || name === 'calculate_portions') {
    const result = await executeFunction(name, args);
    return {
      result,
      canUndo: false,
      riskLevel,
    };
  }

  // Capturar estado previo para funciones de modificación
  const previousState = await capturePreState(name, args);

  // Crear audit log
  const auditLogId = await createAuditLog({
    householdId: context.householdId,
    userId: context.userId,
    sessionId: context.sessionId,
    functionName: name,
    parameters: args,
    riskLevel,
  });

  try {
    // Ejecutar la función
    const result = await executeFunction(name, args);

    // Capturar nuevo estado
    const newState = await capturePostState(name, args, previousState);

    // Completar audit log
    if (auditLogId) {
      await completeAuditLog({
        logId: auditLogId,
        status: 'completed',
        result: result as Record<string, unknown>,
        previousState: previousState || undefined,
        newState: newState || undefined,
        affectedTables: getAffectedTables(name),
      });
    }

    return {
      result,
      auditLogId: auditLogId || undefined,
      canUndo: !!previousState && !!auditLogId,
      riskLevel,
    };
  } catch (error) {
    // Log error en audit
    if (auditLogId) {
      await completeAuditLog({
        logId: auditLogId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

/**
 * Crea una propuesta para funciones de alto riesgo
 */
async function createFunctionProposal(
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>,
  context: ExecutionContext
): Promise<ProposalResponse> {
  const actions: AIProposedAction[] = [];

  for (const fc of functionCalls) {
    const action = await functionCallToProposedAction(
      fc.name,
      fc.args,
      generateActionDescription(fc.name, fc.args)
    );
    actions.push(action);
  }

  const proposal = await createProposal({
    householdId: context.householdId,
    userId: context.userId,
    sessionId: context.sessionId,
    summary: generateProposalSummary(actions),
    actions,
  });

  if (!proposal) {
    throw new Error('No se pudo crear la propuesta');
  }

  return {
    type: 'proposal',
    proposalId: proposal.proposal_id,
    summary: proposal.summary,
    actions: proposal.actions,
    riskLevel: proposal.risk_level as AIRiskLevel,
    expiresAt: proposal.expires_at,
  };
}

/**
 * Genera una descripción legible para una acción
 */
function generateActionDescription(functionName: string, args: Record<string, unknown>): string {
  const descriptions: Record<string, (args: Record<string, unknown>) => string> = {
    // Recetas y menú
    swap_menu_recipe: (a) => `Cambiar ${a.meal_type} del día ${a.day_number} a "${a.new_recipe_name}"`,
    // Inventario y compras
    update_inventory: (a) => `Actualizar inventario de "${a.item_name}" a ${a.quantity}`,
    mark_shopping_item: (a) => `${a.checked ? 'Marcar' : 'Desmarcar'} "${a.item_name}" en la lista de compras`,
    add_to_shopping_list: (a) => `Agregar "${a.item_name}" a la lista de compras`,
    add_missing_to_shopping: (a) => `Agregar ingredientes faltantes de "${a.recipe_name}" a la lista`,
    // Tareas
    complete_task: (a) => `Marcar como completada la tarea "${a.task_name}"`,
    add_quick_task: (a) => `Crear tarea rápida "${a.task_name}"`,
    create_task_template: (a) => `Crear plantilla de tarea "${a.task_name}" para ${a.employee_name}`,
    update_task_template: (a) => `Actualizar plantilla de tarea ${a.template_id}`,
    delete_task_template: (a) => `Eliminar plantilla de tarea ${a.template_id}`,
    reschedule_task: (a) => `Reprogramar tarea ${a.task_id}${a.new_date ? ` para ${a.new_date}` : ''}`,
    generate_tasks_for_date: (a) => `Generar tareas para ${a.date}`,
    // Espacios
    create_space: (a) => `Crear espacio "${a.name}" (${a.space_type})`,
    update_space: (a) => `Actualizar espacio ${a.space_id}`,
    delete_space: (a) => `Eliminar espacio ${a.space_id}`,
    // Empleados
    create_employee: (a) => `Registrar empleado "${a.name}" (${a.role})`,
    update_employee: (a) => `Actualizar empleado ${a.employee_id}`,
    delete_employee: (a) => `${a.hard_delete ? 'Eliminar' : 'Desactivar'} empleado ${a.employee_id}`,
    // Multi-paso
    execute_multi_step_task: (a) => `Ejecutar plan: ${a.task_type}`,
    smart_shopping_list: (a) => `Generar lista de compras para ${a.days_ahead || 7} días`,
  };

  const generator = descriptions[functionName];
  if (generator) {
    return generator(args);
  }

  // Default description
  return `Ejecutar ${functionName}`;
}

/**
 * Determina si se debe crear una propuesta basada en el nivel de riesgo
 */
async function shouldCreateProposal(
  functionNames: string[],
  householdId: string
): Promise<boolean> {
  for (const name of functionNames) {
    const riskLevel = await getFunctionRiskLevel(name);

    // Nivel 3+ siempre crea propuesta
    if (riskLevel >= AI_RISK_LEVELS.HIGH) {
      return true;
    }

    // Para nivel 2, verificar configuración del household
    if (riskLevel === AI_RISK_LEVELS.MEDIUM) {
      const autoApprove = await shouldAutoApprove(householdId, riskLevel);
      if (!autoApprove) {
        return true;
      }
    }
  }

  return false;
}

// ============================================
// EJECUTOR DE FUNCIONES ORIGINAL
// ============================================

async function executeFunction(name: string, args: Record<string, unknown>) {
  switch (name) {
    // Consultas - Recetario
    case 'get_today_menu':
      return await getTodayMenu();
    case 'get_week_menu':
      return await getWeekMenu();
    case 'get_recipe_details':
      return await getRecipeDetails(args.recipe_name as string);
    case 'search_recipes':
      return await searchRecipes(args.query as string);
    case 'get_inventory':
      return await getInventory();
    case 'get_shopping_list':
      return await getShoppingList();
    case 'get_missing_ingredients':
      return await getMissingIngredients(args.recipe_name as string);
    case 'suggest_recipe':
      return await suggestRecipe(args.preferences as string);

    // Consultas - Hogar
    case 'get_today_tasks':
      return await getTodayTasks();
    case 'get_employee_schedule':
      return await getEmployeeSchedule(args.employee_name as string, args.period as string);
    case 'get_tasks_summary':
      return await getTasksSummary();

    // Acciones - Recetario
    case 'add_to_shopping_list':
      return await addToShoppingList(args.item_name as string, args.quantity as string);
    case 'add_missing_to_shopping':
      return await addMissingToShopping(args.recipe_name as string);
    case 'mark_shopping_item':
      return await markShoppingItem(args.item_name as string, args.checked as boolean);
    case 'swap_menu_recipe':
      return await swapMenuRecipe(args.day_number as number, args.meal_type as string, args.new_recipe_name as string);
    case 'update_inventory':
      return await updateInventory(args.item_name as string, args.quantity as number, args.action as string);

    // Acciones - Hogar
    case 'complete_task':
      return await completeTask(args.task_name as string, args.employee_name as string);
    case 'add_quick_task':
      return await addQuickTask(args.task_name as string, args.employee_name as string, args.category as string);

    // Reportes y análisis
    case 'get_weekly_report':
      return await getWeeklyReport();
    case 'get_low_inventory_alerts':
      return await getLowInventoryAlerts(args.threshold as number);
    case 'get_upcoming_meals':
      return await getUpcomingMeals(args.days as number);

    // Utilidades
    case 'get_current_date_info':
      return getCurrentDateInfo();
    case 'calculate_portions':
      return await calculatePortions(args.recipe_name as string, args.portions as number);
    case 'get_preparation_tips':
      return await getPreparationTips();

    // Agente Multi-paso
    case 'execute_multi_step_task':
      return await executeMultiStepTask(
        args.task_type as string,
        (args.params as Record<string, unknown>) || {}
      );
    case 'smart_shopping_list':
      return await smartShoppingList(args.days_ahead as number);

    // CRUD - Espacios
    case 'list_spaces':
      return await listSpaces(args.household_id as string);
    case 'get_space_details':
      return await getSpaceDetails(args.space_id as string, args.space_name as string);
    case 'create_space':
      return await createSpace(
        args.household_id as string || 'default-household',
        args.name as string,
        args.space_type as string,
        args.category as string,
        args.usage_level as string,
        args.has_bathroom as boolean,
        args.area_sqm as number,
        args.notes as string
      );
    case 'update_space':
      return await updateSpace(args.space_id as string, {
        name: args.name as string,
        category: args.category as string,
        usageLevel: args.usage_level as string,
        hasBathroom: args.has_bathroom as boolean,
        areaSqm: args.area_sqm as number,
        notes: args.notes as string
      });
    case 'delete_space':
      return await deleteSpace(args.space_id as string, args.confirm as boolean);

    // CRUD - Empleados
    case 'list_employees':
      return await listEmployees(args.household_id as string, args.active_only as boolean ?? true);
    case 'get_employee_details':
      return await getEmployeeDetails(args.employee_id as string, args.employee_name as string);
    case 'create_employee':
      return await createEmployee(
        args.household_id as string || 'default-household',
        args.name as string,
        args.role as string,
        args.zone as string,
        args.work_days as string[],
        args.hours_per_day as number,
        args.schedule as string,
        args.phone as string,
        args.notes as string
      );
    case 'update_employee':
      return await updateEmployee(args.employee_id as string, {
        name: args.name as string,
        role: args.role as string,
        zone: args.zone as string,
        workDays: args.work_days as string[],
        hoursPerDay: args.hours_per_day as number,
        schedule: args.schedule as string,
        phone: args.phone as string,
        notes: args.notes as string,
        active: args.active as boolean
      });
    case 'delete_employee':
      return await deleteEmployee(
        args.employee_id as string,
        args.hard_delete as boolean,
        args.confirm as boolean
      );

    // CRUD - Tareas
    case 'list_task_templates':
      return await listTaskTemplates(
        args.employee_id as string,
        args.week_number as number,
        args.category as string
      );
    case 'create_task_template':
      return await createTaskTemplate(
        args.employee_name as string,
        args.task_name as string,
        args.week_number as number,
        args.day_of_week as number,
        args.time_start as string,
        args.time_end as string,
        args.category as string,
        args.is_special as boolean,
        args.description as string
      );
    case 'update_task_template':
      return await updateTaskTemplate(args.template_id as string, {
        taskName: args.task_name as string,
        employeeName: args.employee_name as string,
        timeStart: args.time_start as string,
        timeEnd: args.time_end as string,
        category: args.category as string,
        isSpecial: args.is_special as boolean,
        description: args.description as string
      });
    case 'delete_task_template':
      return await deleteTaskTemplate(args.template_id as string, args.confirm as boolean);
    case 'reschedule_task':
      return await rescheduleTask(
        args.task_id as string,
        args.new_date as string,
        args.new_time_start as string,
        args.new_time_end as string,
        args.new_employee_name as string
      );
    case 'generate_tasks_for_date':
      return await generateTasksForDate(args.date as string);

    // CRUD - Recetas
    case 'create_recipe':
      return await createRecipe(
        args.name as string,
        args.type as 'breakfast' | 'lunch' | 'dinner',
        args.ingredients as RecipeIngredient[],
        args.steps as string[],
        args.prep_time as number,
        args.cook_time as number,
        args.difficulty as string,
        args.description as string,
        args.tips as string
      );
    case 'update_recipe':
      return await updateRecipe(
        args.recipe_id as string,
        args.updates as Partial<{
          name: string;
          type: 'breakfast' | 'lunch' | 'dinner';
          ingredients: RecipeIngredient[];
          steps: string[];
          prep_time: number;
          cook_time: number;
          difficulty: string;
          description: string;
          tips: string;
        }>
      );
    case 'delete_recipe':
      return await deleteRecipe(args.recipe_id as string, args.confirm as boolean);

    // Inventario avanzado
    case 'bulk_update_inventory':
      return await bulkUpdateInventory(
        args.updates as InventoryUpdate[],
        args.confirm as boolean
      );
    case 'scan_receipt_items':
      return await scanReceiptItems(args.items as ReceiptItem[]);
    case 'reset_inventory_to_default':
      return await resetInventoryToDefault(args.confirm as boolean);

    default:
      return { error: `Función desconocida: ${name}` };
  }
}

// ============================================
// API ROUTE
// ============================================

const SYSTEM_PROMPT = `Eres el Asistente del Hogar González. Ayudas con recetas, menú, inventario y tareas del hogar.

## REGLAS IMPORTANTES

1. **USA LAS FUNCIONES** para obtener datos reales. NUNCA escribas código ni llames funciones con texto.

2. **SIEMPRE AYUDA con recetas**: Si una receta no está en la base de datos, usa tu conocimiento culinario para dar ingredientes y pasos. Verifica el inventario y marca ✅ lo que tiene y ❌ lo que falta.

3. **Usa execute_multi_step_task** para tareas complejas:
   - "Ayúdame a hacer X" → task_type: "prepare_recipe"
   - "Planifica la semana" → task_type: "weekly_planning"
   - "Reporte del hogar" → task_type: "full_report"
   - "Qué puedo cocinar" → task_type: "menu_from_inventory"

## DATOS DEL HOGAR
- Ciclo de menú: 12 días
- Porciones: Grande (3) + Pequeña (2) = 5 total
- Viernes/Sábado: Sin cena (salen a comer)

## FORMATO DE RESPUESTAS
- Usa **negritas** para destacar
- Usa listas con bullets
- Máximo 3-4 párrafos
- Emojis con moderación (1-2 por respuesta)

## CUANDO LA RECETA NO EXISTE
Si get_recipe_details devuelve recipe_not_found=true:
1. Llama get_inventory() para ver qué tiene el usuario
2. Da los ingredientes típicos de la receta
3. Marca ✅ los que tiene y ❌ los que faltan
4. Ofrece agregar faltantes a la lista de compras
5. Da los pasos de preparación

NUNCA digas solo "no tengo esa receta" - SIEMPRE ayuda con tu conocimiento culinario.`;

// Helper for tool streaming events
interface ToolStreamEvent {
  type: 'tool_start' | 'tool_result' | 'content' | 'done';
  tool?: {
    name: string;
    description?: string;
    args?: Record<string, unknown>;
  };
  result?: {
    success: boolean;
    summary?: string;
  };
  content?: string;
  done?: boolean;
  sessionId?: string;
  executionMetadata?: {
    actionsExecuted: number;
    undoAvailable: boolean;
    undoableActions: Array<{ functionName: string; auditLogId?: string }>;
  };
}

function createToolStreamEvent(event: ToolStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Get human-readable description for a tool
function getToolDescription(name: string): string {
  const descriptions: Record<string, string> = {
    // Queries
    get_current_menu: 'Consultando menú actual',
    get_recipe_details: 'Buscando detalles de receta',
    get_inventory: 'Revisando inventario',
    search_recipes: 'Buscando recetas',
    suggest_recipes: 'Generando sugerencias',
    get_shopping_list: 'Obteniendo lista de compras',
    get_tasks_summary: 'Consultando resumen de tareas',
    list_spaces: 'Listando espacios',
    list_employees: 'Listando empleados',
    list_task_templates: 'Listando plantillas de tareas',

    // Actions
    swap_menu_recipe: 'Cambiando receta del menú',
    update_inventory: 'Actualizando inventario',
    add_to_shopping_list: 'Agregando a lista de compras',
    remove_from_shopping_list: 'Quitando de lista de compras',
    clear_shopping_list: 'Limpiando lista de compras',
    smart_shopping_list: 'Generando lista inteligente',

    // CRUD Spaces
    create_space: 'Creando espacio',
    update_space: 'Actualizando espacio',
    delete_space: 'Eliminando espacio',

    // CRUD Employees
    create_employee: 'Registrando empleado',
    update_employee: 'Actualizando empleado',
    delete_employee: 'Eliminando empleado',

    // CRUD Tasks
    create_task_template: 'Creando plantilla de tarea',
    update_task_template: 'Actualizando plantilla',
    delete_task_template: 'Eliminando plantilla',
    reschedule_task: 'Reprogramando tarea',
    generate_tasks_for_date: 'Generando tareas',

    // CRUD Recipes
    create_recipe: 'Creando receta',
    update_recipe: 'Actualizando receta',
    delete_recipe: 'Eliminando receta',

    // Inventory
    bulk_update_inventory: 'Actualizando inventario masivo',
    scan_receipt_items: 'Procesando ticket',
    reset_inventory_to_default: 'Restableciendo inventario',

    // Multi-step
    execute_multi_step_task: 'Ejecutando tarea compleja',
  };

  return descriptions[name] || `Ejecutando ${name}`;
}

// Detectar si una respuesta contiene código o errores que no deberían mostrarse
function isInvalidResponse(text: string): boolean {
  const invalidPatterns = [
    /^print\s*\(/i,           // Código Python
    /^console\.(log|error)/i, // Código JS
    /default_api\./i,         // Referencias a API internas
    /^import\s+/i,            // Imports de código
    /^function\s+/i,          // Declaraciones de funciones
    /^class\s+/i,             // Declaraciones de clases
    /^\s*\{\s*"error"/i,      // JSON de error
    /^```(python|javascript|typescript)/i, // Bloques de código ejecutables
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(text.trim())) {
      return true;
    }
  }
  return false;
}

// Generar una respuesta de fallback cuando hay errores
function getFallbackResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('menú') || msg.includes('menu') || msg.includes('almuerzo') || msg.includes('cena') || msg.includes('desayuno')) {
    return '🍽️ Déjame revisar el menú de hoy. ¿Qué comida te interesa: desayuno, almuerzo o cena?';
  }

  if (msg.includes('receta') || msg.includes('cocinar') || msg.includes('preparar') || msg.includes('hacer')) {
    return '👨‍🍳 ¡Con gusto te ayudo! ¿Qué receta te gustaría preparar?';
  }

  if (msg.includes('inventario') || msg.includes('ingredientes') || msg.includes('tengo')) {
    return '📦 Déjame revisar qué ingredientes tienes disponibles. Un momento...';
  }

  if (msg.includes('compra') || msg.includes('lista') || msg.includes('mercado')) {
    return '🛒 Te ayudo con la lista de compras. ¿Qué necesitas agregar o revisar?';
  }

  return '¡Hola! Soy tu asistente del hogar. ¿En qué puedo ayudarte hoy? Puedo ayudarte con recetas, el menú, inventario o la lista de compras.';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      conversationContext,
      stream = false,
      // AI Command Center parameters
      householdId,
      userId,
      sessionId: providedSessionId,
      // If true, skip proposals and execute directly (for approved proposals)
      executeDirectly = false,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Create execution context
    const sessionId = providedSessionId || generateSessionId();
    const context: ExecutionContext = {
      householdId: householdId || 'default-household', // Fallback for backwards compatibility
      userId,
      sessionId,
    };

    const gemini = getGeminiClient();

    // Build enhanced system prompt with context
    let enhancedSystemPrompt = SYSTEM_PROMPT;

    if (conversationContext) {
      const { history, lastTopic, preferences } = conversationContext;

      if (history && typeof history === 'string' && history.trim()) {
        enhancedSystemPrompt += `\n\n## CONTEXTO ANTERIOR\n${history}`;
      }

      if (lastTopic) {
        enhancedSystemPrompt += `\n\nTema actual: ${lastTopic}`;
      }

      if (preferences && Object.keys(preferences).length > 0) {
        if (preferences.favoriteRecipes?.length) {
          enhancedSystemPrompt += `\nRecetas favoritas: ${preferences.favoriteRecipes.join(', ')}`;
        }
        if (preferences.dislikedIngredients?.length) {
          enhancedSystemPrompt += `\nNo le gusta: ${preferences.dislikedIngredients.join(', ')}`;
        }
        if (preferences.dietaryRestrictions?.length) {
          enhancedSystemPrompt += `\nRestricciones: ${preferences.dietaryRestrictions.join(', ')}`;
        }
      }
    }

    // Convertir mensajes al formato de Gemini (con soporte para imágenes)
    const geminiMessages = messages.map((msg: MessageWithImage) => {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      // Add image if present
      if (msg.image) {
        const imageData = base64ToGeminiFormat(msg.image);
        parts.push(imageData);
      }

      return {
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        parts
      };
    });

    // Primera llamada a Gemini con las funciones
    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: geminiMessages,
      config: {
        temperature: GEMINI_CONFIG.assistant.temperature,
        maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
        systemInstruction: enhancedSystemPrompt,
        tools: [{
          functionDeclarations
        }]
      }
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Buscar si hay llamadas a funciones
    const functionCalls = parts.filter(part => part.functionCall);

    if (functionCalls.length > 0) {
      // Parse function calls
      const parsedCalls = functionCalls
        .map(part => part.functionCall!)
        .filter(fc => fc.name)
        .map(fc => ({
          name: fc.name!,
          args: (fc.args as Record<string, unknown>) || {}
        }));

      // Check if we should create a proposal (only for write operations)
      const writeOperations = parsedCalls.filter(fc =>
        !fc.name.startsWith('get_') &&
        !fc.name.startsWith('search_') &&
        !fc.name.startsWith('suggest_') &&
        fc.name !== 'calculate_portions'
      );

      // If there are high-risk write operations and we're not in executeDirectly mode
      if (writeOperations.length > 0 && !executeDirectly && householdId) {
        const needsProposal = await shouldCreateProposal(
          writeOperations.map(fc => fc.name),
          householdId
        );

        if (needsProposal) {
          // Create a proposal instead of executing
          const proposal = await createFunctionProposal(writeOperations, context);

          // Return proposal response with explanation
          return NextResponse.json({
            type: 'proposal',
            content: `He preparado un plan que requiere tu aprobación:\n\n**${proposal.summary}**\n\nEste plan incluye ${proposal.actions.length} acción(es) que modificarán datos. ¿Quieres que lo ejecute?`,
            role: 'assistant',
            proposal,
            sessionId,
          });
        }
      }

      // Execute all functions with logging
      // If streaming, create a response that streams tool events
      if (stream) {
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              const functionResponses = [];
              const executionMetadata: Array<{ functionName: string; auditLogId?: string; canUndo: boolean }> = [];

              // Stream tool execution events
              for (const fc of parsedCalls) {
                // Send tool_start event
                controller.enqueue(new TextEncoder().encode(
                  createToolStreamEvent({
                    type: 'tool_start',
                    tool: {
                      name: fc.name,
                      description: getToolDescription(fc.name),
                      args: fc.args,
                    },
                  })
                ));

                let result: unknown;
                let auditLogId: string | undefined;
                let canUndo = false;

                // Execute the function
                if (householdId) {
                  const executionResult = await executeFunctionWithLogging(fc.name, fc.args, context);
                  result = executionResult.result;
                  auditLogId = executionResult.auditLogId;
                  canUndo = executionResult.canUndo;
                } else {
                  result = await executeFunction(fc.name, fc.args);
                }

                // Determine if successful
                const isSuccess = typeof result === 'object' && result !== null
                  ? (result as Record<string, unknown>).success !== false
                  : true;

                // Send tool_result event
                controller.enqueue(new TextEncoder().encode(
                  createToolStreamEvent({
                    type: 'tool_result',
                    tool: { name: fc.name },
                    result: {
                      success: isSuccess,
                      summary: typeof result === 'object' && result !== null
                        ? ((result as Record<string, unknown>).message as string) || getToolDescription(fc.name) + ' completado'
                        : 'Completado',
                    },
                  })
                ));

                functionResponses.push({
                  functionResponse: {
                    name: fc.name,
                    response: result,
                  },
                });

                executionMetadata.push({
                  functionName: fc.name,
                  auditLogId,
                  canUndo,
                });
              }

              // Now stream the AI response
              const streamResponse = await gemini.models.generateContentStream({
                model: GEMINI_MODELS.FLASH,
                contents: [
                  ...geminiMessages,
                  { role: 'model' as const, parts: parts },
                  { role: 'user' as const, parts: functionResponses },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ] as any,
                config: {
                  temperature: GEMINI_CONFIG.assistant.temperature,
                  maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
                  systemInstruction: enhancedSystemPrompt,
                },
              });

              // Stream the content
              for await (const chunk of streamResponse) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  controller.enqueue(new TextEncoder().encode(
                    createToolStreamEvent({ type: 'content', content: text, done: false })
                  ));
                }
              }

              // Prepare execution metadata for final message
              const undoableActions = executionMetadata.filter(m => m.canUndo);
              const streamMetadata = executionMetadata.length > 0 ? {
                actionsExecuted: executionMetadata.length,
                undoAvailable: undoableActions.length > 0,
                undoableActions: undoableActions.map(a => ({
                  functionName: a.functionName,
                  auditLogId: a.auditLogId,
                })),
              } : undefined;

              // Send done event
              controller.enqueue(new TextEncoder().encode(
                createToolStreamEvent({
                  type: 'done',
                  done: true,
                  sessionId,
                  executionMetadata: streamMetadata,
                })
              ));

              controller.close();
            } catch (error) {
              console.error('Tool streaming error:', error);
              controller.error(error);
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // Non-streaming execution
      const functionResponses = [];
      const executionMetadata: Array<{ functionName: string; auditLogId?: string; canUndo: boolean }> = [];

      for (const fc of parsedCalls) {
        let result: unknown;
        let auditLogId: string | undefined;
        let canUndo = false;

        // Use logging wrapper if householdId is provided
        if (householdId) {
          const executionResult = await executeFunctionWithLogging(fc.name, fc.args, context);
          result = executionResult.result;
          auditLogId = executionResult.auditLogId;
          canUndo = executionResult.canUndo;
        } else {
          // Fallback to direct execution for backwards compatibility
          result = await executeFunction(fc.name, fc.args);
        }

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: result
          }
        });

        executionMetadata.push({
          functionName: fc.name,
          auditLogId,
          canUndo,
        });
      }

      // Non-streaming - make final call and return
      const finalResponse = await gemini.models.generateContent({
        model: GEMINI_MODELS.FLASH,
        contents: [
          ...geminiMessages,
          { role: 'model' as const, parts: parts },
          { role: 'user' as const, parts: functionResponses }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
        config: {
          temperature: GEMINI_CONFIG.assistant.temperature,
          maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
          systemInstruction: enhancedSystemPrompt,
        }
      });

      let finalContent = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Validar que la respuesta no contenga código o errores
      if (!finalContent || isInvalidResponse(finalContent)) {
        const lastUserMessage = messages[messages.length - 1]?.content || '';
        finalContent = getFallbackResponse(lastUserMessage);
        console.warn('Invalid response detected, using fallback');
      }

      // Check if any actions can be undone
      const undoableActions = executionMetadata.filter(m => m.canUndo);

      return NextResponse.json({
        content: finalContent,
        role: 'assistant',
        sessionId,
        // AI Command Center metadata
        executionMetadata: executionMetadata.length > 0 ? {
          actionsExecuted: executionMetadata.length,
          undoAvailable: undoableActions.length > 0,
          undoableActions: undoableActions.map(a => ({
            functionName: a.functionName,
            auditLogId: a.auditLogId,
          })),
        } : undefined,
      });
    }

    // Si no hay llamadas a funciones
    // Si streaming está habilitado, simular streaming palabra por palabra
    if (stream) {
      const textContent = parts.find(part => part.text)?.text || '';

      // Dividir el texto en chunks para simular streaming
      // Usamos palabras/frases cortas para un efecto de typing natural
      const chunks = textContent.split(/(\s+)/).filter(Boolean);

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            let sentContent = '';
            let chunkBuffer = '';

            for (let i = 0; i < chunks.length; i++) {
              chunkBuffer += chunks[i];

              // Enviar cada 3-5 tokens o en signos de puntuación para un efecto natural
              const shouldFlush =
                i % 4 === 3 || // Cada ~4 tokens
                /[.!?:,\n]$/.test(chunkBuffer) || // Después de puntuación
                i === chunks.length - 1; // Último chunk

              if (shouldFlush && chunkBuffer.trim()) {
                sentContent += chunkBuffer;
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ content: chunkBuffer, done: false })}\n\n`
                  )
                );
                chunkBuffer = '';
                // Pequeña pausa para efecto de typing (5-15ms)
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }

            // Enviar cualquier contenido restante
            if (chunkBuffer.trim()) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ content: chunkBuffer, done: false })}\n\n`
                )
              );
            }

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ content: '', done: true })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Sin streaming - comportamiento original
    let textContent = parts.find(part => part.text)?.text || '';

    // Validar que la respuesta no contenga código o errores
    if (!textContent || isInvalidResponse(textContent)) {
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      textContent = getFallbackResponse(lastUserMessage);
      console.warn('Invalid response detected (no function calls), using fallback');
    }

    return NextResponse.json({
      content: textContent,
      role: 'assistant'
    });

  } catch (error) {
    console.error('AI Assistant error:', error);

    // Intenta dar una respuesta útil incluso con error
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Si es un error de red/timeout, dar respuesta amigable
    if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return NextResponse.json({
        content: '⚠️ Tuve un problema de conexión. Por favor intenta de nuevo en unos segundos.',
        role: 'assistant'
      });
    }

    // Si es un error de la API de Gemini
    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return NextResponse.json({
        content: 'Lo siento, no puedo procesar esa solicitud. ¿En qué más puedo ayudarte?',
        role: 'assistant'
      });
    }

    return NextResponse.json(
      { error: 'Error processing request', details: errorMessage },
      { status: 500 }
    );
  }
}
