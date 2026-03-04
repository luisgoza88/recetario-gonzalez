import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const LogPriceSchema = z.object({
  itemName: z.string().min(1),
  price: z.number().positive(),
  store: z.string().min(1),
  quantity: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { itemName, price, store, quantity } = LogPriceSchema.parse(body);
    const supabase = createServiceRoleClient();

    // 1. Save to price_history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: priceError } = await (supabase as any)
      .from("price_history")
      .insert({
        item_name: itemName,
        price,
        store,
        quantity: quantity || null,
        recorded_at: new Date().toISOString(),
      });

    if (priceError) {
      logger.error("Error saving price history", { error: priceError.message });
      return NextResponse.json(
        { error: "Error guardando precio" },
        { status: 500 },
      );
    }

    // 2. Update avg_price and preferred_store in market_items
    // Get all price records for this item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPrices } = await (supabase as any)
      .from("price_history")
      .select("price, store")
      .ilike("item_name", itemName);

    if (allPrices && allPrices.length > 0) {
      const total = allPrices.reduce(
        (s: number, p: { price: number }) => s + Number(p.price),
        0,
      );
      const avgPrice = Math.round((total / allPrices.length) * 100) / 100;

      // Find cheapest store
      const storeAvgs = new Map<string, { sum: number; count: number }>();
      for (const p of allPrices) {
        const s = p.store || "Otro";
        if (!storeAvgs.has(s)) storeAvgs.set(s, { sum: 0, count: 0 });
        const sa = storeAvgs.get(s)!;
        sa.sum += Number(p.price);
        sa.count++;
      }
      let preferredStore = store;
      let bestAvg = Infinity;
      for (const [s, data] of storeAvgs) {
        const avg = data.sum / data.count;
        if (avg < bestAvg) {
          bestAvg = avg;
          preferredStore = s;
        }
      }

      // Update market_items (try exact match, then fuzzy)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: exactMatch } = await (supabase as any)
        .from("market_items")
        .select("id")
        .ilike("name", itemName)
        .limit(1)
        .single();

      if (exactMatch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("market_items")
          .update({
            avg_price: avgPrice,
            preferred_store: preferredStore,
            last_purchase_date: new Date().toISOString().split("T")[0],
          })
          .eq("id", exactMatch.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Precio de ${itemName} registrado: $${price.toLocaleString()} en ${store}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 },
      );
    }
    logger.error("Error logging price", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Error registrando precio" },
      { status: 500 },
    );
  }
}
