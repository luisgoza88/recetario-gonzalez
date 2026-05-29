/**
 * Tool-calling agnóstico de proveedor para el asistente conversacional.
 *
 * Estrategia robusta (evita el formato multi-turno de tool-results, que difiere
 * mucho entre Gemini y OpenAI):
 *   1) selectTools(): UNA llamada de selección de herramientas. Devuelve el
 *      texto y/o los tool calls que el modelo decidió invocar.
 *   2) La síntesis final la hace el route con generateText() (texto plano,
 *      inyectando los resultados de las funciones como contexto).
 *
 * Proveedor: DeepSeek si AI_CHAT_PROVIDER=deepseek (o default con DEEPSEEK_API_KEY),
 * con FALLBACK automático a Gemini ante cualquier error. Si algún mensaje trae
 * imagen, se usa Gemini (DeepSeek V4 es solo texto, sin visión).
 */

import {
  getGeminiClient,
  GEMINI_MODELS,
  GEMINI_CONFIG,
  base64ToGeminiFormat,
} from "@/lib/gemini/client";
import {
  hasDeepSeek,
  deepseekChatWithRetry,
  DEEPSEEK_MODELS,
} from "@/lib/deepseek/client";
import { FunctionCallingConfigMode, FunctionDeclaration } from "@google/genai";
import { logger } from "@/lib/logger";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
  image?: string; // base64 (data URL o crudo)
}

export interface SelectToolsResult {
  text: string;
  toolCalls: ToolCall[];
  provider: "deepseek" | "gemini";
}

function chatProvider(): "deepseek" | "gemini" {
  const explicit = process.env.AI_CHAT_PROVIDER?.toLowerCase();
  if (explicit === "gemini") return "gemini";
  if (explicit === "deepseek") return "deepseek";
  // default: sigue al text provider
  const text = process.env.AI_TEXT_PROVIDER?.toLowerCase();
  if (text === "gemini") return "gemini";
  return hasDeepSeek() ? "deepseek" : "gemini";
}

/** Convierte FunctionDeclaration[] de Gemini a `tools` de OpenAI (DeepSeek). */
function toOpenAITools(decls: FunctionDeclaration[]) {
  const mapType = (t: unknown): string => {
    const s = String(t).toLowerCase();
    if (s.includes("string")) return "string";
    if (s.includes("number")) return "number";
    if (s.includes("integer")) return "integer";
    if (s.includes("boolean")) return "boolean";
    if (s.includes("array")) return "array";
    if (s.includes("object")) return "object";
    return "string";
  };
  // Limpia un Schema de Gemini a JSON Schema (tipos en minúscula).
  const cleanSchema = (schema: unknown): Record<string, unknown> => {
    if (!schema || typeof schema !== "object") return { type: "object" };
    const s = schema as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    if (s.type) out.type = mapType(s.type);
    if (s.description) out.description = s.description;
    if (s.enum) out.enum = s.enum;
    if (s.properties && typeof s.properties === "object") {
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(s.properties as object)) {
        props[k] = cleanSchema(v);
      }
      out.properties = props;
    }
    if (s.items) out.items = cleanSchema(s.items);
    if (Array.isArray(s.required)) out.required = s.required;
    return out;
  };

  return decls.map((d) => ({
    type: "function" as const,
    function: {
      name: d.name,
      description: d.description ?? "",
      parameters: d.parameters
        ? cleanSchema(d.parameters)
        : { type: "object", properties: {} },
    },
  }));
}

interface DeepSeekToolCallRaw {
  function?: { name?: string; arguments?: string };
}

/**
 * Una llamada de selección de herramientas. El route luego ejecuta los toolCalls
 * (con sus gates de seguridad) y sintetiza la respuesta con generateText().
 */
export async function selectTools(opts: {
  system: string;
  messages: ChatMessageInput[];
  tools: FunctionDeclaration[];
  temperature?: number;
  maxTokens?: number;
}): Promise<SelectToolsResult> {
  const {
    system,
    messages,
    tools,
    temperature = GEMINI_CONFIG.assistant.temperature,
    maxTokens = GEMINI_CONFIG.assistant.maxOutputTokens,
  } = opts;

  const hasImage = messages.some((m) => m.image);
  let provider = chatProvider();
  if (hasImage) provider = "gemini"; // DeepSeek no tiene visión

  // ---- DeepSeek (OpenAI-compatible tool calling) ----
  if (provider === "deepseek" && hasDeepSeek()) {
    try {
      const oaMessages = [
        { role: "system" as const, content: system },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];
      const apiKey = process.env.DEEPSEEK_API_KEY!;
      const res = await fetch(
        `${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL_TEXT ?? DEEPSEEK_MODELS.FLASH,
            messages: oaMessages,
            tools: toOpenAITools(tools),
            tool_choice: "auto",
            temperature,
            max_tokens: Math.max(maxTokens, 4000),
          }),
        },
      );
      if (!res.ok) {
        throw new Error(
          `DeepSeek tools ${res.status}: ${(await res.text()).slice(0, 200)}`,
        );
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message ?? {};
      const rawCalls: DeepSeekToolCallRaw[] = msg.tool_calls ?? [];
      const toolCalls: ToolCall[] = rawCalls
        .filter((c) => c.function?.name)
        .map((c) => {
          let args: Record<string, unknown> = {};
          try {
            args = c.function?.arguments
              ? JSON.parse(c.function.arguments)
              : {};
          } catch {
            args = {};
          }
          return { name: c.function!.name!, args };
        });
      return { text: msg.content ?? "", toolCalls, provider: "deepseek" };
    } catch (err) {
      logger.warn("[AI chat] DeepSeek tool-calling falló, fallback a Gemini", {
        error: err instanceof Error ? err.message : String(err),
      });
      // cae a Gemini
    }
  }

  // ---- Gemini (nativo) ----
  const gemini = getGeminiClient();
  const contents = messages.map((m) => {
    const parts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [];
    if (m.content) parts.push({ text: m.content });
    if (m.image) parts.push(base64ToGeminiFormat(m.image));
    return {
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts,
    };
  });
  const response = await gemini.models.generateContent({
    model: GEMINI_MODELS.FLASH,
    contents,
    config: {
      temperature,
      maxOutputTokens: maxTokens,
      systemInstruction: system,
      tools: [{ functionDeclarations: tools }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
      },
    },
  });
  const respParts = response.candidates?.[0]?.content?.parts || [];
  const toolCalls: ToolCall[] = respParts
    .filter((p) => p.functionCall?.name)
    .map((p) => ({
      name: p.functionCall!.name!,
      args: (p.functionCall!.args as Record<string, unknown>) || {},
    }));
  const text = respParts.find((p) => p.text)?.text || "";
  return { text, toolCalls, provider: "gemini" };
}
