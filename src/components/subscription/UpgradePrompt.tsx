"use client";
import { Crown, Sparkles, Check } from "lucide-react";
import { TIER_PRICES_COP, TIER_LIMITS } from "@/lib/subscription/tier-features";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  recommendedTier?: "premium" | "family";
  onClose?: () => void;
}

export function UpgradePrompt({
  feature,
  description,
  recommendedTier = "premium",
  onClose,
}: UpgradePromptProps) {
  const price = TIER_PRICES_COP[recommendedTier];

  const features =
    recommendedTier === "premium"
      ? [
          "Recetas ilimitadas con IA",
          "Imágenes ilimitadas",
          "Asistente de voz",
          "Reportes mensuales",
          "Recetas externas (Spoonacular)",
        ]
      : [
          "Todo de Premium",
          "Hasta 8 miembros del hogar",
          "Bot de WhatsApp",
          "Soporte prioritario",
        ];

  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <Crown size={32} className="text-yellow-300" />
        <div>
          <h3 className="text-xl font-bold">Función Premium</h3>
          <p className="text-purple-100 text-sm">{feature}</p>
        </div>
      </div>

      {description && <p className="text-purple-100 mb-4">{description}</p>}

      <div className="bg-white/10 rounded-xl p-4 mb-4">
        <p className="text-3xl font-bold">
          ${price.toLocaleString("es-CO")}{" "}
          <span className="text-sm font-normal">/mes</span>
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check
                size={16}
                className="text-green-300 mt-0.5 flex-shrink-0"
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <button className="w-full bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
        <Sparkles size={20} />
        Actualizar a {recommendedTier === "premium" ? "Premium" : "Family"}
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="w-full mt-2 text-purple-200 text-sm hover:text-white"
        >
          Tal vez después
        </button>
      )}
    </div>
  );
}
