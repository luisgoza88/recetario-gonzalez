/**
 * Genera un mensaje WhatsApp con la lista de compras lista para compartir.
 * Usa wa.me que abre WhatsApp con el mensaje pre-llenado.
 *
 * Nota: Para funcionalidad base de WhatsApp (menu del dia, schedule empleados)
 * ver src/lib/whatsapp-share.ts
 */

export interface ShoppingItem {
  name: string;
  quantity?: string;
  category?: string;
  price?: number;
  checked?: boolean;
}

export function buildShoppingListWhatsAppMessage(params: {
  items: ShoppingItem[];
  total?: number;
  storeName?: string;
  weekLabel?: string;
}): string {
  const { items, total, storeName, weekLabel } = params;

  let msg = `🛒 *Lista de Compras${weekLabel ? ` - ${weekLabel}` : ""}*\n`;
  if (storeName) msg += `📍 ${storeName}\n`;
  msg += "\n";

  // Agrupar por categoria
  const byCategory: Record<string, ShoppingItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || "Otros";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  for (const [category, catItems] of Object.entries(byCategory)) {
    msg += `*${category}*\n`;
    catItems.forEach((item) => {
      const check = item.checked ? "✅" : "▫️";
      const qty = item.quantity ? ` (${item.quantity})` : "";
      const price = item.price
        ? ` - $${item.price.toLocaleString("es-CO")}`
        : "";
      msg += `${check} ${item.name}${qty}${price}\n`;
    });
    msg += "\n";
  }

  if (total) {
    msg += `\n💰 *Total estimado: $${total.toLocaleString("es-CO")}*\n`;
  }

  msg += "\n_Enviado desde Recetario_";

  return msg;
}

export function openWhatsAppWithMessage(
  message: string,
  phoneNumber?: string,
): void {
  const encoded = encodeURIComponent(message);
  const phone = phoneNumber?.replace(/\D/g, "") || "";
  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}
