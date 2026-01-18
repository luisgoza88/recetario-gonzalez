# Recetario App - Instrucciones para Claude

## Proyecto
Aplicación de recetario familiar con plan de 15 días y menú rotativo para la Familia González.
- **Porciones**: Luis (3 porciones), Mariana (2 porciones) = 5 total
- **Ciclo**: 12 días de menú que se repite (excluyendo domingos)
- **Viernes/Sábado**: Sin cena (salen a comer)

## Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL) + OpenAI GPT-4o-mini
- **PWA**: Serwist (Service Worker para offline)
- **Deploy**: Vercel (auto-deploy desde main)
- **UI**: Lucide React (iconos)

## URLs
- **Producción**: https://recetario-app-self.vercel.app
- **Supabase Project ID**: snyelpbcfbzaxadrtxpa
- **GitHub**: https://github.com/luisgoza88/recetario-gonzalez

## Arquitectura de Archivos

```
src/
├── app/
│   ├── page.tsx                    # Home principal con navegación
│   ├── layout.tsx                  # Layout con PWA metadata
│   └── api/generate-recipe/        # API de IA (OpenAI)
├── components/
│   ├── CalendarView.tsx            # Vista calendario/menú
│   ├── MarketView.tsx              # Mercado + Inventario
│   ├── RecipesView.tsx             # Lista de recetas
│   ├── SmartSuggestions.tsx        # Modal de sugerencias IA
│   ├── RecipeModal.tsx             # Detalles de receta
│   └── FeedbackModal.tsx           # Feedback de comidas
├── lib/
│   ├── inventory-check.ts          # Comparación de ingredientes
│   ├── notifications.ts            # Sistema de notificaciones
│   └── supabase/client.ts          # Cliente Supabase
├── data/
│   ├── recipes.ts                  # 28 recetas iniciales
│   ├── menu.ts                     # Menú de 12 días
│   ├── market.ts                   # 82 items de mercado
│   └── substitutions.ts            # 90+ sustituciones
└── types/index.ts                  # Tipos TypeScript
```

## Base de Datos (Supabase)

### Tablas Principales
| Tabla | Registros | Propósito |
|-------|-----------|-----------|
| `recipes` | 28 | Recetas con ingredientes JSONB |
| `day_menu` | 12 | Menú rotativo (día → recetas) |
| `market_items` | 82 | Items de compra base |
| `inventory` | 70 | Stock actual (item_id, current_number) |
| `market_checklist` | 68 | Estado de compra (checked) |
| `meal_feedback` | 0 | Feedback de comidas |
| `adjustment_suggestions` | 0 | Sugerencias automáticas |

### Relaciones
- `day_menu` → `recipes` (breakfast_id, lunch_id, dinner_id)
- `inventory` → `market_items` (item_id)
- `market_checklist` → `market_items` (item_id)

### RLS
- Habilitado con políticas públicas (sin autenticación)
- Usar `onConflict` en upserts para evitar errores 409

## Reglas de Desarrollo

### Siempre hacer commit y deploy
1. Verificar build: `npm run build`
2. Commit con mensaje descriptivo
3. Push a `main` para deploy automático en Vercel

### Variables de Entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://snyelpbcfbzaxadrtxpa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
```

---

## PROBLEMAS CONOCIDOS (Enero 2025)

### 1. Matching de Ingredientes NO Funciona Bien
**Archivo**: `src/lib/inventory-check.ts`

**Problema**: La función `findInventoryMatch()` usa comparación parcial simple:
```typescript
// Actual: falla cuando nombres son similares pero no idénticos
normalizedItem.includes(normalizedIngredient) ||
normalizedIngredient.includes(normalizedItem)
```

**Casos que FALLAN**:
- "Jamón en cubos" (receta) vs "Jamón de pierna" (inventario) → NO MATCH
- "Hogao + Aguacate" (receta) → NO se separa en componentes
- "Queso cuajada" vs "Queso costeño/cuajada" → FALLA

### 2. Ingredientes Compuestos
Las recetas usan ingredientes como `"Hogao + Aguacate"` pero:
- El sistema no separa por "+"
- "Hogao" es una preparación, no un item de mercado

### 3. Preparaciones vs Items de Mercado
No hay distinción entre:
- **Items comprables**: aguacate, queso, jamón
- **Preparaciones**: hogao (tomate+cebolla+ajo), chimichurri, salsa criolla

### 4. Sistema de Feedback Sin Usar
Las tablas `meal_feedback` y `adjustment_suggestions` están vacías.
El sistema de aprendizaje automático no está funcionando.

---

## MEJORAS PENDIENTES

### Prioridad 1: Arreglar Matching de Ingredientes
1. Crear tabla `ingredient_aliases` con sinónimos
2. Separar ingredientes compuestos por "+"
3. Crear tabla `preparations` que mapee a ingredientes base
4. Implementar fuzzy matching (distancia Levenshtein)

### Prioridad 2: Normalizar Datos
1. Unificar nombres de ingredientes (recetas ↔ mercado)
2. Normalizar unidades de medida
3. Crear mapeo: "Jamón en cubos" = "Jamón de pierna"

### Prioridad 3: Activar Sistema de Feedback
1. Promover uso del FeedbackModal
2. Generar sugerencias automáticas basadas en feedback
3. Ajustar porciones según historial

### Prioridad 4: Mejorar IA
1. Incluir contexto de preparaciones disponibles
2. Usar historial de comidas para evitar repetición
3. Considerar preferencias y restricciones

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build (verificar antes de commit)
npm run build

# Lint
npm run lint

# SQL útil para debug
SELECT mi.name, i.current_number
FROM market_items mi
LEFT JOIN inventory i ON mi.id = i.item_id
WHERE i.current_number > 0;
```
