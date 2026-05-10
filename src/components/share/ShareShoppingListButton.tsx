"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  buildShoppingListWhatsAppMessage,
  openWhatsAppWithMessage,
  type ShoppingItem,
} from "@/lib/share/whatsapp";

interface ShareShoppingListButtonProps {
  items: ShoppingItem[];
  total?: number;
  storeName?: string;
  weekLabel?: string;
}

export function ShareShoppingListButton({
  items,
  total,
  storeName,
  weekLabel,
}: ShareShoppingListButtonProps) {
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phone, setPhone] = useState("");

  const handleShare = (toContact: boolean) => {
    const message = buildShoppingListWhatsAppMessage({
      items,
      total,
      storeName,
      weekLabel,
    });
    openWhatsAppWithMessage(message, toContact ? phone : undefined);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => handleShare(false)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow"
      >
        <MessageCircle size={20} />
        Compartir por WhatsApp
      </button>

      <button
        onClick={() => setShowPhoneInput(!showPhoneInput)}
        className="text-xs text-gray-500 hover:text-gray-700 mx-auto block"
      >
        {showPhoneInput ? "Cancelar" : "Enviar a contacto especifico"}
      </button>

      {showPhoneInput && (
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="Numero (ej: 573001234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            onClick={() => handleShare(true)}
            disabled={!phone}
            className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
