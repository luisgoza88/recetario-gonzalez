# Analisis Profundo: Agentes, Skills y Teams para Recetario App

---

## Diagnostico del Proyecto

**Recetario App** es una PWA madura con mas complejidad de la aparente:

| Metrica                             | Valor                                              |
| ----------------------------------- | -------------------------------------------------- |
| Lineas de codigo (src/)             | ~72,000+                                           |
| Solo codigo de IA                   | ~15,200 lineas                                     |
| Subsistemas de IA                   | 7 distintos                                        |
| Componentes "monster" (500+ lineas) | 17                                                 |
| API routes                          | 22+                                                |
| Tablas DB                           | 40+                                                |
| Migraciones                         | 17                                                 |
| Tests                               | 12 archivos, ~15% coverage                         |
| Archivos de datos estaticos         | 600KB+ (recipe-library 231KB, image-library 145KB) |

### Problemas Criticos Encontrados

1. **Vulnerabilidad de seguridad**: `/api/daily-completion` NO tiene autenticacion y usa service role key. Cualquiera puede leer/escribir datos de cualquier hogar.
2. **3 sistemas de notificaciones paralelos** sin unificar (`notifications.ts`, `ai-notifications.ts`, `ProactiveAlerts.tsx`)
3. **17 componentes monster** (500-1100 lineas cada uno) sin splitting
4. **ZERO lazy loading** de componentes (no hay React.lazy ni dynamic())
5. **231KB de datos hardcodeados** que podrian entrar al bundle del cliente
6. **Trust system con bugs**: `recordRollback` usa `.rpc('increment')` incorrectamente
7. **Race condition** en `budget-service.ts` (recordPurchase)
8. **ZERO tests de componentes**, endpoints criticos sin tests
9. **Anti-patron CustomEvents** para navegacion (no testeable, no type-safe)
10. **console.log en produccion** (AuthContext.tsx, notifications.ts)
11. **CLAUDE.md desactualizado** - no refleja el 50% del proyecto actual

---

## MAPA COMPLETO DE AGENTES

### Agentes de Proyecto (15 agentes en `.claude/agents/`)

---

#### 1. `gemini-orchestrator` (Sonnet)

**El sistema de IA es 15,200+ lineas con 7 subsistemas. Este es el agente mas critico.**

**Dominio**:

- Orchestrator principal (`api/ai-assistant/orchestrator.ts` - 600 lineas)
- Function declarations (`api/ai-assistant/functions/declarations.ts` - 650 lineas, 50+ herramientas)
- Chat endpoint (`api/ai-assistant/chat/route.ts` - 1,145 lineas)
- Action endpoint (`api/ai-assistant/route.ts` - 662 lineas)
- Execute endpoint (`api/ai-assistant/execute/route.ts` - 644 lineas)
- Multi-step agent (`api/ai-assistant/functions/multi-step.ts` - 249 lineas)
- All function implementations (`functions/recetario-queries.ts`, `recetario-mutations.ts`, `home-queries.ts`, `home-mutations.ts`, `reports.ts`)
- Gemini client with retry/sanitization (`lib/gemini/client.ts` - 350 lineas)
- System prompt & constants (`lib/ai-assistant/constants.ts`)
- AI assistant types & utils (`lib/ai-assistant/`)
- Rate limiting (`lib/rate-limit.ts`)

**Problemas conocidos que debe resolver**:

- Routing de endpoint con regex fragil en `useAIChat.ts` (puede clasificar mal accion vs consulta)
- Duplicacion de funciones read-only entre `chat/route.ts` y `declarations.ts`
- Rollback incompleto: `capturePostState()` reutiliza `capturePreState()`
- Expiracion de propuestas sin job de limpieza automatica

**Cuando usarlo**: Agregar herramientas IA, modificar orchestrator, ajustar prompts, debugging de respuestas, optimizar function calling.

---

#### 2. `trust-proposal-system` (Sonnet)

**El sistema de confianza y propuestas es el mas sofisticado del proyecto.**

**Dominio**:

- Trust service (`lib/ai/trust-service.ts` - 593 lineas)
- AI Command Service (`lib/ai/ai-command-service.ts` - 631 lineas)
- Proposal Executor (`lib/ai/proposal-executor.ts` - 847 lineas)
- AICommandCenter UI (`components/ai/AICommandCenter.tsx` - 873 lineas)
- ProposalCard, ContextPills, UndoToast (`components/ai/`)
- useAIProposal hook (`lib/hooks/useAIProposal.ts` - 255 lineas)
- Tablas: `ai_audit_log`, `ai_action_queue`, `household_ai_trust`, `ai_function_registry`
- RPC functions: `create_ai_audit_log`, `complete_ai_audit_log`, `rollback_ai_action`, `create_ai_proposal`, `decide_ai_proposal`

**Problemas conocidos**:

- **BUG**: `recordRollback` en trust-service usa `client.rpc('increment', { x: 1 })` dentro de `.update()` - no funciona
- Dos flujos de trust paralelos: `ai-command-service.ts` tiene su propia `getHouseholdTrust()` vs la de `trust-service.ts`
- `capturePreState` solo cubre 4 funciones (swap_menu_recipe, update_inventory, mark_shopping_item, complete_task)
- Propuestas expiradas no se limpian automaticamente

**Cuando usarlo**: Modificar niveles de riesgo, ajustar trust progression, arreglar rollback, agregar captura de estado para mas funciones, auditar acciones IA.

---

#### 3. `vision-ai` (Sonnet)

**5 endpoints de vision AI, cada uno con prompt engineering distinto.**

**Dominio**:

- Scan receipt (`api/scan-receipt/route.ts` - 178 lineas) - extrae productos con precio/cantidad/categoria
- Scan pantry (`api/scan-pantry/route.ts` - 456 lineas) - hasta 5 imagenes simultaneas, concurrencia limitada a 3, matching contra inventario, deduplicacion
- Analyze room (`api/analyze-room/route.ts` - 232 lineas) - tipo de espacio, area estimada, muebles, tareas sugeridas
- Recipe from image (`api/generate-recipe-from-image/route.ts` - 183 lineas) - receta completa desde foto de plato
- Match recipe image (`api/match-recipe-image/route.ts` - 240 lineas) - matching semantico entre receta y hasta 100 candidatos
- Image generation (`api/generate-recipe-image/route.ts` - 347 lineas) - Imagen 3
- Library image generation (`api/generate-library-images/route.ts`)
- Image input hook (`lib/hooks/useImageInput.ts`)
- ImageUpload component, PhotoCapture (Yolima), RoomScanner

**Cuando usarlo**: Mejorar prompts de vision, agregar nuevos endpoints de escaneo, optimizar concurrencia, mejorar matching semantico.

---

#### 4. `ai-memory-alerts` (Sonnet)

**Memoria conversacional + 3 sistemas de alertas que necesitan unificacion.**

**Dominio**:

- AI Memory (`lib/ai-memory.ts` - 270 lineas) - sessionId, historial, extraccion de preferencias
- AI Notifications (`lib/ai-notifications.ts` - 410 lineas) - alertas basadas en hora del dia
- Notifications (`lib/notifications.ts` - 187 lineas) - Web Notifications API
- ProactiveAlerts component (`components/ProactiveAlerts.tsx` - 354 lineas) - queries directas a Supabase
- SmartAlerts home (`components/home/SmartAlerts.tsx` - 377 lineas) - inteligencia del hogar
- useProactiveAlerts hook (`lib/hooks/useProactiveAlerts.ts`)
- Home intelligence (`lib/home/intelligence.ts`)
- Tablas: `ai_conversations`, `ai_context`

**Problemas criticos**:

- **3 sistemas de alertas completamente separados** (notifications.ts, ai-notifications.ts, ProactiveAlerts.tsx)
- Extraccion de preferencias en ai-memory es keywords hardcodeadas, no usa LLM
- `ai-notifications.ts` dice "AI" pero genera alertas con reglas, no con IA
- `setInterval` en notifications.ts sin cleanup (memory leak potencial)
- `console.log` en produccion en ambos archivos de notificaciones
- El historial se limita a 20 mensajes pero solo 9 van al modelo

**Cuando usarlo**: Unificar los 3 sistemas de alertas, mejorar AI memory con LLM, implementar push notifications reales, cleanup de intervals.

---

#### 5. `recipe-engine` (Sonnet)

**Motor de recetas, menu y matching de ingredientes.**

**Dominio**:

- 3 representaciones de recetas: `recipes.ts` (28 simples), `expanded-recipes.ts` (90KB con porciones), `recipe-library.ts` (231KB escalable)
- Menu rotativo (`data/menu.ts` - ciclo 12 dias desde 2026-01-06)
- Matching de ingredientes 4 pasos (`lib/inventory-check.ts` - 14,801 bytes)
- Sustituciones inteligentes (`lib/smart-substitutions.ts`, `data/substitutions.ts`)
- Feedback y aprendizaje (`lib/feedback-learning.ts`)
- Thermomix (`data/thermomix-recipes.ts`, `components/ThermomixView.tsx`)
- Market items y checklist (`data/market.ts`, `components/MarketView.tsx` - 936 lineas)
- CalendarView (`components/CalendarView.tsx` - 1,025 lineas)
- RecipesView, RecipeModal, RecipeForm, FeedbackModal
- APIs: `generate-recipe`, `generate-weekly-menu`, `generate-shopping-list`, `smart-shopping-list`, `adapt-recipe-thermomix`, `generated-menu`

**Problemas conocidos**:

- 3 representaciones redundantes de recetas (necesitan consolidacion)
- `recipe-library.ts` (231KB) podria estar entrando al bundle del cliente
- `CYCLE_START_DATE` hardcodeado, deberia ser configurable por hogar
- Nombres personales hardcodeados (Luis, Mariana) en datos
- `countIngredientMatches` sin fallback para JSONB complejo

**Cuando usarlo**: Features de recetas, menu, matching, sustituciones, Thermomix, lista de compras.

---

#### 6. `home-manager` (Sonnet)

**26+ componentes del modulo hogar + Modo Yolima.**

**Dominio**:

- HomeView principal + 26 sub-componentes en `/components/home/`
- Modo Yolima: 6 componentes en `/components/yolima/`
- Scheduling: ScheduleGenerator, ScheduleOptimizer, ScheduleTemplateEditor, ScheduleDashboard
- Empleados: EmployeesPanel, EmployeeDetailModal (846 lineas!), EmployeeCheckIn
- Espacios: SpacesPanel, SpaceFormView, SpaceListView, SpaceTypeSelector
- Inspecciones: InspectionMode, RoomScanner
- Reportes: MonthlyReport, HomeAnalyticsSummary, CleaningHistory
- Hooks: useHomeData, useSpacesData, useDailyDashboard, useWeeklyCalendar
- Store: useHouseholdStore
- Data: schedule-seed.ts (76KB)
- APIs: seed-schedule, daily-completion, analyze-room

**Cuando usarlo**: Features del hogar, empleados, espacios, tareas, scheduling, Yolima.

---

#### 7. `recetario-db` (Sonnet)

**40+ tablas, 17 migraciones, RLS complejo.**

**Dominio**:

- 17 migraciones en `supabase/migrations/`
- 40+ tablas con relaciones complejas (ver diagrama en investigacion)
- RLS basado en `household_memberships` con helpers `is_household_member()`, `has_household_role()`
- 20+ funciones RPC (invitaciones, rate limiting, AI audit, trust)
- 13+ triggers (new user, new household, legacy blocks, updated_at)
- Indices (`supabase-indexes.sql` - 65+ indices)
- Clientes Supabase: browser singleton, server auth, service role
- Vista: `today_tasks_summary`

**Cuando usarlo**: Crear/modificar tablas, migraciones, RLS, indices, funciones RPC, debugging de datos.

---

#### 8. `auth-multitenancy` (Sonnet)

**Sistema de roles, permisos e invitaciones.**

**Dominio**:

- Middleware (`middleware.ts`) - protege solo /api/, inyecta x-user-id
- AuthContext (`contexts/AuthContext.tsx`) - sesion, perfil, membresías
- RoleGate (`components/auth/RoleGate.tsx`) - AdminOnly, CanEdit, ShowByRole, useRoleCheck
- Invitation service (`lib/invitation-service.ts`)
- Household service/store (`lib/services/household-service.ts`, `lib/stores/useHouseholdStore.ts`)
- MembersPanel (`components/settings/MembersPanel.tsx` - 560 lineas)
- Auth pages: login, register, forgot-password, reset-password, join
- Migracion: `20260119000000_multi_tenant_users.sql` (17,253 bytes)
- RPCs: create_invitation, use_invitation_code, get_my_memberships, check_user_permission

**Problemas conocidos**:

- Inconsistencia de roles: AuthContext usa `admin|empleado|familia`, HouseholdStore usa `owner|admin|member|viewer`
- `console.log('Auth state changed')` en produccion en AuthContext.tsx

**Cuando usarlo**: Roles, permisos, invitaciones, auth flow, middleware.

---

#### 9. `component-architect` (Sonnet)

**17 monster components que necesitan refactoring + accesibilidad.**

**Dominio**:

- Componentes criticos a dividir:
  - `AIChat.tsx` (1,105 lineas) - duplica FloatingAIAssistant
  - `AddCustomItemModal.tsx` (1,070 lineas) - 5 modos de input en uno
  - `CalendarView.tsx` (1,025 lineas) - calendario + menus + modales
  - `MarketView.tsx` (936 lineas)
  - `EmployeeDetailModal.tsx` (846 lineas) - 4 tabs en uno
- UI library custom (`components/ui/`) - Button, Card, Toast, ConfirmDialog, FocusTrap, Spinner, ErrorBoundary, OfflineIndicator
- Accesibilidad: inconsistente (algunos modales con FocusTrap, la mayoria sin)
- Anti-patron: CustomEvents para navegacion desde SmartFAB (17 custom events!)
- Patron repetido: spinner inline en 30+ archivos en lugar del Spinner custom
- Queries Supabase directas en componentes en vez de TanStack Query hooks

**Cuando usarlo**: Refactoring de components monster, mejorar accesibilidad, unificar patrones UI, eliminar anti-patrones.

---

#### 10. `budget-finance` (Haiku)

**Modulo de presupuesto y precios.**

**Dominio**:

- budget-service.ts (403 lineas) - CRUD presupuesto, registro compras, estimacion costos
- BudgetWidget.tsx (421 lineas) - widget con modal de compra interno
- PriceLogModal.tsx (93 lineas)
- SmartShoppingSection.tsx (13,717 bytes)
- Tablas: `budgets`, `purchases`, `price_history`
- APIs: `log-price`, `smart-shopping-list`, `generate-shopping-list`

**Problemas criticos**:

- **Race condition**: `recordPurchase` hace GET + UPDATE manual en vez de usar RPC atomico
- **Cliente Supabase duplicado**: budget-service.ts crea su propio `createClient` en vez del singleton
- PriceLogModal sin focus trap, sin aria-modal, sin Escape handler
- Conversion de unidades fragil en `estimateShoppingCost`

**Cuando usarlo**: Features de presupuesto, precios, compras, estimacion de costos.

---

#### 11. `pwa-offline` (Haiku)

**Service worker, offline, sync.**

**Dominio**:

- Service Worker (`sw.ts`)
- IndexedDB cache (`lib/indexedDB.ts`)
- Offline sync (`hooks/useOfflineSync.ts`)
- OfflineIndicator (`components/ui/OfflineIndicator.tsx`)
- SW registration (`components/ServiceWorkerRegistration.tsx`)
- Manifest (`app/manifest.ts`)
- Next config (Serwist)

**Cuando usarlo**: Mejorar offline, caching strategies, push notifications, sync en background.

---

#### 12. `performance-optimizer` (Sonnet)

**ZERO lazy loading, 600KB+ en datos estaticos, bundle sin optimizar.**

**Dominio**:

- Bundle analysis (next.config.ts con @next/bundle-analyzer)
- Archivos de datos grandes: recipe-library (231KB), image-library (145KB), expanded-recipes (90KB), schedule-seed (76KB), categoryIcons (28KB)
- Lazy loading: implementar React.lazy / dynamic() para 70+ componentes
- TanStack Query config (QueryProvider.tsx)
- IndexedDB cache patterns
- Image optimization (AVIF/WebP ya configurado)

**Hallazgo critico**: No hay NI UN SOLO `React.lazy` ni `dynamic()` en componentes del cliente. Todo se carga en el bundle inicial.

**Cuando usarlo**: Reducir bundle, lazy loading, code splitting, mover datos a DB, analizar performance.

---

#### 13. `recetario-security` (Sonnet)

**Vulnerabilidades activas y gaps de seguridad.**

**Dominio**:

- **CRITICO**: `/api/daily-completion` sin auth, usa service role key
- Middleware coverage (solo /api/, paginas no protegidas server-side)
- Service role key usage audit (6+ archivos)
- CSP headers (script-src unsafe-inline necesario para Next.js)
- Rate limiting gaps (`daily-completion` sin rate limit)
- Singleton Supabase con anon key en routes de API (`generate-recipe`)
- ILIKE sin validacion en `execute/route.ts` (potencial query costosa)
- console.log en AuthContext.tsx exponiendo eventos de auth

**Cuando usarlo**: Auditorias de seguridad, arreglar vulnerabilidades, revisar RLS, revisar auth en endpoints.

---

#### 14. `recetario-qa` (Haiku)

**Testing: 15% coverage, 0 tests de componentes, endpoints criticos sin tests.**

**Dominio**:

- 12 archivos de test existentes
- Vitest config (vitest.config.ts)
- Coverage actual (thresholds: 15% - MUY bajo)
- Build: `npm run build`
- Lint: `npm run lint`
- CI/CD: GitHub Actions (lint + typecheck + test + build)

**Lo que falta testear (critico)**:

- `/api/daily-completion` (sin auth Y sin tests)
- `/api/ai-assistant/execute` (ejecuta acciones destructivas)
- `/api/generate-recipe` (endpoint core)
- `proposal-executor.ts` (logica de ejecucion de propuestas IA)
- `ai-command-service.ts` (audit log y rollback)
- `middleware.ts`
- ZERO tests de componentes React (ni RTL ni E2E)

**Cuando usarlo**: Post-cambios, mejorar coverage, agregar tests para endpoints criticos.

---

#### 15. `data-curator` (Haiku)

**3 representaciones de recetas, 600KB+ de datos hardcodeados, sync TS↔DB.**

**Dominio**:

- `recipes.ts` (28 recetas simples) vs `expanded-recipes.ts` (90KB con porciones) vs `recipe-library.ts` (231KB escalable) → 3 fuentes de verdad
- `image-library-dishes.ts` (145KB, 500 platillos)
- `market.ts` (82 items) - debe coincidir con tabla `market_items` de Supabase
- `schedule-seed.ts` (76KB) - datos de 4 semanas
- `categoryIcons.ts` (28KB) - clasificacion fuzzy de 60+ subcategorias
- Nombres hardcodeados: "Luis", "Mariana", "Yolima", "John"
- `CYCLE_START_DATE` hardcodeado (2025-01-06)
- Redundancia entre datos TS y tablas de Supabase

**Cuando usarlo**: Consolidar fuentes de datos, migrar datos estaticos a DB, limpiar hardcoded data, gestionar seeds.

---

#### 16. `voice-speech` (Haiku)

**Web Speech API para entrada/salida de voz.**

**Dominio**:

- VoiceManager singleton (`lib/voice-commands.ts` - 280 lineas) - 7 patrones de comandos con regex
- Speech Recognition hook (`hooks/useSpeechRecognition.ts` - 140 lineas)
- Voice input hook (`lib/hooks/useVoiceInput.ts`)
- TTS output con voz en espanol (es-CO)
- Integrado en FloatingAIAssistant y AIChat

**Limitaciones**: `continuous = false`, no hay wake word, requiere activacion manual

**Cuando usarlo**: Mejorar comandos de voz, agregar wake word, mejorar TTS, continuous listening.

---

#### 17. `analytics-monitoring` (Haiku)

**PostHog + logging + error reporting.**

**Dominio**:

- PostHog integration (`lib/analytics/index.ts`, `useAnalytics.ts`, `AnalyticsProvider.tsx`)
- Eventos: 40+ eventos en 10 categorias
- Logger (`lib/logger.ts`)
- ErrorBoundary (`components/ui/ErrorBoundary.tsx`) - NO reporta a Sentry
- console.log en produccion: 15+ ocurrencias en componentes y lib

**Cuando usarlo**: Implementar Sentry, limpiar console.log, agregar mas eventos, dashboards de analytics.

---

### Resumen: 17 Agentes de Proyecto

| #   | Agente                  | Modelo | Lineas de codigo | Prioridad   |
| --- | ----------------------- | ------ | ---------------- | ----------- |
| 1   | `gemini-orchestrator`   | Sonnet | ~3,500           | Critica     |
| 2   | `trust-proposal-system` | Sonnet | ~2,800           | Critica     |
| 3   | `vision-ai`             | Sonnet | ~1,600           | Alta        |
| 4   | `ai-memory-alerts`      | Sonnet | ~1,600           | Alta        |
| 5   | `recipe-engine`         | Sonnet | ~5,000+          | Critica     |
| 6   | `home-manager`          | Sonnet | ~8,000+          | Alta        |
| 7   | `recetario-db`          | Sonnet | SQL + config     | Critica     |
| 8   | `auth-multitenancy`     | Sonnet | ~2,500           | Alta        |
| 9   | `component-architect`   | Sonnet | ~17,000+         | Alta        |
| 10  | `budget-finance`        | Haiku  | ~1,000           | Media       |
| 11  | `pwa-offline`           | Haiku  | ~500             | Media       |
| 12  | `performance-optimizer` | Sonnet | Transversal      | Alta        |
| 13  | `recetario-security`    | Sonnet | Transversal      | **URGENTE** |
| 14  | `recetario-qa`          | Haiku  | Tests            | Critica     |
| 15  | `data-curator`          | Haiku  | ~600KB datos     | Media       |
| 16  | `voice-speech`          | Haiku  | ~500             | Baja        |
| 17  | `analytics-monitoring`  | Haiku  | ~400             | Media       |

---

## AGENTES GLOBALES QUE APLICAN

| Agente Global      | Uso en este Proyecto                      |
| ------------------ | ----------------------------------------- |
| `debug-specialist` | Root cause de bugs complejos              |
| `qa`               | Build/test verification generica          |
| `test-writer`      | Escribir tests (complementa recetario-qa) |
| `pr-reviewer`      | Review antes de push                      |
| `typescript-fixer` | Errores de tipos (tsconfig strict)        |
| `devops-deployer`  | Deploys a Vercel, CI/CD GitHub Actions    |

---

## AGENTES GLOBALES QUE NO APLICAN

| Agente                                 | Razon                                   |
| -------------------------------------- | --------------------------------------- |
| `mobile`, `mobile-developer`           | No hay app mobile                       |
| `clinico`, `financiero`, `operaciones` | No es app clinica/comercial             |
| `hipaa-compliance`, `clinical-*`       | No maneja datos de salud                |
| `fhir-interop`                         | No hay interoperabilidad HL7            |
| `messaging-specialist`                 | Solo hay share basico via WhatsApp URL  |
| `trading-bot-developer`                | No hay trading                          |
| `breathe-move`                         | No hay clases wellness                  |
| `web-client`                           | No es landing publica                   |
| `tenant-onboarding`                    | Onboarding ya implementado              |
| `integrations-sync`                    | No hay integraciones externas complejas |
| `ai-automation`                        | No usa CrewAI ni browser-use            |

---

## PLAN DE SKILLS

### Skills a MANTENER

| Skill                              | Relevancia                                    |
| ---------------------------------- | --------------------------------------------- |
| `next-best-practices`              | **CRITICA** - Framework principal             |
| `supabase-postgres-best-practices` | **CRITICA** - Backend principal               |
| `vercel-react-best-practices`      | **ALTA** - Patrones React                     |
| `vercel-composition-patterns`      | **MEDIA** - Util para refactoring de monsters |

### Skills a REMOVER (4 de mobile no aplican)

- `vercel-react-native-skills`
- `building-native-ui`
- `native-data-fetching`
- `upgrading-expo`

### Skills NUEVOS a Crear (8)

#### 1. `gemini-function-calling`

Patrones del sistema de IA: client con retry, function calling, streaming SSE, system prompt, tool declarations, risk levels, sanitizacion de input, modelos disponibles (Flash, Flash Exp, Imagen 3).

#### 2. `trust-proposal-patterns`

Sistema de confianza: 4 niveles de riesgo, 5 niveles de trust, progresion automatica, rate limits por accion, audit logging con pre/post state, rollback, propuestas con aprobacion parcial, ejecucion transaccional.

#### 3. `recetario-data-model`

Mapa completo de 40+ tablas, relaciones, RLS con household pattern, funciones RPC, triggers, indices criticos, tipos TypeScript, clientes Supabase (browser vs server vs service_role).

#### 4. `recetario-auth-patterns`

Middleware, AuthContext, roles (admin/familia/empleado), 16 permisos granulares, RoleGate components, flujo de invitaciones, multi-household, helper `requireAuth`.

#### 5. `pwa-serwist-patterns`

Serwist con Next.js, IndexedDB para cache offline, estrategias de sync, Service Worker lifecycle, manifest, iconos dinamicos.

#### 6. `recetario-component-patterns`

UI library custom (Button, Card, Toast, etc.), patrones a seguir, anti-patrones a evitar (CustomEvents, spinner inline, queries directas), accesibilidad (FocusTrap, ARIA), TanStack Query hooks.

#### 7. `vision-ai-prompts`

Prompt engineering para cada endpoint de vision: scan-receipt, scan-pantry (multi-imagen con concurrencia), analyze-room, recipe-from-image, match-recipe-image. Formatos de respuesta JSON esperados.

#### 8. `analytics-posthog-patterns`

PostHog en Next.js, hook useAnalytics, 40+ eventos en 10 categorias, identificacion de usuarios, modo log-only sin API key.

---

## PLAN DE SLASH COMMANDS (10)

#### 1. `/project:add-gemini-tool`

Agregar nueva herramienta al AI Assistant: declaration + handler + orchestrator + risk level + tests.

#### 2. `/project:new-api-route`

Nuevo API route con boilerplate: requireAuth, rate limiting, validacion, error handling, vercel.json si maxDuration.

#### 3. `/project:migration`

Nueva migracion Supabase: naming convention, RLS con household pattern, indices, triggers, verificacion.

#### 4. `/project:run-tests`

Ejecutar suite completa: `npm run test:run` + `npm run test:coverage` + `npm run build` + reportar resultados.

#### 5. `/project:security-audit`

Auditoria de seguridad: verificar auth en todos los endpoints, revisar service role usage, buscar console.log en prod, verificar RLS.

#### 6. `/project:split-component`

Dividir un componente monster: analizar responsabilidades, proponer split, mantener tests, verificar accesibilidad.

#### 7. `/project:add-recipe`

Agregar recetas: formato correcto con ingredientes JSONB, porciones Luis/Mariana, categorias, tags, seed o Supabase.

#### 8. `/project:optimize-bundle`

Analizar bundle con `ANALYZE=true npm run build`, identificar archivos grandes, agregar lazy loading, mover datos a DB.

#### 9. `/project:fix-vulnerability`

Arreglar una vulnerabilidad especifica: auth, RLS, rate limiting, service role key, CSP.

#### 10. `/project:update-claude-md`

Actualizar CLAUDE.md del proyecto con estado actual (esta MUY desactualizado).

---

## CONFIGURACION DE AGENT TEAMS

### Team 1: "ai-upgrade"

**Cuando**: Mejorar/extender el sistema de IA

```
Lider: gemini-orchestrator
Miembros:
  - trust-proposal-system (si toca riesgo/trust)
  - vision-ai (si toca endpoints de vision)
  - ai-memory-alerts (si toca memoria/alertas)
  - recipe-engine (herramientas de recetario)
  - home-manager (herramientas del hogar)
  - recetario-db (tablas AI)
Post:
  - recetario-qa (tests)
  - recetario-security (audit)
```

### Team 2: "feature-recetario"

**Cuando**: Feature nueva del modulo recetario

```
Lider: recipe-engine
Miembros:
  - recetario-db (si toca tablas)
  - component-architect (si toca UI compleja)
  - budget-finance (si toca precios/presupuesto)
  - gemini-orchestrator (si agrega herramienta IA)
Post:
  - recetario-qa
```

### Team 3: "feature-hogar"

**Cuando**: Feature nueva del modulo hogar

```
Lider: home-manager
Miembros:
  - recetario-db (si toca tablas)
  - component-architect (si toca UI compleja)
  - auth-multitenancy (si toca roles/permisos)
Post:
  - recetario-qa
```

### Team 4: "security-hardening"

**Cuando**: Arreglar vulnerabilidades o auditoria de seguridad

```
Lider: recetario-security
Miembros:
  - auth-multitenancy (auth/middleware)
  - recetario-db (RLS/policies)
  - recetario-qa (tests de seguridad)
```

### Team 5: "performance-sprint"

**Cuando**: Optimizacion de performance

```
Lider: performance-optimizer
Miembros:
  - component-architect (lazy loading, code splitting)
  - data-curator (mover datos de TS a DB)
  - recetario-db (indices, queries)
Post:
  - recetario-qa
```

### Team 6: "refactoring-sprint"

**Cuando**: Refactoring masivo de componentes

```
Lider: component-architect
Miembros:
  - recipe-engine (componentes de recetario)
  - home-manager (componentes del hogar)
  - ai-memory-alerts (unificar alertas)
Post:
  - recetario-qa
  - recetario-security (verificar que no se rompio acceso)
```

### Team 7: "full-sprint"

**Cuando**: Sprint completo con multiples features

```
Lider: yo (orquestador principal)
Todos los agentes relevantes segun features del sprint
Siempre al final:
  - recetario-qa
  - recetario-security
```

### Team 8: "bugfix"

**Cuando**: Resolver bugs complejos

```
Lider: debug-specialist (global)
Miembros: segun modulo afectado
Post:
  - recetario-qa
```

---

## AUTO-ROUTING ACTUALIZADO

```
SI tarea menciona IA/chat/gemini/herramienta/orchestrator/function calling:
  → gemini-orchestrator

SI tarea menciona trust/propuesta/riesgo/audit/rollback/aprobacion:
  → trust-proposal-system

SI tarea menciona scan/escaneo/camara/vision/imagen IA/foto:
  → vision-ai

SI tarea menciona memoria IA/alertas/notificaciones/proactive:
  → ai-memory-alerts

SI tarea menciona receta/menu/porcion/ingrediente/mercado/thermomix/sustituc:
  → recipe-engine

SI tarea menciona hogar/empleado/tarea/espacio/limpieza/yolima/schedule:
  → home-manager

SI tarea menciona tabla/migracion/RLS/query/indice/SQL:
  → recetario-db

SI tarea menciona auth/login/rol/permiso/invitacion/household:
  → auth-multitenancy

SI tarea menciona refactoring/componente grande/accesibilidad/ARIA/dividir:
  → component-architect

SI tarea menciona presupuesto/precio/compra/gasto/budget:
  → budget-finance

SI tarea menciona offline/PWA/service worker/cache/sync:
  → pwa-offline

SI tarea menciona bundle/performance/lazy/lento/pesado:
  → performance-optimizer

SI tarea menciona seguridad/vulnerabilidad/auth audit/service role:
  → recetario-security

SI tarea menciona test/coverage/vitest/testing:
  → recetario-qa

SI tarea menciona datos/seed/recetas estaticas/consolidar/migrar datos:
  → data-curator

SI tarea menciona voz/speech/hablar/escuchar:
  → voice-speech

SI tarea menciona analytics/PostHog/Sentry/monitoreo/logging:
  → analytics-monitoring

SI tarea toca 2+ dominios:
  → Team con agentes relevantes

SI tarea es bug:
  → debug-specialist + agente de modulo afectado

SIEMPRE post-cambios:
  → recetario-qa (build + tests)
  → recetario-security (si toca auth/datos)
```

---

## PRIORIDAD DE IMPLEMENTACION

### URGENTE (hoy)

1. Crear `recetario-security` y arreglar `/api/daily-completion` sin auth
2. Arreglar bug en `recordRollback` (trust-service.ts)

### Fase 1 - Agentes Core (crear los 17 agentes)

3. `gemini-orchestrator` + `trust-proposal-system` (corazon de IA)
4. `recipe-engine` + `home-manager` (dominios de negocio)
5. `recetario-db` + `auth-multitenancy` (infraestructura)
6. `component-architect` + `performance-optimizer` (calidad)
7. Resto de agentes

### Fase 2 - Skills y Commands

8. Crear 8 skills nuevos
9. Remover 4 skills de mobile
10. Crear 10 slash commands
11. Actualizar CLAUDE.md del proyecto

### Fase 3 - Testing y Seguridad

12. Subir coverage de 15% a 50%+ (priorizar endpoints criticos)
13. Agregar tests de componentes (RTL)
14. Integrar Sentry para error reporting
15. Limpiar console.log de produccion

### Fase 4 - Performance y Refactoring

16. Implementar lazy loading (React.lazy / dynamic)
17. Migrar datos de TS a DB (recipe-library, image-library)
18. Dividir 17 componentes monster
19. Unificar 3 sistemas de alertas
20. Eliminar anti-patron CustomEvents

---

## COMPARATIVA: ANALISIS INICIAL vs PROFUNDO

| Aspecto                      | Analisis Inicial | Analisis Profundo                                     |
| ---------------------------- | ---------------- | ----------------------------------------------------- |
| Agentes de proyecto          | 7                | **17**                                                |
| Skills nuevos                | 5                | **8**                                                 |
| Slash commands               | 6                | **10**                                                |
| Team templates               | 5                | **8**                                                 |
| Vulnerabilidades encontradas | 0                | **1 critica + 5 altas**                               |
| Bugs en codigo               | 0                | **3 (trust rollback, race condition, regex routing)** |
| Subsistemas de IA            | 1 ("IA")         | **7 distintos**                                       |
| Componentes monster          | No mencionado    | **17 identificados**                                  |
| Datos hardcodeados           | No mencionado    | **600KB+ que pueden entrar al bundle**                |
| Anti-patrones                | No mencionado    | **CustomEvents, spinner repetido, queries directas**  |
