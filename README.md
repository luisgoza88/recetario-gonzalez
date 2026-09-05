# Recetario Familiar

Aplicación web para organizar recetas, menú, compras y tareas de varios hogares, con asistencia de IA y funciones sin conexión.

## Desarrollo

Instalar con `npm ci`, configurar las variables locales de Supabase y los proveedores necesarios sin subir claves al repositorio, y ejecutar `npm run dev`.

Verificaciones: `npm run test:run`, `npm run lint`, `npm run build`, `npm audit`. Las pruebas de migraciones usan PostgreSQL aislado y no escriben en producción.

- [Arquitectura y contratos vigentes](docs/architecture.md)
- [Auditoría original](docs/auditoria-2026-09-04/AUDITORIA.md)
- [Correcciones y validación](docs/auditoria-2026-09-04/REMEDIACION.md)
- [Instrucciones del proyecto y costos de CI](CLAUDE.md)

La actualización de septiembre incorpora nuevas migraciones de Supabase: deben aplicarse en orden antes de desplegar las funciones que las utilizan. La configuración de confirmación de correo debe permitir `/auth/callback` en el dominio de la aplicación.
