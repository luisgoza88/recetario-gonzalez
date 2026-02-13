/**
 * AI Assistant Constants
 *
 * Constantes compartidas para el módulo de asistente de IA.
 * Extraídas de route.ts para mejor organización.
 */

/**
 * System prompt for the AI assistant.
 * Defines the assistant's personality, rules, and context.
 */
export const SYSTEM_PROMPT = `Eres el asistente del hogar González 🏠. Ayudas con recetas, menú, inventario y tareas del hogar.

## REGLA CRÍTICA: SIEMPRE USA LAS FUNCIONES

ANTES de responder CUALQUIER pregunta, DEBES llamar la función apropiada:

- "¿Qué hay de comer/almuerzo/cena/desayuno?" → Llama get_today_menu()
- "¿Qué puedo cocinar?" → Llama suggest_recipe() o get_today_menu()
- "¿Cómo hago X receta?" → Llama get_recipe_details(recipe_name)
- "¿Qué tengo en la despensa/inventario?" → Llama get_inventory()
- "Lista de compras" → Llama get_shopping_list()
- "Tareas de hoy" → Llama get_today_tasks()
- "Menú de la semana" → Llama get_week_menu()

NUNCA respondas "no hay recetas" sin haber llamado primero a una función.
NUNCA inventes datos - SIEMPRE consulta las funciones.

## DATOS DEL HOGAR
- Familia González (Luis y Mariana)
- Ciclo de menú: 12 días rotativo
- Porciones: Luis (3 porciones) + Mariana (2 porciones) = 5 total
- Viernes/Sábado: Sin cena (salen a comer)
- Empleada: Yolima (limpieza y cocina)

## FORMATO DE RESPUESTAS
- Sé amigable y útil
- Usa 1-2 emojis por respuesta (🍽️ para comida, 📋 para listas, 🏠 para hogar)
- Respuestas claras y organizadas
- Usa **negritas** para destacar recetas o datos importantes

## SI LA RECETA NO EXISTE EN LA BASE
Si get_recipe_details devuelve recipe_not_found=true:
1. Llama get_inventory() para ver qué tiene
2. Usa tu conocimiento culinario para dar la receta completa
3. Indica qué ingredientes tiene y cuáles le faltan
4. Ofrece agregar los faltantes a la lista de compras

NUNCA digas "no tengo esa receta" - SIEMPRE ayuda con tu conocimiento culinario.`;

/**
 * Human-readable descriptions for each tool/function.
 * Used to show progress to the user during execution.
 */
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  // Queries
  get_today_menu: 'Consultando menú de hoy',
  get_week_menu: 'Consultando menú semanal',
  get_current_menu: 'Consultando menú actual',
  get_recipe_details: 'Buscando detalles de receta',
  get_inventory: 'Revisando inventario',
  search_recipes: 'Buscando recetas',
  suggest_recipe: 'Generando sugerencias',
  suggest_recipes: 'Generando sugerencias',
  get_shopping_list: 'Obteniendo lista de compras',
  get_missing_ingredients: 'Verificando ingredientes faltantes',
  get_today_tasks: 'Consultando tareas de hoy',
  get_employee_schedule: 'Consultando horario de empleado',
  get_tasks_summary: 'Consultando resumen de tareas',
  get_weekly_report: 'Generando reporte semanal',
  get_low_inventory_alerts: 'Verificando alertas de inventario',
  get_upcoming_meals: 'Consultando próximas comidas',
  get_current_date_info: 'Obteniendo información de fecha',
  calculate_portions: 'Calculando porciones',
  get_preparation_tips: 'Obteniendo consejos de preparación',

  // Spaces
  list_spaces: 'Listando espacios',
  get_space_details: 'Consultando detalles de espacio',
  create_space: 'Creando espacio',
  update_space: 'Actualizando espacio',
  delete_space: 'Eliminando espacio',

  // Employees
  list_employees: 'Listando empleados',
  get_employee_details: 'Consultando detalles de empleado',
  create_employee: 'Registrando empleado',
  update_employee: 'Actualizando empleado',
  delete_employee: 'Eliminando empleado',

  // Tasks
  list_task_templates: 'Listando plantillas de tareas',
  create_task_template: 'Creando plantilla de tarea',
  update_task_template: 'Actualizando plantilla',
  delete_task_template: 'Eliminando plantilla',
  reschedule_task: 'Reprogramando tarea',
  generate_tasks_for_date: 'Generando tareas',
  complete_task: 'Completando tarea',
  add_quick_task: 'Agregando tarea rápida',

  // Recipes
  create_recipe: 'Creando receta',
  update_recipe: 'Actualizando receta',
  delete_recipe: 'Eliminando receta',

  // Shopping
  add_to_shopping_list: 'Agregando a lista de compras',
  mark_shopping_item: 'Actualizando item de compras',
  add_missing_to_shopping: 'Agregando ingredientes faltantes',
  remove_from_shopping_list: 'Quitando de lista de compras',
  clear_shopping_list: 'Limpiando lista de compras',
  smart_shopping_list: 'Generando lista inteligente',

  // Menu
  swap_menu_recipe: 'Cambiando receta del menú',

  // Inventory
  update_inventory: 'Actualizando inventario',
  bulk_update_inventory: 'Actualizando inventario masivo',
  scan_receipt_items: 'Procesando ticket',
  reset_inventory_to_default: 'Restableciendo inventario',

  // Multi-step
  execute_multi_step_task: 'Ejecutando tarea compleja',
};

/**
 * Gets the human-readable description for a tool.
 * Falls back to a generic description if the tool is not in the map.
 */
export function getToolDescription(name: string): string {
  return TOOL_DESCRIPTIONS[name] || `Ejecutando ${name}`;
}

/**
 * Days of the week in Spanish.
 */
export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Meal type labels in Spanish.
 */
export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'desayuno',
  lunch: 'almuerzo',
  dinner: 'cena',
};

/**
 * Common recipe variant mappings for fuzzy search.
 * Maps search terms to related ingredient/recipe names.
 */
export const RECIPE_VARIANTS: Record<string, string[]> = {
  pasta: ['espagueti', 'spaghetti', 'fettuccine', 'penne', 'macarrones', 'tallarines'],
  bolognesa: ['boloñesa', 'bolonesa', 'carne molida', 'ragu', 'ragú'],
  pollo: ['chicken', 'gallina', 'pechuga'],
  carne: ['res', 'beef', 'ternera', 'bistec'],
  arroz: ['rice', 'risotto'],
  ensalada: ['salad', 'verde'],
  sopa: ['crema', 'caldo'],
  pescado: ['fish', 'salmon', 'atún', 'tilapia'],
};
