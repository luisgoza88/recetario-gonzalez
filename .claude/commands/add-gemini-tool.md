# Agregar Nueva Herramienta al AI Assistant

## Parametros

- $TOOL_NAME: Nombre de la herramienta (snake_case, ej: get_recipe_nutrition)
- $DESCRIPTION: Descripcion de lo que hace
- $RISK_LEVEL: Nivel de riesgo (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)

## Instrucciones

1. **Leer el skill** `gemini-function-calling` para entender los patrones del proyecto.

2. **Agregar declaration** en `src/app/api/ai-assistant/functions/declarations.ts`:
   - Definir JSON schema completo para parameters
   - Incluir description clara en espanol
   - No usar `any` en tipos

3. **Crear handler** en el archivo correspondiente:
   - Queries read-only: `functions/recetario-queries.ts` o `functions/home-queries.ts`
   - Mutations: `functions/recetario-mutations.ts` o `functions/home-mutations.ts`
   - Reportes: `functions/reports.ts`

4. **Agregar routing** en `src/app/api/ai-assistant/orchestrator.ts`:
   - Case en el switch para el nombre de la funcion
   - Llamar al handler correcto

5. **Registrar risk level** en la tabla `ai_function_registry`:
   - Risk level: $RISK_LEVEL
   - Si risk >= 3, implementar capturePreState para rollback

6. **Si es read-only**, agregar tambien en `chat/route.ts` (funciones de chat tienen acceso a read-only directo)

7. **Agregar rate limiting** si es una operacion costosa

8. **Verificar**:
   - [ ] `npm run build` exitoso
   - [ ] Declaration con schema completo
   - [ ] Handler implementado
   - [ ] Routing en orchestrator
   - [ ] Risk level registrado
   - [ ] Rate limiting si necesario
   - [ ] Sin console.log en produccion
