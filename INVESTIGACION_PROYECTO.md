# Recetario App - Informe Completo del Sistema

## Resumen Ejecutivo

| Atributo | Valor |
|----------|-------|
| **Nombre** | Recetario App / Hogar Inteligente |
| **Usuarios** | Familia González (Luis y Mariana) |
| **Estado** | Producción activa |
| **URL** | https://recetario-app-self.vercel.app |
| **GitHub** | https://github.com/luisgoza88/recetario-gonzalez |
| **Supabase ID** | snyelpbcfbzaxadrtxpa |

### Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Componentes React | 66 archivos |
| Líneas de código UI | 22,731+ líneas |
| API Endpoints | 11 rutas |
| Tablas en DB | 40+ tablas |
| Archivos totales src/ | 119 archivos |

---

## 1. Visión y Propósito

### 1.1 Problema que Resuelve

La aplicación combina **dos módulos principales**:

**Módulo Recetario:**
- Planificación de comidas en ciclo de 12 días (excluyendo domingos)
- Control de porciones diferenciadas (Luis: 3, Mariana: 2 = 5 total)
- Gestión de lista de mercado sincronizada con menú
- Control de inventario/despensa
- Generación de recetas con IA
- Sistema de feedback y aprendizaje automático

**Módulo Hogar:**
- Administración de espacios del hogar (24+ espacios)
- Gestión de empleados domésticos (horarios, zonas, tareas)
- Programación inteligente de limpieza con IA
- Historial y reportes de mantenimiento
- Check-in/out de empleados

### 1.2 Usuarios del Sistema

| Usuario | Rol | Porciones | Descripción |
|---------|-----|-----------|-------------|
| **Luis** | Admin | 3 de 5 | Porciones grandes, comida sustanciosa |
| **Mariana** | Admin | 2 de 5 | Porciones medianas, preferencias ligeras |
| **Empleados** | Empleado | N/A | Ven tareas, hacen check-in/out |
| **Familia** | Familia | N/A | Ven menú, lista de compras |

### 1.3 Filosofía de Diseño

- **Mobile-first**: Diseñado para uso en celular
- **PWA Offline**: Funciona sin internet, instalable como app
- **IA Asistida**: Gemini para recetas, chat, análisis, imágenes
- **Multi-tenant**: Sistema de roles y permisos por hogar

---

## 2. Stack Tecnológico

### 2.1 Tecnologías Core

| Capa | Tecnología | Versión | Propósito |
|------|------------|---------|-----------|
| Frontend | Next.js | 16.1.2 | Framework React |
| UI | React | 19.2.3 | Componentes |
| Lenguaje | TypeScript | 5.x | Type safety |
| Estilos | Tailwind CSS | 4.x | Styling |
| Backend/DB | Supabase | PostgreSQL | Base de datos + Auth |
| **IA** | **Google Gemini** | 2.0/2.5 | Generación, visión, chat |
| State | Zustand | 5.0.10 | Estado global |
| Data | TanStack Query | 5.90.19 | Fetching + cache |
| PWA | Serwist | 9.5.0 | Service Worker |
| Iconos | Lucide React | 0.562.0 | Iconografía |
| Deploy | Vercel | Auto | CI/CD |

### 2.2 Modelos de IA (Google Gemini)

| Modelo | Uso |
|--------|-----|
| `gemini-2.0-flash` | Generación rápida (recetas, parsing) |
| `gemini-2.0-flash-exp` | Con soporte de imágenes |
| `gemini-2.5-flash` | Chat y asistente |
| `imagen-3.0-generate-002` | Generación de imágenes de platos |

---

## 3. Arquitectura del Sistema

### 3.1 Estructura de Carpetas

```
src/
├── app/                          # Pages & API Routes (35 archivos)
│   ├── page.tsx                  # Hub principal de navegación
│   ├── layout.tsx                # Layout global + PWA + Auth
│   ├── offline/page.tsx          # Página offline PWA
│   ├── onboarding/page.tsx       # Wizard de onboarding
│   ├── auth/
│   │   ├── login/page.tsx        # Login de usuario
│   │   └── register/page.tsx     # Registro de usuario
│   ├── join/page.tsx             # Unirse a hogar con código
│   └── api/                      # 11 endpoints de API
│       ├── generate-recipe/      # Generar receta con IA
│       ├── parse-market-items/   # Parsear items del mercado
│       ├── analyze-room/         # Analizar habitación
│       ├── ai-assistant/         # Chat IA principal
│       ├── generate-recipe-image/# Generar imagen de plato
│       ├── generate-recipe-from-image/ # OCR de receta
│       ├── match-recipe-image/   # Matching visual
│       ├── scan-pantry/          # Escanear despensa
│       ├── scan-receipt/         # Escanear recibo
│       ├── seed-schedule/        # Sembrar datos iniciales
│       └── generate-library-images/ # Batch de imágenes
│
├── components/                   # 66 componentes React (22,731+ líneas)
│   ├── CalendarView.tsx          # Calendario de menú (714 líneas)
│   ├── MarketView.tsx            # Mercado + Inventario (771 líneas)
│   ├── RecipesView.tsx           # Catálogo de recetas
│   ├── RecipeModal.tsx           # Detalle de receta + nutrición
│   ├── FeedbackModal.tsx         # Feedback de comidas
│   ├── SmartSuggestions.tsx      # Sugerencias IA (655 líneas)
│   ├── SuggestionsPanel.tsx      # Panel de ajustes
│   ├── SmartSubstitutionPanel.tsx# Sustituciones inteligentes
│   ├── NutritionDisplay.tsx      # Info nutricional
│   ├── BudgetWidget.tsx          # Widget presupuesto
│   ├── AddCustomItemModal.tsx    # Agregar items custom (1,067 líneas)
│   ├── ScanPantryModal.tsx       # Escanear despensa (657 líneas)
│   │
│   ├── home/                     # Módulo Hogar (16 componentes)
│   │   ├── HomeView.tsx          # Vista principal (689 líneas)
│   │   ├── HomeSetupWizard.tsx   # Wizard setup (752 líneas)
│   │   ├── DailyDashboard.tsx    # Dashboard diario (595 líneas)
│   │   ├── ScheduleDashboard.tsx # Dashboard horarios
│   │   ├── WeeklyCalendar.tsx    # Calendario semanal (520 líneas)
│   │   ├── ScheduleGenerator.tsx # Generador horarios (703 líneas)
│   │   ├── ScheduleOptimizer.tsx # Optimizador IA (593 líneas)
│   │   ├── ScheduleTemplateEditor.tsx # Editor plantillas (599 líneas)
│   │   ├── SpacesPanel.tsx       # Panel espacios (1,026 líneas)
│   │   ├── EmployeesPanel.tsx    # Panel empleados
│   │   ├── EmployeeDetailModal.tsx # Detalle empleado (819 líneas)
│   │   ├── EmployeeCheckIn.tsx   # Check-in/out
│   │   ├── CleaningRating.tsx    # Calificar limpieza
│   │   ├── CleaningHistory.tsx   # Historial limpieza
│   │   ├── InspectionMode.tsx    # Modo inspección
│   │   ├── RoomScanner.tsx       # Escáner IA (589 líneas)
│   │   ├── QuickRoutines.tsx     # Rutinas rápidas
│   │   ├── SuppliesInventory.tsx # Inventario limpieza
│   │   ├── MonthlyReport.tsx     # Reporte mensual
│   │   ├── HomeAnalyticsSummary.tsx # Analytics
│   │   └── SmartAlerts.tsx       # Alertas inteligentes
│   │
│   ├── sections/                 # Secciones principales
│   │   ├── RecetarioSection.tsx  # Sección recetas unificada
│   │   ├── TodayDashboard.tsx    # Dashboard "Hoy" (873 líneas)
│   │   ├── AIChat.tsx            # Chat IA completo (1,132 líneas)
│   │   └── SettingsView.tsx      # Configuración
│   │
│   ├── navigation/               # Navegación
│   │   ├── BottomNavigation.tsx  # Nav inferior (5 secciones)
│   │   ├── DynamicFAB.tsx        # Botón flotante contextual
│   │   └── RecetarioSubNav.tsx   # Sub-nav de recetario
│   │
│   ├── forms/
│   │   └── RecipeForm.tsx        # Formulario recetas (551 líneas)
│   │
│   ├── auth/
│   │   └── RoleGate.tsx          # Control de acceso por rol
│   │
│   ├── settings/
│   │   └── MembersPanel.tsx      # Gestión miembros (533 líneas)
│   │
│   ├── providers/                # Providers de contexto
│   │   ├── Providers.tsx         # Provider raíz
│   │   ├── QueryProvider.tsx     # TanStack Query
│   │   └── HouseholdProvider.tsx # Contexto hogar
│   │
│   └── ui/                       # Componentes base
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Spinner.tsx
│       └── OfflineIndicator.tsx
│
├── lib/                          # Lógica de negocio (25 archivos)
│   ├── supabase/client.ts        # Cliente Supabase
│   ├── gemini/client.ts          # Cliente Google Gemini
│   ├── inventory-check.ts        # Verificación ingredientes
│   ├── smart-substitutions.ts    # Sistema sustituciones
│   ├── feedback-learning.ts      # Aprendizaje feedback
│   ├── menu-tasks-integration.ts # Integración menú-tareas
│   ├── notifications.ts          # Notificaciones
│   ├── budget-service.ts         # Servicio presupuesto
│   ├── units.ts                  # Conversión unidades
│   ├── invitation-service.ts     # Sistema invitaciones
│   ├── ai-memory.ts              # Memoria IA
│   ├── ai-notifications.ts       # Alertas IA
│   ├── voice-commands.ts         # Comandos de voz
│   ├── whatsapp-share.ts         # Compartir WhatsApp
│   ├── indexedDB.ts              # Cache offline
│   ├── userPreferences.ts        # Preferencias usuario
│   │
│   ├── home/
│   │   ├── defaults.ts           # Defaults espacios/tareas
│   │   └── intelligence.ts       # Lógica de optimización
│   │
│   ├── stores/                   # Estado global (Zustand)
│   │   ├── useAppStore.ts        # Estado de app
│   │   └── useHouseholdStore.ts  # Estado de hogar
│   │
│   ├── hooks/
│   │   └── useAppData.ts         # Hooks de datos
│   │
│   └── __tests__/                # Tests
│       ├── inventory-check.test.ts
│       └── units.test.ts
│
├── contexts/
│   └── AuthContext.tsx           # Contexto de autenticación
│
├── hooks/                        # Hooks custom
│   ├── useOfflineSync.ts         # Sincronización offline
│   ├── useProactiveSuggestions.ts# Sugerencias proactivas
│   └── useSpeechRecognition.ts   # Reconocimiento de voz
│
├── types/                        # TypeScript types
│   ├── index.ts                  # 50+ interfaces
│   └── ai-messages.ts            # Tipos mensajes IA
│
└── data/                         # Datos estáticos
    ├── recipes.ts                # 28 recetas iniciales
    ├── menu.ts                   # Menú 12 días
    ├── market.ts                 # 82 items mercado
    ├── substitutions.ts          # 90+ sustituciones
    ├── schedule-seed.ts          # Templates tareas (74KB)
    └── image-library-dishes.ts   # Biblioteca imágenes (142KB)
```

### 3.2 Mapa de Componentes e Interacciones

```
┌─────────────────────────────────────────────────────────────────┐
│                    page.tsx (Hub Principal)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  BottomNavigation                            ││
│  │  [Hoy] [Recetario] [+FAB] [Hogar] [IA]                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    HOY        │    │  RECETARIO    │    │    HOGAR      │
│               │    │               │    │               │
│ TodayDashboard│    │RecetarioSection    │  HomeView     │
│    │          │    │    │          │    │    │          │
│    ├─DailyDash│    │    ├─Calendar │    │    ├─SetupWiz │
│    ├─Kitchen  │    │    ├─Market   │    │    ├─Spaces   │
│    └─Alerts   │    │    ├─Recipes  │    │    ├─Employees│
│               │    │    └─Suggest  │    │    ├─Schedule │
└───────────────┘    └───────────────┘    │    └─Reports  │
                                          └───────────────┘
        ┌─────────────────────┐
        ▼                     ▼
┌───────────────┐    ┌───────────────┐
│      IA       │    │  AJUSTES      │
│               │    │               │
│   AIChat      │    │ SettingsView  │
│   (1,132 ln)  │    │    │          │
│    │          │    │    └─Members  │
│    ├─TextMsg  │    │               │
│    ├─Cards    │    └───────────────┘
│    ├─Recipes  │
│    └─Alerts   │
└───────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DynamicFAB (Contextual)                      │
│                                                                  │
│  Recetario:                    Hogar:                           │
│  • Nueva receta               • Nuevo espacio                   │
│  • Agregar al mercado         • Agregar empleado                │
│  • Registrar comida           • Rutina rápida                   │
│  • Sugerencia IA              • Inspección                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Base de Datos (Supabase PostgreSQL)

### 4.1 Módulo Recetario

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `recipes` | 28 | Catálogo de recetas con ingredientes (JSONB) |
| `day_menu` | 12 | Menú por día del ciclo (desayuno/almuerzo/cena) |
| `market_items` | 82 | Items del mercado con categorías |
| `inventory` | ~70 | Estado actual del inventario |
| `market_checklist` | ~68 | Estado de compras (checked) |
| `ingredient_categories` | 10 | Categorías de ingredientes |
| `ingredient_aliases` | 51+ | Mapeo nombres (receta → mercado) |
| `preparations` | 17 | Preparaciones base (hogao, guacamole, etc.) |
| `meal_feedback` | variable | Feedback de comidas |
| `adjustment_suggestions` | variable | Sugerencias automáticas |
| `completed_days` | variable | Días completados del menú |

### 4.2 Módulo Presupuesto

| Tabla | Descripción |
|-------|-------------|
| `budgets` | Presupuestos semanales/mensuales |
| `purchases` | Historial de compras |
| `price_history` | Tracking de precios |

### 4.3 Módulo Hogar

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| `households` | 1+ | Configuración del hogar |
| `space_types` | 22 | Tipos de espacio predefinidos |
| `spaces` | 24+ | Espacios reales del hogar |
| `home_employees` | 2+ | Empleados domésticos |
| `task_templates` | 88+ | Plantillas de tareas |
| `scheduled_tasks` | variable | Tareas programadas |
| `cleaning_history` | variable | Historial de limpieza |
| `employee_checkins` | variable | Registros check-in/out |
| `cleaning_ratings` | variable | Calificaciones |
| `cleaning_supplies` | variable | Inventario limpieza |
| `inspection_reports` | variable | Reportes inspección |
| `quick_routine_logs` | variable | Log de rutinas |

### 4.4 Sistema Multi-Tenant (Autenticación)

| Tabla | Descripción |
|-------|-------------|
| `user_profiles` | Perfiles de usuario (extiende auth.users) |
| `household_memberships` | Membresías usuario → hogar con roles |
| `household_invitations` | Códigos de invitación (8 caracteres) |

### 4.5 Programación Inteligente

| Tabla | Descripción |
|-------|-------------|
| `schedule_templates` | Templates de horarios |
| `daily_task_instances` | Instancias diarias |
| `schedule_config` | Configuración global |
| `task_categories` | Categorías de tareas |
| `employee_space_assignments` | Asignaciones empleado-espacio |
| `learned_task_durations` | Duraciones aprendidas (ML) |
| `employee_performance_scores` | Métricas de rendimiento |
| `workload_predictions_log` | Predicciones de carga |

**Total: 40+ tablas con Row-Level Security (RLS)**

---

## 5. API Endpoints

### 5.1 Generación de Recetas (`/api/generate-recipe`)

```typescript
// Input
{
  availableIngredients: string[],
  mealType: 'breakfast' | 'lunch' | 'dinner',
  recipeStyle: 'saludable' | 'rapida' | 'economica' |
               'alta-proteina' | 'baja-carbohidrato' |
               'vegetariana' | 'comfort' | 'ligera',
  recentRecipes?: string[]
}

// Output: Receta completa con porciones, pasos, nutrición
```

### 5.2 Chat IA (`/api/ai-assistant`)

```typescript
// Input
{
  message: string,
  context: {
    currentMenu: DayMenu[],
    inventory: InventoryItem[],
    tasks: ScheduledTask[]
  }
}

// Output: RichMessage (text, cards, recipes, alerts, lists)
```

### 5.3 APIs de Visión

| Endpoint | Input | Output |
|----------|-------|--------|
| `/api/generate-recipe-image` | Recipe object | URL imagen |
| `/api/generate-recipe-from-image` | Foto de receta | Recipe object |
| `/api/match-recipe-image` | Foto de plato | Matching recipes |
| `/api/scan-pantry` | Foto de despensa | InventoryItem[] |
| `/api/scan-receipt` | Foto de recibo | MarketItem[] |

### 5.4 Utilidades

| Endpoint | Propósito |
|----------|-----------|
| `/api/parse-market-items` | Texto libre → items estructurados |
| `/api/analyze-room` | Descripción → tareas sugeridas |
| `/api/seed-schedule` | Inicializar datos |
| `/api/generate-library-images` | Batch de imágenes |

---

## 6. Sistema de Autenticación Multi-Tenant

### 6.1 Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────▶│  user_profiles  │────▶│   memberships   │
│   (Supabase)    │     │   (id, email,   │     │  (user_id,      │
│                 │     │    full_name)   │     │   household_id, │
└─────────────────┘     └─────────────────┘     │   role)         │
                                                └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   households    │
                                                │   (id, name,    │
                                                │    config)      │
                                                └─────────────────┘
```

### 6.2 Roles y Permisos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `admin` | Administrador del hogar | Control total |
| `familia` | Miembro de familia | Ver/editar menú, recetas, compras |
| `empleado` | Empleado doméstico | Ver tareas, check-in, completar |

### 6.3 Permisos Detallados

**Lectura:**
- `view_menu`, `view_shopping_list`, `view_tasks`, `view_inventory`

**Empleado:**
- `complete_tasks`, `update_inventory`, `check_in`

**Edición (admin + familia):**
- `edit_menu`, `edit_recipes`, `edit_shopping_list`

**Gestión (solo admin):**
- `manage_employees`, `manage_spaces`, `manage_tasks`
- `manage_members`, `manage_invitations`, `delete_data`

### 6.4 Sistema de Invitaciones

```
1. Admin crea invitación → código 8 caracteres (ej: "ABCD-1234")
2. Admin comparte código o link
3. Invitado va a /join o usa link directo
4. Sistema valida código (expiración, usos)
5. Invitado se registra/login
6. Se crea membresía con rol asignado
```

### 6.5 Funciones RPC en Supabase

| Función | Propósito |
|---------|-----------|
| `generate_invitation_code()` | Genera código único |
| `create_invitation()` | Crea invitación (solo admins) |
| `use_invitation_code()` | Usa código para unirse |
| `get_my_memberships()` | Obtiene hogares del usuario |
| `check_user_permission()` | Verifica permiso específico |
| `handle_new_user_profile()` | Trigger: crea perfil en registro |

---

## 7. Flujos de Usuario Principales

### 7.1 Flujo: Planificación de Menú

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Calendar │───▶│  Recipe  │───▶│ Feedback │───▶│ Suggest  │
│   View   │    │  Modal   │    │  Modal   │    │  Panel   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                │                │               │
     ▼                ▼                ▼               ▼
 day_menu         recipes        meal_feedback   adjustment_
                                                 suggestions
```

1. Usuario ve calendario de 12 días
2. Click en día → ve recetas del día
3. Click en receta → ve detalles + nutrición
4. Después de comer → registra feedback
5. Sistema genera sugerencias automáticas

### 7.2 Flujo: Lista de Compras

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Market  │───▶│   Add    │───▶│  Scan    │
│   View   │    │  Custom  │    │ Pantry   │
└──────────┘    └──────────┘    └──────────┘
     │                │                │
     ▼                ▼                ▼
market_items    parse AI        inventory
+ checklist     + categories    + camera
```

1. Ver lista automática del menú
2. Agregar items custom (IA parsea texto)
3. Marcar comprados
4. Cambiar a modo "Despensa"
5. Escanear con cámara para actualizar

### 7.3 Flujo: Sugerencias IA

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Smart    │───▶│ Generate │───▶│  Add to  │
│ Suggest  │    │  Recipe  │    │  Menu    │
└──────────┘    └──────────┘    └──────────┘
     │                │                │
     ▼                ▼                ▼
 inventory      /api/generate    day_menu
 + recipes      -recipe          + recipes
```

1. Sistema analiza inventario vs recetas
2. Muestra qué se puede cocinar
3. Usuario selecciona estilo de receta
4. IA genera receta nueva
5. Agregar al menú

### 7.4 Flujo: Gestión del Hogar

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Setup   │───▶│  Spaces  │───▶│ Employees│───▶│ Schedule │
│  Wizard  │    │  Panel   │    │  Panel   │    │ Generator│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │                │                │               │
     ▼                ▼                ▼               ▼
 households        spaces        home_employees  scheduled_
                                                 tasks
```

1. Admin configura hogar (wizard)
2. Define espacios (tipo, tamaño, uso)
3. Agrega empleados (horarios, zonas)
4. Sistema genera tareas automáticas
5. Optimizador balancea carga

### 7.5 Flujo: Chat IA

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  AIChat  │───▶│   API    │───▶│  Rich    │
│  Input   │    │ Assistant│    │ Response │
└──────────┘    └──────────┘    └──────────┘
     │                │                │
     ▼                ▼                ▼
  message         context          cards,
  + voice       (menu, tasks,     recipes,
                inventory)        alerts
```

1. Usuario escribe o habla pregunta
2. Sistema inyecta contexto actual
3. Gemini procesa y responde
4. Respuesta rica (cards, listas, acciones)

---

## 8. Lógica de Negocio Crítica

### 8.1 Algoritmo de Matching de Ingredientes

```typescript
// Ubicación: src/lib/inventory-check.ts

// 4 pasos de búsqueda:
1. Coincidencia exacta en inventario
2. Búsqueda en tabla ingredient_aliases
3. Coincidencia parcial (uno contiene al otro)
4. Fuzzy matching por palabras (≥4 caracteres)

// Resultado: IngredientStatus con availablePercent (0-100%)
```

### 8.2 Verificación de Disponibilidad

```typescript
// Receta disponible si ≥80% ingredientes disponibles
// Preparaciones disponibles si ≥70% de sus ingredientes

// Ejemplo:
"Hogao + Aguacate" → se separa por "+"
→ Verifica "Hogao" (preparación)
  → Verifica tomate, cebolla, ajo, aceite
→ Verifica "Aguacate"
```

### 8.3 Sistema de Feedback y Aprendizaje

```typescript
// Ubicación: src/lib/feedback-learning.ts

1. Usuario califica: porciones (poca/bien/mucha), sobras
2. Sistema analiza patrones
3. Genera sugerencias:
   - Ajustar porciones +/-10%
   - Cambiar ingrediente
   - Actualizar cantidad en mercado
4. Usuario aplica o descarta
5. Mejora con el tiempo
```

### 8.4 Optimización de Horarios

```typescript
// Ubicación: src/lib/home/intelligence.ts

1. Analiza carga por empleado/día
2. Detecta problemas:
   - Sobrecarga (>8 horas)
   - Gaps de cobertura
   - Ineficiencias
3. Sugiere optimizaciones:
   - Reprogramar tareas
   - Agregar empleado
   - Reducir frecuencia
   - Combinar tareas
4. Muestra % mejora proyectada
```

---

## 9. Sistema PWA Offline

### 9.1 Arquitectura Offline

```
┌─────────────────────────────────────────────────────────────┐
│                      Service Worker (Serwist)                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Cache API  │  │  IndexedDB   │  │   Sync API   │      │
│  │  (assets)    │  │  (data)      │  │  (mutations) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Datos Cacheados

| Store | Datos |
|-------|-------|
| `dayMenus` | Menú de 12 días |
| `recipes` | Catálogo completo |
| `inventory` | Estado de despensa |
| `marketItems` | Lista de mercado |

### 9.3 Hooks de Sincronización

```typescript
// src/hooks/useOfflineSync.ts

- Detecta estado online/offline
- Cola de mutaciones pendientes
- Sincroniza al reconectar
- Muestra indicador visual
```

---

## 10. Estado de la Aplicación

### 10.1 Estado Global (Zustand)

```typescript
// src/lib/stores/useAppStore.ts

interface AppState {
  activeSection: MainSection;     // 'hoy' | 'recetario' | 'hogar' | 'ia' | 'ajustes'
  recetarioTab: RecetarioTab;     // 'calendar' | 'market' | 'recipes' | 'suggestions'
  isFabOpen: boolean;
  modals: {
    recipe: Recipe | null;
    feedback: {...} | null;
    // ...
  };
}
```

### 10.2 Estado del Hogar (Zustand)

```typescript
// src/lib/stores/useHouseholdStore.ts

interface HouseholdState {
  currentHouseholdId: string | null;
  employees: HomeEmployee[];
  spaces: Space[];
  // ...
}
```

### 10.3 Fetching de Datos (React Query)

```typescript
// src/lib/hooks/useAppData.ts

// Hooks disponibles:
useRecipes()          // Todas las recetas
useMarketItems()      // Items del mercado
useInventory()        // Estado de inventario
useDayMenus()         // Menú del ciclo
useSuggestionsCount() // Conteo de sugerencias pendientes
useSpaces()           // Espacios del hogar
useEmployees()        // Empleados
// ...
```

---

## 11. Integraciones Externas

### 11.1 Activas

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **Google Gemini** | IA completa | GOOGLE_GEMINI_API_KEY |
| **Supabase** | DB + Auth | NEXT_PUBLIC_SUPABASE_* |
| **Vercel** | Deploy + Edge | Automático desde GitHub |

### 11.2 Preparadas (Código Existe)

| Servicio | Estado | Archivo |
|----------|--------|---------|
| WhatsApp Share | Listo | src/lib/whatsapp-share.ts |
| Speech Recognition | Listo | src/hooks/useSpeechRecognition.ts |
| Push Notifications | Parcial | src/lib/notifications.ts |

### 11.3 Potenciales

| Servicio | Caso de Uso |
|----------|-------------|
| Google Calendar | Sincronizar menú |
| Rappi/Merqueo | Compras directas |
| Apple Health | Tracking nutricional |
| Alexa/Google Home | Control por voz |
| Stripe | Monetización |

---

## 12. Fortalezas del Sistema

### 12.1 Técnicas

| Fortaleza | Descripción |
|-----------|-------------|
| **TypeScript 100%** | Type safety en todo el código |
| **IA Avanzada** | Gemini 2.0/2.5 para texto, visión, imágenes |
| **PWA Completa** | Funciona offline, instalable |
| **Multi-tenant** | Sistema de roles y permisos robusto |
| **State Moderno** | Zustand + React Query |
| **DB Optimizada** | 40+ tablas con RLS |
| **Tests** | Vitest configurado |

### 12.2 Funcionales

| Fortaleza | Descripción |
|-----------|-------------|
| **Ciclo de Menú** | 12 días rotativos bien definido |
| **Porciones** | Diferenciadas por persona |
| **Feedback Loop** | Aprende de preferencias |
| **Matching Inteligente** | 4 niveles de búsqueda |
| **Sustituciones** | 90+ alternativas |
| **Preparaciones** | 17 bases caseras reconocidas |
| **Gestión Hogar** | 22 tipos de espacio, 88+ plantillas |

### 12.3 UX

| Fortaleza | Descripción |
|-----------|-------------|
| **Mobile-first** | Optimizado para teléfono |
| **FAB Contextual** | Acciones rápidas por sección |
| **Chat IA Rico** | Cards, recetas, alertas |
| **Onboarding** | Wizard guiado |
| **Offline** | Funciona sin internet |

---

## 13. Constantes del Sistema

| Constante | Valor | Propósito |
|-----------|-------|-----------|
| `CYCLE_START` | 2026-01-06 (Lunes) | Inicio del ciclo de menú |
| `CYCLE_LENGTH` | 12 días | Duración del ciclo (sin domingos) |
| `LUIS_PORTIONS` | 3 de 5 | Porciones grandes |
| `MARIANA_PORTIONS` | 2 de 5 | Porciones medianas |
| `PREP_THRESHOLD` | 70% | Mínimo para preparación disponible |
| `INGREDIENT_THRESHOLD` | 80% | Mínimo para receta "posible" |
| `RECIPE_STYLES` | 8 tipos | Opciones de generación |
| `INVITATION_CODE_LENGTH` | 8 caracteres | Formato: XXXX-XXXX |
| `INVITATION_EXPIRY` | 7 días | Default de expiración |

---

## 14. Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://snyelpbcfbzaxadrtxpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# Google Gemini
GOOGLE_GEMINI_API_KEY=***

# Opcional
NEXT_PUBLIC_APP_URL=https://recetario-app-self.vercel.app
```

---

## 15. Comandos de Desarrollo

```bash
# Desarrollo
npm run dev           # Servidor local (localhost:3000)
npm run build         # Build de producción
npm run start         # Servidor de producción
npm run lint          # Linting

# Tests
npm run test          # Watch mode
npm run test:ui       # UI dashboard
npm run test:run      # Run once
npm run test:coverage # Coverage report

# Git + Deploy
git add .
git commit -m "tipo: descripción"
git push origin main  # Auto-deploy a Vercel
```

---

## 16. Próximos Pasos Recomendados

### Corto Plazo (1-2 semanas)
- [ ] Fotos de recetas (Vercel Blob)
- [ ] Timer de cocción con notificaciones
- [ ] Dark mode
- [ ] Mejorar UI de escaneo de recibos

### Mediano Plazo (1-2 meses)
- [ ] Invitaciones funcionando end-to-end
- [ ] Notificaciones push configuradas
- [ ] Gráficas de gasto/nutrición
- [ ] Voz para seguir recetas

### Largo Plazo (3-6 meses)
- [ ] App nativa (React Native/Expo)
- [ ] Integración con supermercados
- [ ] Marketplace de recetas
- [ ] Multi-familia completo

---

## 17. Preguntas Frecuentes Técnicas

**Q: ¿Cómo agrego una nueva receta?**
A: `RecipeForm.tsx` hace upsert a `recipes`. También disponible via chat IA.

**Q: ¿Cómo funciona el ciclo de 15 días?**
A: Son 12 días hábiles (excluyendo domingos). `getDayOfCycle()` calcula basado en `CYCLE_START`.

**Q: ¿Cómo verifico ingredientes disponibles?**
A: `checkRecipeIngredients()` en `lib/inventory-check.ts` usa 4 niveles de matching.

**Q: ¿Cómo genero una receta con IA?**
A: POST a `/api/generate-recipe` con `availableIngredients`, `mealType`, `recipeStyle`.

**Q: ¿Cómo funciona el multi-tenant?**
A: `AuthContext` maneja sesión, `household_memberships` vincula usuarios con hogares y roles.

**Q: ¿Cómo invito a alguien?**
A: `createInvitation()` genera código, invitado usa `/join?code=XXXX-XXXX`.

---

*Documento actualizado: 2026-01-19*
*Versión: 2.0*
*Para uso con Claude Code y análisis de proyecto*
