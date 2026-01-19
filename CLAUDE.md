# Recetario App - Instrucciones para Claude

## Proyecto
Aplicación de recetario familiar con plan de 15 días y menú rotativo para la Familia González.
- **Porciones**: Luis (3 porciones), Mariana (2 porciones) = 5 total
- **Ciclo**: 12 días de menú que se repite (excluyendo domingos)
- **Viernes/Sábado**: Sin cena (salen a comer)

## Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL) + Google Gemini API (Gemini 2.5 Flash + Imagen 3)
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
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_GEMINI_API_KEY=...
```

---

## MEJORAS IMPLEMENTADAS (Enero 2025)

### 1. Sistema de Matching de Ingredientes MEJORADO
**Archivo**: `src/lib/inventory-check.ts`

El algoritmo ahora usa 4 pasos de búsqueda:
1. **Coincidencia exacta** en inventario
2. **Búsqueda en aliases** desde tabla `ingredient_aliases`
3. **Coincidencia parcial** (uno contiene al otro)
4. **Fuzzy matching** por palabras clave (>=4 caracteres)

**Nuevas tablas creadas**:
- `ingredient_aliases` (51+ registros): Mapea nombres de recetas a items del mercado
  - "Jamón en cubos" → "Jamón de pierna"
  - "Queso rallado" → "Queso mozzarella"
  - "Huevos revueltos" → "Huevos"
- `preparations` (17 registros): Define preparaciones caseras
  - "Hogao" → ["Tomate", "Cebolla", "Ajo", "Aceite"]
  - "Chimichurri" → ["Perejil", "Ajo", "Aceite", "Vinagre"]
  - "Guacamole" → ["Aguacate", "Tomate", "Cebolla", "Limón", "Cilantro"]

**Ingredientes compuestos**: Ahora se separan por "+" automáticamente
- "Hogao + Aguacate" → se verifica ["Hogao", "Aguacate"] por separado

### 2. Preparaciones vs Items de Mercado RESUELTO
- Las preparaciones se reconocen automáticamente
- Se verifica que al menos 70% de los ingredientes de la preparación estén disponibles
- Si están disponibles, la preparación cuenta como "disponible"

### 3. Sistema de IA MEJORADO
**Archivo**: `src/app/api/generate-recipe/route.ts`

Mejoras implementadas:
- **Contexto de preparaciones**: La IA conoce qué preparaciones caseras están disponibles
- **Historial de recetas**: Evita sugerir recetas consumidas recientemente
- **Contexto familiar**: Conoce las preferencias de Luis (porciones grandes) y Mariana (porciones ligeras)
- **Campo usedPreparations**: Las recetas generadas indican qué preparaciones caseras usan

### 4. Sistema de Feedback ACTIVO
- **Badge de notificación**: Muestra número de sugerencias pendientes en la navegación
- **Guardado de recipe_name**: Permite al sistema de IA evitar repetición
- **SuggestionsPanel**: Panel completo para ver y aplicar sugerencias de ajustes

### 5. Cache Inteligente
- Aliases y preparaciones se cachean en memoria para evitar queries repetidas
- Función `clearInventoryCache()` para limpiar cache cuando se actualizan datos

### 6. Lógica de Disponibilidad CORREGIDA (Enero 2025)
**Problema encontrado**: La comparación de cantidades fallaba por unidades incompatibles:
- Inventario almacena `current_number = 5` (ej: "5 kg")
- Recetas requieren "280g" que se parseaba como 280
- La comparación `5 >= 140` fallaba aunque claramente hay suficiente

**Solución implementada**: Lógica simplificada
```typescript
// ANTES (fallaba):
const hasEnough = totalAvailable > 0 && totalAvailable >= requiredNum * 0.5;

// DESPUÉS (correcto):
const hasEnough = totalAvailable > 0;
```
Si el ingrediente se encuentra en inventario con stock > 0, se considera disponible.

---

## Tablas de Base de Datos (Actualizado)

| Tabla | Registros | Propósito |
|-------|-----------|-----------|
| `recipes` | 28 | Recetas con ingredientes JSONB |
| `day_menu` | 12 | Menú rotativo (día → recetas) |
| `market_items` | 82 | Items de compra base |
| `inventory` | ~70 | Stock actual (item_id, current_number) |
| `market_checklist` | ~68 | Estado de compra (checked) |
| `ingredient_aliases` | 51+ | Sinónimos de ingredientes |
| `preparations` | 17 | Preparaciones caseras (hogao, guacamole, etc.) |
| `meal_feedback` | variable | Feedback de comidas |
| `adjustment_suggestions` | variable | Sugerencias automáticas |

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
