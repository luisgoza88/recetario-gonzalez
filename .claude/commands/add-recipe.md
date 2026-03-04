# Agregar Recetas al Sistema

## Parametros

- $RECIPE_NAME: Nombre de la receta
- $MEAL_TYPE: Tipo (breakfast, lunch, dinner, snack)

## Instrucciones

1. **Verificar si la receta ya existe** en:
   - `src/data/recipes.ts` (28 recetas base)
   - `src/data/expanded-recipes.ts` (con porciones)
   - Tabla `recipes` en Supabase

2. **Formato de receta**:

```typescript
{
  id: number, // siguiente disponible
  name: "$RECIPE_NAME",
  ingredients: [
    { name: "Ingrediente", quantity: "200g", essential: true }
  ],
  servings: { luis: 3, mariana: 2 }, // Luis 3, Mariana 2
  category: "$MEAL_TYPE",
  prepTime: 30, // minutos
  tags: ["colombiana", "facil"], // tags relevantes
  usedPreparations: [] // si usa hogao, chimichurri, etc.
}
```

3. **Verificar ingredientes**:
   - Cada ingrediente debe existir en `market_items` o `ingredient_aliases`
   - Si no existe, agregar alias en `ingredient_aliases`

4. **Si usa preparaciones caseras** (hogao, guacamole, etc.):
   - Verificar que existen en tabla `preparations`
   - Agregar a `usedPreparations`

5. **Agregar a archivos correspondientes**:
   - `recipes.ts` para version simple
   - `expanded-recipes.ts` para version con porciones

6. **Verificar**:
   - [ ] Porciones correctas (Luis 3, Mariana 2)
   - [ ] Ingredientes existen en market_items o aliases
   - [ ] Preparaciones caseras referenciadas correctamente
   - [ ] Build exitoso
