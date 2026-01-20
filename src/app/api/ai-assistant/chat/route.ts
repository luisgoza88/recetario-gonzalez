import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, base64ToGeminiFormat } from '@/lib/gemini/client';
import { FunctionDeclaration, Type, FunctionCallingConfigMode } from '@google/genai';

/**
 * ENDPOINT SIMPLIFICADO PARA CONSULTAS
 *
 * Este endpoint maneja SOLO consultas de lectura (get_*, search_*, suggest_*, list_*).
 * NO tiene sistema de trust, proposals ni audit logs.
 * Es más rápido y directo para preguntas simples como "¿qué hay de comer?".
 *
 * Para acciones de escritura (crear, actualizar, eliminar), usar /api/ai-assistant
 */

interface MessageWithImage {
  role: string;
  content: string;
  image?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// SOLO FUNCIONES DE CONSULTA (READ-ONLY)
// ============================================

const queryFunctions: FunctionDeclaration[] = [
  // Menú
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
  // Recetas
  {
    name: 'get_recipe_details',
    description: 'Obtiene los detalles completos de una receta específica',
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
        query: { type: Type.STRING, description: 'Término de búsqueda' }
      },
      required: ['query']
    }
  },
  // Inventario
  {
    name: 'get_inventory',
    description: 'Obtiene el inventario actual de ingredientes disponibles',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_missing_ingredients',
    description: 'Obtiene los ingredientes que faltan para una receta',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: 'Nombre de la receta' }
      },
      required: ['recipe_name']
    }
  },
  {
    name: 'get_low_inventory_alerts',
    description: 'Obtiene alertas de ingredientes con bajo inventario',
    parameters: {
      type: Type.OBJECT,
      properties: {
        threshold: { type: Type.NUMBER, description: 'Cantidad mínima (default: 2)' }
      },
      required: []
    }
  },
  // Lista de compras
  {
    name: 'get_shopping_list',
    description: 'Obtiene la lista de compras pendientes',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  // Tareas
  {
    name: 'get_today_tasks',
    description: 'Obtiene las tareas programadas para hoy',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_tasks_summary',
    description: 'Obtiene un resumen del progreso de tareas',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'get_employee_schedule',
    description: 'Obtiene el horario de un empleado específico',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_name: { type: Type.STRING, description: 'Nombre del empleado' },
        period: { type: Type.STRING, description: 'Período: today o week' }
      },
      required: ['employee_name']
    }
  },
  // Sugerencias
  {
    name: 'suggest_recipe',
    description: 'Sugiere una receta basada en los ingredientes disponibles',
    parameters: {
      type: Type.OBJECT,
      properties: {
        preferences: { type: Type.STRING, description: 'Preferencias opcionales' },
        meal_type: { type: Type.STRING, description: 'Tipo de comida' }
      },
      required: []
    }
  },
  // Utilidades
  {
    name: 'get_current_date_info',
    description: 'Obtiene información de la fecha actual',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'calculate_portions',
    description: 'Calcula las cantidades de ingredientes para X porciones',
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
    name: 'get_upcoming_meals',
    description: 'Obtiene las próximas comidas programadas',
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.NUMBER, description: 'Número de días (default: 3)' }
      },
      required: []
    }
  },
  {
    name: 'get_preparation_tips',
    description: 'Obtiene consejos de preparación para las comidas del día',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  // Espacios y Empleados (solo lectura)
  {
    name: 'list_spaces',
    description: 'Lista todos los espacios del hogar',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'list_employees',
    description: 'Lista todos los empleados del hogar',
    parameters: {
      type: Type.OBJECT,
      properties: {
        active_only: { type: Type.BOOLEAN, description: 'Solo activos (default: true)' }
      },
      required: []
    }
  },
  {
    name: 'list_task_templates',
    description: 'Lista las plantillas de tareas recurrentes',
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_id: { type: Type.STRING, description: 'Filtrar por empleado' },
        category: { type: Type.STRING, description: 'Filtrar por categoría' }
      },
      required: []
    }
  },
  {
    name: 'get_weekly_report',
    description: 'Genera un reporte semanal de tareas, comidas e inventario',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
  }
];

// ============================================
// IMPLEMENTACIÓN DE FUNCIONES DE CONSULTA
// ============================================

async function getTodayMenu() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

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
    return {
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

async function getRecipeDetails(recipeName: string) {
  let { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .ilike('name', `%${recipeName}%`)
    .single();

  if (!recipe) {
    // Búsqueda fuzzy
    const searchTerms = recipeName.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const { data: recipes } = await supabase.from('recipes').select('*');

    if (recipes && recipes.length > 0) {
      const scored = recipes.map(r => {
        const nameLower = r.name.toLowerCase();
        let score = 0;
        for (const term of searchTerms) {
          if (nameLower.includes(term)) score += 2;
        }
        return { recipe: r, score };
      });
      scored.sort((a, b) => b.score - a.score);
      if (scored[0]?.score > 0) recipe = scored[0].recipe;
    }
  }

  if (!recipe) {
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*, market_item:market_items(name)')
      .gt('current_number', 0);

    const availableIngredients = inventory?.map(i => (i.market_item as { name?: string })?.name).filter(Boolean) || [];

    return {
      recipe_not_found: true,
      requested_recipe: recipeName,
      instruction: `La receta "${recipeName}" no está en la base de datos. Usa tu conocimiento culinario para ayudar.`,
      user_inventory: availableIngredients
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

async function searchRecipes(query: string) {
  let { data: recipes } = await supabase
    .from('recipes')
    .select('name, prep_time, category, portions, ingredients')
    .or(`name.ilike.%${query}%,ingredients.cs.{${query}}`);

  if (!recipes || recipes.length === 0) {
    const { data: allRecipes } = await supabase
      .from('recipes')
      .select('name, prep_time, category, portions, ingredients');

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    recipes = allRecipes?.filter(r => {
      const nameLower = r.name.toLowerCase();
      const ingredientsStr = JSON.stringify(r.ingredients).toLowerCase();
      return searchTerms.some(term => nameLower.includes(term) || ingredientsStr.includes(term));
    }) || [];
  }

  return recipes?.slice(0, 8).map(r => ({
    name: r.name,
    prep_time: r.prep_time,
    category: r.category,
    ingredient_count: Array.isArray(r.ingredients) ? r.ingredients.length : 0
  })) || [];
}

async function getInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name, category)')
    .gt('current_number', 0)
    .limit(50);

  if (error || !data || data.length === 0) {
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
}

async function getMissingIngredients(recipeName: string) {
  const { data: recipe } = await supabase
    .from('recipes')
    .select('name, ingredients')
    .ilike('name', `%${recipeName}%`)
    .single();

  if (!recipe) {
    return { error: `No se encontró la receta "${recipeName}"` };
  }

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
    const found = availableItems.some(item => item?.includes(normalized) || normalized.includes(item || ''));
    if (found) available.push(ingName);
    else missing.push(ingName);
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

async function getShoppingList() {
  const { data, error } = await supabase
    .from('market_checklist')
    .select('*, market_item:market_items(name, category)')
    .eq('checked', false)
    .limit(30);

  if (error || !data || data.length === 0) {
    return { message: 'La lista de compras está vacía', items: [] };
  }

  const items = data.map(item => ({
    name: item.market_item?.name || 'Item',
    category: item.market_item?.category || 'Otros'
  }));

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
}

async function getTodayTasks() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = Math.ceil(today.getDate() / 7);
  const cycleWeek = ((weekNumber - 1) % 4) + 1;

  const { data: tasks } = await supabase
    .from('task_templates')
    .select('*, employee:employees(name)')
    .eq('day_of_week', dayOfWeek)
    .eq('week_number', cycleWeek)
    .order('time_start');

  if (!tasks || tasks.length === 0) {
    return { message: 'No hay tareas programadas para hoy', tasks: [] };
  }

  return {
    date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    total_tasks: tasks.length,
    tasks: tasks.map(t => ({
      task: t.task_name,
      employee: t.employee?.name || 'Sin asignar',
      time: `${t.time_start} - ${t.time_end}`,
      category: t.category,
      is_special: t.is_special
    }))
  };
}

async function getTasksSummary() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = Math.ceil(today.getDate() / 7);
  const cycleWeek = ((weekNumber - 1) % 4) + 1;

  const { data: templates } = await supabase
    .from('task_templates')
    .select('id')
    .eq('day_of_week', dayOfWeek)
    .eq('week_number', cycleWeek);

  const totalTasks = templates?.length || 0;

  // Por ahora asumimos que las tareas no tienen estado de completado persistente
  return {
    date: today.toLocaleDateString('es-ES', { weekday: 'long' }),
    total_tasks: totalTasks,
    message: `${totalTasks} tareas programadas para hoy`
  };
}

async function getEmployeeSchedule(employeeName: string, period: string = 'today') {
  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, work_days, schedule')
    .ilike('name', `%${employeeName}%`)
    .single();

  if (!employee) {
    return { error: `No se encontró el empleado "${employeeName}"` };
  }

  const today = new Date();
  const dayOfWeek = today.getDay();

  if (period === 'week') {
    const { data: tasks } = await supabase
      .from('task_templates')
      .select('*')
      .eq('employee_id', employee.id)
      .order('week_number')
      .order('day_of_week')
      .order('time_start');

    return {
      employee: employee.name,
      work_days: employee.work_days,
      schedule: employee.schedule,
      tasks_this_week: tasks?.length || 0
    };
  }

  // Today
  const weekNumber = Math.ceil(today.getDate() / 7);
  const cycleWeek = ((weekNumber - 1) % 4) + 1;

  const { data: tasks } = await supabase
    .from('task_templates')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('day_of_week', dayOfWeek)
    .eq('week_number', cycleWeek)
    .order('time_start');

  return {
    employee: employee.name,
    date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    tasks_today: tasks?.map(t => ({
      task: t.task_name,
      time: `${t.time_start} - ${t.time_end}`,
      category: t.category
    })) || []
  };
}

async function suggestRecipe(preferences?: string, mealType?: string) {
  const { data: inventory } = await supabase
    .from('inventory')
    .select('market_item:market_items(name)')
    .gt('current_number', 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableIngredients = inventory?.map((i: any) => i.market_item?.name).filter(Boolean) || [];

  const { data: recipes } = await supabase
    .from('recipes')
    .select('name, ingredients, prep_time, category');

  if (!recipes || recipes.length === 0) {
    return { suggestion: 'No hay recetas disponibles' };
  }

  let bestMatch = { recipe: recipes[0], matchCount: 0 };

  for (const recipe of recipes) {
    if (mealType && recipe.category !== mealType) continue;

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

  const totalIng = Array.isArray(bestMatch.recipe.ingredients) ? bestMatch.recipe.ingredients.length : 0;
  const coverage = totalIng > 0 ? Math.round((bestMatch.matchCount / totalIng) * 100) : 0;

  return {
    suggested_recipe: bestMatch.recipe.name,
    prep_time: bestMatch.recipe.prep_time,
    category: bestMatch.recipe.category,
    ingredients_available: bestMatch.matchCount,
    total_ingredients: totalIng,
    coverage_percent: coverage,
    preferences_applied: preferences || null
  };
}

async function getCurrentDateInfo() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekNumber = Math.ceil(today.getDate() / 7);
  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;
  const cycleWeek = ((weekNumber - 1) % 4) + 1;

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return {
    date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    day_name: days[dayOfWeek],
    cycle_day: cycleDay,
    cycle_week: cycleWeek,
    is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
    no_dinner: dayOfWeek === 5 || dayOfWeek === 6
  };
}

async function calculatePortions(recipeName: string, portions: number) {
  const { data: recipe } = await supabase
    .from('recipes')
    .select('name, ingredients, portions')
    .ilike('name', `%${recipeName}%`)
    .single();

  if (!recipe) {
    return { error: `No se encontró la receta "${recipeName}"` };
  }

  const originalPortions = recipe.portions || 5;
  const multiplier = portions / originalPortions;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  const adjusted = ingredients.map((ing: { name?: string; amount?: string } | string) => {
    if (typeof ing === 'string') return ing;
    const amount = ing.amount || '';
    const numMatch = amount.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      const newNum = Math.round(num * multiplier * 10) / 10;
      return {
        item: ing.name,
        original: amount,
        adjusted: amount.replace(numMatch[1], newNum.toString())
      };
    }
    return { item: ing.name, original: amount, adjusted: amount };
  });

  return {
    recipe: recipe.name,
    original_portions: originalPortions,
    requested_portions: portions,
    multiplier: Math.round(multiplier * 100) / 100,
    adjusted_ingredients: adjusted
  };
}

async function getUpcomingMeals(days: number = 3) {
  const today = new Date();
  const meals = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    const cycleDay = ((dow === 0 ? 7 : dow) - 1) % 12 + 1;
    const isWeekend = dow === 5 || dow === 6;

    const { data: menu } = await supabase
      .from('day_menu')
      .select(`
        breakfast:recipes!day_menu_breakfast_id_fkey(name),
        lunch:recipes!day_menu_lunch_id_fkey(name),
        dinner:recipes!day_menu_dinner_id_fkey(name)
      `)
      .eq('day_number', cycleDay)
      .single();

    // Type assertion for Supabase join result
    const menuData = menu as {
      breakfast: { name: string } | null;
      lunch: { name: string } | null;
      dinner: { name: string } | null;
    } | null;

    meals.push({
      date: date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }),
      breakfast: menuData?.breakfast?.name || '-',
      lunch: menuData?.lunch?.name || '-',
      dinner: isWeekend ? 'Sin cena' : (menuData?.dinner?.name || '-')
    });
  }

  return { days: days, upcoming_meals: meals };
}

async function getPreparationTips() {
  const todayMenu = await getTodayMenu();

  const tips = [];
  if (todayMenu.lunch && todayMenu.lunch !== 'No programado') {
    tips.push(`Para el almuerzo (${todayMenu.lunch}): revisa que tengas todos los ingredientes listos`);
  }
  if (todayMenu.dinner && todayMenu.dinner !== 'No programado' && todayMenu.dinner !== 'Sin cena (salen a comer)') {
    tips.push(`Para la cena (${todayMenu.dinner}): puedes adelantar la preparación en la mañana`);
  }

  return {
    date: todayMenu.date,
    menu_today: todayMenu,
    tips: tips.length > 0 ? tips : ['No hay tips específicos para hoy']
  };
}

async function getLowInventoryAlerts(threshold: number = 2) {
  const { data } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name, category)')
    .lte('current_number', threshold)
    .gt('current_number', 0);

  if (!data || data.length === 0) {
    return { message: 'No hay alertas de inventario bajo', alerts: [] };
  }

  return {
    threshold,
    alerts_count: data.length,
    alerts: data.map(item => ({
      item: item.market_item?.name || 'Item',
      category: item.market_item?.category || 'Otros',
      current_quantity: item.current_number
    }))
  };
}

async function listSpaces() {
  const { data } = await supabase
    .from('spaces')
    .select('*')
    .order('name');

  return {
    total: data?.length || 0,
    spaces: data?.map(s => ({
      id: s.id,
      name: s.name,
      type: s.space_type,
      category: s.category,
      usage_level: s.usage_level
    })) || []
  };
}

async function listEmployees(activeOnly: boolean = true) {
  let query = supabase.from('employees').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);

  const { data } = await query;

  return {
    total: data?.length || 0,
    employees: data?.map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      work_days: e.work_days,
      schedule: e.schedule,
      active: e.active
    })) || []
  };
}

async function listTaskTemplates(employeeId?: string, category?: string) {
  let query = supabase.from('task_templates').select('*, employee:employees(name)').order('week_number').order('day_of_week').order('time_start');

  if (employeeId) query = query.eq('employee_id', employeeId);
  if (category) query = query.eq('category', category);

  const { data } = await query.limit(50);

  return {
    total: data?.length || 0,
    templates: data?.map(t => ({
      id: t.id,
      task: t.task_name,
      employee: t.employee?.name || 'Sin asignar',
      week: t.week_number,
      day: t.day_of_week,
      time: `${t.time_start} - ${t.time_end}`,
      category: t.category
    })) || []
  };
}

async function getWeeklyReport() {
  const inventory = await getInventory();
  const tasksSummary = await getTasksSummary();
  const lowInventory = await getLowInventoryAlerts(3);
  const upcomingMeals = await getUpcomingMeals(7);

  return {
    report_date: new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    inventory_summary: {
      total_items: inventory.total || 0,
      low_stock_alerts: lowInventory.alerts_count || 0
    },
    tasks_summary: tasksSummary,
    upcoming_meals: upcomingMeals.upcoming_meals
  };
}

// ============================================
// EJECUTAR FUNCIÓN DE CONSULTA
// ============================================

async function executeQueryFunction(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_today_menu': return await getTodayMenu();
    case 'get_week_menu': return await getWeekMenu();
    case 'get_recipe_details': return await getRecipeDetails(args.recipe_name as string);
    case 'search_recipes': return await searchRecipes(args.query as string);
    case 'get_inventory': return await getInventory();
    case 'get_missing_ingredients': return await getMissingIngredients(args.recipe_name as string);
    case 'get_shopping_list': return await getShoppingList();
    case 'get_today_tasks': return await getTodayTasks();
    case 'get_tasks_summary': return await getTasksSummary();
    case 'get_employee_schedule': return await getEmployeeSchedule(args.employee_name as string, args.period as string);
    case 'suggest_recipe': return await suggestRecipe(args.preferences as string, args.meal_type as string);
    case 'get_current_date_info': return await getCurrentDateInfo();
    case 'calculate_portions': return await calculatePortions(args.recipe_name as string, args.portions as number);
    case 'get_upcoming_meals': return await getUpcomingMeals(args.days as number);
    case 'get_preparation_tips': return await getPreparationTips();
    case 'get_low_inventory_alerts': return await getLowInventoryAlerts(args.threshold as number);
    case 'list_spaces': return await listSpaces();
    case 'list_employees': return await listEmployees(args.active_only as boolean);
    case 'list_task_templates': return await listTaskTemplates(args.employee_id as string, args.category as string);
    case 'get_weekly_report': return await getWeeklyReport();
    default: return { error: `Función desconocida: ${name}` };
  }
}

// ============================================
// SYSTEM PROMPT SIMPLIFICADO
// ============================================

const SYSTEM_PROMPT = `Eres el asistente del hogar González. Ayudas con consultas sobre recetas, menú, inventario y tareas.

## REGLA: SIEMPRE USA LAS FUNCIONES
- "¿Qué hay de comer?" → get_today_menu()
- "¿Cómo hago X receta?" → get_recipe_details(recipe_name)
- "¿Qué tengo en la despensa?" → get_inventory()
- "Lista de compras" → get_shopping_list()
- "Tareas de hoy" → get_today_tasks()

## DATOS DEL HOGAR
- Familia González (Luis y Mariana)
- Porciones: Luis (3) + Mariana (2) = 5 total
- Viernes/Sábado: Sin cena
- Empleada: Yolima

## FORMATO
- Sé amigable y conciso
- Usa 1-2 emojis por respuesta
- Respuestas claras y organizadas

NOTA: Este chat es solo para CONSULTAS. Para acciones (crear, modificar, eliminar), indica al usuario que use el chat principal.`;

// ============================================
// HELPER: Detectar función requerida
// ============================================

function detectRequiredFunction(message: string): { name: string; args: Record<string, unknown> } | null {
  const msg = message.toLowerCase();

  if (msg.includes('qué hay') || msg.includes('que hay') || msg.includes('almuerzo') ||
      msg.includes('cena') || msg.includes('desayuno') || msg.includes('menú del día')) {
    return { name: 'get_today_menu', args: {} };
  }

  if ((msg.includes('cómo') || msg.includes('como')) &&
      (msg.includes('hago') || msg.includes('preparo') || msg.includes('hacer'))) {
    const patterns = [
      /cómo (?:hago|preparo|hacer|preparar) (?:una?|el|la|los|las)?\s*(.+)/i,
      /como (?:hago|preparo|hacer|preparar) (?:una?|el|la|los|las)?\s*(.+)/i
    ];
    for (const pattern of patterns) {
      const match = msg.match(pattern);
      if (match) {
        return { name: 'get_recipe_details', args: { recipe_name: match[1].trim().replace(/\?$/, '') } };
      }
    }
    return { name: 'search_recipes', args: { query: msg } };
  }

  if (msg.includes('inventario') || msg.includes('despensa') || msg.includes('qué tengo')) {
    return { name: 'get_inventory', args: {} };
  }

  if (msg.includes('lista de compras') || msg.includes('que comprar') || msg.includes('qué comprar')) {
    return { name: 'get_shopping_list', args: {} };
  }

  if (msg.includes('tarea') || msg.includes('pendiente') || msg.includes('yolima')) {
    return { name: 'get_today_tasks', args: {} };
  }

  if (msg.includes('sugiér') || msg.includes('sugier') || msg.includes('qué puedo cocinar')) {
    return { name: 'suggest_recipe', args: {} };
  }

  if (msg.includes('semana') && msg.includes('menú')) {
    return { name: 'get_week_menu', args: {} };
  }

  return null;
}

// ============================================
// API ROUTE - ENDPOINT SIMPLIFICADO
// ============================================

export async function POST(request: NextRequest) {
  console.log('[AI Chat Simple] POST request received');

  try {
    const body = await request.json();
    const { messages, stream = false } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const gemini = getGeminiClient();
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Convertir mensajes al formato Gemini
    const geminiMessages = messages.map((msg: MessageWithImage) => {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.image) parts.push(base64ToGeminiFormat(msg.image));
      return {
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        parts
      };
    });

    // Llamar a Gemini con funciones de consulta
    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: geminiMessages,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: queryFunctions }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO }
        }
      }
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter(part => part.functionCall);

    // Si no hay llamadas a funciones, verificar si debería haber una
    if (functionCalls.length === 0) {
      const detected = detectRequiredFunction(lastUserMessage);

      if (detected) {
        console.log('[AI Chat Simple] Forcing function:', detected.name);
        const result = await executeQueryFunction(detected.name, detected.args);

        // Generar respuesta basada en el resultado
        const followUp = await gemini.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: [{ role: 'user', parts: [{ text: `Usuario preguntó: "${lastUserMessage}"\n\nResultado de ${detected.name}:\n${JSON.stringify(result, null, 2)}\n\nResponde de forma útil y amigable.` }] }],
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            systemInstruction: SYSTEM_PROMPT
          }
        });

        const content = followUp.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude obtener la información.';

        if (stream) {
          return new Response(`data: ${JSON.stringify({ type: 'content', content })}\n\ndata: ${JSON.stringify({ type: 'done', done: true })}\n\n`, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
          });
        }

        return NextResponse.json({ content, role: 'assistant' });
      }

      // Respuesta directa sin función
      const textResponse = parts.find(part => part.text)?.text || 'Hola, ¿en qué puedo ayudarte con el menú, recetas o tareas del hogar?';

      if (stream) {
        return new Response(`data: ${JSON.stringify({ type: 'content', content: textResponse })}\n\ndata: ${JSON.stringify({ type: 'done', done: true })}\n\n`, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
        });
      }

      return NextResponse.json({ content: textResponse, role: 'assistant' });
    }

    // Ejecutar funciones llamadas
    const functionResponses = [];
    for (const part of functionCalls) {
      const fc = part.functionCall!;
      const result = await executeQueryFunction(fc.name!, (fc.args as Record<string, unknown>) || {});
      functionResponses.push({
        functionResponse: { name: fc.name, response: result }
      });
    }

    // Obtener respuesta final
    const finalResponse = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [
        ...geminiMessages,
        { role: 'model' as const, parts: parts },
        { role: 'user' as const, parts: functionResponses }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        systemInstruction: SYSTEM_PROMPT
      }
    });

    const finalContent = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu solicitud.';

    if (stream) {
      return new Response(`data: ${JSON.stringify({ type: 'content', content: finalContent })}\n\ndata: ${JSON.stringify({ type: 'done', done: true })}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
      });
    }

    return NextResponse.json({ content: finalContent, role: 'assistant' });

  } catch (error) {
    console.error('[AI Chat Simple] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
