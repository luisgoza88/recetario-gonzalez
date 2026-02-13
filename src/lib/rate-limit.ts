/**
 * Rate Limiting Utility
 *
 * Sistema de rate limiting persistente usando Supabase.
 * Funciona correctamente en entornos serverless (Vercel)
 * porque el estado se persiste en la base de datos.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Configuración por defecto para diferentes tipos de acciones
export const RATE_LIMIT_CONFIG = {
  // Generación de recetas con IA
  'generate-recipe': {
    limit: 20,           // 20 requests
    windowMs: 60 * 60 * 1000, // por hora
  },
  // Generación de imágenes (más costoso)
  'generate-image': {
    limit: 10,           // 10 requests
    windowMs: 60 * 60 * 1000, // por hora
  },
  // Escaneo de despensa
  'scan-pantry': {
    limit: 30,           // 30 requests
    windowMs: 60 * 60 * 1000, // por hora
  },
  // Chat con IA
  'ai-chat': {
    limit: 100,          // 100 requests
    windowMs: 60 * 60 * 1000, // por hora
  },
  // Asistente IA (acciones)
  'ai-assistant': {
    limit: 50,           // 50 requests
    windowMs: 60 * 60 * 1000, // por hora
  },
  // Validación de códigos de invitación
  'validate-invitation': {
    limit: 5,            // 5 intentos
    windowMs: 15 * 60 * 1000, // por 15 minutos
  },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMIT_CONFIG;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Verifica si una acción está permitida según el rate limit.
 * Usa la función RPC `check_rate_limit` en Supabase.
 */
export async function checkRateLimit(
  identifier: string,
  action: RateLimitAction,
  customLimit?: number,
  customWindowMs?: number
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[action];
  const limit = customLimit ?? config.limit;
  const windowMs = customWindowMs ?? config.windowMs;
  const key = `${identifier}:${action}`;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error || !data || data.length === 0) {
      // Si falla la BD, permitir la request (fail-open)
      logger.error('[RateLimit] DB error, allowing request', { error: error?.message ? String(error.message) : 'unknown' });
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowMs),
      };
    }

    const row = data[0];
    const resetAt = new Date(row.reset_at);
    const now = Date.now();

    return {
      allowed: row.allowed,
      remaining: Math.max(0, limit - row.current_count),
      resetAt,
      retryAfterMs: row.allowed ? undefined : Math.max(0, resetAt.getTime() - now),
    };
  } catch (err) {
    // Fail-open: si hay error de conexión, no bloquear al usuario
    logger.error('[RateLimit] Exception, allowing request', { error: err instanceof Error ? err.message : String(err) });
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + windowMs),
    };
  }
}

/**
 * Helper para crear respuesta de rate limit exceeded
 */
export function createRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = result.retryAfterMs
    ? Math.ceil(result.retryAfterMs / 1000)
    : 3600;

  return {
    error: 'Rate limit exceeded',
    message: 'Has excedido el límite de solicitudes. Por favor espera antes de intentar de nuevo.',
    retryAfter: retryAfterSeconds,
    resetAt: result.resetAt.toISOString(),
  };
}

/**
 * Middleware helper para aplicar rate limiting en API routes
 */
export async function withRateLimit(
  identifier: string,
  action: RateLimitAction
): Promise<{ allowed: boolean; response?: ReturnType<typeof createRateLimitResponse>; headers: Record<string, string> }> {
  const result = await checkRateLimit(identifier, action);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG[action].limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(Math.ceil((result.retryAfterMs || 0) / 1000));
    return {
      allowed: false,
      response: createRateLimitResponse(result),
      headers,
    };
  }

  return { allowed: true, headers };
}
