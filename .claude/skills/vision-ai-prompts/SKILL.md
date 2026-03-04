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

# Vision AI Prompts

## Modelos de Vision

- **Analisis**: `gemini-2.0-flash` (rapido, suficiente para vision)
- **Generacion**: `imagen-3.0-generate-002` (alta calidad)

## 1. Scan Receipt (`/api/scan-receipt`)

**Input**: 1 imagen de ticket/recibo de supermercado
**Output**: JSON con productos extraidos

```
Analiza esta imagen de un ticket de supermercado colombiano.
Extrae TODOS los productos con:
- nombre: nombre del producto como aparece
- precio: precio en COP (numero)
- cantidad: cantidad comprada (numero, default 1)
- categoria: una de [frutas, verduras, carnes, lacteos, granos, bebidas, limpieza, otros]

Responde SOLO con JSON valido, sin markdown:
{ "items": [{ "nombre": "...", "precio": 0, "cantidad": 1, "categoria": "..." }] }
```

## 2. Scan Pantry (`/api/scan-pantry`)

**Input**: Hasta 5 imagenes de despensa/nevera
**Output**: JSON con items detectados, matched con inventario

```
Analiza esta imagen de una despensa/nevera colombiana.
Identifica TODOS los productos visibles:
- nombre: nombre del producto en espanol
- cantidad_estimada: cantidad aproximada (numero)
- unidad: unidad (unidades, kg, litros, paquetes)
- estado: bueno | por_vencer | vencido
- confianza: alta | media | baja

Responde SOLO con JSON valido:
{ "items": [{ "nombre": "...", "cantidad_estimada": 0, "unidad": "...", "estado": "...", "confianza": "..." }] }
```

**Patron multi-imagen**: Procesa hasta 5 imagenes con concurrencia limitada a 3.

## 3. Analyze Room (`/api/analyze-room`)

**Input**: 1 imagen de habitacion
**Output**: JSON con tipo, area, muebles, tareas sugeridas

```
Analiza esta imagen de una habitacion/espacio del hogar.
Identifica:
- tipo: tipo de espacio (cocina, sala, bano, habitacion, etc.)
- area_estimada: area aproximada en m2
- muebles: lista de muebles/objetos visibles
- estado_limpieza: limpio | moderado | sucio
- tareas_sugeridas: lista de tareas de limpieza recomendadas

Responde SOLO con JSON valido.
```

## 4. Recipe from Image (`/api/generate-recipe-from-image`)

**Input**: 1 imagen de plato de comida
**Output**: Receta completa

```
Observa esta imagen de un plato de comida.
Genera una receta completa en espanol:
- nombre: nombre del plato
- ingredientes: lista con cantidades
- instrucciones: pasos numerados
- tiempo_preparacion: en minutos
- porciones: numero de porciones
- categoria: desayuno | almuerzo | cena | snack

Responde SOLO con JSON valido.
```

## 5. Match Recipe Image (`/api/match-recipe-image`)

**Input**: Nombre de receta + hasta 100 URLs candidatas
**Output**: Mejor match semantico

```
Necesito encontrar la imagen que mejor represente la receta "{recipeName}".
Analiza estas {n} imagenes candidatas y elige la que mejor coincida
semanticamente con el nombre y tipo de plato.

Responde con el indice (0-based) de la mejor imagen:
{ "bestMatch": 0, "confidence": "alta" }
```

## Reglas para Prompts de Vision

1. SIEMPRE en espanol con contexto colombiano
2. Pedir respuesta en JSON valido, sin markdown
3. Try/catch al parsear respuesta (Gemini puede devolver formato incorrecto)
4. Limitar concurrencia a 3 llamadas simultaneas
5. Verificar tamano de imagen antes de enviar (max 20MB por request)
6. Incluir contexto relevante (inventario actual, recetas disponibles) cuando aplica
