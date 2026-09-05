---
name: vision-ai-prompts
description: "Prompt engineering para endpoints de vision: scan-receipt, scan-pantry, analyze-room, recipe-from-image, match-recipe-image."
globs:
  - "src/app/api/scan-receipt/**"
  - "src/app/api/scan-pantry/**"
  - "src/app/api/analyze-room/**"
  - "src/app/api/generate-recipe-from-image/**"
  - "src/app/api/match-recipe-image/**"
---

# Visión e imágenes

Revisar adaptadores actuales (`lib/gemini`, `lib/openai-images`, rutas scan-pantry, scan-receipt, analyze-room y generate-recipe-image). No copiar modelos antiguos de ejemplos. Validar tipo, tamaño y cantidad de imágenes antes de enviarlas, y validar JSON de respuesta con Zod.

Escanear identifica candidatos; guardar exige IDs pertenecientes al hogar y comprobar cada error. Aplicar límites de consumo también a recibos, lotes e imágenes opcionales. El presupuesto temporal incluye texto, imagen y fallbacks; no fijar un timeout superior al de la función desplegada.

No registrar imágenes base64, claves, recibos completos ni contenido sensible en logs. Una salida vacía o parcial no equivale a datos guardados.
