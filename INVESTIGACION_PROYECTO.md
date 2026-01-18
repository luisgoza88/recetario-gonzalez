# Recetario App - Documento de Investigacion Exhaustiva

## Resumen Ejecutivo

**Nombre del Proyecto:** Recetario App (evolucionado a "Hogar Inteligente")
**Usuarios Objetivo:** Familia Gonzalez (Luis y Mariana)
**Estado:** En produccion activa
**URL Produccion:** https://recetario-app-self.vercel.app

---

## 1. Vision y Proposito del Proyecto

### 1.1 Problema que Resuelve

La aplicacion nacio como un **recetario familiar** para resolver:
- Planificacion de comidas para un ciclo de 15 dias (12 dias habiles, excluyendo domingos)
- Control de porciones diferenciadas (Luis: 3 porciones, Mariana: 2 porciones)
- Gestion de lista de mercado sincronizada con el menu
- Control de inventario/despensa

Ha **evolucionado** para incluir **gestion integral del hogar**:
- Administracion de espacios del hogar (interiores y exteriores)
- Gestion de empleados domesticos (horarios, zonas, tareas)
- Programacion inteligente de limpieza
- Historial y reportes de mantenimiento

### 1.2 Usuarios Principales

1. **Luis** - Porciones mas grandes (3 de 5 totales), preferencias de comida mas sustanciosa
2. **Mariana** - Porciones medianas (2 de 5 totales), preferencias mas ligeras

### 1.3 Filosofia de Diseno

- **Mobile-first**: Disenado para uso en celular mientras se cocina o compra
- **Sin autenticacion**: Uso familiar directo, sin login
- **PWA**: Funciona offline, instalable como app
- **IA asistida**: Generacion de recetas, sugerencias inteligentes, parsing de productos

---

## 2. Arquitectura Tecnica

### 2.1 Stack Tecnologico

| Capa | Tecnologia | Version |
|------|------------|---------|
| Frontend | Next.js | 16.1.2 |
| UI Framework | React | 19.2.3 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Backend/DB | Supabase (PostgreSQL) | - |
| IA | OpenAI API | gpt-4o-mini |
| PWA | Serwist | 9.5.0 |
| Iconos | Lucide React | 0.562.0 |
| Deploy | Vercel | Auto-deploy |

### 2.2 Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx              # Pagina principal con navegacion
│   ├── layout.tsx            # Layout global
│   ├── offline/page.tsx      # Pagina offline PWA
│   └── api/
│       ├── generate-recipe/  # Generacion IA de recetas
│       ├── parse-market-items/ # Parsing IA de productos
│       └── analyze-room/     # Analisis IA de habitaciones
├── components/
│   ├── CalendarView.tsx      # Vista calendario de menus
│   ├── MarketView.tsx        # Lista de mercado/despensa
│   ├── RecipesView.tsx       # Catalogo de recetas
│   ├── SuggestionsPanel.tsx  # Panel de ajustes sugeridos
│   ├── SmartSuggestions.tsx  # Sugerencias IA por receta
│   ├── FeedbackModal.tsx     # Sistema de feedback
│   ├── RecipeModal.tsx       # Modal detalle de receta
│   ├── NutritionDisplay.tsx  # Informacion nutricional
│   ├── BudgetWidget.tsx      # Widget de presupuesto
│   ├── forms/
│   │   └── RecipeForm.tsx    # Formulario crear/editar recetas
│   └── home/
│       ├── HomeView.tsx           # Vista principal hogar
│       ├── HomeSetupWizard.tsx    # Wizard configuracion
│       ├── EmployeesPanel.tsx     # Gestion empleados
│       ├── SpacesPanel.tsx        # Gestion espacios
│       ├── ScheduleGenerator.tsx  # Generador de horarios
│       ├── ScheduleOptimizer.tsx  # Optimizador de carga
│       ├── DailyDashboard.tsx     # Dashboard diario
│       ├── WeeklyCalendar.tsx     # Calendario semanal
│       ├── QuickRoutines.tsx      # Rutinas rapidas
│       ├── CleaningRating.tsx     # Calificacion limpieza
│       ├── CleaningHistory.tsx    # Historial limpieza
│       ├── SuppliesInventory.tsx  # Inventario productos
│       ├── InspectionMode.tsx     # Modo inspeccion
│       ├── MonthlyReport.tsx      # Reporte mensual
│       ├── EmployeeCheckIn.tsx    # Check-in empleados
│       └── RoomScanner.tsx        # Escaner IA de cuartos
├── lib/
│   ├── supabase/client.ts         # Cliente Supabase
│   ├── inventory-check.ts         # Verificacion inventario
│   ├── smart-substitutions.ts     # Sistema sustituciones
│   ├── feedback-learning.ts       # Aprendizaje de feedback
│   ├── menu-tasks-integration.ts  # Integracion menu-tareas
│   ├── notifications.ts           # Sistema notificaciones
│   ├── budget-service.ts          # Servicio presupuesto
│   └── units.ts                   # Conversion unidades
├── data/
│   ├── recipes.ts            # Datos iniciales recetas
│   ├── menu.ts               # Datos menu inicial
│   └── substitutions.ts      # Mapa de sustituciones
└── types/
    └── index.ts              # Definiciones TypeScript
```

### 2.3 Esquema de Base de Datos (Supabase)

#### Modulo Recetario
| Tabla | Registros | Descripcion |
|-------|-----------|-------------|
| `recipes` | 28 | Catalogo de recetas |
| `day_menu` | 12 | Menu por dia del ciclo (0-11) |
| `market_items` | 82 | Items de mercado |
| `inventory` | 70 | Estado inventario/despensa |
| `market_checklist` | 68 | Estado checklist compras |
| `ingredient_categories` | 10 | Categorias de ingredientes |
| `ingredient_aliases` | 112 | Mapeo nombres ingredientes |
| `preparations` | 17 | Preparaciones base (hogao, etc.) |
| `meal_feedback` | 0 | Feedback de comidas |
| `adjustment_suggestions` | 0 | Sugerencias de ajuste |
| `substitution_history` | 0 | Historial sustituciones |
| `completed_days` | 0 | Dias completados |

#### Modulo Presupuesto
| Tabla | Descripcion |
|-------|-------------|
| `budgets` | Presupuestos semanales/mensuales |
| `purchases` | Registro de compras |
| `price_history` | Historial de precios |

#### Modulo Hogar
| Tabla | Registros | Descripcion |
|-------|-----------|-------------|
| `households` | 1 | Configuracion del hogar |
| `space_types` | 22 | Tipos de espacio predefinidos |
| `spaces` | 24 | Espacios del hogar |
| `home_employees` | 2 | Empleados domesticos |
| `task_templates` | 88 | Plantillas de tareas |
| `scheduled_tasks` | 0 | Tareas programadas |
| `cleaning_history` | 0 | Historial de limpieza |

---

## 3. Funcionalidades Actuales

### 3.1 Modulo Recetario

#### Calendario de Menus
- Ciclo de 12 dias habiles (excluyendo domingos)
- Inicio: Lunes 6 de Enero 2026
- Vista mensual con indicador de dia del ciclo
- Detalle de desayuno, almuerzo y cena por dia
- Marcar dias como completados
- Recordatorios por dia

#### Gestion de Recetas
- CRUD completo de recetas
- Campos: nombre, tipo, ingredientes, pasos, tiempos, nutricion
- Porciones diferenciadas (Luis vs Mariana)
- Filtrado por tipo de comida
- Busqueda por nombre o ingrediente
- Dificultad: facil, media, dificil
- Tags dieteticos: vegetariano, vegano, sin-gluten, keto, etc.

#### Lista de Mercado
- Dos modos: Compras y Despensa
- Categorias con iconos
- Controles +/- para cantidades
- Progress bar de compras
- Barra de progreso de inventario
- Items personalizados con IA
- Busqueda de productos

#### Sistema de Sugerencias Inteligentes
- Verificacion de ingredientes vs inventario
- Alternativas con ingredientes disponibles
- **Generacion de recetas con IA**:
  - Estilos: saludable, rapida, economica, alta-proteina, baja-carbohidrato, vegetariana, comfort, ligera
  - Considera ingredientes disponibles
  - Evita recetas recientes
  - Usa preparaciones caseras

#### Sistema de Feedback
- Rating de porciones (poca/bien/mucha)
- Rating de sobras (nada/poco/mucho)
- Marcar ingredientes faltantes
- Marcar ingredientes agotados (actualiza inventario)
- Notas adicionales
- **Aprendizaje automatico**: genera sugerencias de ajuste

#### Panel de Ajustes
- Sugerencias automaticas basadas en feedback
- Tipos: porciones, ingredientes, mercado
- Aplicar o descartar sugerencias
- Conteo de feedback por sugerencia

### 3.2 Modulo Hogar

#### Wizard de Configuracion
- Nombre del hogar
- Seleccion de espacios (interiores/exteriores)
- Configuracion de empleados
- Generacion automatica de tareas

#### Gestion de Espacios
- Tipos predefinidos (22 tipos)
- Categorias: interior/exterior
- Nivel de uso: alto/medio/bajo
- Caracteristicas especiales (bano, area, etc.)
- Tareas configurables por espacio

#### Gestion de Empleados
- Nombre, rol, zona (interior/exterior/ambos)
- Dias de trabajo
- Horas por dia
- Horarios detallados por dia (entrada/salida)
- Notas y telefono

#### Sistema de Tareas
- Plantillas con frecuencia (diaria, semanal, quincenal, mensual, trimestral)
- Tiempo estimado en minutos
- Prioridad (alta/normal/baja)
- Asignacion a empleado
- Estado: pendiente/en_progreso/completada/omitida

#### Dashboard y Calendario
- Vista diaria con tareas del dia
- Vista semanal/mensual
- Progreso de completado
- Carga de trabajo por empleado

#### Herramientas Adicionales
- Rutinas rapidas
- Check-in de empleados
- Inventario de productos de limpieza
- Historial de limpieza
- Modo inspeccion
- Reportes mensuales
- Optimizador de horarios

### 3.3 Integraciones IA

1. **Generacion de Recetas** (`/api/generate-recipe`)
   - Modelo: gpt-4o-mini
   - Input: ingredientes disponibles, tipo comida, estilo, preferencias
   - Output: receta completa con porciones, pasos, nutricion

2. **Parsing de Productos** (`/api/parse-market-items`)
   - Extrae items de texto libre a formato estructurado
   - Detecta categoria, cantidad, unidad

3. **Analisis de Habitaciones** (`/api/analyze-room`)
   - Analiza descripcion de espacio
   - Sugiere tareas de limpieza apropiadas

---

## 4. Historial de Evolucion

### Commits Principales (cronologico inverso)

1. **Sistema inteligente para agregar productos al mercado** - Parsing IA
2. **Sistema de generacion de recetas con IA mejorado** - Estilos de receta
3. **Task configuration per space with frequencies** - Frecuencias por espacio
4. **Availability logic fix** - Correccion matching ingredientes
5. **Detailed schedule with entry/exit times** - Horarios detallados
6. **Home management panels and intelligent scheduling** - Paneles hogar
7. **Home Management module with setup wizard** - Modulo hogar
8. **Smart recipe suggestions with AI generation** - Sugerencias IA
9. **PWA offline, timers, scaling, substitutions, notifications** - PWA completo
10. **Complete feedback system with auto-adjustments** - Sistema feedback
11. **Pantry/despensa mode with inventory tracking** - Modo despensa
12. **Initial RecetarioApp setup with Supabase** - Setup inicial

---

## 5. Oportunidades de Mejora

### 5.1 Funcionalidades Pendientes Identificadas

- [ ] Autenticacion de usuarios (multi-familia)
- [ ] Sincronizacion entre dispositivos
- [ ] Fotos de recetas
- [ ] Escaneo de recibos de supermercado
- [ ] Integracion con supermercados (precios en tiempo real)
- [ ] Planificacion automatica de menus basada en preferencias
- [ ] Exportar lista de mercado a apps de supermercado
- [ ] Notificaciones push (recordatorios de cocina)
- [ ] Timer de coccion integrado
- [ ] Modo voz para seguir recetas
- [ ] Compartir recetas entre usuarios
- [ ] Valoracion de recetas (estrellas)
- [ ] Historial de lo que se cocino cada dia
- [ ] Graficas de gasto mensual
- [ ] Prediccion de cuando se agotaran ingredientes

### 5.2 Mejoras Tecnicas Sugeridas

#### Performance
- [ ] Implementar React Server Components donde sea posible
- [ ] Agregar caching con SWR o React Query
- [ ] Optimizar queries de Supabase con indices
- [ ] Lazy loading de componentes pesados

#### UX/UI
- [ ] Dark mode
- [ ] Animaciones de transicion (Framer Motion)
- [ ] Skeleton loaders
- [ ] Pull-to-refresh en mobile
- [ ] Gestos de swipe para acciones rapidas
- [ ] Onboarding para nuevos usuarios

#### Codigo
- [ ] Tests unitarios y de integracion
- [ ] Storybook para componentes
- [ ] Documentacion de API
- [ ] Error boundaries
- [ ] Logging estructurado
- [ ] Migraciones de base de datos versionadas

### 5.3 Integraciones Potenciales

| Servicio | Uso Potencial |
|----------|---------------|
| **Twilio/WhatsApp** | Notificaciones de menu diario |
| **Google Calendar** | Sincronizar menu con calendario |
| **Rappi/Merqueo** | Compras directas desde la app |
| **Notion** | Exportar recetas |
| **Apple Health** | Tracking nutricional |
| **Alexa/Google Home** | Control por voz |
| **OpenAI Vision** | Escanear recibos, identificar ingredientes |
| **Stripe** | Si se monetiza (plan premium) |

---

## 6. Tecnologias a Considerar

### 6.1 Para Escalar

| Tecnologia | Caso de Uso |
|------------|-------------|
| **Clerk/Auth.js** | Autenticacion multi-usuario |
| **Tanstack Query** | Cache y sync de datos |
| **Zustand/Jotai** | Estado global mas complejo |
| **tRPC** | API type-safe |
| **Drizzle ORM** | Migraciones tipadas |
| **Turso** | SQLite distribuido (alternativa) |
| **Vercel Blob** | Almacenar fotos de recetas |
| **Resend** | Emails transaccionales |
| **Inngest** | Jobs en background |
| **Sentry** | Monitoreo de errores |
| **PostHog** | Analytics |

### 6.2 Para IA Avanzada

| Tecnologia | Caso de Uso |
|------------|-------------|
| **Claude API** | Generacion de recetas mas creativa |
| **Langchain** | Chains complejas de IA |
| **Pinecone/Supabase Vector** | Busqueda semantica de recetas |
| **Replicate** | Generacion de imagenes de platos |
| **Whisper** | Transcripcion de voz |
| **RAG** | Responder preguntas sobre recetas |

---

## 7. Contexto para Claude Code

### 7.1 Convenciones del Proyecto

```typescript
// Nomenclatura
- Componentes: PascalCase (CalendarView.tsx)
- Funciones: camelCase (loadData)
- Tipos: PascalCase (Recipe, MarketItem)
- Constantes: SCREAMING_SNAKE (CYCLE_START)

// Estilos
- Tailwind CSS 4 (nueva sintaxis)
- Colores principales: green-700, orange-600, blue-600, purple-600
- Rounded: xl/2xl para cards, full para botones pill

// Patrones
- 'use client' en componentes interactivos
- supabase.from().select() para queries
- upsert con onConflict para evitar errores
- async/await con try/catch
```

### 7.2 Comandos Utiles

```bash
# Desarrollo
npm run dev          # Servidor local
npm run build        # Build de produccion
npm run lint         # Linting

# Git (despues de cambios)
git add .
git commit -m "tipo: descripcion"
git push origin main  # Auto-deploy a Vercel
```

### 7.3 Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
OPENAI_API_KEY=sk-xxx
```

### 7.4 IDs Importantes

- **Supabase Project ID:** snyelpbcfbzaxadrtxpa
- **Ciclo inicia:** 2026-01-06 (Lunes 6 Enero)
- **Porciones estandar:** 5 (3 Luis + 2 Mariana)

---

## 8. Proximos Pasos Recomendados

### Corto Plazo (1-2 semanas)
1. Agregar fotos a las recetas (Vercel Blob)
2. Implementar timer de coccion
3. Dark mode
4. Tests basicos

### Mediano Plazo (1-2 meses)
1. Autenticacion (compartir con familia extendida)
2. Notificaciones push
3. Graficas de gasto/nutricion
4. Escaneo de recibos

### Largo Plazo (3-6 meses)
1. App nativa (React Native o Expo)
2. Integracion con supermercados
3. Asistente de voz
4. Marketplace de recetas

---

## 9. Preguntas Frecuentes para Claude

**Q: Como agrego una nueva receta?**
A: Usa el componente `RecipeForm.tsx` que hace upsert a la tabla `recipes`.

**Q: Como funciona el ciclo de 15 dias?**
A: Son 12 dias habiles (excluyendo domingos). La funcion `getDayOfCycle()` calcula el dia basado en `CYCLE_START`.

**Q: Como verifico si hay ingredientes disponibles?**
A: Usa `checkRecipeIngredients()` de `lib/inventory-check.ts` que compara receta vs tabla `inventory`.

**Q: Como genero una receta con IA?**
A: POST a `/api/generate-recipe` con `availableIngredients`, `mealType`, y `recipeStyle`.

**Q: Como funciona el sistema de feedback?**
A: `FeedbackModal` guarda en `meal_feedback`, luego `feedback-learning.ts` genera sugerencias automaticas.

---

*Documento generado el 2026-01-18*
*Para usar con Claude Code en futuras sesiones de desarrollo*
