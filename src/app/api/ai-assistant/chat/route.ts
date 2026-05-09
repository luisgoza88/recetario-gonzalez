import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getGeminiClient,
  GEMINI_MODELS,
  base64ToGeminiFormat,
} from "@/lib/gemini/client";
import {
  FunctionDeclaration,
  Type,
  FunctionCallingConfigMode,
} from "@google/genai";
import { withRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import { getCookingProfile, getFamilyDisplayName } from "@/lib/cooking-profile";
import {
  getHouseholdMoodPatterns,
  formatMoodPatternsForPrompt,
} from "@/lib/mood-learning";

// Import shared types
import { MessageWithImage } from "@/lib/ai-assistant/types";

// Import query handlers from functions/ — consolidated implementations
import {
  getTodayMenu,
  getWeekMenu,
  getRecipeDetails,
  searchRecipes,
  getInventory,
  getMissingIngredients,
  getShoppingList,
  suggestRecipe,
} from "../functions/recetario-queries";
import {
  getTodayTasks,
  getTasksSummary,
  getEmployeeSchedule,
  listSpaces,
  listEmployees,
  listTaskTemplates,
} from "../functions/home-queries";
import {
  getCurrentDateInfo,
  calculatePortions,
  getUpcomingMeals,
  getPreparationTips,
  getLowInventoryAlerts,
  getWeeklyReport,
} from "../functions/reports";

// Zod schema for request validation
const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(10000),
  image: z
    .string()
    .max(10 * 1024 * 1024)
    .optional(), // Max ~7.5MB image
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  stream: z.boolean().optional(),
  conversationContext: z.record(z.string(), z.unknown()).optional(),
  householdId: z.string().uuid().optional(),
});

/**
 * ENDPOINT SIMPLIFICADO PARA CONSULTAS
 *
 * Este endpoint maneja SOLO consultas de lectura (get_*, search_*, suggest_*, list_*).
 * NO tiene sistema de trust, proposals ni audit logs.
 * Es más rápido y directo para preguntas simples como "¿qué hay de comer?".
 *
 * Para acciones de escritura (crear, actualizar, eliminar), usar /api/ai-assistant
 */

// Note: MessageWithImage is imported from @/lib/ai-assistant modules

// ============================================
// SOLO FUNCIONES DE CONSULTA (READ-ONLY)
// ============================================

const queryFunctions: FunctionDeclaration[] = [
  // Menú
  {
    name: "get_today_menu",
    description:
      "Obtiene el menú programado para hoy (desayuno, almuerzo, cena)",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_week_menu",
    description: "Obtiene el menú completo de la semana",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  // Recetas
  {
    name: "get_recipe_details",
    description: "Obtiene los detalles completos de una receta específica",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: {
          type: Type.STRING,
          description: "Nombre de la receta a consultar",
        },
      },
      required: ["recipe_name"],
    },
  },
  {
    name: "search_recipes",
    description: "Busca recetas por nombre o ingrediente",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Término de búsqueda" },
      },
      required: ["query"],
    },
  },
  // Inventario
  {
    name: "get_inventory",
    description: "Obtiene el inventario actual de ingredientes disponibles",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_missing_ingredients",
    description: "Obtiene los ingredientes que faltan para una receta",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: "Nombre de la receta" },
      },
      required: ["recipe_name"],
    },
  },
  {
    name: "get_low_inventory_alerts",
    description: "Obtiene alertas de ingredientes con bajo inventario",
    parameters: {
      type: Type.OBJECT,
      properties: {
        threshold: {
          type: Type.NUMBER,
          description: "Cantidad mínima (default: 2)",
        },
      },
      required: [],
    },
  },
  // Lista de compras
  {
    name: "get_shopping_list",
    description: "Obtiene la lista de compras pendientes",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  // Tareas
  {
    name: "get_today_tasks",
    description: "Obtiene las tareas programadas para hoy",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_tasks_summary",
    description: "Obtiene un resumen del progreso de tareas",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "get_employee_schedule",
    description: "Obtiene el horario de un empleado específico",
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_name: {
          type: Type.STRING,
          description: "Nombre del empleado",
        },
        period: { type: Type.STRING, description: "Período: today o week" },
      },
      required: ["employee_name"],
    },
  },
  // Sugerencias
  {
    name: "suggest_recipe",
    description: "Sugiere una receta basada en los ingredientes disponibles",
    parameters: {
      type: Type.OBJECT,
      properties: {
        preferences: {
          type: Type.STRING,
          description: "Preferencias opcionales",
        },
        meal_type: { type: Type.STRING, description: "Tipo de comida" },
      },
      required: [],
    },
  },
  // Utilidades
  {
    name: "get_current_date_info",
    description: "Obtiene información de la fecha actual",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "calculate_portions",
    description: "Calcula las cantidades de ingredientes para X porciones",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipe_name: { type: Type.STRING, description: "Nombre de la receta" },
        portions: {
          type: Type.NUMBER,
          description: "Número de porciones deseadas",
        },
      },
      required: ["recipe_name", "portions"],
    },
  },
  {
    name: "get_upcoming_meals",
    description: "Obtiene las próximas comidas programadas",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: { type: Type.NUMBER, description: "Número de días (default: 3)" },
      },
      required: [],
    },
  },
  {
    name: "get_preparation_tips",
    description: "Obtiene consejos de preparación para las comidas del día",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  // Espacios y Empleados (solo lectura)
  {
    name: "list_spaces",
    description: "Lista todos los espacios del hogar",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
  {
    name: "list_employees",
    description: "Lista todos los empleados del hogar",
    parameters: {
      type: Type.OBJECT,
      properties: {
        active_only: {
          type: Type.BOOLEAN,
          description: "Solo activos (default: true)",
        },
      },
      required: [],
    },
  },
  {
    name: "list_task_templates",
    description: "Lista las plantillas de tareas recurrentes",
    parameters: {
      type: Type.OBJECT,
      properties: {
        employee_id: { type: Type.STRING, description: "Filtrar por empleado" },
        category: { type: Type.STRING, description: "Filtrar por categoría" },
      },
      required: [],
    },
  },
  {
    name: "get_weekly_report",
    description: "Genera un reporte semanal de tareas, comidas e inventario",
    parameters: { type: Type.OBJECT, properties: {}, required: [] },
  },
];

// ============================================
// EJECUTAR FUNCIÓN DE CONSULTA
// ============================================

async function executeQueryFunction(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_today_menu":
      return await getTodayMenu();
    case "get_week_menu":
      return await getWeekMenu();
    case "get_recipe_details":
      return await getRecipeDetails(args.recipe_name as string);
    case "search_recipes":
      return await searchRecipes(args.query as string);
    case "get_inventory":
      return await getInventory();
    case "get_missing_ingredients":
      return await getMissingIngredients(args.recipe_name as string);
    case "get_shopping_list":
      return await getShoppingList();
    case "get_today_tasks":
      return await getTodayTasks();
    case "get_tasks_summary":
      return await getTasksSummary();
    case "get_employee_schedule":
      return await getEmployeeSchedule(
        args.employee_name as string,
        args.period as string,
      );
    case "suggest_recipe":
      return await suggestRecipe(args.preferences as string);
    case "get_current_date_info":
      return getCurrentDateInfo();
    case "calculate_portions":
      return await calculatePortions(
        args.recipe_name as string,
        args.portions as number,
      );
    case "get_upcoming_meals":
      return await getUpcomingMeals(args.days as number);
    case "get_preparation_tips":
      return await getPreparationTips();
    case "get_low_inventory_alerts":
      return await getLowInventoryAlerts(args.threshold as number);
    case "list_spaces":
      return await listSpaces();
    case "list_employees":
      return await listEmployees(undefined, args.active_only as boolean);
    case "list_task_templates":
      return await listTaskTemplates(
        args.employee_id as string,
        undefined,
        args.category as string,
      );
    case "get_weekly_report":
      return await getWeeklyReport();
    default:
      return { error: `Función desconocida: ${name}` };
  }
}

// ============================================
// SYSTEM PROMPT SIMPLIFICADO
// ============================================

interface ConversationContextPayload {
  history?: string;
  lastTopic?: string | null;
  preferences?: {
    preferredMeals?: string[];
    dietaryRestrictions?: string[];
    favoriteRecipes?: string[];
    dislikedIngredients?: string[];
  };
  /** Snapshot del estado del hogar al abrir el chat (inyectado por AIChat.tsx) */
  snapshot?: string;
}

interface LearningInsightsPayload {
  totalFeedbacks: number;
  activePatterns: number;
  topRecipesNeedingAdjustment: string[];
  overallConfidence: number;
}

function buildChatSystemPrompt(opts?: {
  familyName?: string;
  city?: string;
  cookingStyle?: string;
  familySize?: number;
  conversationContext?: ConversationContextPayload;
  learningInsights?: LearningInsightsPayload;
  moodPatterns?: string;
}): string {
  const familyName = opts?.familyName || "tu hogar";
  const locationSuffix = opts?.city ? ` (${opts.city})` : "";
  const ctx = opts?.conversationContext;
  const insights = opts?.learningInsights;

  // Build memory sections only when data is available
  let snapshotSection = "";
  if (ctx?.snapshot && ctx.snapshot.trim().length > 0) {
    snapshotSection = `\n\n## Estado actual del hogar\n${ctx.snapshot}`;
  }

  let recentMessagesSection = "";
  if (ctx?.history && ctx.history.trim().length > 0) {
    recentMessagesSection = `\n\n## Contexto de conversación reciente\n${ctx.history}`;
  }

  let preferencesSection = "";
  const prefs = ctx?.preferences;
  if (prefs) {
    const lines: string[] = [];
    if (prefs.favoriteRecipes?.length)
      lines.push(`- Recetas favoritas: ${prefs.favoriteRecipes.join(", ")}`);
    if (prefs.dislikedIngredients?.length)
      lines.push(
        `- Ingredientes que no le gustan: ${prefs.dislikedIngredients.join(", ")}`,
      );
    if (prefs.dietaryRestrictions?.length)
      lines.push(
        `- Restricciones alimentarias: ${prefs.dietaryRestrictions.join(", ")}`,
      );
    if (prefs.preferredMeals?.length)
      lines.push(`- Comidas preferidas: ${prefs.preferredMeals.join(", ")}`);
    if (lines.length > 0) {
      preferencesSection = `\n\n## Preferencias del usuario\n${lines.join("\n")}`;
    }
  }

  let insightsSection = "";
  if (insights && insights.activePatterns > 0) {
    const recipeList = insights.topRecipesNeedingAdjustment.length
      ? insights.topRecipesNeedingAdjustment.join(", ")
      : "ninguna";
    insightsSection = `\n\n## Aprendizajes recientes (basado en ${insights.totalFeedbacks} feedbacks)\n- Recetas que necesitan ajuste de porciones: ${recipeList}\n- Patrones activos detectados: ${insights.activePatterns}`;
  }

  let moodPatternsSection = "";
  if (opts?.moodPatterns && opts.moodPatterns.trim().length > 0) {
    moodPatternsSection = `\n\n${opts.moodPatterns}`;
  }

  return `Eres el asistente de ${familyName}${locationSuffix}. Ayudas con consultas sobre recetas, menú, inventario y tareas.

## REGLA: SIEMPRE USA LAS FUNCIONES
- "¿Qué hay de comer?" → get_today_menu()
- "¿Cómo hago X receta?" → get_recipe_details(recipe_name)
- "¿Qué tengo en la despensa?" → get_inventory()
- "Lista de compras" → get_shopping_list()
- "Tareas de hoy" → get_today_tasks()

## DATOS DEL HOGAR
- Hogar: ${familyName}
- Porciones totales: 5 por receta
- Viernes/Sábado: Sin cena${opts?.cookingStyle ? `\n- Estilo: ${opts.cookingStyle}` : ""}${opts?.familySize ? `\n- Miembros: ${opts.familySize}` : ""}

## FORMATO
- Sé amigable y conciso
- Usa 1-2 emojis por respuesta
- Respuestas claras y organizadas${snapshotSection}${recentMessagesSection}${preferencesSection}${insightsSection}${moodPatternsSection}

NOTA: Este chat es solo para CONSULTAS. Para acciones (crear, modificar, eliminar), indica al usuario que use el chat principal.`;
}

// ============================================
// HELPER: Detectar función requerida
// ============================================

function detectRequiredFunction(
  message: string,
): { name: string; args: Record<string, unknown> } | null {
  const msg = message.toLowerCase();

  if (
    msg.includes("qué hay") ||
    msg.includes("que hay") ||
    msg.includes("almuerzo") ||
    msg.includes("cena") ||
    msg.includes("desayuno") ||
    msg.includes("menú del día")
  ) {
    return { name: "get_today_menu", args: {} };
  }

  if (
    (msg.includes("cómo") || msg.includes("como")) &&
    (msg.includes("hago") || msg.includes("preparo") || msg.includes("hacer"))
  ) {
    const patterns = [
      /cómo (?:hago|preparo|hacer|preparar) (?:una?|el|la|los|las)?\s*(.+)/i,
      /como (?:hago|preparo|hacer|preparar) (?:una?|el|la|los|las)?\s*(.+)/i,
    ];
    for (const pattern of patterns) {
      const match = msg.match(pattern);
      if (match) {
        return {
          name: "get_recipe_details",
          args: { recipe_name: match[1].trim().replace(/\?$/, "") },
        };
      }
    }
    return { name: "search_recipes", args: { query: msg } };
  }

  if (
    msg.includes("inventario") ||
    msg.includes("despensa") ||
    msg.includes("qué tengo")
  ) {
    return { name: "get_inventory", args: {} };
  }

  if (
    msg.includes("lista de compras") ||
    msg.includes("que comprar") ||
    msg.includes("qué comprar")
  ) {
    return { name: "get_shopping_list", args: {} };
  }

  if (
    msg.includes("tarea") ||
    msg.includes("pendiente") ||
    msg.includes("yolima")
  ) {
    return { name: "get_today_tasks", args: {} };
  }

  if (
    msg.includes("sugiér") ||
    msg.includes("sugier") ||
    msg.includes("qué puedo cocinar")
  ) {
    return { name: "suggest_recipe", args: {} };
  }

  if (msg.includes("semana") && msg.includes("menú")) {
    return { name: "get_week_menu", args: {} };
  }

  return null;
}

// ============================================
// API ROUTE - ENDPOINT SIMPLIFICADO
// ============================================

export async function POST(request: NextRequest) {
  logger.info("[AI Chat Simple] POST request received");

  try {
    // Authenticate the user first
    const authClient = await createAuthenticatedClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Rate limiting - use authenticated user ID
    const userId =
      user.id || request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = await withRateLimit(userId, "ai-chat");

    if (!rateLimit.allowed) {
      return NextResponse.json(rateLimit.response, {
        status: 429,
        headers: rateLimit.headers,
      });
    }

    // Parse and validate request body with Zod
    let validatedBody;
    try {
      const rawBody = await request.json();
      validatedBody = ChatRequestSchema.parse(rawBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Datos de entrada inválidos",
            details: validationError.issues.map(
              (e) => `${e.path.join(".")}: ${e.message}`,
            ),
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Error parsing request body" },
        { status: 400 },
      );
    }

    const {
      messages,
      stream = false,
      householdId,
      conversationContext,
    } = validatedBody;

    // Fetch cooking profile, learning insights, and mood patterns in parallel
    // getLearningInsights is imported dynamically to avoid top-level env access at build time
    const [cookingProfile, learningInsights, moodPatterns] = await Promise.all([
      getCookingProfile(householdId),
      import("@/lib/feedback-learning")
        .then((m) => m.getLearningInsights())
        .catch(() => null),
      householdId
        ? getHouseholdMoodPatterns(householdId).catch(() => null)
        : Promise.resolve(null),
    ]);
    const familyName = getFamilyDisplayName(cookingProfile);
    const dynamicSystemPrompt = buildChatSystemPrompt({
      familyName,
      city: cookingProfile.city,
      cookingStyle: cookingProfile.cooking_style,
      familySize: cookingProfile.family_size,
      conversationContext: conversationContext as
        | ConversationContextPayload
        | undefined,
      learningInsights: learningInsights ?? undefined,
      moodPatterns: formatMoodPatternsForPrompt(moodPatterns),
    });

    const gemini = getGeminiClient();
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Convertir mensajes al formato Gemini
    const geminiMessages = messages.map((msg: MessageWithImage) => {
      const parts: Array<
        { text: string } | { inlineData: { data: string; mimeType: string } }
      > = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.image) parts.push(base64ToGeminiFormat(msg.image));
      return {
        role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
        parts,
      };
    });

    // Llamar a Gemini con funciones de consulta
    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: geminiMessages,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        systemInstruction: dynamicSystemPrompt,
        tools: [{ functionDeclarations: queryFunctions }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter((part) => part.functionCall);

    // Si no hay llamadas a funciones, verificar si debería haber una
    if (functionCalls.length === 0) {
      const detected = detectRequiredFunction(lastUserMessage);

      if (detected) {
        logger.info(`[AI Chat Simple] Forcing function: ${detected.name}`);
        const result = await executeQueryFunction(detected.name, detected.args);

        // Generar respuesta basada en el resultado
        const followUp = await gemini.models.generateContent({
          model: GEMINI_MODELS.FLASH,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Usuario preguntó: "${lastUserMessage}"\n\nResultado de ${detected.name}:\n${JSON.stringify(result, null, 2)}\n\nResponde de forma útil y amigable.`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            systemInstruction: dynamicSystemPrompt,
          },
        });

        const content =
          followUp.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No pude obtener la información.";

        if (stream) {
          return new Response(
            `data: ${JSON.stringify({ type: "content", content })}\n\ndata: ${JSON.stringify({ type: "done", done: true })}\n\n`,
            {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
              },
            },
          );
        }

        return NextResponse.json({ content, role: "assistant" });
      }

      // Respuesta directa sin función
      const textResponse =
        parts.find((part) => part.text)?.text ||
        "Hola, ¿en qué puedo ayudarte con el menú, recetas o tareas del hogar?";

      if (stream) {
        return new Response(
          `data: ${JSON.stringify({ type: "content", content: textResponse })}\n\ndata: ${JSON.stringify({ type: "done", done: true })}\n\n`,
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            },
          },
        );
      }

      return NextResponse.json({ content: textResponse, role: "assistant" });
    }

    // Ejecutar funciones llamadas
    const functionResponses = [];
    for (const part of functionCalls) {
      const fc = part.functionCall!;
      const result = await executeQueryFunction(
        fc.name!,
        (fc.args as Record<string, unknown>) || {},
      );
      functionResponses.push({
        functionResponse: { name: fc.name, response: result },
      });
    }

    // Obtener respuesta final
    const finalResponse = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [
        ...geminiMessages,
        { role: "model" as const, parts: parts },
        { role: "user" as const, parts: functionResponses },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        systemInstruction: dynamicSystemPrompt,
      },
    });

    const finalContent =
      finalResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No pude procesar tu solicitud.";

    if (stream) {
      return new Response(
        `data: ${JSON.stringify({ type: "content", content: finalContent })}\n\ndata: ${JSON.stringify({ type: "done", done: true })}\n\n`,
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        },
      );
    }

    return NextResponse.json({ content: finalContent, role: "assistant" });
  } catch (error) {
    logger.error("[AI Chat Simple] Error", {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
