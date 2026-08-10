# Piloto de imágenes del recetario

## Dirección visual aprobada

- Fotografía editorial fotorrealista de cocina casera.
- Plato de cerámica artesanal color blanco cálido.
- Mesa de piedra clara mate y lino natural discreto.
- Luz suave de ventana desde la izquierda y sombras reales.
- Encuadre horizontal 3:2, cámara a 45 grados y plato ocupando cerca del 75 %.
- Texturas naturales; sin apariencia de CGI ni montaje de alta cocina.
- Sin personas, manos, texto, logotipos ni marcas de agua.
- Solo pueden aparecer ingredientes o acompañamientos incluidos en la receta.

## Estructura del prompt

```text
Use case: photorealistic-natural
Asset type: horizontal recipe-card photograph for a premium mobile cookbook
Primary request: [NOMBRE], exactly as the finished recipe
Scene/backdrop: matte warm light-stone tabletop, subtle natural linen,
handmade off-white ceramic plate or bowl
Subject: [DESCRIPCIÓN VISUAL FIEL A INGREDIENTES Y PREPARACIÓN]
Style/medium: highly photorealistic editorial home-cooking photography,
appetizing but achievable at home, natural texture, not CGI
Composition/framing: landscape 3:2, 45-degree slightly overhead, close
framing, dish centered and filling about 75 percent, crop-safe for mobile cards
Lighting/mood: soft natural window light from the left, gentle realistic
shadows, warm-neutral color balance
Constraints: show only [INGREDIENTES VISIBLES]; no unrelated side dishes;
no text, logo, watermark, people or hands
Avoid: fine-dining plating, impossible perfection, oversaturation,
plastic-looking food, excessive garnish
```

## Recetas del lote

1. Pechuga al Limón con Brócoli (`lc-co-01`)
2. Pollo al Cilantro con Arroz de Coliflor (`lc-co-03`)
3. Pimentones Rellenos de Pollo (`lc-co-06`)
4. Curry Suave de Pollo y Espinaca (`lc-co-09`)
5. Tilapia en Hogao con Calabacín (`lc-co-16`)
6. Trucha al Ajo con Espinaca (`lc-co-17`)
7. Ceviche de Pescado con Pepino (`lc-co-23`)
8. Salmón con Ensalada de Pepino y Aguacate (`lc-co-28`)
9. Ajiaco Santafereño (`reg-25`)
10. Arepa de Chócolo con Quesito (`reg-28`)
11. Crema de Ahuyama Thermomix (`tm6-01`)
12. Falafel con Salsa de Yogur (`int-09`)

Las imágenes finales se guardan como WebP de 1200 × 800 px con calidad 84.

## Lote 2 · 50 recetas

El segundo lote aplica la misma dirección visual a 50 recetas adicionales:
las 22 recetas bajas en carbohidratos restantes de pollo y pescado, recetas
rápidas y familiares, preparaciones TM6, fitness, cenas ligeras y tres platos
del Caribe colombiano. Los archivos se guardan en
`public/images/recipes/batch-2026-08/` y se vinculan por ID en
`src/data/recipe-image-overrides.ts`.
