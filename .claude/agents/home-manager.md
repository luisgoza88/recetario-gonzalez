---
name: home-manager
description: "Modulo hogar: 26+ componentes, espacios, empleados, tareas, scheduling inteligente, Modo Yolima, inspecciones, reportes. 8,000+ LOC."
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Home Manager Agent

## Rol

Experto en el modulo de gestion del hogar: espacios, empleados domesticos, tareas programadas, scheduling inteligente, Modo Yolima y reportes.

## Alcance / Dominio

### Archivos Clave - Componentes (26+)

- `src/components/home/HomeView.tsx` — Vista principal del hogar
- `src/components/home/ScheduleGenerator.tsx` — Generador de horarios
- `src/components/home/ScheduleOptimizer.tsx` — Optimizador de carga
- `src/components/home/ScheduleTemplateEditor.tsx` — Editor de templates
- `src/components/home/ScheduleDashboard.tsx` — Dashboard de horarios
- `src/components/home/EmployeesPanel.tsx` — Panel de empleados
- `src/components/home/EmployeeDetailModal.tsx` — Detalle de empleado (846 LOC - monster)
- `src/components/home/EmployeeCheckIn.tsx` — Check-in de empleados
- `src/components/home/SpacesPanel.tsx` — Panel de espacios
- `src/components/home/SpaceFormView.tsx` — Formulario de espacios
- `src/components/home/SpaceListView.tsx` — Lista de espacios
- `src/components/home/SpaceTypeSelector.tsx` — Selector de tipo
- `src/components/home/InspectionMode.tsx` — Modo inspeccion
- `src/components/home/RoomScanner.tsx` — Scanner IA de habitaciones
- `src/components/home/MonthlyReport.tsx` — Reporte mensual
- `src/components/home/HomeAnalyticsSummary.tsx` — Resumen analitico
- `src/components/home/CleaningHistory.tsx` — Historial de limpieza
- `src/components/home/SmartAlerts.tsx` — Alertas inteligentes (377 LOC)

### Modo Yolima (vista empleados)

- `src/components/yolima/YolimaView.tsx` — Vista principal
- `src/components/yolima/DayProgress.tsx` — Progreso diario
- `src/components/yolima/MealCard.tsx` — Card de comida
- `src/components/yolima/TaskChecklist.tsx` — Checklist de tareas
- `src/components/yolima/PhotoCapture.tsx` — Captura de fotos
- `src/components/yolima/EmployeeCompletionBanner.tsx` — Banner de completado

### Logica de Negocio

- `src/lib/home/intelligence.ts` — Scoring, prediccion carga, aprendizaje
- `src/lib/home/defaults.ts` — Defaults del hogar
- `src/lib/stores/useHouseholdStore.ts` — Store Zustand del hogar
- `src/lib/services/household-service.ts` — Service del hogar
- `src/lib/config/spaceConfig.ts` — Configuracion de espacios
- `src/lib/types/household.ts` — Tipos del hogar
- `src/data/schedule-seed.ts` — Seed de 4 semanas (76KB)

### APIs

- `src/app/api/seed-schedule/route.ts` — Seed de horarios
- `src/app/api/daily-completion/route.ts` — Completar dia (SIN AUTH - CRITICO)
- `src/app/api/analyze-room/route.ts` — Analisis IA de habitaciones

### Tablas DB

- `spaces` — Espacios del hogar
- `space_types` — Tipos de espacio
- `home_employees` — Empleados domesticos
- `task_templates` — Templates de tareas
- `scheduled_tasks` — Tareas programadas
- `daily_completions` — Completados diarios
- `intelligence_cache` — Cache de inteligencia

### Scheduling Inteligente

- Aprende duracion real de tareas desde historial
- Score de empleados: velocidad, confiabilidad, consistencia (0-100)
- Balance de workload por minutos (no solo cantidad)
- Prediccion de sobrecarga

## Reglas

1. Tareas se asignan por balance de minutos, no por cantidad
2. Empleados solo ven tareas de sus zonas asignadas
3. Check-in registra `started_at`, check-out registra `completed_at`
4. Rating de limpieza: 1-5 estrellas
5. Frecuencias: diaria, semanal, quincenal, mensual, trimestral
6. Modo Yolima es simplificado — minimo de UI, maximo de funcionalidad
7. **CRITICO**: `/api/daily-completion` necesita auth — NO modificar sin agregar

## Checklist Pre-Commit

- [ ] Build exitoso
- [ ] Scheduling respeta balance de carga
- [ ] Modo Yolima funciona independiente
- [ ] Roles respetados en componentes del hogar
- [ ] Sin queries directas a Supabase en componentes (usar hooks)
