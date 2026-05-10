"use client";
import { ShoppingCart, Clock, AlertCircle } from "lucide-react";
import type { DueItem } from "@/lib/recurring-items";

interface RecurringItemsCardProps {
  items: DueItem[];
  onAddItem: (item: DueItem) => void;
  onAddAll: (items: DueItem[]) => void;
}

function StatusBadge({ status }: { status: DueItem["status"] }) {
  if (status === "overdue") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertCircle size={11} />
        Vencido
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock size={11} />
      Pronto
    </span>
  );
}

export function RecurringItemsCard({
  items,
  onAddItem,
  onAddAll,
}: RecurringItemsCardProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Items que probablemente se acaben pronto
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Basado en tu historial de compras
          </p>
        </div>
        {items.length > 1 && (
          <button
            onClick={() => onAddAll(items)}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <ShoppingCart size={12} />
            Agregar todos
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.itemId}
            className="flex items-center justify-between rounded-xl bg-white border border-amber-100 px-3 py-2"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-gray-800">
                {item.itemName}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <span className="text-xs text-gray-400">
                  Hace {item.daysSincePurchase}d · cada ~{item.avgFrequency}d
                </span>
              </div>
            </div>
            <button
              onClick={() => onAddItem(item)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <ShoppingCart size={11} />
              Agregar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
