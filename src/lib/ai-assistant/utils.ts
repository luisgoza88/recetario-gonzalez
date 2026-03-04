/**
 * AI Assistant Utilities
 *
 * Funciones de utilidad para el módulo de asistente de IA.
 * Extraídas de route.ts para mejor organización.
 */

import { getToolDescription } from "./constants";

/**
 * Tool stream event for SSE (Server-Sent Events).
 * Extended interface for streaming tool execution progress.
 */
export interface ToolStreamEventExtended {
  type: "tool_start" | "tool_result" | "content" | "done";
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

/**
 * Creates a formatted Server-Sent Event string from a tool stream event.
 *
 * @param event - The tool stream event to serialize
 * @returns Formatted SSE string with "data: " prefix
 */
export function createToolStreamEvent(event: ToolStreamEventExtended): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Creates a tool_start event for SSE streaming.
 *
 * @param name - Function/tool name
 * @param args - Optional function arguments
 * @returns Formatted SSE string
 */
export function createToolStartEvent(
  name: string,
  args?: Record<string, unknown>,
): string {
  return createToolStreamEvent({
    type: "tool_start",
    tool: {
      name,
      description: getToolDescription(name),
      args,
    },
  });
}

/**
 * Creates a tool_result event for SSE streaming.
 *
 * @param success - Whether the tool execution was successful
 * @param summary - Optional summary of the result
 * @returns Formatted SSE string
 */
export function createToolResultEvent(
  success: boolean,
  summary?: string,
): string {
  return createToolStreamEvent({
    type: "tool_result",
    result: { success, summary },
  });
}

/**
 * Creates a content event for SSE streaming.
 *
 * @param content - The text content to stream
 * @returns Formatted SSE string
 */
export function createContentEvent(content: string): string {
  return createToolStreamEvent({
    type: "content",
    content,
  });
}

/**
 * Creates a done event for SSE streaming.
 *
 * @param sessionId - Optional session ID to include
 * @param executionMetadata - Optional execution metadata
 * @returns Formatted SSE string
 */
export function createDoneEvent(
  sessionId?: string,
  executionMetadata?: ToolStreamEventExtended["executionMetadata"],
): string {
  return createToolStreamEvent({
    type: "done",
    done: true,
    sessionId,
    executionMetadata,
  });
}

/**
 * Patterns that indicate invalid or malformed AI responses.
 * These should not be shown to users.
 */
const INVALID_RESPONSE_PATTERNS = [
  /^print\s*\(/i, // Python code
  /^console\.(log|error)/i, // JavaScript code
  /default_api\./i, // Internal API references
  /^import\s+/i, // Import statements
  /^function\s+/i, // Function declarations
  /^class\s+/i, // Class declarations
  /^\s*\{\s*"error"/i, // JSON error objects
  /^```(python|javascript|typescript)/i, // Executable code blocks
];

/**
 * Detects if a response contains code or errors that shouldn't be shown.
 *
 * @param text - Response text to validate
 * @returns true if the response is invalid/malformed
 */
export function isInvalidResponse(text: string): boolean {
  const trimmed = text.trim();
  return INVALID_RESPONSE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Mapping of message patterns to required functions.
 */
interface FunctionRequirement {
  required: boolean;
  suggestedFunction: string | null;
}

/**
 * Detects if a user message REQUIRES calling a function to respond correctly.
 * Returns the suggested function if one is needed.
 *
 * @param userMessage - The user's message to analyze
 * @returns Object with required flag and suggested function name
 */
export function messageRequiresFunction(
  userMessage: string,
): FunctionRequirement {
  const msg = userMessage.toLowerCase();

  // Questions about today's menu/food
  if (
    msg.includes("qué hay") ||
    msg.includes("que hay") ||
    msg.includes("almuerzo") ||
    msg.includes("cena") ||
    msg.includes("desayuno") ||
    msg.includes("comida") ||
    msg.includes("comer hoy") ||
    msg.includes("menú")
  ) {
    return { required: true, suggestedFunction: "get_today_menu" };
  }

  // Questions about specific recipes
  if (
    (msg.includes("cómo") || msg.includes("como")) &&
    (msg.includes("hago") ||
      msg.includes("preparo") ||
      msg.includes("hacer") ||
      msg.includes("preparar"))
  ) {
    return { required: true, suggestedFunction: "get_recipe_details" };
  }

  // Questions about inventory
  if (
    msg.includes("inventario") ||
    msg.includes("despensa") ||
    msg.includes("qué tengo") ||
    msg.includes("que tengo")
  ) {
    return { required: true, suggestedFunction: "get_inventory" };
  }

  // Shopping list
  if (
    msg.includes("lista de compras") ||
    msg.includes("comprar") ||
    msg.includes("falta")
  ) {
    return { required: true, suggestedFunction: "get_shopping_list" };
  }

  // Tasks
  if (
    msg.includes("tarea") ||
    msg.includes("pendiente") ||
    msg.includes("yolima")
  ) {
    return { required: true, suggestedFunction: "get_today_tasks" };
  }

  // Recipe suggestions
  if (
    msg.includes("sugiér") ||
    msg.includes("sugier") ||
    msg.includes("qué puedo cocinar") ||
    msg.includes("que puedo cocinar")
  ) {
    return { required: true, suggestedFunction: "suggest_recipe" };
  }

  return { required: false, suggestedFunction: null };
}

/**
 * Generates a fallback response when there are errors.
 * Provides context-aware defaults based on the user's message.
 *
 * @param userMessage - The user's original message
 * @returns A helpful fallback response
 */
export function getFallbackResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (
    msg.includes("menú") ||
    msg.includes("menu") ||
    msg.includes("almuerzo") ||
    msg.includes("cena") ||
    msg.includes("desayuno")
  ) {
    return "Déjame revisar el menú de hoy. ¿Qué comida te interesa: desayuno, almuerzo o cena?";
  }

  if (
    msg.includes("receta") ||
    msg.includes("cocinar") ||
    msg.includes("preparar") ||
    msg.includes("hacer")
  ) {
    return "Con gusto te ayudo. ¿Qué receta te gustaría preparar?";
  }

  if (
    msg.includes("inventario") ||
    msg.includes("ingredientes") ||
    msg.includes("tengo")
  ) {
    return "Déjame revisar qué ingredientes tienes disponibles. Un momento...";
  }

  if (
    msg.includes("compra") ||
    msg.includes("lista") ||
    msg.includes("mercado")
  ) {
    return "Te ayudo con la lista de compras. ¿Qué necesitas agregar o revisar?";
  }

  return "Hola, soy tu asistente del hogar. Puedo ayudarte con recetas, el menú, inventario o la lista de compras.";
}

/**
 * Calculates the current cycle day based on a date.
 * The menu rotates on a 12-day cycle, excluding Sundays.
 *
 * @param date - The date to calculate for (defaults to today)
 * @returns The cycle day number (1-12)
 */
export function calculateCycleDay(date: Date = new Date()): number {
  const dayOfWeek = date.getDay();
  // Convert to 1-7 where Monday=1, then map to cycle
  return (((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12) + 1;
}

/**
 * Checks if a given date is a weekend day (Friday or Saturday).
 * On weekends, no dinner is prepared (family goes out).
 *
 * @param date - The date to check
 * @returns true if the date is Friday (5) or Saturday (6)
 */
export function isWeekendDinner(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 5 || dayOfWeek === 6;
}

/**
 * Normalizes text for comparison (lowercase, remove accents).
 *
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Simple fuzzy match between two strings.
 * Returns true if either contains the other.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if there's a fuzzy match
 */
export function fuzzyMatch(a: string, b: string): boolean {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  return normA.includes(normB) || normB.includes(normA);
}
