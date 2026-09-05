---
name: gemini-function-calling
description: "Patrones de IA en recetario-app: DeepSeek primario + Gemini fallback/vision, function calling, modelos, retry, sanitizacion, risk levels. Incluye la topologia real de endpoints."
globs:
  - "src/app/api/ai-assistant/**"
  - "src/lib/gemini/**"
  - "src/lib/ai/**"
  - "src/lib/ai-assistant/**"
---

# Asistente y proveedores

Entrada activa: `src/app/api/ai-assistant/chat/route.ts`. El despachador canónico está en `orchestrator.ts`; `/execute` lo reutiliza. Agregar una función exige conectar declaración, implementación, riesgo/permisos y clasificarla en `write-gate.ts`. No duplicar implementaciones en endpoints.

Las consultas y escrituras usan createAIClient (cliente autenticado del hogar activo). El hogar nunca lo decide el modelo. Las escrituras destructivas y de alto riesgo requieren aprobación. Un resultado `{ error }` o `{ success: false }` debe producir un fallo, no un mensaje de acción completada.

Texto usa `src/lib/ai/generate.ts` y sus proveedores configurados. Visión/imágenes tienen sus propios adaptadores. Consultar las constantes y el entorno, sin copiar nombres antiguos de modelos. Limitar entrada, salida, llamadas y tiempo total; no reintentar escrituras sin idempotencia.
