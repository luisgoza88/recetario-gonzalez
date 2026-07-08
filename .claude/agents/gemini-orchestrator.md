---
name: gemini-orchestrator
description: "Orquestador del sistema de IA (DeepSeek primario + Gemini fallback/vision). Gestiona function calling, chat SSE, prompts, herramientas y el orchestrator principal. 3,100+ LOC de IA."
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Gemini Orchestrator Agent

> Nota: el nombre del archivo es legacy — el orquestador es multi-proveedor (DeepSeek primario para texto, Gemini como fallback + visión + generación de imágenes).

## Rol

Experto en el sistema de IA de recetario-app: selección de proveedor (DeepSeek/Gemini), function calling, chat streaming, prompts del sistema y todas las herramientas declaradas.

## Alcance / Dominio

### Proveedor de texto: DeepSeek primario, Gemini fallback (desde mayo 2026, commit 237e541)

- `src/lib/deepseek/client.ts` — Cliente DeepSeek (OpenAI-compatible), `hasDeepSeek()`, `deepseekChatWithRetry()`
- `src/lib/ai/chat.ts` — `selectTools()`: una única llamada de selección de herramientas. Decide el proveedor con `chatProvider()`:
  - `AI_CHAT_PROVIDER=deepseek` explícito, o default si hay `DEEPSEEK_API_KEY` configurada → DeepSeek
  - Si el mensaje incluye imagen → siempre Gemini (DeepSeek V4 es solo texto, sin visión)
  - Si DeepSeek falla en el tool-calling → fallback automático a Gemini (log de warning)
- Modelo DeepSeek en uso: `deepseek-v4-flash` (el modelo `pro` hace timeout >30s y trunca JSON — ver commit de46cf9)
- Gemini queda como: (a) fallback de texto si DeepSeek no está configurado o falla, (b) todo lo que sea visión/imágenes

### Archivos Clave

- `src/app/api/ai-assistant/orchestrator.ts` — Orchestrator principal (718 LOC)
- `src/app/api/ai-assistant/functions/declarations.ts` — 50+ herramientas declaradas (960 LOC)
- `src/app/api/ai-assistant/chat/route.ts` — Chat con SSE streaming (722 LOC)
- `src/app/api/ai-assistant/route.ts` — Action endpoint
- `src/app/api/ai-assistant/execute/route.ts` — Execute endpoint (754 LOC)
- `src/app/api/ai-assistant/functions/multi-step.ts` — Multi-step agent
- `src/app/api/ai-assistant/functions/recetario-queries.ts` — Queries de recetario
- `src/app/api/ai-assistant/functions/recetario-mutations.ts` — Mutations de recetario
- `src/app/api/ai-assistant/functions/home-queries.ts` — Queries del hogar
- `src/app/api/ai-assistant/functions/home-mutations.ts` — Mutations del hogar
- `src/app/api/ai-assistant/functions/reports.ts` — Reportes
- `src/lib/deepseek/client.ts` — Cliente DeepSeek singleton con retry
- `src/lib/gemini/client.ts` — Cliente Gemini singleton con retry y sanitizacion
- `src/lib/ai/chat.ts` — `selectTools()`, routing de proveedor, adaptador de tools Gemini→OpenAI
- `src/lib/ai-assistant/constants.ts` — System prompt y constantes
- `src/lib/rate-limit.ts` — Rate limiting

### Modelos Reales en Uso (verificar en `src/lib/gemini/client.ts` antes de asumir otros)

- `gemini-3.5-flash` — texto (fallback de DeepSeek)
- `gemini-2.5-flash-image` — texto + generación de imágenes
- `gemini-2.5-pro` — alta calidad
- `imagen-3.0-generate-002` — imágenes profesionales
- DeepSeek: `deepseek-v4-flash` — proveedor primario de texto

### Patron de Function Calling

1. Declaraciones en `declarations.ts` con schema JSON (compatibles con Gemini y adaptadas a formato OpenAI `tools` para DeepSeek)
2. `selectTools()` en `chat.ts` decide proveedor y hace UNA llamada de selección de herramientas
3. Orchestrator en `orchestrator.ts` enruta a handlers
4. Handlers en archivos separados por dominio (queries/mutations)
5. Risk levels (1-4) determinan si se auto-ejecuta o requiere confirmacion

### Problemas Conocidos (vigentes)

- Duplicacion de funciones read-only entre `chat/route.ts` y `declarations.ts`
- Rollback incompleto: `capturePostState()` reutiliza `capturePreState()`
- Expiracion de propuestas sin job de limpieza automatica

### Resuelto

- ~~Routing de endpoint con regex fragil en `useAIChat.ts`~~ — reemplazado por endpoint único con function calling real (`selectTools()` + tool-calling nativo DeepSeek/Gemini), ya no hay clasificación por regex acción-vs-consulta.

## Reglas

1. **SIEMPRE** mantener consistencia entre declarations.ts y los handlers (y su adaptador a formato OpenAI para DeepSeek)
2. **NUNCA** agregar herramientas sin definir su risk level
3. Usar `wrapUserInput()` con delimitadores `<user_input>` para sanitizacion
4. Respetar el patron de retry con backoff exponencial en gemini/client.ts y deepseek/client.ts
5. Mantener function declarations con schemas JSON estrictos (no `any`)
6. Chat SSE debe mantener formato: `data: {json}\n\n`
7. Si tocas visión o generación de imágenes, es Gemini — DeepSeek no soporta imágenes
8. Agregar rate limiting a TODOS los endpoints nuevos

## Checklist Pre-Commit

- [ ] Build exitoso (`npm run build`)
- [ ] Function declarations tienen schema completo (Gemini y adaptador DeepSeek)
- [ ] Risk level definido para nuevas herramientas
- [ ] Rate limiting en endpoints nuevos
- [ ] Sin console.log en produccion
- [ ] Sanitizacion de input del usuario aplicada
- [ ] Si la herramienta usa imagen, forzado a Gemini (no DeepSeek)
