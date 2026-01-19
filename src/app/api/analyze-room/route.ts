import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_MODELS, GEMINI_CONFIG, cleanJsonResponse, base64ToGeminiFormat } from '@/lib/gemini/client';

interface RoomAnalysis {
  roomType: string;
  roomTypeId: string;
  estimatedArea: number;
  attributes: {
    has_bathroom: boolean;
    has_walkin_closet: boolean;
    has_balcony: boolean;
    has_windows: number;
    floor_type: 'tile' | 'wood' | 'carpet' | 'concrete' | 'other';
    has_curtains: boolean;
    has_air_conditioning: boolean;
  };
  furniture: string[];
  surfaces: string[];
  cleaningZones?: {
    zone: string;
    complexity: 'simple' | 'moderada' | 'compleja';
    items: string[];
  }[];
  suggestedTasks: {
    name: string;
    frequency: 'diaria' | 'semanal' | 'quincenal' | 'mensual';
    estimatedMinutes: number;
    reason: string;
    priority?: 'alta' | 'media' | 'baja';
  }[];
  usageLevel: 'alto' | 'medio' | 'bajo';
  description: string;
  specialConsiderations?: string[];
  confidence: number;
}

// Dimensiones de referencia para estimación de área
const REFERENCE_DIMENSIONS: Record<string, { name: string; size: string; meters: number }> = {
  door: { name: 'puerta estándar', size: '2.10m de altura x 0.90m de ancho', meters: 2.10 },
  bed_single: { name: 'cama sencilla', size: '1.90m de largo x 0.90m de ancho', meters: 1.90 },
  bed_double: { name: 'cama doble/queen', size: '2.00m de largo x 1.50m de ancho', meters: 2.00 },
  window: { name: 'ventana estándar', size: '1.20m de ancho x 1.00m de alto', meters: 1.20 },
  sofa: { name: 'sofá de 3 puestos', size: '2.00m de largo x 0.90m de profundidad', meters: 2.00 },
  none: { name: 'ninguna', size: 'sin referencia específica', meters: 0 }
};

export async function POST(request: NextRequest) {
  try {
    const { images, referenceObject, capturedSteps } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos una imagen' },
        { status: 400 }
      );
    }

    const gemini = getGeminiClient();

    // Obtener información de referencia
    const reference = REFERENCE_DIMENSIONS[referenceObject] || REFERENCE_DIMENSIONS.none;
    const hasCapturedSteps = capturedSteps && Array.isArray(capturedSteps) && capturedSteps.length > 0;

    // Construir el contenido con las imágenes para Gemini Vision
    const imageParts = images.map((imageBase64: string) => base64ToGeminiFormat(imageBase64));

    // Construir contexto de referencia para el prompt
    const referenceContext = reference.meters > 0
      ? `\n\n## REFERENCIA DE DIMENSIONES (MUY IMPORTANTE):\nEl usuario indicó que hay una ${reference.name} visible en las imágenes (${reference.size}).
USA ESTA REFERENCIA para calcular el área del espacio de forma más precisa:
1. Identifica la ${reference.name} en las imágenes
2. Usa sus dimensiones conocidas (${reference.meters}m) como escala
3. Estima el ancho y largo del espacio comparando con esta referencia
4. Calcula: área = largo × ancho
5. Sé preciso: una habitación típica es 12-20m², una sala 20-40m², un baño 4-8m²`
      : '';

    const capturedStepsContext = hasCapturedSteps
      ? `\n\n## IMÁGENES CAPTURADAS:\nEl usuario tomó fotos de: ${capturedSteps.join(', ')}. Esto te ayuda a entender qué partes del espacio están documentadas.`
      : '';

    const systemPrompt = `Eres un experto analizador de espacios del hogar para un sistema de gestión de limpieza. Tu objetivo es identificar LO IMPORTANTE para la limpieza, no cada objeto pequeño.${referenceContext}${capturedStepsContext}

## REGLAS DE ANÁLISIS INTELIGENTE:

### ENFÓCATE EN (lo que genera tareas de limpieza):
- **Superficies grandes**: Pisos, mesones, mesas, escritorios
- **Muebles principales**: Camas, sofás, sillas, armarios, estantes
- **Electrodomésticos**: TV, nevera, estufa, lavadora, A/C
- **Elementos estructurales**: Ventanas, puertas, techos, paredes
- **Textiles grandes**: Cortinas, alfombras, tapetes, sábanas
- **Áreas problemáticas**: Zonas de alto tráfico, áreas húmedas, rincones

### GENERALIZA (no listes individualmente):
- Decoración variada → "Zona de decoración" (si hay muchos adornos)
- Objetos pequeños → "Organizar superficies"
- Libros/revistas → "Estantería con libros" (no cada libro)
- Plantas → "Plantas de interior" (no cada maceta)
- Juguetes → "Área de juegos" o "Juguetes infantiles"
- Fotos/cuadros → "Cuadros decorativos" (no cada uno)

### IGNORA COMPLETAMENTE:
- Controles remotos, lapiceros, cables sueltos
- Objetos personales pequeños (llaves, carteras, celulares)
- Ropa en uso o tirada temporalmente
- Basura o desorden temporal
- Documentos o papeles sueltos

### TAREAS INTELIGENTES:
Genera tareas basadas en CATEGORÍAS, no en objetos individuales:

| Si detectas... | Tarea generalizada |
|----------------|-------------------|
| Muchos adornos/decoración | "Sacudir y organizar decoración" (quincenal) |
| Estantes con objetos | "Limpiar y organizar estantes" (semanal) |
| Zona de trabajo con cosas | "Organizar escritorio/área de trabajo" (semanal) |
| Varios electrodomésticos | "Limpiar electrodomésticos" (semanal) |
| Plantas múltiples | "Cuidado de plantas" (incluye regar y limpiar hojas) |
| Área infantil | "Organizar y limpiar área de juegos" |
| Mascotas (evidencia) | "Limpieza de pelos y olores" |

## FORMATO DE RESPUESTA (JSON sin markdown):

{
  "roomType": "Nombre descriptivo (ej: Habitación Principal con Baño)",
  "roomTypeId": "sala|cocina|habitacion|baño|comedor|estudio|lavanderia|jardin|piscina|terraza|garaje|patio",
  "estimatedArea": número en metros cuadrados (estima basado en proporciones),
  "attributes": {
    "has_bathroom": boolean,
    "has_walkin_closet": boolean,
    "has_balcony": boolean,
    "has_windows": número (cuenta ventanas visibles),
    "floor_type": "tile|wood|carpet|concrete|other",
    "has_curtains": boolean,
    "has_air_conditioning": boolean
  },
  "furniture": ["Solo muebles PRINCIPALES que requieren limpieza"],
  "surfaces": ["Solo superficies GRANDES que se limpian regularmente"],
  "cleaningZones": [
    {
      "zone": "Nombre de la zona",
      "complexity": "simple|moderada|compleja",
      "items": ["elementos agrupados en esta zona"]
    }
  ],
  "suggestedTasks": [
    {
      "name": "Tarea generalizada e inteligente",
      "frequency": "diaria|semanal|quincenal|mensual",
      "estimatedMinutes": número realista,
      "reason": "Razón basada en lo observado",
      "priority": "alta|media|baja"
    }
  ],
  "usageLevel": "alto|medio|bajo",
  "description": "Descripción concisa del espacio (2-3 oraciones máximo)",
  "specialConsiderations": ["Consideraciones especiales si las hay (mascotas, niños, alergias visibles, etc.)"],
  "confidence": número 0-100
}

## EJEMPLO DE ANÁLISIS INTELIGENTE:
- NO: "TV Samsung 55 pulgadas, control remoto, decodificador, cables HDMI"
- SÍ: "Centro de entretenimiento con TV" → Tarea: "Limpiar pantalla y mueble de TV"

- NO: "Lámpara de mesa, portarretratos, vela decorativa, florero, 3 libros"
- SÍ: "Mesa de noche con decoración" → Tarea: "Sacudir y organizar mesa de noche"

Sé PRÁCTICO y ÚTIL. Un ama de llaves profesional no limpia "el lapicero", limpia "el escritorio".`;

    const userPrompt = `Analiza estas ${images.length} imagen(es) del espacio y extrae toda la información posible para configurar tareas de limpieza. Si hay múltiples imágenes, son diferentes ángulos del mismo espacio.`;

    // Build content parts: system prompt + user prompt + images
    const contentParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: systemPrompt },
      { text: userPrompt },
      ...imageParts
    ];

    const response = await gemini.models.generateContent({
      model: GEMINI_MODELS.FLASH,
      contents: [{
        role: 'user',
        parts: contentParts
      }],
      config: {
        temperature: GEMINI_CONFIG.vision.temperature,
        maxOutputTokens: GEMINI_CONFIG.vision.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: 'No se pudo analizar la imagen' },
        { status: 500 }
      );
    }

    // Parsear el JSON de respuesta
    let analysis: RoomAnalysis;
    try {
      const cleanContent = cleanJsonResponse(content);
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', content);
      return NextResponse.json(
        { error: 'Error al procesar la respuesta del análisis', raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
      imagesAnalyzed: images.length
    });

  } catch (error) {
    console.error('Error analyzing room:', error);
    return NextResponse.json(
      { error: 'Error al analizar el espacio' },
      { status: 500 }
    );
  }
}
