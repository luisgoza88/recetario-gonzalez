import { createServiceRoleClient } from "@/lib/supabase/server";

export interface DueItem {
  itemId: string;
  itemName: string;
  daysSincePurchase: number;
  avgFrequency: number;
  status: "due" | "overdue";
}

/**
 * Devuelve items que probablemente se estan acabando o ya se acabaron
 * basado en el patron historico de compras.
 */
export async function getDueItems(householdId: string): Promise<DueItem[]> {
  const supabase = createServiceRoleClient();

  const { data: patterns } = await supabase
    .from("purchase_patterns")
    .select("*")
    .eq("household_id", householdId)
    .gte("total_purchases", 2);

  const today = new Date();
  const dueItems: DueItem[] = [];

  for (const p of patterns || []) {
    if (!p.last_purchase_date || !p.avg_frequency_days) continue;

    const last = new Date(p.last_purchase_date);
    const days = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Si pasaron mas dias que la frecuencia promedio, es "due"
    if (days >= p.avg_frequency_days * 0.8) {
      dueItems.push({
        itemId: p.item_id,
        itemName: p.item_name,
        daysSincePurchase: days,
        avgFrequency: p.avg_frequency_days,
        status: days >= p.avg_frequency_days ? "overdue" : "due",
      });
    }
  }

  return dueItems.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (a.status !== "overdue" && b.status === "overdue") return 1;
    return b.daysSincePurchase - a.daysSincePurchase;
  });
}
