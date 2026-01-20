import { GoogleGenAI } from '@google/genai';

// Cliente singleton de Gemini
let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Gemini] API key not found in environment variables');
      throw new Error('GOOGLE_GEMINI_API_KEY no está configurada en las variables de entorno');
    }

    console.log('[Gemini] Initializing client with API key:', apiKey.substring(0, 10) + '...');
    geminiClient = new GoogleGenAI({ apiKey });
    console.log('[Gemini] Client initialized successfully');
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
