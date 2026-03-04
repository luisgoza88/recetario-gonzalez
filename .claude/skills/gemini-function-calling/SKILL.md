---
name: gemini-function-calling
description: "Patrones de Google Gemini AI en recetario-app: function calling, streaming SSE, modelos, retry, sanitizacion, risk levels."
globs:
  - "src/app/api/ai-assistant/**"
  - "src/lib/gemini/**"
  - "src/lib/ai/**"
  - "src/lib/ai-assistant/**"
---

# Gemini Function Calling Patterns

## Modelos Disponibles

| Modelo                    | Uso                            | Costo |
| ------------------------- | ------------------------------ | ----- |
| `gemini-2.0-flash`        | Texto rapido, function calling | Bajo  |
| `gemini-2.0-flash-exp`    | Texto + generacion imagenes    | Medio |
| `gemini-2.0-pro`          | Alta calidad, razonamiento     | Alto  |
| `imagen-3.0-generate-002` | Generacion de imagenes         | Alto  |

## Cliente Gemini (`src/lib/gemini/client.ts`)

```typescript
import { GoogleGenAI } from '@google/genai';

// Singleton client
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// Modelos
export const flashModel = genAI.models.get('gemini-2.0-flash');
export const proModel = genAI.models.get('gemini-2.0-pro');

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
