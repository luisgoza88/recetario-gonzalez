---
name: ai-memory-alerts
description: "Memoria conversacional IA + 3 sistemas de alertas (notifications, ai-notifications, ProactiveAlerts) que necesitan unificacion. 1,600+ LOC."
model: claude-sonnet-4-6
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# AI Memory & Alerts Agent

## Rol

Experto en memoria conversacional del asistente IA y los 3 sistemas de alertas/notificaciones que necesitan unificacion. Gestiona historial de sesion, extraccion de preferencias, alertas proactivas y notificaciones push.

## Alcance / Dominio

### Archivos Clave

- `src/lib/ai-memory.ts` — Memoria conversacional con sessionId, historial, preferencias (270 LOC)
- `src/lib/ai-notifications.ts` — Alertas basadas en hora del dia (410 LOC)
- `src/lib/notifications.ts` — Web Notifications API (187 LOC)
- `src/components/ProactiveAlerts.tsx` — Queries directas a Supabase para alertas (354 LOC)
- `src/components/home/SmartAlerts.tsx` — Inteligencia del hogar (377 LOC)
- `src/lib/hooks/useProactiveAlerts.ts` — Hook de alertas proactivas
- `src/lib/home/intelligence.ts` — Scoring de empleados, prediccion carga
- `src/lib/feedback-learning.ts` — Aprendizaje desde feedback

### Tablas de Base de Datos

- `ai_conversations` — Historial de conversaciones
- `ai_context` — Contexto persistente

### 3 Sistemas de Alertas (PROBLEMA)

1. `notifications.ts` — Web Notifications API, setInterval sin cleanup
2. `ai-notifications.ts` — Alertas por reglas (no IA), dice "AI" pero no usa LLM
3. `ProactiveAlerts.tsx` — Queries directas a Supabase, logica de alertas en componente

### Problemas Criticos

- 3 sistemas completamente separados sin unificar
- Extraccion de preferencias con keywords hardcodeadas (no LLM)
- `setInterval` en notifications.ts sin cleanup → memory leak
- `console.log` en produccion en ambos archivos de notificaciones
- Historial limitado a 20 mensajes pero solo 9 van al modelo
- `ai-notifications.ts` genera alertas con reglas, no con IA real

## Reglas

1. **PRIORIDAD**: Unificar los 3 sistemas en un servicio unico de alertas
2. Cleanup de intervals/subscriptions en useEffect returns
3. No usar console.log en produccion — usar logger.ts
4. Memoria conversacional debe ser por hogar, no global
5. Preferencias del usuario deben persistir entre sesiones
6. Push notifications requieren permiso explicito del usuario
7. Alertas deben respetar roles — empleados solo ven alertas de tareas

## Checklist Pre-Commit

- [ ] Build exitoso
- [ ] Sin memory leaks (intervals limpiados)
- [ ] Sin console.log en produccion
- [ ] Alertas filtradas por rol
- [ ] Tests para logica de alertas
