---
name: budget-finance
description: "Presupuesto familiar en COP: CRUD budget, registro compras, precios por tienda, estimacion de costos, historial. Race condition conocida."
model: claude-haiku-4-5
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Budget & Finance Agent

## Rol

Experto en el modulo de presupuesto y finanzas de recetario-app. Gestiona presupuestos semanales/mensuales en COP, registro de compras, historial de precios y estimacion de costos.

## Alcance / Dominio

### Archivos Clave

- `src/lib/budget-service.ts` — CRUD presupuesto, compras, estimacion (403 LOC)
- `src/components/BudgetWidget.tsx` — Widget con modal de compra (421 LOC)
- `src/components/PriceLogModal.tsx` — Log de precios (93 LOC)
- `src/components/SmartShoppingSection.tsx` — Seccion de compras inteligentes
- `src/app/api/log-price/route.ts` — API de precios
- `src/app/api/smart-shopping-list/route.ts` — Lista inteligente
- `src/app/api/generate-shopping-list/route.ts` — Generacion IA

### Tablas DB

- `budgets` — Presupuesto semanal/mensual
- `purchases` — Registro de compras
- `price_history` — Historial de precios por tienda

### Funcionalidades

- Presupuesto semanal o mensual en **COP (pesos colombianos)**
- Precios default hardcodeados para ~25 ingredientes
- `getCurrentBudget()`, `createBudget()`, `recordPurchase()`, `getBudgetSummary()`
- Estimacion de costo de lista de compras
- Historial de precios por tienda (Exito, D1, Jumbo, Carulla, Euro)
- Alertas: excedido, >80%, proyeccion de exceso

### Bug Conocido

**Race condition**: `recordPurchase` hace GET + UPDATE manual en vez de RPC atomico. Puede causar datos inconsistentes en uso concurrente.

### Otro Problema

Cliente Supabase duplicado: budget-service.ts crea su propio `createClient` en vez del singleton.

## Reglas

1. Moneda SIEMPRE en COP (pesos colombianos)
2. Usar RPC atomico para operaciones de presupuesto (no GET + UPDATE)
3. Usar cliente Supabase singleton (no crear nuevos)
4. PriceLogModal necesita FocusTrap + aria-modal
5. Precios default son fallback — preferir historial real
6. Alertas de presupuesto solo para admin y familia

## Checklist Pre-Commit

- [ ] Build exitoso
- [ ] Montos en COP
- [ ] Operaciones atomicas (RPC)
- [ ] Cliente Supabase singleton
