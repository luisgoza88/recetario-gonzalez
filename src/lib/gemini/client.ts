import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

// Cliente singleton de Gemini
let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      logger.error('[Gemini] API key not found in environment variables');
      throw new Error('GOOGLE_GEMINI_API_KEY no está configurada en las variables de entorno');
    }

    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

// Modelos disponibles
export const GEMINI_MODELS = {
  // Para texto rápido y económico
  FLASH: 'gemini-2.0-flash',

  // Para texto con generación de imágenes (Nano Banana)
  FLASH_IMAGE: 'gemini-2.0-flash-exp',

  // Para tareas de alta calidad
  PRO: 'gemini-2.0-pro',

  // Para generación de imágenes profesionales (Imagen 3)
  IMAGE_GEN: 'imagen-3.0-generate-002',
} as const;

// Configuraciones comunes
export const GEMINI_CONFIG = {
  // Para generación de recetas
  recipe: {
    temperature: 0.7,
    maxOutputTokens: 2500,
  },

  // Para análisis de imágenes (visión)
  vision: {
    temperature: 0.3,
    maxOutputTokens: 2000,
  },

  // Para asistente conversacional
  assistant: {
    temperature: 0.7,
    maxOutputTokens: 1000,
  },

  // Para parsing de texto (tickets, etc.)
  parsing: {
    temperature: 0.2,
    maxOutputTokens: 2000,
  },
} as const;

// Helper para limpiar respuestas JSON de Gemini
export function cleanJsonResponse(content: string): string {
  let cleaned = content;

  // Remover bloques de código markdown
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // Encontrar el primer { y el último }
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.slice(firstBrace);
  }

  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastBrace + 1);
  }

  // Limpiar caracteres de control y comas finales
  cleaned = cleaned
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .trim();

  return cleaned;
}

// Helper para convertir base64 a formato Gemini
export function base64ToGeminiFormat(base64String: string, mimeType: string = 'image/jpeg') {
  // Si ya tiene el prefijo data:, extraer solo la parte base64
  if (base64String.startsWith('data:')) {
    const parts = base64String.split(',');
    const extractedMime = parts[0].match(/data:(.*?);/)?.[1] || mimeType;
    return {
      inlineData: {
        data: parts[1],
        mimeType: extractedMime,
      },
    };
  }

  return {
    inlineData: {
      data: base64String,
      mimeType,
    },
  };
}

// ============================================
// Retry con Backoff Exponencial
// ============================================

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'RESOURCE_EXHAUSTED',
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'INTERNAL',
    'rate limit',
    'quota exceeded',
    '429',
    '500',
    '502',
    '503',
    '504',
  ],
};

/**
 * Espera un tiempo determinado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica si un error es reintentable
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  const errorString = String(error).toLowerCase();
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

  return retryableErrors.some(
    retryable =>
      errorString.includes(retryable.toLowerCase()) ||
      errorMessage.includes(retryable.toLowerCase())
  );
}

/**
 * Ejecuta una función con retry y backoff exponencial
 *
 * @param fn - Función asíncrona a ejecutar
 * @param options - Opciones de retry
 * @returns Resultado de la función
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si es el último intento o el error no es reintentable, lanzar
      if (attempt === opts.maxRetries || !isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      // Log del retry (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        logger.info(
          `[Gemini Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms...`,
          { error: error instanceof Error ? error.message : String(error) }
        );
      }

      // Esperar antes del siguiente intento
      await sleep(delay);

      // Incrementar delay con backoff exponencial (con jitter)
      const jitter = Math.random() * 0.3 + 0.85; // 0.85 - 1.15
      delay = Math.min(delay * opts.backoffMultiplier * jitter, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Wrapper para llamadas a Gemini con retry automático
 *
 * @example
 * const response = await geminiWithRetry(() =>
 *   gemini.models.generateContent({...})
 * );
 */
export async function geminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return withRetry(fn, { maxRetries });
}

// ============================================
// Sanitización de Prompts (Prevención de Injection)
// ============================================

/**
 * Patrones peligrosos que podrían indicar un intento de prompt injection
 */
const DANGEROUS_PATTERNS = [
  // Intentos de cambiar el rol/personalidad
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /forget\s+(everything|all|your)\s+(instructions?|training)/i,
  /you\s+are\s+now\s+(?:a|an|the)\s+/i,
  /act\s+as\s+(?:a|an|if)/i,
  /pretend\s+(?:to\s+be|you\s+are)/i,
  /new\s+(?:instructions?|persona|role)/i,

  // Intentos de revelar información del sistema
  /(?:show|reveal|tell|display)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?)/i,
  /what\s+(?:are|were)\s+your\s+(?:original\s+)?instructions?/i,

  // Inyección de comandos/código
  /```(?:bash|sh|shell|cmd|powershell|python|javascript|js)/i,
  /\$\{.*\}/,  // Template literals
  /eval\s*\(/i,
  /exec\s*\(/i,
  /system\s*\(/i,

  // Intentos de manipulación
  /(?:do\s+not|don't)\s+(?:follow|obey)/i,
  /override\s+(?:your|the)\s+(?:rules?|instructions?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
];

/**
 * Patrones para limpiar del input del usuario
 */
const SANITIZATION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Remover caracteres de control
  { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, replacement: '' },

  // Normalizar múltiples espacios/newlines
  { pattern: /\n{3,}/g, replacement: '\n\n' },
  { pattern: / {3,}/g, replacement: '  ' },

  // Escapar caracteres especiales de markdown que podrían usarse maliciosamente
  { pattern: /^#{4,}/gm, replacement: '####' },  // Limitar niveles de heading
];

/**
 * Verifica si un texto contiene patrones de prompt injection
 *
 * @param text - Texto a verificar
 * @returns true si se detecta un patrón peligroso
 */
export function detectsPromptInjection(text: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Sanitiza el input del usuario para prevenir prompt injection
 *
 * @param userInput - Input del usuario a sanitizar
 * @param maxLength - Longitud máxima permitida (default: 5000)
 * @returns Input sanitizado
 */
export function sanitizeUserInput(userInput: string, maxLength: number = 5000): string {
  let sanitized = userInput;

  // Aplicar patrones de sanitización
  for (const { pattern, replacement } of SANITIZATION_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Truncar si excede el límite
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  return sanitized.trim();
}

/**
 * Prepara el input del usuario de forma segura para incluirlo en un prompt
 *
 * @param userInput - Input del usuario
 * @param options - Opciones de sanitización
 * @returns Objeto con el input sanitizado y si se detectó injection
 */
export function prepareUserInput(
  userInput: string,
  options?: {
    maxLength?: number;
    allowMarkdown?: boolean;
    throwOnInjection?: boolean;
  }
): { sanitized: string; possibleInjection: boolean } {
  const { maxLength = 5000, throwOnInjection = false } = options || {};

  const possibleInjection = detectsPromptInjection(userInput);

  if (possibleInjection && throwOnInjection) {
    throw new Error('Posible intento de prompt injection detectado');
  }

  const sanitized = sanitizeUserInput(userInput, maxLength);

  return { sanitized, possibleInjection };
}

/**
 * Envuelve el input del usuario en delimitadores claros para el modelo
 *
 * Esto ayuda al modelo a distinguir entre instrucciones del sistema
 * y contenido del usuario.
 *
 * @param userInput - Input del usuario (ya sanitizado)
 * @returns Input envuelto en delimitadores
 */
export function wrapUserInput(userInput: string): string {
  return `<user_input>\n${userInput}\n</user_input>`;
}
