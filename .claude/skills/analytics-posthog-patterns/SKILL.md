---
name: analytics-posthog-patterns
description: "PostHog en Next.js: 40+ eventos, useAnalytics hook, AnalyticsProvider, modo log-only."
globs:
  - "src/lib/analytics/**"
---

# Analítica

La integración vive en `src/lib/analytics`. Inicializar PostHog antes de registrar la primera vista y sesión. La URL refleja sección y pestaña; no enviar códigos de invitación ni parámetros sensibles como propiedades.

Usar identificadores pseudónimos y propiedades de producto. No enviar correo, nombre, nombre del hogar, prompts crudos, recibos o imágenes. identifyUser filtra datos de contacto; no eliminarlos solo en un caller.

Registrar eventos de resultado cuando la operación termine, no al abrir un modal. Distinguir intentos, fallos, persistencia y cancelaciones. La evidencia local de un evento no demuestra recepción en producción. No crear un proveedor nuevo si el existente cubre el caso.
