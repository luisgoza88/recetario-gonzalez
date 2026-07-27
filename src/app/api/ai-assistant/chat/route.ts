import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FunctionDeclaration, Type } from "@google/genai";
import { selectTools, type ChatMessageInput } from "@/lib/ai/chat";
import { generateText } from "@/lib/ai/generate";
import { withRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { createAuthenticatedClient } from "@/lib/supabase/server";
import {
  requireHouseholdMembership,
  forbiddenResponse,
} from "@/lib/api/auth";
// Reconexión de escrituras: el catálogo completo de tools y el orchestrator
// que ya sabía despacharlas, ejecutarlas con audit log y proponerlas.
import { functionDeclarations } from "../functions";
import {
  executeFunctionWithLogging,
  createFunctionProposal,
} from "../orchestrator";
import {
  isWriteFunction,
  partitionCalls,
  needsHumanApproval,
} from "../write-gate";
import { generateSessionId } from "@/lib/ai/ai-command-service";
import { getToolDescription } from "@/lib/ai-assistant/constants";
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
 * ENDPOINT ÚNICO DEL ASISTENTE
 *
 * Maneja consultas Y acciones. Es el único endpoint de chat: `/api/ai-assistant`
 * (la ruta raíz) quedó obsoleta y fue eliminada — durante meses estuvo huérfana
 * y por eso el bot no podía ejecutar nada.
 *
 * Flujo:
 *   1. Auth + rate limit + verificación de membresía del hogar.
 *   2. `selectTools()` con consultas + escrituras (estas últimas solo si hay
 *      un householdId verificado).
 *   3. Las escrituras pasan por `write-gate.ts`: riesgo alto o destructivo →
 *      propuesta con aprobación humana; riesgo bajo → ejecución con audit log
 *      y undo.
 *   4. Síntesis final del texto con el proveedor de turno.
 *
 * Al agregar una tool nueva: declararla en `functions/declarations.ts` y, si
 * modifica datos, registrarla en `WRITE_FUNCTIONS` de `write-gate.ts` con su
 * risk level. Las consultas se declaran en `queryFunctions` de este archivo.
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
// FUNCIONES DE ESCRITURA
// ============================================

/**
 * Tools que modifican datos, tomadas del catálogo canónico
 * (`functions/declarations.ts`) y filtradas por la lista explícita de
 * `write-gate.ts`. No se redeclaran aquí a mano: así el schema de una mutación
 * vive en UN solo lugar y no se desincroniza.
 *
 * Solo se ofrecen cuando hay `householdId` verificado — sin hogar no hay a
 * quién auditar ni a quién pedirle aprobación.
 */
const writeFunctions: FunctionDeclaration[] = functionDeclarations.filter((d) =>
  d.name ? isWriteFunction(d.name) : false,
);

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

  const now = new Date();
  const monthName = now.toLocaleDateString("es-CO", { month: "long" });
  const weekday = now.toLocaleDateString("es-CO", { weekday: "long" });

  return `Eres el asistente de cocina y hogar de ${familyName}${locationSuffix}. Hoy es ${weekday}, ${now.toLocaleDateString("es-CO")} (${monthName}).

## REGLA 1: NUNCA INVENTES — USA LAS FUNCIONES
Si la respuesta depende de datos del hogar, llama la función. No adivines.
- "¿Qué hay de comer?" → get_today_menu()
- "¿Cómo hago X?" → get_recipe_details(recipe_name)
- "¿Qué tengo?" → get_inventory()
- "Lista de compras" → get_shopping_list()
- "Tareas de hoy" → get_today_tasks()
- "¿Qué me falta para X?" → get_missing_ingredients(recipe_name)

## REGLA 2: PUEDES ACTUAR, NO SOLO RESPONDER
Tienes funciones que MODIFICAN datos: agregar a la lista de compras, cambiar
una comida del menú, actualizar inventario, completar tareas, crear recetas,
programar tareas. Úsalas cuando el usuario lo pida.

Las acciones delicadas (eliminar algo, operaciones masivas) generan una
propuesta que el usuario aprueba antes de ejecutarse — eso es automático, tú
solo llama la función. Nunca digas que no puedes hacer cambios.

## REGLA 3: SÉ PROACTIVO CON LO QUE LA APP SABE HACER
Cuando venga al caso, ofrece estas capacidades — el usuario a menudo no sabe
que existen:
- **Escanear la despensa** con la cámara para actualizar el inventario de golpe
- **Escanear la factura** del mercado para registrar precios y stock
- **Generar el menú de la semana** completo según lo que hay y la temporada
- **Adaptar cualquier receta a Thermomix**
- **Sustituir un ingrediente** que falta por otro que sí hay
- **Ver qué está en cosecha** este mes en Colombia (sale más barato y mejor)
- **Ajustar porciones** de una receta al número de comensales

## CONTEXTO COLOMBIANO
Cocinas para un hogar en Colombia. Usa nombres locales de ingredientes
(cebolla cabezona, cebolla larga, cilantro, panela, plátano maduro/verde,
guascas, ají dulce, color/achiote, arracacha, yuca, costeño, campesino).
Mide en gramos, libras y tazas. Precios en pesos colombianos.
Estamos en ${monthName}: si mencionas frutas o verduras, prioriza lo de cosecha.
Considera pisos térmicos: no es lo mismo cocinar en Medellín que en la costa.

## DATOS DEL HOGAR
- Hogar: ${familyName}
- Comensales: ${opts?.familySize ?? "no especificado"}
- Viernes y sábado: sin cena (salen a comer)${opts?.cookingStyle ? `\n- Estilo de cocina: ${opts.cookingStyle}` : ""}

## FORMATO
- Amigable y concreto. Nada de párrafos largos.
- 1-2 emojis por respuesta, no más.
- Si listas ingredientes o pasos, usa viñetas.
- Cuando ejecutes una acción, confirma en una línea qué hiciste.${snapshotSection}${recentMessagesSection}${preferencesSection}${insightsSection}${moodPatternsSection}`;
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

    // ─── Gate cross-tenant ────────────────────────────────────────────────────
    // `householdId` llega del BODY, y tanto getCookingProfile como
    // getHouseholdMoodPatterns usan createServiceRoleClient (bypass de RLS).
    // Sin este chequeo, un usuario autenticado del hogar A podía pasar el UUID
    // del hogar B y recibir su perfil (nombre de familia, ciudad, estilo,
    // tamaño) y 90 días de patrones de ánimo inyectados en el system prompt —
    // y luego pedirle al bot que se los repitiera.
    if (householdId) {
      const isMember = await requireHouseholdMembership(householdId);
      if (!isMember) {
        return forbiddenResponse("No perteneces a este hogar");
      }
    }

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
        ConversationContextPayload | undefined,
      learningInsights: learningInsights ?? undefined,
      moodPatterns: formatMoodPatternsForPrompt(moodPatterns),
    });

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Mensajes normalizados para el adaptador agnóstico de proveedor
    const chatMessages: ChatMessageInput[] = messages.map(
      (msg: MessageWithImage) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content || "",
        image: msg.image,
      }),
    );

    // Herramientas disponibles: consultas siempre; escrituras solo con un
    // hogar ya verificado arriba (si no, no hay contexto de auditoría válido).
    const availableTools = householdId
      ? [...queryFunctions, ...writeFunctions]
      : queryFunctions;

    // Selección de herramientas (DeepSeek con fallback Gemini)
    const selection = await selectTools({
      system: dynamicSystemPrompt,
      messages: chatMessages,
      tools: availableTools,
      temperature: 0.7,
      maxTokens: 1000,
    });
    const assistantText = selection.text;
    const functionCalls = selection.toolCalls;

    // Si no hay llamadas a funciones, verificar si debería haber una
    if (functionCalls.length === 0) {
      const detected = detectRequiredFunction(lastUserMessage);

      if (detected) {
        logger.info(`[AI Chat Simple] Forcing function: ${detected.name}`);
        const result = await executeQueryFunction(detected.name, detected.args);

        // Generar respuesta basada en el resultado (DeepSeek/Gemini)
        const content =
          (await generateText({
            system: dynamicSystemPrompt,
            prompt: `Usuario preguntó: "${lastUserMessage}"\n\nResultado de ${detected.name}:\n${JSON.stringify(result, null, 2)}\n\nResponde de forma útil y amigable.`,
            json: false,
            temperature: 0.7,
            maxTokens: 1000,
          })) || "No pude obtener la información.";

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
        assistantText ||
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

    // ─── Separar lecturas de escrituras ──────────────────────────────────────
    const { reads, writes } = partitionCalls(functionCalls);

    // ─── Compuerta de escritura ──────────────────────────────────────────────
    // Si el modelo pidió modificar algo, decide si se ejecuta con auditoría o
    // si hay que pedirle permiso al humano. La propuesta se devuelve como JSON
    // (no SSE) a propósito: el cliente ya distingue por content-type y su rama
    // JSON sabe manejar `data.proposal` → `onProposal()`.
    const sessionId = generateSessionId();
    if (writes.length > 0 && householdId) {
      const needsApproval = await needsHumanApproval(writes, householdId);

      if (needsApproval) {
        const proposal = await createFunctionProposal(
          writes.map((w) => ({ name: w.name, args: w.args || {} })),
          { householdId, userId: user.id, sessionId },
        );

        logger.info("[AI Chat] Propuesta creada", {
          proposalId: proposal.proposalId,
          actions: proposal.actions.length,
          riskLevel: proposal.riskLevel,
        });

        return NextResponse.json({
          type: "proposal",
          content: `He preparado un plan que requiere tu aprobación:\n\n**${proposal.summary}**\n\nIncluye ${proposal.actions.length} acción(es) que modificarán datos. ¿Quieres que lo ejecute?`,
          role: "assistant",
          proposal,
          sessionId,
        });
      }
    }

    // ─── Ejecutar ────────────────────────────────────────────────────────────
    // Lecturas: directas. Escrituras de riesgo bajo (ya pasaron la compuerta):
    // con audit log y undo vía executeFunctionWithLogging.
    //
    // `onEvent` permite que el modo streaming emita tool_start/tool_result a
    // medida que cada función corre. El cliente ya sabe pintarlos
    // (useAIChat.ts, casos "tool_start"/"tool_result"); hasta ahora el servidor
    // nunca los mandaba y el indicador de herramientas jamás se encendía.
    type ToolEvent = Record<string, unknown>;
    const executionMetadata: Array<{
      functionName: string;
      auditLogId?: string;
      canUndo: boolean;
    }> = [];

    const runCalls = async (
      onEvent?: (event: ToolEvent) => void,
    ): Promise<string[]> => {
      const results: string[] = [];

      for (const fc of [...reads, ...writes]) {
        const isWrite = isWriteFunction(fc.name);
        onEvent?.({
          type: "tool_start",
          tool: {
            name: fc.name,
            description: getToolDescription(fc.name),
            args: fc.args,
          },
        });

        try {
          if (!isWrite) {
            const result = await executeQueryFunction(fc.name, fc.args || {});
            results.push(
              `${fc.name}:\n${JSON.stringify(result, null, 2).slice(0, 4000)}`,
            );
            onEvent?.({
              type: "tool_result",
              tool: { name: fc.name },
              result: { success: true },
            });
            continue;
          }

          if (!householdId) {
            results.push(
              `${fc.name}: no ejecutada — se requiere un hogar activo para modificar datos.`,
            );
            onEvent?.({
              type: "tool_result",
              tool: { name: fc.name },
              result: { success: false, summary: "Sin hogar activo" },
            });
            continue;
          }

          const execution = await executeFunctionWithLogging(
            fc.name,
            fc.args || {},
            { householdId, userId: user.id, sessionId },
          );
          results.push(
            `${fc.name} (ejecutada):\n${JSON.stringify(execution.result, null, 2).slice(0, 4000)}`,
          );
          executionMetadata.push({
            functionName: fc.name,
            auditLogId: execution.auditLogId,
            canUndo: execution.canUndo,
          });
          onEvent?.({
            type: "tool_result",
            tool: { name: fc.name },
            result: { success: true },
          });
        } catch (execError) {
          const message =
            execError instanceof Error
              ? execError.message
              : "error desconocido";
          logger.error("[AI Chat] Falló la ejecución de una función", {
            functionName: fc.name,
            isWrite,
            error: message,
          });
          results.push(`${fc.name}: la acción falló — ${message}`);
          onEvent?.({
            type: "tool_result",
            tool: { name: fc.name },
            result: { success: false, summary: message },
          });
        }
      }

      return results;
    };

    const synthesisPrompt = (results: string[]) =>
      `El usuario dijo: "${lastUserMessage}"\n\nResultados:\n${results.join("\n\n")}\n\nResponde de forma útil, amigable y breve basándote en estos resultados. Si alguna acción se ejecutó, confírmalo explícitamente. Si alguna falló, dilo con claridad. No inventes datos que no estén en los resultados.`;

    if (stream) {
      const encoder = new TextEncoder();
      const send = (
        controller: ReadableStreamDefaultController,
        event: ToolEvent,
      ) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const results = await runCalls((event) => send(controller, event));

            const content =
              (await generateText({
                system: dynamicSystemPrompt,
                prompt: synthesisPrompt(results),
                json: false,
                temperature: 0.7,
                maxTokens: 1000,
              })) || "No pude procesar tu solicitud.";

            send(controller, { type: "content", content });
            send(controller, {
              type: "done",
              done: true,
              sessionId,
              ...(executionMetadata.length > 0 && {
                executionMetadata: {
                  actionsExecuted: executionMetadata.length,
                  undoAvailable: executionMetadata.some((m) => m.canUndo),
                  undoableActions: executionMetadata
                    .filter((m) => m.canUndo)
                    .map((m) => ({
                      functionName: m.functionName,
                      auditLogId: m.auditLogId,
                    })),
                },
              }),
            });
          } catch (streamError) {
            logger.error("[AI Chat] Error dentro del stream", {
              error:
                streamError instanceof Error
                  ? streamError.message
                  : String(streamError),
            });
            send(controller, {
              type: "content",
              content: "Ocurrió un error procesando tu solicitud.",
            });
            send(controller, { type: "done", done: true });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const results = await runCalls();
    const finalContent =
      (await generateText({
        system: dynamicSystemPrompt,
        prompt: synthesisPrompt(results),
        json: false,
        temperature: 0.7,
        maxTokens: 1000,
      })) || "No pude procesar tu solicitud.";

    return NextResponse.json({
      content: finalContent,
      role: "assistant",
      sessionId,
    });
  } catch (error) {
    logger.error("[AI Chat Simple] Error", {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
