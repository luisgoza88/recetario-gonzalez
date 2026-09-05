# Arquitectura del Recetario Familiar

Estado del código: septiembre de 2026. Aplicación web Next.js + React + Tailwind, con Supabase, IA y PWA. No es una aplicación Expo/React Native.

## Sesión, hogar y autorización

`src/proxy.ts` verifica la identidad en APIs privadas e inyecta `x-user-id` en la solicitud. Las cookies usan `@supabase/ssr`. `AuthContext` carga perfil/membresías y selecciona un hogar; `HouseholdProvider` sincroniza esa selección con el estado de la interfaz.

El cliente de navegador y `createHouseholdClient()` delimitan las consultas domésticas mediante `household-fetch.ts`. El cliente servidor valida la membresía activa del hogar seleccionado. Este filtro no sustituye RLS. Las migraciones agregan permisos de escritura, inmutabilidad del hogar en relaciones críticas y pertenencia de productos, recetas, espacios y empleados.

`createAuthenticatedClient()` sirve para identidad y consultas con contexto explícito. Service role queda reservado a tareas administrativas justificadas, cuotas persistentes, almacenamiento y lectura pública de tokens de publicación. Nunca enviar esa clave al navegador.

## Menú, dieta y compras

`getEffectiveMenu` resuelve el menú aprobado/activo para una fecha y después el ciclo legacy. El calendario también permite previsualizar borradores. `menuCycleDay` define un único ciclo cero basado de 12 días, sin domingo, desde el 6 de enero de 2026. `householdDate` interpreta las fechas en America/Bogota; no recortar UTC para obtener el día doméstico.

Las restricciones se guardan en `households.dietary_preferences` y las porciones/perfil culinario en `cooking_profile`. El onboarding se guarda mediante `complete_household_onboarding` en una transacción; si falla un espacio o persona, no se marca como terminado. Las alergias se validan independientemente de tener un plan de dieta activo.

La compra semanal acumula cantidades compatibles y descuenta existencias comparables. Las cantidades desconocidas quedan por confirmar. No se calcula un precio total a partir de compras históricas sin equivalencia de presentación/unidad.

## IA y propuestas

Texto: `src/lib/ai/generate.ts`, con proveedor configurado y fallback acotado. Visión e imágenes usan adaptadores específicos. Limitar también tamaño de entrada, número de imágenes y lotes; un límite temporal incluye intentos y fallbacks.

Chat y ejecución de propuestas comparten `src/app/api/ai-assistant/orchestrator.ts`. `write-gate.ts` clasifica las escrituras; acciones destructivas requieren aprobación. `decide_ai_proposal` valida actor, hogar, estado y expiración. `claim_ai_proposal` permite una sola ejecución.

Las herramientas que devuelven errores no cuentan como exitosas. El rollback restaura campos solo con snapshots completos, permisos vigentes y sin cambios posteriores; no es una garantía de transacción entre varias herramientas. Creaciones, borrados y operaciones sin estado suficiente pueden requerir reparación manual.

## Compartir y autenticación

`/api/recipe-share` crea una instantánea explícita en `recipe_shares`; `/r/[token]` solo lee tokens activos. No se publican recetas por coincidencia de nombre ni por conocer su ID privado. El endpoint DELETE revoca el enlace.

Login, registro e invitaciones conservan un destino local validado por `safeRedirect`. `/auth/callback` intercambia el código de confirmación. Configurar esta URL entre las URLs permitidas de Supabase al desplegar.

## Navegación y trabajo sin conexión

`useAppNavigation` refleja sección/pestaña en URL y conserva Atrás. Las consultas principales se activan al necesitarlas y muestran errores con reintento. Las vistas del recetario se cargan de forma independiente.

TanStack Query separa claves por usuario/hogar y fecha cuando corresponde. IndexedDB separa bases por usuario/hogar; el caché legacy sin identidad no se mezcla automáticamente. Las operaciones de mercado usan `item_id`, son idempotentes, conservan fallos y se sincronizan en orden con exclusión entre pestañas. Cerrar sesión limpia cachés visibles, pero conserva cambios pendientes bajo su identidad original. La consulta offline necesita datos previamente guardados; no habilita autenticación inicial sin conexión.

`src/sw.ts` es la fuente del worker. No cachear APIs privadas ni respuestas Supabase en cachés HTTP compartidos. La suscripción Web Push se activa desde ajustes mediante `useNotifications`; tener permiso no implica que exista un disparador automático de recordatorios.

## Capacidades comerciales y presentación

El registro de suscripción valida estado y expiración. No existe checkout ni bot de WhatsApp operativo: no anunciar compra de planes o ventajas ilimitadas como acciones disponibles. La interfaz muestra tema claro y español como información. El modo niños usa el almuerzo vigente y progreso local por sesión/hogar/día.

## Verificación y despliegue

- `npm run test:run`: contratos de aplicación, transporte y migraciones en PostgreSQL aislado (PGlite).
- `npm run test:coverage`: cobertura instrumentada; no equivale a cobertura completa de toda la interfaz.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm audit`.
- `npm run verify:rls`: lecturas anónimas contra un destino configurado. Falta de entorno o errores inesperados no cuentan como éxito. Sondas de escritura solo en una base aislada expresamente seleccionada.

Aplicar las migraciones nuevas en orden antes de publicar el código que usa sus RPCs/tablas. Las pruebas aisladas validan estos contratos, no la coincidencia exacta con la base desplegada. Mantener la restricción de costos de CI en CLAUDE.md; no ampliar workflows/triggers ni eliminar sus protecciones.


## Validación del esquema publicado

El despliegue y las migraciones verificadas se documentan en [PRODUCCION.md](auditoria-2026-09-04/PRODUCCION.md). Además del filtro de transporte, 38 tablas tienen políticas restrictivas de membresía que se combinan con las políticas antiguas. No se permite asignarse una membresía por escritura directa; la creación inicial del hogar y la aceptación de invitaciones usan RPC con actor validado.

`complete_household_onboarding` crea explícitamente la membresía del administrador y adapta `work_days` al tipo de la columna. Las invitaciones bloquean su fila al consumirse, devuelven un contrato tabular que el cliente comprueba y seleccionan el hogar desde las membresías recién cargadas. Los miembros de familia pueden actualizar inventario al comprar. El registro de auditoría incluye `updated_at`, requerido por su trigger existente.
