/**
 * AI Memory System
 * Handles conversation persistence and context management
 */

import { supabase } from "./supabase/client";
import type { AIRichMessage } from "@/types/ai-messages";

// Types
export interface ConversationMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  rich_content?: AIRichMessage;
  created_at: string;
}

export interface ConversationContext {
  id: string;
  session_id: string;
  context: Record<string, unknown>;
  last_topic: string | null;
  user_preferences: {
    preferredMeals?: string[];
    dietaryRestrictions?: string[];
    favoriteRecipes?: string[];
    dislikedIngredients?: string[];
  };
  updated_at: string;
}

// Session ID management (anchored to householdId when available)
const LEGACY_SESSION_KEY = "ai_session_id";

export function getSessionId(householdId?: string): string {
  if (typeof window === "undefined") return "server";

  if (householdId) {
    // Anchor session to householdId so different households (or tabs) stay isolated
    const key = `ai_session_${householdId}`;
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = `session_${householdId}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, sessionId);
    }
    return sessionId;
  }

  // Fallback: legacy device-scoped session (no household)
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[ai-memory] getSessionId called without householdId — using legacy device session",
    );
  }
  let sessionId = localStorage.getItem(LEGACY_SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(LEGACY_SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function resetSession(householdId?: string): string {
  if (typeof window === "undefined") return "server";

  const key = householdId ? `ai_session_${householdId}` : LEGACY_SESSION_KEY;
  const newSessionId = householdId
    ? `session_${householdId}_${Math.random().toString(36).substr(2, 9)}`
    : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(key, newSessionId);
  return newSessionId;
}

// Conversation message operations
export async function saveMessage(
  role: "user" | "assistant",
  content: string,
  richContent?: AIRichMessage,
  householdId?: string,
): Promise<ConversationMessage | null> {
  const sessionId = getSessionId(householdId);

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      session_id: sessionId,
      role,
      content,
      rich_content: richContent || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving message:", error);
    return null;
  }

  return data;
}

export async function loadConversationHistory(
  limit: number = 20,
  householdId?: string,
): Promise<ConversationMessage[]> {
  const sessionId = getSessionId(householdId);

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error loading conversation:", error);
    return [];
  }

  return data || [];
}

export async function clearConversationHistory(
  householdId?: string,
): Promise<boolean> {
  const sessionId = getSessionId(householdId);

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error clearing conversation:", error);
    return false;
  }

  return true;
}

// Context management
export async function getContext(
  householdId?: string,
): Promise<ConversationContext | null> {
  const sessionId = getSessionId(householdId);

  const { data, error } = await supabase
    .from("ai_context")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows
    console.error("Error getting context:", error);
  }

  return data || null;
}

export async function updateContext(
  updates: Partial<{
    context: Record<string, unknown>;
    last_topic: string;
    user_preferences: ConversationContext["user_preferences"];
  }>,
  householdId?: string,
): Promise<ConversationContext | null> {
  const sessionId = getSessionId(householdId);

  const { data, error } = await supabase
    .from("ai_context")
    .upsert(
      {
        session_id: sessionId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "session_id",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Error updating context:", error);
    return null;
  }

  return data;
}

// Extract topic from message (simple keyword-based)
export function extractTopic(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  const topics: Record<string, string[]> = {
    recetas: ["receta", "cocinar", "preparar", "ingredientes", "plato"],
    menu: ["menú", "menu", "comida del día", "almuerzo", "cena", "desayuno"],
    inventario: ["inventario", "despensa", "tenemos", "hay", "falta", "stock"],
    compras: ["comprar", "mercado", "lista de compras", "supermercado"],
    tareas: ["tarea", "limpieza", "limpiar", "pendiente"],
    sugerencias: ["sugerir", "recomienda", "qué puedo", "ideas"],
  };

  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      return topic;
    }
  }

  return null;
}

// Format conversation history for AI context
export function formatHistoryForAI(
  messages: ConversationMessage[],
  maxMessages: number = 10,
): string {
  const recent = messages.slice(-maxMessages);

  if (recent.length === 0) return "";

  const formatted = recent
    .map((msg) => {
      const role = msg.role === "user" ? "Usuario" : "Asistente";
      // Truncate long messages for context
      const content =
        msg.content.length > 200
          ? msg.content.substring(0, 200) + "..."
          : msg.content;
      return `${role}: ${content}`;
    })
    .join("\n");

  return `\n\n--- Conversación reciente ---\n${formatted}\n--- Fin de conversación ---\n`;
}

// Get summarized context for AI
export async function getAIContext(householdId?: string): Promise<{
  history: string;
  lastTopic: string | null;
  preferences: ConversationContext["user_preferences"];
}> {
  const [messages, context] = await Promise.all([
    loadConversationHistory(10, householdId),
    getContext(householdId),
  ]);

  return {
    history: formatHistoryForAI(messages),
    lastTopic: context?.last_topic || null,
    preferences: context?.user_preferences || {},
  };
}

// Update context based on conversation
export async function updateContextFromMessage(
  message: string,
  role: "user" | "assistant",
  householdId?: string,
): Promise<void> {
  if (role === "user") {
    const topic = extractTopic(message);
    if (topic) {
      await updateContext({ last_topic: topic }, householdId);
    }
  }

  // Extract user preferences from messages
  const lowerMessage = message.toLowerCase();

  if (role === "user") {
    const context = await getContext(householdId);
    const preferences = context?.user_preferences || {};

    // Detect dietary preferences
    if (
      lowerMessage.includes("no me gusta") ||
      lowerMessage.includes("no como")
    ) {
      const disliked = preferences.dislikedIngredients || [];
      // Simple extraction - could be enhanced with NLP
      const words = message.split(/\s+/);
      const noIndex = words.findIndex(
        (w) => w.toLowerCase() === "gusta" || w.toLowerCase() === "como",
      );
      if (noIndex > 0 && noIndex < words.length - 1) {
        const ingredient = words
          .slice(noIndex + 1, noIndex + 3)
          .join(" ")
          .toLowerCase();
        if (!disliked.includes(ingredient)) {
          disliked.push(ingredient);
          await updateContext(
            {
              user_preferences: {
                ...preferences,
                dislikedIngredients: disliked,
              },
            },
            householdId,
          );
        }
      }
    }

    // Detect favorite recipes
    if (
      lowerMessage.includes("me encanta") ||
      lowerMessage.includes("favorit")
    ) {
      const favorites = preferences.favoriteRecipes || [];
      // Could extract recipe name here
      await updateContext(
        {
          user_preferences: { ...preferences, favoriteRecipes: favorites },
        },
        householdId,
      );
    }
  }
}
