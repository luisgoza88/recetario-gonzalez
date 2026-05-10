"use client";

import { useEffect } from "react";
import { X, Check } from "lucide-react";
import { groupByAisle } from "@/lib/supermarket-aisle-order";

interface SupermarketItem {
  id: string;
  name: string;
  quantity?: string;
  price?: number;
  checked: boolean;
  category?: string | null;
}

interface SupermarketModeProps {
  items: SupermarketItem[];
  onToggleItem: (id: string) => void;
  onClose: () => void;
}

export function SupermarketMode({
  items,
  onToggleItem,
  onClose,
}: SupermarketModeProps) {
  // WakeLock — mantener pantalla encendida mientras se hace la compra
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // El navegador puede denegar el wakelock silenciosamente
      }
    };

    acquire();

    // Re-adquirir si la pagina vuelve a ser visible (ej: cambio de tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const totalPrice = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const checkedPrice = items
    .filter((i) => i.checked)
    .reduce((sum, i) => sum + (i.price || 0), 0);

  // Separar pendientes y comprados; dentro de cada grupo, ordenar por pasillo
  const pendingItems = items.filter((i) => !i.checked);
  const doneItems = items.filter((i) => i.checked);

  const pendingGroups = groupByAisle(pendingItems);
  const doneGroups = groupByAisle(doneItems);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header con progreso */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">Modo Supermercado</h2>
            <p className="text-sm text-green-100">
              {checkedCount} de {totalCount} items
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modo supermercado"
            className="p-2 rounded-full hover:bg-white/20 active:scale-95 transition-transform"
          >
            <X size={28} />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="h-3 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-sm">
          {totalPrice > 0 ? (
            <>
              <span>${checkedPrice.toLocaleString("es-CO")} comprado</span>
              <span className="text-green-100">
                ${totalPrice.toLocaleString("es-CO")} total
              </span>
            </>
          ) : (
            <span className="text-green-100">
              {progress === 100
                ? "Lista completa!"
                : `${Math.round(progress)}% completado`}
            </span>
          )}
        </div>
      </div>

      {/* Lista scrollable — BIG taps */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        {/* Items pendientes agrupados por pasillo */}
        {pendingGroups.map(({ aisle, items: aisleItems }) => (
          <div key={aisle} className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
              {aisle}
            </p>
            <div className="space-y-2">
              {aisleItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggleItem(item.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Items ya comprados */}
        {doneItems.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
              Ya en el carrito ({doneItems.length})
            </p>
            {doneGroups.map(({ aisle, items: aisleItems }) => (
              <div key={aisle} className="mb-3">
                <div className="space-y-2">
                  {aisleItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => onToggleItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista vacia */}
        {totalCount === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No hay items en la lista</p>
            <p className="text-sm mt-1">
              Agrega productos desde la vista de compras
            </p>
          </div>
        )}

        {/* Completado */}
        {totalCount > 0 && checkedCount === totalCount && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-700">Lista completa</p>
            <p className="text-sm text-gray-500 mt-1">
              Ya tienes todo lo necesario
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
}: {
  item: SupermarketItem;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left
        ${
          item.checked
            ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 opacity-60"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
        }
      `}
    >
      {/* Checkbox visual */}
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all
          ${
            item.checked
              ? "bg-green-500 text-white"
              : "border-2 border-gray-300 dark:border-gray-600"
          }
        `}
      >
        {item.checked && <Check size={22} strokeWidth={3} />}
      </div>

      {/* Nombre y cantidad */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xl font-semibold leading-tight ${
            item.checked
              ? "line-through text-gray-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {item.name}
        </p>
        {item.quantity && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {item.quantity}
          </p>
        )}
      </div>

      {/* Precio si existe */}
      {item.price ? (
        <span className="text-lg font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">
          ${item.price.toLocaleString("es-CO")}
        </span>
      ) : null}
    </button>
  );
}
