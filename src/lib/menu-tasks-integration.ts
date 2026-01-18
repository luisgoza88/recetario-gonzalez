/**
 * Integración Menú → Tareas Automáticas
 * Genera tareas de preparación de comidas basadas en el menú planificado
 */

import { createClient } from '@supabase/supabase-js';
import { Recipe, DayMenu, Ingredient } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos de tareas de cocina
export interface KitchenTask {
  id?: string;
  type: 'prep' | 'defrost' | 'marinate' | 'cook' | 'buy' | 'clean';
  title: string;
  description?: string;
  recipe_id?: string;
  recipe_name?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner';
  scheduled_date: string;
  scheduled_time?: string;
  estimated_minutes: number;
  priority: 'alta' | 'normal' | 'baja';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  ingredients?: string[];
  notes?: string;
  created_at?: string;
}

// Reglas de preparación por tipo de ingrediente/preparación
const PREP_RULES: Array<{
  pattern: string[];
  taskType: KitchenTask['type'];
  title: string;
  description: string;
  minutesBefore: number; // Minutos antes de la comida
  estimatedMinutes: number;
  priority: KitchenTask['priority'];
}> = [
  // Descongelar proteínas
  {
    pattern: ['pollo', 'pechuga', 'carne', 'res', 'cerdo', 'pescado'],
    taskType: 'defrost',
    title: 'Descongelar {ingredient}',
    description: 'Sacar del congelador y dejar descongelar en la nevera',
    minutesBefore: 12 * 60, // 12 horas antes
    estimatedMinutes: 5,
    priority: 'alta'
  },
  // Marinar carnes
  {
    pattern: ['pechuga', 'carne', 'cerdo', 'pollo'],
    taskType: 'marinate',
    title: 'Marinar {ingredient}',
    description: 'Preparar marinada y dejar reposar',
    minutesBefore: 4 * 60, // 4 horas antes
    estimatedMinutes: 15,
    priority: 'normal'
  },
  // Preparaciones base (hogao, etc.)
  {
    pattern: ['hogao', 'sofrito', 'base'],
    taskType: 'prep',
    title: 'Preparar {ingredient}',
    description: 'Preparar la base para la receta',
    minutesBefore: 60, // 1 hora antes
    estimatedMinutes: 20,
    priority: 'alta'
  },
  // Remojar granos
  {
    pattern: ['frijoles', 'lentejas', 'garbanzos', 'arvejas secas'],
    taskType: 'prep',
    title: 'Remojar {ingredient}',
    description: 'Dejar en agua desde la noche anterior',
    minutesBefore: 8 * 60, // 8 horas antes
    estimatedMinutes: 5,
    priority: 'alta'
  },
  // Picar vegetales
  {
    pattern: ['ensalada', 'vegetales', 'verduras'],
    taskType: 'prep',
    title: 'Picar vegetales para {recipe}',
    description: 'Lavar y picar los vegetales',
    minutesBefore: 30, // 30 minutos antes
    estimatedMinutes: 15,
    priority: 'normal'
  },
  // Cocinar arroz/granos
  {
    pattern: ['arroz', 'quinoa', 'pasta'],
    taskType: 'cook',
    title: 'Preparar {ingredient}',
    description: 'Cocinar el acompañamiento',
    minutesBefore: 45, // 45 minutos antes
    estimatedMinutes: 30,
    priority: 'normal'
  }
];

// Tiempos de comida por defecto
const MEAL_TIMES: Record<string, string> = {
  breakfast: '07:30',
  lunch: '12:30',
  dinner: '19:00'
};

/**
 * Analizar receta y extraer tareas necesarias
 */
function analyzeRecipeForTasks(
  recipe: Recipe,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  scheduledDate: string
): KitchenTask[] {
  const tasks: KitchenTask[] = [];
  const ingredients = recipe.ingredients as Ingredient[];
  const mealTime = MEAL_TIMES[mealType];

  // Analizar cada ingrediente
  for (const ing of ingredients) {
    const ingLower = ing.name.toLowerCase();

    // Buscar reglas aplicables
    for (const rule of PREP_RULES) {
      const matches = rule.pattern.some(p => ingLower.includes(p));

      if (matches) {
        // Calcular fecha/hora de la tarea
        const mealDateTime = new Date(`${scheduledDate}T${mealTime}:00`);
        const taskDateTime = new Date(mealDateTime.getTime() - rule.minutesBefore * 60 * 1000);

        // Solo crear si la tarea es en el futuro
        if (taskDateTime > new Date()) {
          const title = rule.title
            .replace('{ingredient}', ing.name)
            .replace('{recipe}', recipe.name);

          // Evitar duplicados
          const existingTask = tasks.find(t =>
            t.title === title && t.scheduled_date === taskDateTime.toISOString().split('T')[0]
          );

          if (!existingTask) {
            tasks.push({
              type: rule.taskType,
              title,
              description: rule.description,
              recipe_id: recipe.id,
              recipe_name: recipe.name,
              meal_type: mealType,
              scheduled_date: taskDateTime.toISOString().split('T')[0],
              scheduled_time: taskDateTime.toTimeString().slice(0, 5),
              estimated_minutes: rule.estimatedMinutes,
              priority: rule.priority,
              status: 'pending',
              ingredients: [ing.name]
            });
          }
        }
      }
    }
  }

  // Agregar tarea principal de cocción si hay tiempo de preparación
  if (recipe.total_time || recipe.cook_time) {
    const cookTime = recipe.total_time || recipe.cook_time || 30;
    const mealDateTime = new Date(`${scheduledDate}T${mealTime}:00`);
    const cookStartTime = new Date(mealDateTime.getTime() - cookTime * 60 * 1000);

    if (cookStartTime > new Date()) {
      tasks.push({
        type: 'cook',
        title: `Preparar ${recipe.name}`,
        description: `Cocinar ${recipe.name} para ${mealType === 'breakfast' ? 'desayuno' : mealType === 'lunch' ? 'almuerzo' : 'cena'}`,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        meal_type: mealType,
        scheduled_date: cookStartTime.toISOString().split('T')[0],
        scheduled_time: cookStartTime.toTimeString().slice(0, 5),
        estimated_minutes: cookTime,
        priority: 'alta',
        status: 'pending'
      });
    }
  }

  return tasks;
}

/**
 * Generar tareas de cocina para los próximos días
 */
export async function generateKitchenTasks(daysAhead: number = 3): Promise<KitchenTask[]> {
  const allTasks: KitchenTask[] = [];
  const today = new Date();

  // Obtener menú
  const { data: menus } = await supabase
    .from('day_menu')
    .select(`
      *,
      breakfast:recipes!day_menu_breakfast_id_fkey(*),
      lunch:recipes!day_menu_lunch_id_fkey(*),
      dinner:recipes!day_menu_dinner_id_fkey(*)
    `);

  if (!menus) return [];

  // Para cada día en el rango
  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Calcular día del ciclo (excluyendo domingos)
    // Esto es una simplificación - en producción deberías usar la lógica real del menú
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 0) continue; // Saltar domingos

    // Buscar menú del día
    const dayIndex = targetDate.getDate() % 12; // Simplificación del ciclo de 12 días
    const menu = menus.find(m => m.day_number === dayIndex) || menus[i % menus.length];

    if (!menu) continue;

    // Analizar cada comida
    if (menu.breakfast) {
      const breakfastTasks = analyzeRecipeForTasks(menu.breakfast as Recipe, 'breakfast', targetDateStr);
      allTasks.push(...breakfastTasks);
    }

    if (menu.lunch) {
      const lunchTasks = analyzeRecipeForTasks(menu.lunch as Recipe, 'lunch', targetDateStr);
      allTasks.push(...lunchTasks);
    }

    if (menu.dinner) {
      const dinnerTasks = analyzeRecipeForTasks(menu.dinner as Recipe, 'dinner', targetDateStr);
      allTasks.push(...dinnerTasks);
    }
  }

  // Ordenar por fecha y hora
  allTasks.sort((a, b) => {
    const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`);
    const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  return allTasks;
}

/**
 * Guardar tareas generadas en la base de datos
 */
export async function saveKitchenTasks(tasks: KitchenTask[]): Promise<void> {
  // Verificar si existe la tabla kitchen_tasks, si no, usar scheduled_tasks
  for (const task of tasks) {
    // Verificar que no exista tarea duplicada
    const { data: existing } = await supabase
      .from('scheduled_tasks')
      .select('id')
      .eq('scheduled_date', task.scheduled_date)
      .ilike('notes', `%${task.recipe_id}%`)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Insertar nueva tarea
    // Nota: Esto asume que tienes un task_template para tareas de cocina
    // En producción, deberías crear una tabla específica kitchen_tasks
    await supabase.from('scheduled_tasks').insert({
      scheduled_date: task.scheduled_date,
      status: 'pendiente',
      notes: JSON.stringify({
        kitchen_task: true,
        task_type: task.type,
        title: task.title,
        description: task.description,
        recipe_id: task.recipe_id,
        recipe_name: task.recipe_name,
        meal_type: task.meal_type,
        scheduled_time: task.scheduled_time,
        estimated_minutes: task.estimated_minutes,
        priority: task.priority,
        ingredients: task.ingredients
      })
    });
  }
}

/**
 * Obtener tareas de cocina para hoy
 */
export async function getTodayKitchenTasks(): Promise<KitchenTask[]> {
  const today = new Date().toISOString().split('T')[0];
  const tasks = await generateKitchenTasks(1);

  return tasks.filter(t => t.scheduled_date === today);
}

/**
 * Marcar tarea como completada
 */
export async function completeKitchenTask(taskId: string): Promise<void> {
  await supabase
    .from('scheduled_tasks')
    .update({
      status: 'completada',
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId);
}

/**
 * Obtener resumen de preparaciones pendientes
 */
export async function getPrepSummary(): Promise<{
  totalTasks: number;
  urgentTasks: number;
  todayTasks: KitchenTask[];
  tomorrowTasks: KitchenTask[];
  nextMealTasks: KitchenTask[];
}> {
  const tasks = await generateKitchenTasks(2);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayTasks = tasks.filter(t => t.scheduled_date === today);
  const tomorrowTasks = tasks.filter(t => t.scheduled_date === tomorrow);

  // Tareas urgentes: las que deben hacerse en las próximas 2 horas
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const urgentTasks = tasks.filter(t => {
    const taskTime = new Date(`${t.scheduled_date}T${t.scheduled_time || '00:00'}`);
    return taskTime <= twoHoursFromNow && taskTime > now;
  });

  // Próxima comida
  const currentHour = now.getHours();
  let nextMealType: 'breakfast' | 'lunch' | 'dinner';
  if (currentHour < 10) nextMealType = 'breakfast';
  else if (currentHour < 15) nextMealType = 'lunch';
  else nextMealType = 'dinner';

  const nextMealTasks = todayTasks.filter(t => t.meal_type === nextMealType);

  return {
    totalTasks: tasks.length,
    urgentTasks: urgentTasks.length,
    todayTasks,
    tomorrowTasks,
    nextMealTasks
  };
}

/**
 * Crear recordatorio para tarea
 */
export async function createTaskReminder(task: KitchenTask): Promise<void> {
  // Esta función podría integrarse con el sistema de notificaciones existente
  // Por ahora, solo logueamos
  console.log(`Reminder: ${task.title} at ${task.scheduled_time}`);

  // En producción, integrar con sistema de notificaciones push
  // o crear un record en una tabla de reminders
}

/**
 * Sincronizar tareas de cocina con el módulo de gestión del hogar
 */
export async function syncWithHouseholdTasks(householdId: string): Promise<void> {
  const tasks = await generateKitchenTasks(7); // Próxima semana

  // Buscar o crear espacio "Cocina"
  const { data: kitchen } = await supabase
    .from('spaces')
    .select('id')
    .eq('household_id', householdId)
    .ilike('custom_name', '%cocina%')
    .single();

  if (!kitchen) {
    console.log('No se encontró espacio de cocina');
    return;
  }

  // Crear tareas en el sistema de hogar
  for (const task of tasks) {
    await supabase.from('scheduled_tasks').insert({
      household_id: householdId,
      space_id: kitchen.id,
      scheduled_date: task.scheduled_date,
      status: 'pendiente',
      notes: JSON.stringify({
        kitchen_task: true,
        type: task.type,
        recipe: task.recipe_name,
        meal: task.meal_type,
        time: task.scheduled_time
      })
    });
  }
}
