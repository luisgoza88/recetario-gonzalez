# Recetario Familiar — instrucciones del proyecto

Aplicación web multi-hogar con Next.js, React, Supabase, IA y PWA. El estado técnico vigente está en [docs/architecture.md](docs/architecture.md). Las preferencias, porciones y nombres dependen del hogar; no fijarlos a una familia concreta.

- Usar clientes autenticados y contexto de hogar. Service role no es un arreglo para errores RLS.
- Mantener contratos de datos, consultas y cachés aislados por hogar y sesión.
- Reutilizar menú efectivo, fechas domésticas y despachador de IA canónicos.
- Verificar errores de escritura y no declarar éxito antes de persistir.
- Revisar cambios existentes y preservar trabajo ajeno. No modificar worktrees anidados.
- Probar localmente los contratos afectados, tipos, lint y build. Las pruebas aisladas de SQL no sustituyen verificar migraciones en el entorno de destino.
- Los skills de Expo/React Native aplican solo a trabajo nativo explícito; la PWA actual es web.
- Commit, push, despliegue y acciones externas siguen el alcance autorizado por el usuario; no son un paso automático de cualquier edición.

## Costos CI/CD (REGLAS DURAS — pedido del dueño 2026-07-11)

GitHub Actions cobra por minutos. Para CUALQUIER agente (Claude Code, Codex u otro): no crear workflows ni ampliar triggers sin autorización del dueño; no quitar `paths-ignore`/`concurrency` ni el `if` del job Build (en PRs el job de lint ya compila); verificar local antes de pushear; commits con pathspecs; no re-lanzar workflows en lote.
