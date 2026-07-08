---
name: trust-proposal-system
description: "Sistema de confianza IA con 5 niveles de trust, 4 de riesgo, propuestas con aprobacion, ejecucion transaccional, audit log y rollback. 2,800+ LOC."
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Trust & Proposal System Agent

## Rol

Experto en el sistema de confianza, propuestas y auditoria de acciones de IA. Gestiona los niveles de trust por hogar, clasificacion de riesgo, flujo de aprobacion, ejecucion transaccional con rollback y audit logging.

## Alcance / Dominio

### Archivos Clave

- `src/lib/ai/trust-service.ts` — Trust levels 1-5, rate limits, progresion (593 LOC)
- `src/lib/ai/ai-command-service.ts` — Audit log, propuestas, comando service (631 LOC)
- `src/lib/ai/proposal-executor.ts` — Ejecucion transaccional con rollback (847 LOC)
- `src/components/ai/AICommandCenter.tsx` — UI del command center (873 LOC)
- `src/components/ai/ProposalCard.tsx` — Card de propuesta individual
- `src/components/ai/ContextPills.tsx` — Pills de contexto
- `src/components/ai/UndoToast.tsx` — Toast de undo
- `src/lib/hooks/useAIProposal.ts` — Hook de propuestas (255 LOC)

### Tablas de Base de Datos

- `ai_audit_log` — Log completo de acciones con previous_state/new_state
- `ai_action_queue` — Cola de acciones pendientes
- `household_ai_trust` — Trust level por hogar (1-5)
- `ai_function_registry` — Registro de funciones disponibles

### Funciones RPC

- `create_ai_audit_log` — Crear entrada de auditoria
- `complete_ai_audit_log` — Completar con resultado
- `rollback_ai_action` — Revertir accion
- `create_ai_proposal` — Crear propuesta pendiente
- `decide_ai_proposal` — Aprobar/rechazar propuesta

### Niveles de Trust (por hogar)

| Nivel | Auto-aprobado | Rate limit | Criticas/dia | Items bulk |
| ----- | ------------- | ---------- | ------------ | ---------- |
| 1     | Riesgo 1      | 5/min      | 2            | 10         |
| 2     | Riesgo 1-2    | 10/min     | 5            | 25         |
| 3     | Riesgo 1-2    | 15/min     | 10           | 50         |
| 4     | Riesgo 1-3    | 20/min     | 15           | 75         |
| 5     | Riesgo 1-3    | 30/min     | 20           | 100        |

### Niveles de Riesgo

| Riesgo       | Comportamiento            | Ejemplo                         |
| ------------ | ------------------------- | ------------------------------- |
| LOW (1)      | Auto-ejecutar             | Consultas read-only             |
| MEDIUM (2)   | Ejecutar + Undo           | Marcar item, completar tarea    |
| HIGH (3)     | Requiere confirmacion     | Cambiar menu, editar receta     |
| CRITICAL (4) | Multi-step + confirmacion | Eliminar datos, bulk operations |

### Bugs Conocidos (CRITICOS, vigentes)

1. **BUG**: `recordRollback` en trust-service.ts usa `.rpc('increment', { x: 1 })` dentro de `.update()` — NO FUNCIONA
2. Dos flujos de trust paralelos: `ai-command-service.ts` tiene su propia `getHouseholdTrust()` vs `trust-service.ts`
3. `capturePreState` solo cubre 4 funciones
4. Propuestas expiradas no se limpian automaticamente

### Bugs Conocidos (RESUELTOS — historia)

- **`decide_ai_proposal` (SECURITY DEFINER) permitia bypass cross-household**: la funcion RPC que aprueba/rechaza propuestas no validaba que `p_decision_by` perteneciera al hogar de la propuesta, permitiendo aprobar/ejecutar propuestas de OTRO hogar. Corregido en `supabase/migrations/20260528000000_fix_cross_tenant_leaks.sql` (agrega el chequeo de membresia del aprobador antes de ejecutar la decision). Ver `recetario-security.md` para el detalle completo de la campaña de seguridad de mayo-julio 2026.

## Reglas

1. **NUNCA** permitir riesgo CRITICAL (4) como auto-aprobado en ningun trust level
2. Capturar SIEMPRE `previous_state` antes de ejecutar acciones mutativas
3. Rollback debe ser transaccional: si falla parcialmente, reportar estado incompleto
4. Timeout de propuestas: 5 minutos por defecto
5. Los audit logs son inmutables — nunca UPDATE, solo INSERT
6. Consultar skill `trust-proposal-patterns` antes de modificar
7. Rate limits son por hogar, no por usuario

## Checklist Pre-Commit

- [ ] Build exitoso
- [ ] Trust levels respetan la tabla de limites
- [ ] Riesgo CRITICAL nunca auto-aprobado
- [ ] Audit log con previous_state para acciones mutativas
- [ ] Rollback implementado para nuevas acciones
- [ ] Tests para flujo de propuestas
