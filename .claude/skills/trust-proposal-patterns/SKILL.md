---
name: trust-proposal-patterns
description: "Sistema de trust IA: 5 niveles, 4 riesgos, propuestas, ejecucion transaccional, audit log, rollback."
globs:
  - "src/lib/ai/**"
  - "src/components/ai/**"
---

# Propuestas de IA

`write-gate.ts` contiene la clasificación explícita de escrituras y las acciones que siempre necesitan aprobación. No interpretar confianza alta como permiso para omitir la aprobación de acciones destructivas.

La decisión verifica actor real, hogar, estado pendiente, expiración y acciones seleccionadas. Respetar el BOOLEAN devuelto por decide_ai_proposal; la ausencia de error no implica aprobación.

Antes de ejecutar, claim_ai_proposal cambia el estado de forma atómica. Dos solicitudes no pueden ejecutar la misma propuesta. `/execute` verifica también la pertenencia de propuesta y audit log. Despachar mediante orchestrator, no mediante una lista parcial duplicada.

`proposal-executor.ts` reconoce tanto excepciones como errores devueltos por las herramientas. La compensación con rollback no es una transacción SQL: registrar fallos parciales y no afirmar que todo se revirtió si una compensación falla. Pruebas: proposal-executor y audit-migrations.
