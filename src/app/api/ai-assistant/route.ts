import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG } from '@/lib/gemini/client';
import { FunctionDeclaration, Type } from '@google/genai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// DEFINICIÓN DE FUNCIONES PARA GEMINI
// ============================================

const functionDeclarations: FunctionDeclaration[] = [
  // CONSULTAS - Recetario
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
    name: 'suggest_recipe',
    description: 'Sugiere una receta basada en los ingredientes disponibles en el inventario',
    parameters: {
      type: Type.OBJECT,
      properties: {
        preferences: { type: Type.STRING, description: 'Preferencias opcionales (ej: "algo ligero", "con pollo")' }
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
  // ACCIONES - Recetario
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
  // UTILIDADES
  {
    name: 'get_current_date_info',
    description: 'Obtiene información de la fecha actual (día, semana del ciclo, etc.)',
    parameters: { type: Type.OBJECT, properties: {}, required: [] }
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
  const { data: recipes } = await supabase
    .from('recipes')
    .select('name, prep_time, category, portions, ingredients')
    .or(`name.ilike.%${query}%,ingredients.cs.{${query}}`);

  return recipes?.slice(0, 5).map(r => ({
    name: r.name,
    prep_time: r.prep_time,
    category: r.category,
    ingredient_count: Array.isArray(r.ingredients) ? r.ingredients.length : 0
  })) || [];
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

  return {
    date: now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    day_name: dayNames[now.getDay()],
    time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    week_number: Math.ceil((now.getDate() - now.getDay() + 1) / 7)
  };
}

// ============================================
// EJECUTOR DE FUNCIONES
// ============================================

async function executeFunction(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_today_menu':
      return await getTodayMenu();
    case 'get_week_menu':
      return await getWeekMenu();
    case 'search_recipes':
      return await searchRecipes(args.query as string);
    case 'get_inventory':
      return await getInventory();
    case 'get_shopping_list':
      return await getShoppingList();
    case 'suggest_recipe':
      return await suggestRecipe(args.preferences as string);
    case 'get_today_tasks':
      return await getTodayTasks();
    case 'get_employee_schedule':
      return await getEmployeeSchedule(args.employee_name as string, args.period as string);
    case 'get_tasks_summary':
      return await getTasksSummary();
    case 'add_to_shopping_list':
      return await addToShoppingList(args.item_name as string, args.quantity as string);
    case 'mark_shopping_item':
      return await markShoppingItem(args.item_name as string, args.checked as boolean);
    case 'complete_task':
      return await completeTask(args.task_name as string, args.employee_name as string);
    case 'add_quick_task':
      return await addQuickTask(args.task_name as string, args.employee_name as string, args.category as string);
    case 'get_current_date_info':
      return getCurrentDateInfo();
    default:
      return { error: `Función desconocida: ${name}` };
  }
}

// ============================================
// API ROUTE
// ============================================

const SYSTEM_PROMPT = `Eres un asistente inteligente para la gestión del hogar y recetas de la Familia González.

Tu rol es ayudar con:
- Consultar y planificar el menú semanal
- Sugerir recetas basadas en ingredientes disponibles
- Gestionar la lista de compras
- Consultar y gestionar las tareas del hogar
- Ver el progreso de limpieza y tareas de los empleados (Yolima - interior, John - exterior)

Personalidad:
- Eres amable, eficiente y práctico
- Respondes en español de manera clara y concisa
- Usas emojis ocasionalmente para hacer la conversación más amigable
- Siempre confirmas las acciones realizadas

Datos importantes:
- El menú rota en ciclos de 12 días
- Las porciones son: Luis (3) y Mariana (2) = 5 total
- Viernes y sábados no hay cena (salen a comer)
- El horario de empleados rota en ciclos de 4 semanas

Cuando el usuario pregunte algo, usa las funciones disponibles para obtener datos reales del sistema antes de responder.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const gemini = getGeminiClient();

    // Convertir mensajes al formato de Gemini
    const geminiMessages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }]
    }));

    // Primera llamada a Gemini con las funciones
    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: geminiMessages,
      config: {
        temperature: GEMINI_CONFIG.assistant.temperature,
        maxOutputTokens: GEMINI_CONFIG.assistant.maxOutputTokens,
        systemInstruction: SYSTEM_PROMPT,
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
          systemInstruction: SYSTEM_PROMPT,
        }
      });

      const finalContent = finalResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return NextResponse.json({
        content: finalContent,
        role: 'assistant'
      });
    }

    // Si no hay llamadas a funciones, devolver la respuesta directa
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
