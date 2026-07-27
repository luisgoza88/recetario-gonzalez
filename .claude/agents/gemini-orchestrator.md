---
name: gemini-orchestrator
description: "Orquestador del sistema de IA (DeepSeek primario + Gemini fallback/vision). Function calling, prompts, herramientas, compuerta de escritura y propuestas. Endpoint unico: /api/ai-assistant/chat."
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

### TOPOLOGIA (reconectada 2026-07-27)

**Un solo endpoint de chat.** Antes habia dos implementaciones en paralelo y la
que tenia las mutaciones estaba huerfana (el bot no podia ejecutar nada). Se
elimino `/api/ai-assistant` (raiz, 847 LOC) y sus capacidades se movieron al
endpoint vivo.

| Endpoint | Rol |
| --- | --- |
| `/api/ai-assistant/chat` | **Unico chat.** Consultas + escrituras + propuestas |
| `/api/ai-assistant/execute` | Ejecuta/rechaza propuestas ya aprobadas (`useAIProposal.ts`) |

Flujo de `chat/route.ts`:

1. Auth → rate limit → **`requireHouseholdMembership(householdId)`**
2. `selectTools()` con `queryFunctions` (consultas, declaradas en el propio
   archivo) + `writeFunctions` (derivadas de `declarations.ts` filtrando por
   `WRITE_FUNCTIONS`). Las escrituras **solo se ofrecen si hay householdId
   verificado**.
3. `partitionCalls()` separa lecturas de escrituras.
4. `needsHumanApproval()` (`write-gate.ts`) decide: destructiva o riesgo HIGH+
   → `createFunctionProposal()` y se devuelve **JSON** (no SSE) con
   `{ type: "proposal", proposal }`; el cliente ya lo maneja en su rama JSON.
   Riesgo bajo → `executeFunctionWithLogging()` con audit log y undo.
5. En modo stream se emiten `tool_start`/`tool_result` por funcion y un `done`
   con `executionMetadata`.

**Al agregar una tool nueva**: declararla en `declarations.ts`; si modifica
datos, agregarla a `WRITE_FUNCTIONS` en `write-gate.ts` y darle risk level en
el registry. Si es destructiva, tambien a `ALWAYS_REQUIRE_APPROVAL`.

**No existe un flag `executeDirectly`**: se elimino a proposito. El cliente no
puede pedir saltarse la aprobacion humana.

### Archivos Clave

- `src/app/api/ai-assistant/chat/route.ts` — **el chat** (consultas + escrituras)
- `src/app/api/ai-assistant/write-gate.ts` — compuerta de escritura (funcion pura, con tests)
- `src/app/api/ai-assistant/orchestrator.ts` — dispatcher + audit + propuestas (718 LOC)
- `src/app/api/ai-assistant/functions/declarations.ts` — catalogo canonico de tools (960 LOC)
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

- **El texto no hace streaming token a token.** Ahora si se emiten
  `tool_start`/`tool_result` progresivamente, pero el contenido final sale de
  `generateText()` completo y se manda en un solo evento `content`. Para
  streaming real hay que darle soporte de stream a `generateText()`.
- Las declaraciones de las **consultas** siguen viviendo en `chat/route.ts`
  (`queryFunctions`) y duplicadas en `declarations.ts`. Las escrituras ya no se
  duplican (se derivan del catalogo). Falta unificar tambien las lecturas.
- `detectRequiredFunction()` sigue siendo un clasificador por palabras clave —
  red de seguridad cuando el modelo no llama ninguna funcion.
- `capturePreState()` en el orchestrator solo cubre 4 funciones, asi que el
  undo real solo aplica a esas.
- `/api/ai-assistant/execute` duplica implementaciones en vez de importarlas.

### Resuelto (2026-07-27)

- ~~`/api/ai-assistant` huerfano~~ — **eliminado**; su funcionalidad vive en
  `/chat`.
- ~~El chat es read-only~~ — reconectado via `write-gate.ts`.
- ~~Fuga cross-tenant~~: `householdId` llegaba del body sin validar y se pasaba
  a `getCookingProfile()`/`getHouseholdMoodPatterns()`, que usan
  `createServiceRoleClient()` (bypass de RLS). Ahora hay
  `requireHouseholdMembership()` antes de usarlo.
- ~~System prompt delgado~~ — ahora incluye mapa de capacidades de la app,
  contexto colombiano (ingredientes locales, pisos termicos, cosecha del mes) y
  comensales reales desde `family_size` en vez del hardcode de 5 porciones.

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
