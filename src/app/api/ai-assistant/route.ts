import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, base64ToGeminiFormat } from '@/lib/gemini/client';
import { FunctionDeclaration, Type } from '@google/genai';

// Types for messages with images
interface MessageWithImage {
  role: string;
  content: string;
  image?: string; // Base64 image data
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
  }
];

// ============================================
// IMPLEMENTACIÓN DE FUNCIONES
// ============================================

async function getTodayMenu() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const cycleDay = ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12 + 1;

  const { data: menu } = await supabase
    .from('day_menu')
    .select(`
      *,
      breakfast:recipes!day_menu_breakfast_id_fkey(name, prep_time),
      lunch:recipes!day_menu_lunch_id_fkey(name, prep_time),
      dinner:recipes!day_menu_dinner_id_fkey(name, prep_time)
    `)
    .eq('day_number', cycleDay)
    .single();

  if (!menu) {
    return { message: 'No hay menú programado para hoy' };
  }

  return {
    date: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    cycle_day: cycleDay,
    breakfast: menu.breakfast?.name || 'No programado',
    lunch: menu.lunch?.name || 'No programado',
    dinner: menu.dinner?.name || 'No programado (viernes/sábado sin cena)'
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
  const { data } = await supabase
    .from('inventory')
    .select('*, market_item:market_items(name, category)')
    .gt('current_number', 0)
    .limit(30);

  const grouped: Record<string, string[]> = {};
  data?.forEach(item => {
    const cat = item.market_item?.category || 'Otros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(`${item.market_item?.name} (${item.current_number})`);
  });

  return grouped;
}

async function getShoppingList() {
  const { data } = await supabase
    .from('market_checklist')
    .select('*, market_item:market_items(name, category)')
    .eq('checked', false)
    .limit(20);

  return data?.map(item => ({
    name: item.market_item?.name || 'Item',
    category: item.market_item?.category || 'Otros'
  })) || [];
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
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('daily_task_instances')
    .select('*, employee:employees(name)')
    .eq('date', today)
    .order('time_start');

  if (!tasks || tasks.length === 0) {
    // Intentar con home_employees
    const { data: tasks2 } = await supabase
      .from('daily_task_instances')
      .select('*, employee:home_employees(name)')
      .eq('date', today)
      .order('time_start');

    return tasks2?.map(t => ({
      task: t.task_name,
      employee: t.employee?.name || 'Sin asignar',
      time: `${t.time_start} - ${t.time_end}`,
      status: t.status,
      category: t.category
    })) || [];
  }

  return tasks.map(t => ({
    task: t.task_name,
    employee: t.employee?.name || 'Sin asignar',
    time: `${t.time_start} - ${t.time_end}`,
    status: t.status,
    category: t.category
  }));
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
  const today = new Date().toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('daily_task_instances')
    .select('status, employee_id')
    .eq('date', today);

  if (!tasks || tasks.length === 0) {
    return { message: 'No hay tareas programadas para hoy' };
  }

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const total = tasks.length;

  return {
    total,
    completed,
    in_progress: inProgress,
    pending,
    progress_percent: Math.round((completed / total) * 100)
  };
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

      return {
        task_type: taskType,
        steps_completed: stepsCompleted,
        results,
        summary: `Lista de compras optimizada. ${currentList.length} items actuales, ${
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
// EJECUTOR DE FUNCIONES
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

    default:
      return { error: `Función desconocida: ${name}` };
  }
}

// ============================================
// API ROUTE
// ============================================

const SYSTEM_PROMPT = `Eres el Asistente Inteligente del Hogar - un ayudante proactivo, eficiente y amigable para la gestión del hogar y cocina.

## TU PERSONALIDAD
- **Proactivo**: No solo respondes, también sugieres y anticipas necesidades
- **Práctico**: Vas al grano pero das contexto útil
- **Amigable**: Usas emojis con moderación (1-2 por respuesta máximo)
- **Colaborativo**: SIEMPRE buscas la manera de ayudar, nunca dices "no puedo"

## ⚠️ REGLA MÁS IMPORTANTE: SER COLABORATIVO

**NUNCA rechaces una solicitud de ayuda para cocinar.** Si el usuario quiere hacer una receta:

1. **Si la receta EXISTE en la base de datos**: Usa las funciones para obtener detalles, verificar ingredientes, etc.

2. **Si la receta NO EXISTE en la base de datos**:
   - NO sugieras una receta diferente como si fuera lo mismo
   - USA TU CONOCIMIENTO GENERAL para ayudar
   - Explica los ingredientes típicos de esa receta
   - Verifica con get_inventory() qué ingredientes tiene el usuario
   - Indica cuáles tiene ✅ y cuáles le faltan ❌
   - Ofrece agregar los faltantes a la lista de compras
   - Da los pasos de preparación usando tu conocimiento

**Ejemplo de respuesta ideal cuando NO existe la receta:**
"No tengo la receta de pasta bolognesa guardada en el sistema, pero **te ayudo a prepararla**.

Para una bolognesa tradicional necesitas:
- Carne molida ✅ (tienes en inventario)
- Pasta/espaguetis ❌ (no tienes)
- Tomate triturado ✅ (tienes)
- Cebolla ✅ (tienes)
- Ajo ✅ (tienes)
- Zanahoria ❌ (no tienes)

Te faltan 2 ingredientes. ¿Quieres que los agregue a la lista de compras?

**Preparación básica:**
1. Sofríe cebolla y ajo picados
2. Agrega la carne molida y dora bien
3. Añade el tomate y cocina 20-30 min
4. Sazona con sal, pimienta, orégano
5. Sirve sobre la pasta cocida

💡 ¿Te doy más detalles de algún paso?"

## ⚡ REGLA CRÍTICA: USAR AGENTE MULTI-PASO

Cuando el usuario pida ayuda con tareas complejas, SIEMPRE usa execute_multi_step_task. Detecta estas frases:

**ACTIVAR prepare_recipe cuando escuches:**
- "Ayúdame con todo para [receta]"
- "Quiero cocinar [receta], ayúdame"
- "Prepárame todo para [receta]"
- "Voy a hacer [receta], qué necesito"
- Cualquier solicitud de cocinar + "ayuda/todo/completo"

**ACTIVAR weekly_planning cuando escuches:**
- "Planifica mi semana"
- "Organiza el menú semanal"
- "Qué necesito para toda la semana"

**ACTIVAR full_report cuando escuches:**
- "Dame un reporte completo"
- "Cómo está todo en casa"
- "Resumen del día/hogar"

**ACTIVAR menu_from_inventory cuando escuches:**
- "Qué puedo cocinar con lo que tengo"
- "Sugiere recetas con mi inventario"

## COMPORTAMIENTOS CLAVE

### 1. Siempre verifica el contexto
ANTES de responder sobre comidas o inventario, usa las funciones para obtener datos REALES:
- get_current_date_info() → Para saber qué día es y si hay cena
- get_today_menu() → Para comidas de hoy
- get_inventory() → Para ingredientes disponibles

### 2. Sé proactivo en tus respuestas
Cuando muestres información, agrega valor:
- Si muestras el menú → menciona si hay ingredientes faltantes
- Si muestras inventario bajo → sugiere agregarlo a la lista de compras
- Si una receta requiere descongelar algo → recuérdalo

### 3. Confirma acciones con claridad
Cuando hagas algo, usa este formato:
✅ [Acción realizada]
📝 [Detalle si es necesario]
💡 [Sugerencia relacionada si aplica]

### 4. Formato de respuestas
- Usa **negritas** para destacar lo importante
- Usa listas con bullets para múltiples items
- Mantén respuestas de máximo 3-4 párrafos cortos
- Si hay mucha información, organízala en secciones claras

### 5. Conocimiento culinario general
Tienes conocimiento de cocina general. Si una receta no está en la base de datos:
- Usa tu conocimiento para dar ingredientes y pasos
- Verifica el inventario del usuario con get_inventory()
- Ayuda igual que si la receta existiera en el sistema
- NUNCA digas "no tengo esa receta" y te quedes ahí - SIEMPRE ofrece ayudar

## DATOS DEL HOGAR

### Configuración de Comidas
- **Ciclo del menú**: 12 días que se repiten
- **Porciones estándar**: Porción grande (3) + Porción pequeña (2) = 5 total
- **Viernes y Sábado**: Sin cena programada (salen a comer fuera)

### Empleados del Hogar
- Los empleados tienen horarios rotativos en ciclos de 4 semanas
- Cada uno tiene espacios y tareas específicas asignadas

## FUNCIONES AVANZADAS DISPONIBLES
- **get_recipe_details**: Ver receta completa con ingredientes y pasos
- **get_missing_ingredients**: Verificar qué falta para una receta
- **swap_menu_recipe**: Cambiar una receta del menú por otra
- **calculate_portions**: Ajustar cantidades para X porciones
- **get_weekly_report**: Resumen semanal de tareas e inventario
- **get_preparation_tips**: Consejos de preparación para hoy
- **get_low_inventory_alerts**: Alertas de items bajos/agotados
- **update_inventory**: Actualizar cantidades del inventario

## CAPACIDADES DE VISIÓN (Análisis de Imágenes)
Puedes analizar imágenes que te envíen. Cuando recibas una imagen:

### Tipos de análisis que puedes hacer:
1. **Escaneo de despensa/nevera**: Identifica productos y ofrece actualizar inventario
2. **Tickets de compra**: Extrae items y ofrece agregarlos a la lista
3. **Platos de comida**: Identifica el plato, sugiere recetas similares
4. **Ingredientes sueltos**: Identifica qué son y sugiere recetas
5. **Espacios del hogar**: Identifica el tipo de espacio y estado de limpieza

### Cómo responder a imágenes:
1. Describe brevemente lo que ves
2. Ofrece acciones relevantes según el contexto
3. Pregunta si quiere que hagas algo con la información

### Ejemplos con imágenes:
**Usuario envía foto de nevera**
📷 Veo tu nevera con varios productos:
- Leche (casi vacía)
- Huevos (~6)
- Queso mozzarella
- Tomates (4)
- Pollo (bandeja)

💡 ¿Quieres que actualice el inventario con estos productos?

**Usuario envía foto de ticket**
🧾 Veo un ticket de compra con:
- Pan tajado $3,500
- Leche x2 $8,000
- Huevos $12,000

💡 ¿Los agrego a la lista de compras como comprados?

## EJEMPLOS DE RESPUESTAS IDEALES

**Usuario**: "¿Qué hay de almuerzo?"
**Tú**: 🍽️ **Hoy (Lunes 20)**: Arroz con pollo
⏱️ Tiempo: 45 min de preparación
✅ Tienes todos los ingredientes disponibles

**Usuario**: "Agrega leche a la lista"
**Tú**: ✅ **Leche** agregada a la lista de compras
📝 También noté que tienes bajo: Huevos (2)
💡 ¿Quieres que los agregue también?

## RESTRICCIONES
- Nunca inventes datos - siempre usa las funciones disponibles
- Si no encuentras información, dilo claramente
- No hagas suposiciones sobre preferencias sin preguntar primero`;

export async function POST(request: NextRequest) {
  try {
    const { messages, conversationContext, stream = false } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const gemini = getGeminiClient();

    // Build enhanced system prompt with context
    let enhancedSystemPrompt = SYSTEM_PROMPT;

    if (conversationContext) {
      const { history, lastTopic, preferences } = conversationContext;

      if (history && history.trim()) {
        enhancedSystemPrompt += `\n\n## CONTEXTO DE CONVERSACIÓN ANTERIOR\n${history}`;
      }

      if (lastTopic) {
        enhancedSystemPrompt += `\n\n## TEMA ACTUAL DE CONVERSACIÓN\nEl usuario estaba hablando sobre: ${lastTopic}. Continúa con este contexto si es relevante.`;
      }

      if (preferences && Object.keys(preferences).length > 0) {
        enhancedSystemPrompt += `\n\n## PREFERENCIAS DEL USUARIO CONOCIDAS`;
        if (preferences.favoriteRecipes?.length) {
          enhancedSystemPrompt += `\n- Recetas favoritas: ${preferences.favoriteRecipes.join(', ')}`;
        }
        if (preferences.dislikedIngredients?.length) {
          enhancedSystemPrompt += `\n- Ingredientes que no le gustan: ${preferences.dislikedIngredients.join(', ')}`;
        }
        if (preferences.dietaryRestrictions?.length) {
          enhancedSystemPrompt += `\n- Restricciones alimentarias: ${preferences.dietaryRestrictions.join(', ')}`;
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
      // Ejecutar todas las funciones
      const functionResponses = [];

      for (const part of functionCalls) {
        const fc = part.functionCall!;
        if (!fc.name) continue;
        const result = await executeFunction(fc.name, fc.args as Record<string, unknown> || {});

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: result
          }
        });
      }

      // Segunda llamada con los resultados de las funciones
      // Si streaming está habilitado, usar generateContentStream
      if (stream) {
        const streamResponse = await gemini.models.generateContentStream({
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

        // Crear un ReadableStream para enviar chunks al cliente
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamResponse) {
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: text, done: false })}\n\n`));
                }
              }
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: '', done: true })}\n\n`));
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

      const finalContent = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return NextResponse.json({
        content: finalContent,
        role: 'assistant'
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
    const textContent = parts.find(part => part.text)?.text || '';

    return NextResponse.json({
      content: textContent,
      role: 'assistant'
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Error processing request', details: String(error) },
      { status: 500 }
    );
  }
}
