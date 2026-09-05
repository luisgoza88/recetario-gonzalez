# Correcciones de la auditoría

Trabajo autorizado: corregir los hallazgos y mejorar los flujos. La auditoría original se conserva como evidencia histórica; sus referencias de línea pueden haber cambiado.

## Cambios por hallazgo

| Hallazgo | Corrección en el código |
|---|---|
| F01 · Hogares y permisos | Rutas domésticas con cliente autenticado del hogar activo; filtro de transporte, validación de membresía, controles SQL de permisos y relaciones; verificación adicional en registros diarios y sugerencias recurrentes. |
| F02 · Ejecución IA | Despachador compartido para propuestas/chat, errores devueltos tratados como fallos, estados parciales honestos y reversión real solo con snapshots válidos. |
| F03 · Menú | Resolvedor compartido para Hoy, empleada y asistente, con prioridad de menús aprobados/activos; calendario conserva vista de borradores. |
| F04 · Contexto | Claves de consultas por usuario/hogar, selección coherente después de aceptar invitación, hogar exacto en la vista de administración y caché visible reiniciado al cambiar sesión. |
| F05 · Offline | Bases separadas por identidad/hogar, cola por item_id, operaciones idempotentes, bloqueo entre instancias/pestañas, cambios fallidos conservados y reflejados en el caché local; reconexión sin recarga que interrumpa formularios. |
| F06 · Preferencias | Onboarding escribe restricciones/alergias en dietary_preferences y porciones/perfil en cooking_profile. Validación alimentaria independiente de activar un plan. |
| F07 · Guardado inicial | RPC transaccional crea o configura el hogar y sus dependencias; error visible, sin terminar el onboarding ante un fallo. |
| F08 · RPC privilegiadas | Decisión con actor real y estado pendiente, claim único, audit logs con validación de actor y rollback sujeto a permisos, hogar y estado actual. |
| F09 · Publicación | Instantáneas con tokens explícitos y revocables; se retira la búsqueda pública por ID privado/nombre. Las recetas del catálogo también pueden compartirse. |
| F10 · Fechas | Función de fecha doméstica y ciclo únicos, sustitución de recortes UTC en los flujos principales y claves de tareas por fecha. |
| F11 · Compras | Suma y resta de cantidades con unidades compatibles; cantidades ambiguas por confirmar. Se retiran totales de precio sin equivalencia verificable de presentación. |
| F12 · Consumo IA | Fallo cerrado cuando no se verifica el límite, 503 diferenciado de 429, límites para recibos/parser/lotes, lote de imágenes acotado y presupuestos temporales de texto/imágenes. |
| F13 · Dependencias | Next/React/Serwist/Vitest actualizados, dependencias transitivas corregidas y Browserslist fijado a una versión corregida mediante override. |
| F14 · Navegación | Sección/pestaña en URL, navegación Atrás y destino de autenticación preservado; selectores Zustand estables. |
| F15 · Invitaciones | Validación estable sin ciclo de efectos; limpieza de código de URL; contexto preservado entre registro/login y callback de confirmación. |
| F16 · Notificaciones | Se elimina el prompt global que solo concedía permiso y prometía recordatorios; ajustes usa la suscripción Web Push real; worker solo en producción y enlaces del mismo origen. |
| F17 · Funciones incompletas | Recetas sugeridas se pueden abrir/cocinar; generación de receta completa desde sugerencias; modo niños con menú y progreso diario; planes/idioma/tema se presentan sin acciones ficticias. |
| F18 · Fluidez | Carga de vistas independiente, consultas limitadas a la sección necesaria, errores recuperables, menos familias tipográficas, semántica de navegación y etiquetas legibles, catálogo por tandas, una entrada al chat y accesos rápidos conectados. Mercado deja de mostrar fechas, porciones y presupuesto ficticios. |
| F19 · Pruebas/observabilidad | Nuevas pruebas de aislamiento, fechas, cantidades, propuestas y SQL; analítica inicial ordenada y datos de contacto filtrados; verificador RLS no acepta cualquier error; CI evita ejecutar dos veces la misma suite. |
| F20 · Estado canónico | README, arquitectura, instrucciones, comando de nuevas APIs y 11 skills propios actualizados; 4 skills nativos delimitados al trabajo Expo/React Native; migración de middleware a proxy. |

## Puesta en marcha completada

La ejecución y evidencia sobre el servidor real están en [PRODUCCION.md](PRODUCCION.md). Las seis migraciones iniciales requirieron cuatro correcciones adicionales al contrastarlas con producción.

### Pasos ejecutados

1. Se restauró una copia del esquema real en PostgreSQL 17 y se validaron las migraciones; las diez constan en el historial de Supabase.
2. Se configuró el dominio publicado y su callback en Supabase.
3. Se desplegaron aplicación y worker en Vercel y se promovió la versión al dominio público.
4. Se verificaron cuentas temporales reales y hogares de prueba; consultar el informe de producción para los resultados y el alcance exacto.

No se habilitó un sistema de pagos, un bot de WhatsApp ni un cron de recordatorios. Se retiraron las promesas y controles que sugerían que esos servicios estaban operativos. Su habilitación requiere definir/configurar el servicio correspondiente. Las cuotas comerciales mensuales no se anuncian como una compra disponible.

La reversión automática no promete reconstruir creaciones, borrados en cascada o cambios sin snapshots completos; devuelve un fallo explícito y conserva la evidencia cuando no puede restaurar con seguridad.

## Evidencia local anterior al despliegue

Evidencia guardada en `verificacion-correcciones/`:

- Suite: **459 pruebas pasaron, 8 omitidas, 33 archivos**. Incluye 7 pruebas SQL con PGlite para las seis migraciones nuevas, actor, ejecución única, referencias, permisos, onboarding atómico y reversión real.
- Cobertura global: **16,26 % de líneas**. Las pruebas nuevas cubren regresiones concretas; todavía hay deuda de cobertura en la aplicación completa.
- Producción: compilación y TypeScript correctos. El compilador advierte sobre el runtime Edge de los iconos; no impide generar la aplicación.
- Lint: **0 errores, 185 advertencias** de mantenimiento pendientes; no se presenta como una limpieza total de todas las advertencias históricas.
- Dependencias: **0 vulnerabilidades conocidas** en el análisis de npm del árbol instalado.
- Migraciones: **0 hallazgos de Squawk en los 6 archivos**. Incluyen límites de espera y validación de restricciones fuera del bloqueo de su reemplazo.
- APIs locales: cinco rutas rechazan con 401 solicitudes sin sesión, incluso enviando un identificador de usuario falso.
- Navegador: **13 comprobaciones pasaron, 0 excepciones de ejecución**, recorrido móvil con datos sintéticos; invitación, destino de login, Atrás, Mercado, apertura del asistente, acceso rápido, cola offline y reconexión. El informe adjunto contiene los resultados exactos.

El navegador intercepta Supabase y los proveedores para usar datos de prueba; registra un worker mínimo sin interceptar peticiones. Por tanto, este recorrido no certifica las políticas RLS reales, las respuestas de los modelos ni el caché del worker de producción. La prueba SQL usa un esquema reducido con las funciones existentes pertinentes, no una copia completa de producción. La validación posterior con cuentas reales se documenta en PRODUCCION.md.
