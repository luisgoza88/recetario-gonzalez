/**
 * Cliente DeepSeek (API compatible con OpenAI).
 *
 * Se usa para GENERACIÓN DE TEXTO (recetas, menús, listas, sustituciones).
 * La visión (escaneos, foto→receta, analyze-room) y la generación de imágenes
 * se quedan en Gemini — DeepSeek es solo texto.
 *
 * Activación: si existe DEEPSEEK_API_KEY. Modelo por defecto: deepseek-v4-pro.
 */

import { logger } from "@/lib/logger";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";

export const DEEPSEEK_MODELS = {
  PRO: process.env.DEEPSEEK_MODEL_PRO ?? "deepseek-v4-pro",
  FLASH: process.env.DEEPSEEK_MODEL_FLASH ?? "deepseek-v4-flash",
} as const;

/** True si DeepSeek está configurado (hay API key). */
export function hasDeepSeek(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekChatOptions {
  messages: DeepSeekMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Fuerza salida JSON (response_format json_object). */
  json?: boolean;
  signal?: AbortSignal;
}

interface DeepSeekChoice {
  message?: { content?: string | null };
}
interface DeepSeekResponse {
  choices?: DeepSeekChoice[];
  model?: string;
  usage?: Record<string, number>;
}

/**
 * Llama al endpoint /chat/completions de DeepSeek y devuelve el texto generado.
 * Lanza si la API responde con error o no hay contenido.
 */
export async function deepseekChat(opts: DeepSeekChatOptions): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY no está configurada");
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? DEEPSEEK_MODELS.PRO,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2500,
  };
  if (opts.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `DeepSeek API error ${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek devolvió una respuesta vacía");
  }
  return content;
}

/**
 * Reintento simple con backoff para llamadas a DeepSeek (errores de red / 5xx).
 */
export async function deepseekChatWithRetry(
  opts: DeepSeekChatOptions,
  maxRetries = 2,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await deepseekChat(opts);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /\b(429|500|502|503|504|timeout|network|fetch)\b/i.test(
        msg,
      );
      if (attempt === maxRetries || !retryable) throw err;
      if (process.env.NODE_ENV === "development") {
        logger.info(`[DeepSeek] retry ${attempt + 1}/${maxRetries}: ${msg}`);
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}
