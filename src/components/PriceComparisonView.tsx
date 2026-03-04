"use client";

import { useState, useMemo } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  TrendingDown,
  Store,
  Filter,
  Trophy,
  ArrowDownAZ,
} from "lucide-react";
import {
  COLOMBIAN_PRICES,
  STORE_LABELS,
  STORE_COLORS,
  StoreKey,
  formatCOP,
  getCheapestStore,
  getMostExpensiveStore,
  calculateStoreTotal,
  calculateOptimizedTotal,
  generateOptimizedList,
  getCategories,
} from "@/data/colombian-prices";

type SortField = "name" | "cheapest" | "savings";
type SortDir = "asc" | "desc";

const ALL_STORES: StoreKey[] = ["exito", "d1", "jumbo", "carulla", "euro"];

export default function PriceComparisonView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOptimized, setShowOptimized] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(getCategories()),
  );

  const categories = useMemo(() => getCategories(), []);

  // Filtrar items
  const filteredItems = useMemo(() => {
    let items = COLOMBIAN_PRICES;

    if (selectedCategory !== "all") {
      items = items.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      items = items.filter((item) => {
        const name = item.item_name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return name.includes(query);
      });
    }

    // Ordenar
    items = [...items].sort((a, b) => {
      if (sortField === "name") {
        const cmp = a.item_name.localeCompare(b.item_name, "es");
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortField === "cheapest") {
        const cheapA = getCheapestStore(a.prices)?.price || 0;
        const cheapB = getCheapestStore(b.prices)?.price || 0;
        return sortDir === "asc" ? cheapA - cheapB : cheapB - cheapA;
      }
      if (sortField === "savings") {
        const savingsA =
          (getMostExpensiveStore(a.prices)?.price || 0) -
          (getCheapestStore(a.prices)?.price || 0);
        const savingsB =
          (getMostExpensiveStore(b.prices)?.price || 0) -
          (getCheapestStore(b.prices)?.price || 0);
        return sortDir === "asc" ? savingsA - savingsB : savingsB - savingsA;
      }
      return 0;
    });

    return items;
  }, [searchQuery, selectedCategory, sortField, sortDir]);

  // Agrupar por categoría
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Resumen de totales por tienda
  const storeTotals = useMemo(() => {
    return ALL_STORES.map((store) => ({
      store,
      total: calculateStoreTotal(store),
    })).sort((a, b) => a.total - b.total);
  }, []);

  // Total optimizado
  const optimized = useMemo(() => calculateOptimizedTotal(), []);
  const optimizedList = useMemo(() => generateOptimizedList(), []);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown size={20} />
          <h2 className="text-lg font-bold">Comparador de Precios</h2>
        </div>
        <p className="text-sm text-white/80">
          Precios promedio en supermercados colombianos (COP) -{" "}
          {filteredItems.length} productos
        </p>
      </div>

      {/* Resumen de totales por tienda */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Store size={16} />
          Total mercado completo por tienda
        </h3>
        <div className="space-y-2">
          {storeTotals.map(({ store, total }, index) => {
            const isFirst = index === 0;
            const isLast = index === storeTotals.length - 1;
            const barWidth =
              storeTotals.length > 0
                ? (total / storeTotals[storeTotals.length - 1].total) * 100
                : 0;

            return (
              <div key={store} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium text-gray-600">
                  {STORE_LABELS[store]}
                </span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: isFirst
                        ? "#16a34a"
                        : isLast
                          ? "#dc2626"
                          : STORE_COLORS[store],
                    }}
                  />
                </div>
                <span
                  className={`text-sm font-bold w-28 text-right ${
                    isFirst
                      ? "text-green-700"
                      : isLast
                        ? "text-red-600"
                        : "text-gray-700"
                  }`}
                >
                  {formatCOP(total)}
                  {isFirst && (
                    <Trophy size={12} className="inline ml-1 text-yellow-500" />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Optimizado */}
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                Lista optimizada (mejor precio x item)
              </span>
            </div>
            <span className="text-lg font-bold text-green-700">
              {formatCOP(optimized.total)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ahorras{" "}
            <span className="font-semibold text-green-600">
              {formatCOP(
                storeTotals[storeTotals.length - 1]?.total - optimized.total,
              )}
            </span>{" "}
            vs comprar todo en{" "}
            {STORE_LABELS[storeTotals[storeTotals.length - 1]?.store]}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar producto... (ej: salmon)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2">
          <ArrowDownAZ size={14} className="text-gray-400" />
          {[
            { field: "name" as const, label: "Nombre" },
            { field: "cheapest" as const, label: "Precio" },
            { field: "savings" as const, label: "Ahorro" },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                sortField === field
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
        </div>
      </div>

      {/* Price Table by Category */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <div
          key={category}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          {/* Category header */}
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-semibold text-gray-700">
              {category}{" "}
              <span className="text-xs font-normal text-gray-400">
                ({items.length})
              </span>
            </span>
            {expandedCategories.has(category) ? (
              <ChevronUp size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
          </button>

          {expandedCategories.has(category) && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-white z-10">
                      Producto
                    </th>
                    {ALL_STORES.map((store) => (
                      <th
                        key={store}
                        className="text-right px-2 py-2 text-xs font-medium whitespace-nowrap"
                        style={{ color: STORE_COLORS[store] }}
                      >
                        {STORE_LABELS[store]}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2 text-xs font-medium text-green-700 whitespace-nowrap">
                      Mejor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const cheapest = getCheapestStore(item.prices);
                    const expensive = getMostExpensiveStore(item.prices);

                    return (
                      <tr
                        key={item.item_name}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white z-10">
                          {item.item_name}
                        </td>
                        {ALL_STORES.map((store) => {
                          const price = item.prices[store];
                          const isCheapest =
                            price !== undefined &&
                            cheapest &&
                            store === cheapest.store;
                          const isExpensive =
                            price !== undefined &&
                            expensive &&
                            store === expensive.store;

                          return (
                            <td
                              key={store}
                              className={`text-right px-2 py-2.5 whitespace-nowrap font-mono text-xs ${
                                isCheapest
                                  ? "text-green-700 font-bold bg-green-50"
                                  : isExpensive
                                    ? "text-red-500"
                                    : "text-gray-600"
                              }`}
                            >
                              {price !== undefined ? (
                                <>
                                  {formatCOP(price)}
                                  {isCheapest && (
                                    <span className="ml-0.5 text-green-500 text-[10px]">
                                      *
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-300">--</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-right px-3 py-2.5 whitespace-nowrap">
                          {cheapest && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              {STORE_LABELS[cheapest.store]}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* No results */}
      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Search size={32} className="mx-auto mb-2 opacity-50" />
          <p>No se encontraron productos</p>
        </div>
      )}

      {/* Optimized List Button */}
      <button
        onClick={() => setShowOptimized(!showOptimized)}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 transition-all shadow-md"
      >
        <ShoppingBag size={18} />
        {showOptimized ? "Ocultar" : "Ver"} Lista Optimizada
        {showOptimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Optimized Shopping List */}
      {showOptimized && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
          <div className="bg-green-50 border border-green-200 p-3 rounded-xl text-sm text-green-700">
            <p className="font-semibold">
              Comprando cada item en la tienda mas barata, tu mercado cuesta{" "}
              {formatCOP(optimized.total)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Visita{" "}
              {
                Object.entries(optimizedList).filter(
                  ([, items]) => items.length > 0,
                ).length
              }{" "}
              tiendas para el mejor precio en todo
            </p>
          </div>

          {ALL_STORES.map((store) => {
            const storeItems = optimizedList[store];
            if (storeItems.length === 0) return null;

            const storeTotal = storeItems.reduce(
              (sum, item) => sum + item.price,
              0,
            );

            return (
              <div
                key={store}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{
                    backgroundColor: `${STORE_COLORS[store]}15`,
                    borderLeft: `4px solid ${STORE_COLORS[store]}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Store size={16} style={{ color: STORE_COLORS[store] }} />
                    <span
                      className="font-bold"
                      style={{ color: STORE_COLORS[store] }}
                    >
                      {STORE_LABELS[store]}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({storeItems.length} items)
                    </span>
                  </div>
                  <span className="font-bold text-gray-700">
                    {formatCOP(storeTotal)}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {storeItems.map((item) => (
                    <div
                      key={item.item_name}
                      className="px-4 py-2 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm text-gray-800">
                          {item.item_name}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-2">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-sm font-mono text-gray-600">
                        {formatCOP(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
