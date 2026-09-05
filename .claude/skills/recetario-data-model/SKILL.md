---
name: recetario-data-model
description: "Mapa de 40+ tablas, relaciones, RLS household pattern, RPCs, triggers, indices, tipos TypeScript."
globs:
  - "supabase/migrations/**"
  - "src/types/**"
  - "src/lib/supabase/**"
---

# Contratos de datos

Consultar `src/types/database.types.ts` para el contrato de tablas y `src/types/index.ts` para el modelo de producto. Las migraciones son la evolución del esquema; no editar una migración ya aplicada.

`households.dietary_preferences` contiene restricciones y alergias. `cooking_profile` contiene tamaño y preferencias culinarias. `complete_household_onboarding` guarda configuración, espacios y personas en una transacción. `settings` no sustituye esos campos.

Menú: `getEffectiveMenu` prioriza generated_menus aprobados/activos y luego day_menu. `menuCycleDay` es cero basado, 12 días sin domingo; usar `householdDate` para fechas colombianas. Una fecha doméstica no se obtiene recortando un timestamp UTC.

Compras: market_items se enlaza por `inventory.item_id` y `market_checklist.item_id`; no son los IDs de las filas de inventario/checklist. Las cantidades requieren unidades compatibles. Personas actuales: home_employees, con work_days de texto; no confundir con employees legacy.

Compartir: recipe_shares publica una instantánea explícita mediante token revocable. Propuestas: ai_action_queue, decisión validada y claim atómico antes de ejecutar. Ver `docs/architecture.md` y pruebas de migraciones para detalles vigentes.
