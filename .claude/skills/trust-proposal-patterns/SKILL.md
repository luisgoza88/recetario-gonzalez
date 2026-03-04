---
name: trust-proposal-patterns
description: "Sistema de trust IA: 5 niveles, 4 riesgos, propuestas, ejecucion transaccional, audit log, rollback."
globs:
  - "src/lib/ai/**"
  - "src/components/ai/**"
---

# Trust & Proposal Patterns

## Arquitectura del Sistema

```
Usuario → AI Assistant → Clasificar riesgo → Verificar trust level
                                                    ↓
                              Trust permite auto?  → SI → Ejecutar + Audit log
                                                    ↓ NO
                              Crear propuesta → Usuario aprueba/rechaza
                                                    ↓ Aprobado
                              Ejecutar transaccional → Capturar post-state → Audit log
                                                    ↓ Falla
                              Rollback → Restaurar pre-state
```

## Trust Levels (por hogar)

| Nivel | Auto-aprueba riesgo | Rate limit | Max criticas/dia | Max items bulk |
| ----- | ------------------- | ---------- | ---------------- | -------------- |
| 1     | Solo 1              | 5/min      | 2                | 10             |
| 2     | 1-2                 | 10/min     | 5                | 25             |
| 3     | 1-2                 | 15/min     | 10               | 50             |
| 4     | 1-3                 | 20/min     | 15               | 75             |
| 5     | 1-3                 | 30/min     | 20               | 100            |

**Riesgo 4 (CRITICAL) NUNCA es auto-aprobado**, sin importar el trust level.

## Risk Levels

| Nivel | Nombre   | Auto-ejecuta  | Undo    | Ejemplo                      |
| ----- | -------- | ------------- | ------- | ---------------------------- |
| 1     | LOW      | Si            | No      | Consultas read-only          |
| 2     | MEDIUM   | Si (trust>=2) | Si, 30s | Marcar item, completar tarea |
| 3     | HIGH     | Si (trust>=4) | No      | Cambiar menu, editar receta  |
| 4     | CRITICAL | Nunca         | No      | Eliminar datos, bulk ops     |

## Flujo de Propuesta

```typescript
// 1. Crear propuesta
const proposal = await createProposal({
  householdId,
  actions: [{ functionName: 'swap_menu_recipe', args: {...}, riskLevel: 3 }],
  summary: 'Cambiar receta del almuerzo del lunes',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
});

// 2. Usuario decide
await decideProposal(proposalId, 'approved'); // o 'rejected', 'partially_approved'

// 3. Ejecutar si aprobado
const result = await executeProposal(proposalId, {
  rollbackOnFailure: true,
  capturePreState: true
});
```

## Audit Log Pattern

```typescript
// Antes de ejecutar
const auditId = await createAuditLog({
  householdId,
  userId,
  functionName,
  args,
  riskLevel,
  previousState: await capturePreState(functionName, args),
});

// Despues de ejecutar
await completeAuditLog(auditId, {
  success: true,
  newState: await capturePostState(functionName, args),
  duration: Date.now() - startTime,
});
```

## Rollback Pattern

```typescript
// Revertir accion
await rollbackAction(auditId, {
  restoreState: auditLog.previousState,
  reason: "user_requested" | "execution_failed",
});
```

## Tablas

- `household_ai_trust` — Trust level por hogar (1-5)
- `ai_audit_log` — Log inmutable de acciones
- `ai_action_queue` — Cola de acciones pendientes
- `ai_function_registry` — Funciones registradas con risk level

## Bugs Conocidos

1. `recordRollback` usa `.rpc('increment')` incorrectamente dentro de `.update()`
2. `capturePreState` solo cubre 4 funciones — agregar mas
3. Propuestas expiradas no se limpian automaticamente
