import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface IdentifiedProduct {
  name: string;
  genericName: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: number;
  matchesExisting?: string | null;
}

interface ScanResult {
  identified: IdentifiedProduct[];
  matched: Array<{
    product: IdentifiedProduct;
    marketItemId: string;
    marketItemName: string;
    action: 'update_inventory';
  }>;
  newItems: Array<{
    product: IdentifiedProduct;
    action: 'create_new';
  }>;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

    // 1. Obtener lista actual de items del mercado para matching
    const { data: marketItems } = await supabase
      .from('market_items')
      .select('id, name, category, quantity');

    const marketItemsList = marketItems?.map(i => `- ${i.name} (${i.category})`).join('\n') || '';

    // 2. Usar GPT-4o Vision para identificar productos
    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en identificar productos de despensa y nevera en fotos.

Tu tarea es:
1. Identificar TODOS los productos visibles en la imagen
2. Convertir nombres de marca a nombres genéricos (ej: "Coca-Cola" → "Gaseosa", "Colgate" → "Crema dental", "Ramo" → "Pan tajado", "Alquería" → "Leche")
3. Estimar la cantidad aproximada de cada producto
4. Asignar una categoría apropiada

Categorías disponibles:
- Proteínas (carnes, pollo, pescado, huevos)
- Vegetales
- Frutas
- Lácteos (leche, queso, yogurt)
- Granos y Cereales (arroz, pasta, avena)
- Condimentos (sal, aceite, salsas)
- Bebidas
- Panadería
- Snacks
- Limpieza
- Otros

Lista de productos existentes en el mercado del usuario:
${marketItemsList}

Si un producto identificado coincide (o es similar) a uno de la lista existente, usa el MISMO nombre exacto de la lista.

Responde ÚNICAMENTE en formato JSON válido con esta estructura:
{
  "products": [
    {
      "name": "nombre original visto (puede incluir marca)",
      "genericName": "nombre genérico del producto",
      "quantity": 2,
      "unit": "unid",
      "category": "Categoría",
      "confidence": 0.95,
      "matchesExisting": "Nombre exacto del item existente si coincide, o null si es nuevo"
    }
  ],
  "summary": "Resumen breve de lo que se encontró"
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identifica todos los productos en esta imagen de mi despensa/nevera. Convierte las marcas a nombres genéricos.'
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = visionResponse.choices[0]?.message?.content || '';

    // Extraer JSON de la respuesta
    let productsData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        productsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      console.error('Error parsing vision response:', content);
      return NextResponse.json({
        error: 'No se pudieron identificar productos en la imagen',
        rawResponse: content
      }, { status: 400 });
    }

    // 3. Procesar productos identificados
    const result: ScanResult = {
      identified: productsData.products || [],
      matched: [],
      newItems: [],
      summary: productsData.summary || ''
    };

    // Crear mapa de items existentes para búsqueda rápida
    const marketItemsMap = new Map(
      (marketItems || []).map(item => [item.name.toLowerCase(), item])
    );

    for (const product of result.identified) {
      // Buscar coincidencia en items existentes
      let matchedItem = null;

      // Primero buscar por nombre exacto que sugirió la IA
      if (product.matchesExisting) {
        const existingMatch = product.matchesExisting;
        matchedItem = marketItems?.find(
          i => i.name.toLowerCase() === existingMatch.toLowerCase()
        );
      }

      // Si no, buscar por nombre genérico
      if (!matchedItem) {
        matchedItem = marketItems?.find(
          i => i.name.toLowerCase() === product.genericName.toLowerCase()
        );
      }

      // Buscar por coincidencia parcial
      if (!matchedItem) {
        const searchTerms = product.genericName.toLowerCase().split(' ');
        matchedItem = marketItems?.find(item => {
          const itemName = item.name.toLowerCase();
          return searchTerms.some(term =>
            term.length >= 4 && itemName.includes(term)
          );
        });
      }

      if (matchedItem) {
        result.matched.push({
          product,
          marketItemId: matchedItem.id,
          marketItemName: matchedItem.name,
          action: 'update_inventory'
        });
      } else {
        result.newItems.push({
          product,
          action: 'create_new'
        });
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error scanning pantry:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen' },
      { status: 500 }
    );
  }
}

// Endpoint para aplicar los cambios después de que el usuario confirme
export async function PUT(request: NextRequest) {
  try {
    const { matched, newItems } = await request.json();

    const results = {
      inventoryUpdated: 0,
      itemsCreated: 0,
      errors: [] as string[]
    };

    // 1. Actualizar inventario de items existentes
    for (const match of matched || []) {
      try {
        const { error } = await supabase
          .from('inventory')
          .upsert({
            item_id: match.marketItemId,
            current_quantity: `${match.product.quantity} ${match.product.unit}`,
            current_number: match.product.quantity,
            last_updated: new Date().toISOString()
          }, { onConflict: 'item_id' });

        if (error) throw error;
        results.inventoryUpdated++;
      } catch (err) {
        results.errors.push(`Error actualizando ${match.marketItemName}: ${err}`);
      }
    }

    // 2. Crear nuevos items
    for (const newItem of newItems || []) {
      try {
        // Obtener el max order_index
        const { data: maxOrder } = await supabase
          .from('market_items')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1);

        const nextOrder = (maxOrder?.[0]?.order_index || 0) + 1;

        // Crear el nuevo item
        const { data: createdItem, error: createError } = await supabase
          .from('market_items')
          .insert({
            name: newItem.product.genericName,
            category: newItem.product.category,
            quantity: `${newItem.product.quantity} ${newItem.product.unit}`,
            order_index: nextOrder,
            is_custom: true
          })
          .select()
          .single();

        if (createError) throw createError;

        // Crear entrada de inventario
        if (createdItem) {
          await supabase
            .from('inventory')
            .upsert({
              item_id: createdItem.id,
              current_quantity: `${newItem.product.quantity} ${newItem.product.unit}`,
              current_number: newItem.product.quantity,
              last_updated: new Date().toISOString()
            }, { onConflict: 'item_id' });
        }

        results.itemsCreated++;
      } catch (err) {
        results.errors.push(`Error creando ${newItem.product.genericName}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${results.inventoryUpdated} productos y se crearon ${results.itemsCreated} nuevos`,
      ...results
    });

  } catch (error) {
    console.error('Error applying scan results:', error);
    return NextResponse.json(
      { error: 'Error al aplicar cambios' },
      { status: 500 }
    );
  }
}
