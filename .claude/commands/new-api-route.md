# Crear una ruta API

Crear `src/app/api/$ROUTE_PATH/route.ts` para `$METHOD` y verificar su cobertura en `src/proxy.ts`. Para APIs privadas usar `requireAuth(request)` y `createHouseholdClient()`; para identidad usar `createAuthenticatedClient()`. No usar auth-helpers-nextjs ni service role como plantilla.

Validar entrada con Zod, acotar tamaños/cantidades, comprobar permisos y pertenencia de recursos. Verificar `{ data, error }` o throwOnError y devolver estados HTTP coherentes. Las APIs de IA requieren withRateLimit y un presupuesto temporal compatible con la función; 503 significa límite no verificable, 429 límite agotado.

Reutilizar los contratos de `docs/architecture.md`. Añadir pruebas para autenticación, pertenencia a hogares y fallos relevantes; ejecutar verificaciones locales sin ampliar workflows ni triggers. No registrar entradas sensibles.
