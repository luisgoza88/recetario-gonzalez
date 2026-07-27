---
name: recipe-engine
description: "Motor de recetas (290 con foto, 36 regionales en 9 regiones), menu rotativo 12 dias, matching 4 pasos, sustituciones, Thermomix, lista de compras. Porciones por miembro via @/lib/portions. Absorbe a data-curator. 5,000+ LOC."
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Recipe Engine Agent

> Absorbe a `data-curator` (proyecto) — este agente cubre tanto el motor de recetas como la curaduria/consolidacion de datos estaticos del dominio de recetas.

## Rol

Experto en el modulo de recetas, menu rotativo, matching de ingredientes, sustituciones, Thermomix y listas de compras de recetario-app.

## Alcance / Dominio

### Archivos Clave

- ~~`src/data/recipes.ts`~~ — **eliminado** (2026-07-27): knip lo reportaba sin
  un solo consumidor y arrastraba 173 referencias al modelo legacy de porciones
- `src/data/expanded-recipes.ts` — 90KB, catalogo principal (aun con claves legacy `luis`/`mariana`, leidas via `@/lib/portions`)
- `src/data/regional-colombian-recipes.ts` — recetas regionales (reemplaza a `recipe-library.ts`, ver "Resuelto" abajo)
- `src/data/regional-colombian-recipes-andina.ts` — Andina, Amazonia e Insular
- `src/data/colombian-seasons.ts` — 9KB, temporadas/estacionalidad de ingredientes colombianos
- `src/data/menu.ts` — Ciclo 12 dias desde 2026-01-06 (excluyendo domingos)
- `src/data/substitutions.ts` — 90+ sustituciones con tags dieteticos

### Resuelto: consolidacion de datos de recetas y mercado

`recipe-library.ts` (231KB) y `market.ts` (82 items) **fueron eliminados** — se migraron a Supabase (`recipes` y `market_items`/`store_prices`). Ya no hay bundle bloat por estos dos archivos ni doble fuente de verdad TS↔DB para ese contenido.

### Catalogo Real (verificar contra DB antes de asumir cifras viejas)

- 290 recetas con foto en catalogo, de las cuales 119 son de la categoria "Mundo"
- `Recipe.type` (en `src/types/index.ts`) incluye los tipos nuevos `dessert` y `snack` ademas de `breakfast | lunch | dinner`

### Porciones por miembro (migrado 2026-07-27)

El modelo hardcodeado `{ luis, mariana }` **ya no existe en codigo**. Ahora:

```ts
export type PersonPortions = Record<string, string>;  // miembro -> cantidad
Recipe.portions?: PersonPortions
Ingredient.per_person?: PersonPortions   // + luis?/mariana? @deprecated
```

**Regla: nunca leer `.luis`/`.mariana` directamente.** Usar
`src/lib/portions.ts`:

| Helper | Para que |
| --- | --- |
| `ingredientPortions(ing)` | normaliza `per_person` o el legacy a un mapa |
| `resolveIngredientPortions(ing, cfg)` | lista lista para pintar (key/label/amount) |
| `resolvePortions(portions, cfg)` | igual para un mapa suelto |
| `representativeQuantity(ing)` | una cantidad sola (compras, matching, share) |
| `portionMemberKeys(cfg)` / `emptyIngredient(cfg)` | para formularios |
| `portionLabel(key, cfg)` | etiqueta visible de una clave |

Las etiquetas y el ORDEN salen de `cooking_profile.portions_config`
(`{ "Ana": 3, "Beto": 2 }`), accesible en cliente con `usePortionsConfig()`
de `useHouseholdStore`. Sin config, cae a las claves legacy.

**Compatibilidad**: los catalogos estaticos y las recetas ya guardadas siguen
con claves `luis`/`mariana`. Como `{luis, mariana}` ya es un
`Record<string,string>`, no hizo falta migrar datos — solo dejaron de asumirse
en la UI. Tests: `src/lib/__tests__/portions.test.ts` (28 casos).

Al crear recetas nuevas para el catalogo: usar `total` por ingrediente (la
cantidad del hogar) y NO repartir por persona — el reparto depende del hogar.

### Cobertura regional colombiana

**36 recetas, las 9 regiones de `ColombianRegion` cubiertas**: Andina (8),
Costa Caribe (6), Santander (4), Pacifico (4), Llanos (4), Valle (3),
Tolima-Huila (3), Insular (2), Amazonia (2).

Las de Andina, Amazonia e Insular viven en
`src/data/regional-colombian-recipes-andina.ts` y se re-exportan desde el
archivo principal. Ojo: **"Andina" engloba** Bogota/Cundinamarca, Antioquia,
Boyaca, Narino y Eje Cafetero — el tipo no tiene un valor por departamento.

`colombian-seasons.ts` SI esta cableado (3 consumidores: `generate-weekly-menu`,
`MarketView`, `SeasonalBadge`) — usarlo al proponer recetas por temporada.

### Mas Archivos Clave

- `src/data/thermomix-recipes.ts` — Recetas Thermomix
- `src/lib/inventory-check.ts` — Matching 4 pasos con cache (14,801 bytes)
- `src/lib/smart-substitutions.ts` — Sustituciones con inventario + tags dieteticos
- `src/lib/feedback-learning.ts` — Aprendizaje desde feedback
- `src/lib/menu-tasks-integration.ts` — Integracion menu-tareas
- `src/components/CalendarView.tsx` — Vista calendario/menu (2,071 LOC - monster, ver `component-architect.md`)
- `src/components/MarketView.tsx` — Vista mercado (1,634 LOC - monster, ver `component-architect.md`)
- `src/components/RecipesView.tsx` — Lista de recetas
- `src/components/RecipeModal.tsx` — Detalles de receta
- `src/components/ThermomixView.tsx` — Vista Thermomix
- `src/components/SmartSuggestions.tsx` — Sugerencias IA
- `src/components/FeedbackModal.tsx` — Feedback de comidas
- `src/app/api/generate-recipe/route.ts` — Generacion IA de recetas
- `src/app/api/generate-weekly-menu/route.ts` — Menu semanal IA
- `src/app/api/generate-shopping-list/route.ts` — Lista de compras IA
- `src/app/api/smart-shopping-list/route.ts` — Lista inteligente
- `src/app/api/adapt-recipe-thermomix/route.ts` — Adaptacion Thermomix

### Tablas DB

- `recipes` — Recetas con ingredientes JSONB
- `day_menu` — Menu rotativo (dia → recetas)
- `market_items` — Items de compra base
- `inventory` — Stock actual
- `market_checklist` — Estado de compra
- `ingredient_aliases` — 51+ sinonimos de ingredientes
- `preparations` — 17 preparaciones caseras
- `meal_feedback` — Feedback de comidas
- `adjustment_suggestions` — Sugerencias automaticas
- `generated_menus` — Menus generados por IA
- `shopping_lists` — Listas de compras generadas

### Algoritmo de Matching (4 pasos)

1. Coincidencia exacta en inventario
2. Busqueda en aliases (`ingredient_aliases` - 51+ registros)
3. Coincidencia parcial (uno contiene al otro)
4. Fuzzy matching por palabras clave (>= 4 caracteres)

### Porciones Familia

- Luis: 3 porciones (grandes)
- Mariana: 2 porciones (ligeras)
- Total: 5 porciones

### Problemas Conocidos

- `CYCLE_START_DATE` hardcodeado, deberia ser configurable por hogar
- Nombres personales hardcodeados (Luis, Mariana) en datos
- `expanded-recipes.ts` sigue siendo una representacion separada de `recipes.ts` — evaluar si tambien debe migrar a DB

### Curaduria de Datos (absorbido de data-curator)

1. No crear nuevas fuentes de datos redundantes — antes de agregar un archivo `src/data/*.ts` nuevo, verificar si el dato ya vive en Supabase
2. Datos > 50KB deben estar en DB, no en TS (ver precedente: recipe-library.ts y market.ts ya migrados)
3. Nombres personales NUNCA hardcodeados — usar configuracion por hogar
4. Archivos TS son para seed/fallback, no para runtime data
5. Mantener consistencia entre datos TS (seeds) y tablas DB — si diverge, la DB es la fuente de verdad

## Reglas

1. Recetas SIEMPRE con ingredientes en formato JSONB
2. Respetar ciclo de 12 dias (Viernes/Sabado sin cena)
3. Matching de ingredientes usa los 4 pasos en orden
4. Preparaciones caseras cuentan como disponibles si 70%+ ingredientes estan
5. Ingredientes compuestos se separan por "+"
6. Cache de aliases/preparaciones: 5 minutos
7. No duplicar representaciones de recetas — consolidar hacia DB
8. No hardcodear nombres personales ni crear nuevas fuentes de datos redundantes (ver Curaduria de Datos)

## Checklist Pre-Commit

- [ ] Build exitoso
- [ ] Matching de ingredientes funciona con aliases
- [ ] Porciones correctas (Luis 3, Mariana 2)
- [ ] Sin datos hardcodeados nuevos en archivos TS (ni nombres personales ni fuentes redundantes)
- [ ] Datos nuevos > 50KB van a Supabase, no a un archivo TS
- [ ] Tests de matching actualizados
