---
name: gemini-function-calling
description: "Patrones de IA en recetario-app: DeepSeek primario + Gemini fallback/vision, function calling, modelos, retry, sanitizacion, risk levels. Incluye la topologia real de endpoints."
globs:
  - "src/app/api/ai-assistant/**"
  - "src/lib/gemini/**"
  - "src/lib/ai/**"
  - "src/lib/ai-assistant/**"
---

# Function Calling Patterns (DeepSeek + Gemini)

## ⚠️ Topologia real de endpoints (verificado 2026-07-27)

Antes de escribir codigo aqui, saber que hay **dos chats en paralelo** y solo
uno esta conectado a la UI:

- `/api/ai-assistant/chat` → **VIVO**. Tools: array propio `queryFunctions`
  (linea 79), **20 tools read-only**. Lo llama `useAIChat.ts:205`.
- `/api/ai-assistant` (raiz) → **HUERFANO**. Usa `declarations.ts` (48 tools con
  mutaciones) + `orchestrator.ts` + propuestas. **Ningun cliente lo llama.**
- `/api/ai-assistant/execute` → vivo, pero nadie crea propuestas que ejecutar.

Consecuencia practica: **agregar una tool a `declarations.ts` no hace nada.**
Si la tool debe estar disponible para el usuario hoy, hay que declararla en
`queryFunctions` de `chat/route.ts` Y en el dispatcher `executeQueryFunction`
del mismo archivo. Ver `.claude/agents/gemini-orchestrator.md` para el detalle.

El "SSE streaming" de `chat/route.ts` tampoco es streaming real: emite un unico
evento `data:` con la respuesta ya completa.

## Modelos Reales en Uso

Fuente de verdad: `src/lib/gemini/client.ts` y `src/lib/deepseek/client.ts`.
Todos son overridables por env var.

| Modelo                     | Uso                                    | Proveedor |
| -------------------------- | -------------------------------------- | --------- |
| `deepseek-v4-flash`        | **Texto y tool-calling PRIMARIO**      | DeepSeek  |
| `gemini-3.5-flash`         | Fallback de texto + tool-calling       | Gemini    |
| `gemini-2.5-flash-image`   | Texto + generacion de imagenes         | Gemini    |
| `gemini-2.5-pro`           | Alta calidad, razonamiento             | Gemini    |
| `imagen-3.0-generate-002`  | Generacion de imagenes profesional     | Gemini    |

Reglas de routing (`chatProvider()` en `src/lib/ai/chat.ts`):

1. `AI_CHAT_PROVIDER` explicito gana.
2. Si el mensaje trae imagen → **siempre Gemini** (DeepSeek V4 no tiene vision).
3. Si DeepSeek falla en tool-calling → fallback automatico a Gemini.
4. `deepseek-pro` NO usar: timeout >30s y trunca JSON.

## Oportunidad: Gemini Interactions API (GA junio 2026)

`src/lib/ai/chat.ts` evita deliberadamente el formato multi-turno de
tool-results porque "difiere mucho entre Gemini y OpenAI", y por eso hace
seleccion de tools + sintesis en dos llamadas separadas. La Interactions API
resuelve exactamente eso con estado en servidor (`previous_interaction_id`) y
circulacion de contexto entre turnos. Si se reconecta el tool-calling con
mutaciones, evaluarla antes de reimplementar el bucle a mano.

## Cliente Gemini (`src/lib/gemini/client.ts`)

```typescript
import { GoogleGenAI } from '@google/genai';

// Singleton client
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// Modelos (nombres reales, overridables por env — ver GEMINI_MODELS en el cliente)
export const flashModel = genAI.models.get(process.env.GEMINI_MODEL_FLASH ?? 'gemini-3.5-flash');
export const proModel = genAI.models.get(process.env.GEMINI_MODEL_PRO ?? 'gemini-2.5-pro');

// Retry con backoff exponencial
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

// Sanitizacion de input
export function sanitizeUserInput(input: string): string {
  // Detecta patrones peligrosos (prompt injection)
  const DANGEROUS_PATTERNS = [/ignore.*instructions/i, /system.*prompt/i, ...];
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) throw new Error('Suspicious input detected');
  }
  return input.trim();
}

// Wrap user input con delimitadores
export function wrapUserInput(input: string): string {
  return `<user_input>${sanitizeUserInput(input)}</user_input>`;
}
```

## Function Calling Pattern

### 1. Declarar herramienta (`declarations.ts`)

```typescript
export const functionDeclarations = [
  {
    name: "get_today_menu",
    description: "Obtiene el menu del dia actual con recetas y porciones",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
      },
    },
  },
  // ... 50+ herramientas
];
```

### 2. Handler en orchestrator (`orchestrator.ts`)

```typescript
export async function handleFunctionCall(
  name: string,
  args: Record<string, unknown>,
  context: { householdId: string; userId: string },
): Promise<FunctionResult> {
  switch (name) {
    case "get_today_menu":
      return await getTodayMenu(args, context);
    case "swap_menu_recipe":
      return await swapMenuRecipe(args, context);
    // ... routing por nombre
  }
}
```

### 3. Chat con SSE (`chat/route.ts`)

```typescript
// Formato de SSE
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "text", content: "..." })}\n\n`,
      ),
    );
    // ... function calls intermedios
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
    );
    controller.close();
  },
});
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream" },
});
```

## Risk Levels para Herramientas

| Nivel        | Comportamiento            | Ejemplos                          |
| ------------ | ------------------------- | --------------------------------- |
| 1 (LOW)      | Auto-ejecutar             | get_today_menu, get_shopping_list |
| 2 (MEDIUM)   | Ejecutar + Undo           | mark_shopping_item, complete_task |
| 3 (HIGH)     | Requiere confirmacion     | swap_menu_recipe, edit_recipe     |
| 4 (CRITICAL) | Multi-step + confirmacion | bulk_update, delete_data          |

## Rate Limiting (`src/lib/rate-limit.ts`)

```typescript
// Verificar rate limit en API route
const rateLimitResult = await checkRateLimit(userId, "ai-chat", {
  maxRequests: 30,
  windowMs: 60000,
});
if (!rateLimitResult.allowed) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

## Reglas Criticas

1. SIEMPRE usar `wrapUserInput()` para input del usuario
2. SIEMPRE definir risk level para herramientas nuevas
3. Retry con backoff para llamadas a Gemini
4. SSE format: `data: {json}\n\n`
5. Function declarations con JSON schema estricto
6. Rate limiting en todos los endpoints de IA
