/**
 * Generación de TEXTO agnóstica de proveedor.
 *
 * Enruta a DeepSeek (V4) cuando está configurado, con fallback automático a
 * Gemini si DeepSeek falla. La visión y la generación de imágenes NO pasan por
 * aquí — esas se quedan en Gemini directamente.
 *
 * Control por env:
 *   AI_TEXT_PROVIDER = "deepseek" | "gemini"  (default: deepseek si hay API key)
 *
 * Las rutas siguen parseando/ validando el JSON resultante con Zod como antes;
 * este helper solo devuelve el string crudo del modelo.
 */

import {
  getGeminiClient,
  GEMINI_MODELS,
  geminiWithRetry,
} from "@/lib/gemini/client";
import {
  hasDeepSeek,
  deepseekChatWithRetry,
  DEEPSEEK_MODELS,
} from "@/lib/deepseek/client";
import { logger } from "@/lib/logger";

interface GenerateTextOptions {
  /** Instrucción de sistema (rol/contexto). */
  system?: string;
  /** Prompt del usuario. */
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Pedir salida JSON (ambos proveedores la soportan). */
  json?: boolean;
}

function resolveProvider(): "deepseek" | "gemini" {
  const explicit = process.env.AI_TEXT_PROVIDER?.toLowerCase();
  if (explicit === "gemini") return "gemini";
  if (explicit === "deepseek") return "deepseek";
  return hasDeepSeek() ? "deepseek" : "gemini";
}

/** Genera texto (típicamente JSON) usando el proveedor configurado. */
export async function generateText(opts: GenerateTextOptions): Promise<string> {
  const {
    system,
    prompt,
    temperature = 0.7,
    maxTokens = 2500,
    json = true,
  } = opts;
  const provider = resolveProvider();

  if (provider === "deepseek" && hasDeepSeek()) {
    try {
      const messages = system
        ? [
            { role: "system" as const, content: system },
            { role: "user" as const, content: prompt },
          ]
        : [{ role: "user" as const, content: prompt }];
      // FLASH por defecto: las rutas de generación tienen límite de 30s en
      // Vercel y PRO (reasoning) tarda ~60s y trunca el JSON. Override con
      // DEEPSEEK_MODEL_TEXT si se quiere otro. Subimos el piso de tokens para
      // dejar espacio al reasoning y evitar JSON truncado.
      const model = process.env.DEEPSEEK_MODEL_TEXT ?? DEEPSEEK_MODELS.FLASH;
      return await deepseekChatWithRetry({
        model,
        messages,
        temperature,
        maxTokens: Math.max(maxTokens, 4000),
        json,
      });
    } catch (err) {
      // Fallback a Gemini para no romper la feature si DeepSeek falla.
      logger.warn("[AI] DeepSeek falló, usando Gemini como fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Gemini (default o fallback)
  const gemini = getGeminiClient();
  const text = system ? `${system}\n\n${prompt}` : prompt;
  const response = await geminiWithRetry(() =>
    gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  );
  return response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
