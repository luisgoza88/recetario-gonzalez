"use client";

import { useState, useMemo, useEffect } from "react";
import {
  RotateCcw,
  ShoppingCart,
  Home,
  Minus,
  Plus,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Search,
  Sparkles,
  Trash2,
  WifiOff,
  Camera,
  PlusIcon,
  ListChecks,
  TrendingDown,
  ShoppingBasket,
  LayoutList,
  Map,
  ScanLine,
  ChevronDown,
  Tag,
  Receipt,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { supabase } from "@/lib/supabase/client";
import { MarketItem, IngredientCategory } from "@/types";
import { CATEGORY_EMOJIS } from "@/lib/constants/categories";
import { getItemIcon, isProteinCategory } from "@/lib/categoryIcons";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SeasonalBadge, { isInSeason } from "@/components/ui/SeasonalBadge";
import {
  getSeasonalProduceForMonth,
  getMonthName,
} from "@/data/colombian-seasons";
import {
  cacheMarketItems,
  getCachedMarketItems,
  cacheInventory,
  getCachedInventory,
} from "@/lib/indexedDB";
import dynamic from "next/dynamic";
import SmartShoppingSection from "./SmartShoppingSection";
import BudgetWidget from "./BudgetWidget";
import { SupermarketMode } from "./SupermarketMode";
import { PriceComparisonCard } from "./PriceComparisonCard";
import { groupByAisle } from "@/lib/supermarket-aisle-order";
import { ShareShoppingListButton } from "@/components/share/ShareShoppingListButton";
import { CookWithThisButton } from "@/components/recipe/CookWithThisButton";
// Sprint 6 (Lazyweb research mayo 2026): Whole Foods pattern - sugerir
// items recurrentes basados en purchase_patterns arriba de la lista
import { RecurringItemsCard } from "@/components/market/RecurringItemsCard";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import type { DueItem } from "@/lib/recurring-items";

const AddCustomItemModal = dynamic(() => import("./AddCustomItemModal"), {
  loading: () => null,
  ssr: false,
});
const ScanPantryModal = dynamic(() => import("./ScanPantryModal"), {
  loading: () => null,
  ssr: false,
});
const PriceLogModal = dynamic(() => import("./PriceLogModal"), {
  loading: () => null,
  ssr: false,
});
const PriceComparisonView = dynamic(() => import("./PriceComparisonView"), {
  loading: () => null,
  ssr: false,
});

interface MarketViewProps {
  items: MarketItem[];
  onUpdate: () => void;
}

type ViewMode = "shopping" | "pantry" | "prices";

export default function MarketView({ items, onUpdate }: MarketViewProps) {
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("shopping");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Filtro de chips (rediseño visual): Todo | Pendientes | Bajo stock | Por temporada
  const [chipFilter, setChipFilter] = useState<
    "Todo" | "Pendientes" | "Bajo stock" | "Por temporada"
  >("Todo");
  // Estado de categorías colapsables (rediseño visual)
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [categoryData, setCategoryData] = useState<
    Record<string, IngredientCategory>
  >({});
  const [isFromCache, setIsFromCache] = useState(false);
  const [showSmartList, setShowSmartList] = useState(false);
  const [smartListLoading, setSmartListLoading] = useState(false);
  const [smartListData, setSmartListData] = useState<{
    total_items: number;
    by_category: Record<
      string,
      Array<{ item: string; for_recipes: string[]; urgency: string }>
    >;
    priority_items: string[];
    estimated_meals: number;
    summary: string;
  } | null>(null);

  // Lista por pasillo vs por categoria
  const [listLayout, setListLayout] = useState<"category" | "aisle">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("market_list_layout") as
          "category" | "aisle" | null) ?? "aisle"
      );
    }
    return "aisle";
  });

  // Modo supermercado pantalla completa
  const [showSupermarketMode, setShowSupermarketMode] = useState(false);

  const [priceLogItem, setPriceLogItem] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Sprint 6: items recurrentes (purchase_patterns)
  const householdId = useHouseholdId();
  const [dueItems, setDueItems] = useState<DueItem[]>([]);

  const [confirmAction, setConfirmAction] = useState<{
    type: "reset-market" | "delete-item";
    item?: MarketItem;
  } | null>(null);

  // Offline sync
  const { isOnline, queueOperation, pendingCount } = useOfflineSync();

  // Cargar datos de categorías
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase.from("ingredient_categories").select("*");

    if (data) {
      const catMap: Record<string, IngredientCategory> = {};
      data.forEach((cat) => {
        catMap[cat.id] = cat;
      });
      setCategoryData(catMap);
    }
  };

  // Sprint 6 (Whole Foods pattern): cargar items recurrentes del hogar
  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    fetch(`/api/recurring-items?household_id=${householdId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items)) {
          setDueItems(data.items);
        }
      })
      .catch(() => {
        // Silenciar - sin recurring items no rompe el resto
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  // Cache items cuando están online para uso offline posterior
  useEffect(() => {
    if (isOnline && items.length > 0) {
      // Cachear items del mercado
      const marketItemsToCache = items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        category_id: item.category_id,
        quantity: item.quantity,
        checked: item.checked,
        order_index: item.order_index || 0,
        is_custom: item.is_custom,
        cachedAt: Date.now(),
      }));
      cacheMarketItems(marketItemsToCache);

      // Cachear inventario
      const inventoryToCache = items
        .filter((item) => item.currentNumber !== undefined)
        .map((item) => ({
          item_id: item.id,
          current_quantity: item.currentQuantity || "0",
          current_number: item.currentNumber || 0,
          cachedAt: Date.now(),
        }));
      cacheInventory(inventoryToCache);

      setIsFromCache(false);
    }
  }, [items, isOnline]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  // Contar items con stock bajo (menos del 20% o vacíos)
  const lowStockCount = items.filter((i) => {
    const current = i.currentNumber || 0;
    const required = parseQuantity(i.quantity);
    return current < required * 0.2;
  }).length;

  // Filtrar items por búsqueda
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    return items.filter((item) => {
      const name = item.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const category = item.category
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      return name.includes(query) || category.includes(query);
    });
  }, [items, searchQuery]);

  const toggleItem = async (item: MarketItem, skipPriceLog?: boolean) => {
    setLoading(item.id);

    try {
      if (!isOnline) {
        // Offline: encolar operaciones
        if (item.checked) {
          await queueOperation({
            operation: "delete",
            table: "market_checklist",
            data: { id: item.id },
          });
        } else {
          await queueOperation({
            operation: "insert",
            table: "market_checklist",
            data: {
              item_id: item.id,
              checked: true,
              checked_at: new Date().toISOString(),
            },
          });
          // También encolar actualización de inventario
          const required = parseQuantity(item.quantity);
          await queueOperation({
            operation: "update",
            table: "inventory",
            data: {
              id: item.id,
              item_id: item.id,
              current_quantity: item.quantity,
              current_number: required,
              last_updated: new Date().toISOString(),
            },
          });
        }
        onUpdate();
        return;
      }

      // Online: operaciones normales
      if (item.checked) {
        const { error } = await supabase
          .from("market_checklist")
          .delete()
          .eq("item_id", item.id);

        if (error) throw error;
      } else {
        const { error: checklistError } = await supabase
          .from("market_checklist")
          .upsert(
            {
              item_id: item.id,
              checked: true,
              checked_at: new Date().toISOString(),
            },
            { onConflict: "item_id" },
          );

        if (checklistError) throw checklistError;

        // Al marcar como comprado, actualizar inventario con la cantidad completa
        const required = parseQuantity(item.quantity);
        const { error: inventoryError } = await supabase
          .from("inventory")
          .upsert(
            {
              item_id: item.id,
              current_quantity: item.quantity,
              current_number: required,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "item_id" },
          );

        if (inventoryError) throw inventoryError;

        // Show price log modal for newly checked items (online only, not skipped)
        if (!skipPriceLog) {
          setPriceLogItem({ id: item.id, name: item.name });
        }
      }

      onUpdate();
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("No se pudo actualizar el producto. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  };

  // Handler para SupermarketMode (recibe id de string)
  const toggleItemById = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) toggleItem(item, true);
  };

  const handlePriceLog = async (price: number, store: string) => {
    if (!priceLogItem) return;
    try {
      await fetch("/api/log-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: priceLogItem.name,
          price,
          store,
        }),
      });
    } catch (err) {
      console.error("Error logging price:", err);
    }
    setPriceLogItem(null);
  };

  const updateInventory = async (
    item: MarketItem,
    newQuantity: string,
    newNumber: number,
  ) => {
    setLoading(item.id);

    try {
      if (!isOnline) {
        // Offline: encolar operación
        await queueOperation({
          operation: "update",
          table: "inventory",
          data: {
            id: item.id,
            item_id: item.id,
            current_quantity: newQuantity,
            current_number: Math.max(0, newNumber),
            last_updated: new Date().toISOString(),
          },
        });
        onUpdate();
        return;
      }

      const { error } = await supabase.from("inventory").upsert(
        {
          item_id: item.id,
          current_quantity: newQuantity,
          current_number: Math.max(0, newNumber),
          last_updated: new Date().toISOString(),
        },
        { onConflict: "item_id" },
      );

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast.error("No se pudo actualizar el inventario. Intenta de nuevo.");
    } finally {
      setLoading(null);
      setEditingItem(null);
    }
  };

  const adjustQuantity = async (item: MarketItem, delta: number) => {
    const currentNum = item.currentNumber || 0;
    const newNum = Math.max(0, currentNum + delta);
    const unit = extractUnit(item.quantity);
    const newQty = `${newNum} ${unit}`.trim();

    await updateInventory(item, newQty, newNum);
  };

  const startEdit = (item: MarketItem) => {
    setEditingItem(item.id);
    setEditValue(item.currentQuantity || "0");
  };

  const saveEdit = async (item: MarketItem) => {
    const newNum = parseQuantity(editValue);
    await updateInventory(item, editValue, newNum);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue("");
  };

  const generateSmartList = async () => {
    setSmartListLoading(true);
    try {
      const res = await fetch("/api/smart-shopping-list");
      if (!res.ok) throw new Error("Error fetching smart list");
      const data = await res.json();
      setSmartListData(data);
      setShowSmartList(true);
    } catch (error) {
      console.error("Error generating smart shopping list:", error);
    } finally {
      setSmartListLoading(false);
    }
  };

  const resetMarket = async () => {
    try {
      if (!isOnline) {
        // Offline: no permitir reset para evitar inconsistencias
        toast.warning("Esta acción requiere conexión a internet");
        return;
      }

      const { error } = await supabase
        .from("market_checklist")
        .delete()
        .neq("item_id", "");
      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error resetting market:", error);
      toast.error(
        "No se pudo reiniciar la lista de mercado. Intenta de nuevo.",
      );
    }
  };

  const deleteCustomItem = async (item: MarketItem) => {
    if (!isOnline) {
      // Offline: no permitir eliminación para evitar inconsistencias
      toast.warning("Esta acción requiere conexión a internet");
      return;
    }

    setLoading(item.id);
    try {
      // Eliminar de inventory primero
      await supabase.from("inventory").delete().eq("item_id", item.id);

      // Eliminar de market_checklist
      await supabase.from("market_checklist").delete().eq("item_id", item.id);

      // Eliminar de market_items
      const { error } = await supabase
        .from("market_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error("Error deleting custom item:", error);
      toast.error("No se pudo eliminar el producto. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  };

  // Obtener emoji de categoría (usando category_id o category legacy)
  const getCategoryEmoji = (item: MarketItem) => {
    // Obtener icono base de la categoría
    let baseIcon = "📦";
    if (item.category_id && categoryData[item.category_id]) {
      baseIcon = categoryData[item.category_id].icon;
    } else if (CATEGORY_EMOJIS[item.category]) {
      baseIcon = CATEGORY_EMOJIS[item.category];
    }

    // Para proteínas, usar subcategoría basada en el nombre del item
    return getItemIcon(item.name, item.category_id, item.category, baseIcon);
  };

  const handleListLayoutChange = (layout: "category" | "aisle") => {
    setListLayout(layout);
    localStorage.setItem("market_list_layout", layout);
  };

  // Contar items personalizados
  const customItemsCount = items.filter((i) => i.is_custom).length;

  // Datos de temporada colombiana
  const currentMonth = new Date().getMonth() + 1;
  const seasonalData = useMemo(() => {
    const { peak, inSeason } = getSeasonalProduceForMonth(currentMonth);
    // Filtrar solo los que coinciden con items del mercado
    const marketNames = items.map((i) => i.name);
    const peakInMarket = peak.filter((p) =>
      marketNames.some(
        (m) =>
          isInSeason(m, currentMonth) === "peak" &&
          m.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]),
      ),
    );
    const inSeasonInMarket = inSeason.filter((p) =>
      marketNames.some(
        (m) =>
          isInSeason(m, currentMonth) === "in_season" &&
          m.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]),
      ),
    );
    return {
      peak,
      inSeason,
      peakInMarket,
      inSeasonInMarket,
      monthName: getMonthName(currentMonth),
    };
  }, [items, currentMonth]);

  // Agrupar items filtrados por categoría (modo categoria)
  const categories = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, MarketItem[]>,
  );

  // Agrupar por pasillo (modo aisle)
  const aisleGroups = useMemo(
    () => groupByAisle(filteredItems),
    [filteredItems],
  );

  // ── Rediseño visual: items según chip seleccionado, agrupados por categoría ──
  const isLowStock = (i: MarketItem) => {
    const current = i.currentNumber || 0;
    const required = parseQuantity(i.quantity);
    return current < required * 0.2;
  };

  const chipFilteredItems = useMemo(() => {
    switch (chipFilter) {
      case "Pendientes":
        return filteredItems.filter((i) => !i.checked);
      case "Bajo stock":
        return filteredItems.filter(isLowStock);
      case "Por temporada":
        return filteredItems.filter(
          (i) => isInSeason(i.name, currentMonth) !== null,
        );
      default:
        return filteredItems;
    }
  }, [filteredItems, chipFilter, currentMonth]);

  const visualCategories = useMemo(() => {
    const groups = chipFilteredItems.reduce(
      (acc, item) => {
        const key = item.category || "Otros";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<string, MarketItem[]>,
    );
    return Object.entries(groups).map(([name, catItems]) => ({
      name,
      icon: getCategoryEmoji(catItems[0]),
      items: catItems,
      checked: catItems.filter((i) => i.checked).length,
    }));
  }, [chipFilteredItems, categoryData]);

  const toggleCategory = (name: string) =>
    setExpandedCats((prev) => ({
      ...prev,
      [name]: prev[name] === undefined ? false : !prev[name],
    }));
  // Por defecto, primeras 3 categorías abiertas
  const isCatOpen = (name: string, index: number) =>
    expandedCats[name] === undefined ? index < 3 : expandedCats[name];

  const totalEstimate = "$782.450";

  return (
    <div className="max-w-lg mx-auto">
      {/* Header — título + acciones scan/add */}
      <div className="px-5 pt-4 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
            Mercado
          </h1>
          <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
            Ciclo del 19 enero al 2 febrero
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanModal(true)}
            aria-label="Escanear despensa"
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ScanLine size={16} className="text-stone-600" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            aria-label="Agregar producto"
            className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Mode Toggle (Compras / Despensa / Precios) */}
      <div className="px-5 flex gap-2 mb-3">
        <button
          onClick={() => setViewMode("shopping")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[12.5px] font-medium transition-colors ${
            viewMode === "shopping"
              ? "bg-[var(--ink)] text-white"
              : "bg-stone-100 text-[var(--ink-soft)]"
          }`}
        >
          <ShoppingCart size={14} />
          Compras
          {customItemsCount > 0 && (
            <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full tabular-nums">
              +{customItemsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode("pantry")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[12.5px] font-medium transition-colors ${
            viewMode === "pantry"
              ? "bg-[var(--ink)] text-white"
              : "bg-stone-100 text-[var(--ink-soft)]"
          }`}
        >
          <Home size={14} />
          Despensa
          {lowStockCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full tabular-nums">
              {lowStockCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode("prices")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[12.5px] font-medium transition-colors ${
            viewMode === "prices"
              ? "bg-[var(--ink)] text-white"
              : "bg-stone-100 text-[var(--ink-soft)]"
          }`}
        >
          <TrendingDown size={14} />
          Precios
        </button>
      </div>

      {/* Progress strip — solo en modo compras */}
      {viewMode === "shopping" && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12.5px] font-medium text-[var(--ink)]">
              Progreso del mercado
            </span>
            <span className="text-[12.5px] text-[var(--ink-soft)] tabular-nums">
              {checkedCount}/{totalCount} items
            </span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-[var(--ink-soft)] flex items-center gap-1">
              <Receipt size={11} /> {totalEstimate} estimado
            </span>
            <span className="text-[11px] text-stone-400">·</span>
            <span className="text-[11px] text-[var(--ink-soft)]">
              15 días · 5 porciones
            </span>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {(!isOnline || pendingCount > 0) && (
        <div
          className={`mx-5 mb-4 p-3 rounded-xl flex items-center gap-3 ${
            !isOnline
              ? "bg-orange-50 border border-orange-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <WifiOff
            className={`w-5 h-5 ${!isOnline ? "text-orange-600" : "text-blue-600"}`}
          />
          <div className="flex-1">
            {!isOnline ? (
              <>
                <p className="text-sm font-medium text-orange-700">
                  Sin conexión
                </p>
                <p className="text-xs text-orange-600">
                  Los cambios se sincronizarán al reconectar
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-blue-700">
                {pendingCount} cambio{pendingCount !== 1 ? "s" : ""} pendiente
                {pendingCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search + chips */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            placeholder="Buscar producto…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 border border-[var(--border)] rounded-lg pl-9 pr-9 py-2.5 text-[13px] text-[var(--ink)] placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-stone-300"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[var(--ink)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {viewMode === "shopping" && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {(
              ["Todo", "Pendientes", "Bajo stock", "Por temporada"] as const
            ).map((chip) => (
              <button
                key={chip}
                onClick={() => setChipFilter(chip)}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                  chipFilter === chip
                    ? "bg-[var(--ink)] text-white"
                    : "bg-stone-100 text-[var(--ink-soft)]"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="px-5 mb-4 text-sm text-gray-500">
          {filteredItems.length === 0 ? (
            <span className="text-red-500">No se encontró "{searchQuery}"</span>
          ) : (
            <span>
              {filteredItems.length} producto
              {filteredItems.length !== 1 ? "s" : ""} encontrado
              {filteredItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <div className="px-5 pb-32">
        {viewMode === "shopping" ? (
          <>
            {/* Categorías colapsables (rediseño visual) */}
            <div className="py-1 space-y-3">
              {visualCategories.map((cat, index) => {
                const isOpen = isCatOpen(cat.name, index);
                return (
                  <section
                    key={cat.name}
                    className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left"
                    >
                      <span className="text-[18px]">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[14px] text-[var(--ink)] truncate">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-[var(--ink-soft)] tabular-nums">
                          {cat.checked} de {cat.items.length} en carrito
                        </p>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-stone-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                        {cat.items.map((item) => (
                          <div key={item.id} className="flex items-center">
                            <button
                              onClick={() => !loading && toggleItem(item)}
                              disabled={loading === item.id}
                              className="px-4 py-2.5 flex items-center gap-3 text-left active:bg-stone-50 flex-1 min-w-0 disabled:opacity-60"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                  item.checked
                                    ? "bg-[var(--accent)] border-[var(--accent)]"
                                    : "border-stone-300"
                                }`}
                              >
                                {item.checked && (
                                  <Check
                                    size={12}
                                    className="text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </span>
                              <span
                                className={`flex-1 text-[13.5px] truncate ${
                                  item.checked
                                    ? "text-stone-400 line-through"
                                    : "text-[var(--ink)]"
                                }`}
                              >
                                {item.name}
                              </span>
                              <span
                                className={`text-[12px] tabular-nums ${
                                  item.checked
                                    ? "text-stone-400"
                                    : "text-[var(--ink-soft)]"
                                }`}
                              >
                                {item.quantity}
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                setPriceLogItem({
                                  id: item.id,
                                  name: item.name,
                                })
                              }
                              className="pr-3 pl-1.5 py-2.5 text-stone-300 active:text-[var(--accent)]"
                              aria-label="Comparar precios"
                            >
                              <Tag size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
              {visualCategories.length === 0 && (
                <div className="text-center text-[13px] text-[var(--ink-soft)] py-10">
                  No hay productos para este filtro.
                </div>
              )}
            </div>

            {/* ── Funcionalidad preservada (widgets/secciones existentes) ── */}
            <div className="pt-4 space-y-4">
              {/* Budget Widget */}
              <div className="mb-4">
                <BudgetWidget compact />
              </div>

              {/* Sprint 6 (Whole Foods pattern): items que probablemente
              se acabaron pronto basado en purchase_patterns historicos.
              Se renderiza solo si hay items due (RecurringItemsCard
              retorna null si lista vacia). */}
              {dueItems.length > 0 && (
                <div className="mb-4">
                  <RecurringItemsCard
                    items={dueItems}
                    onAddItem={(item) => {
                      toast.info(
                        `Agregar "${item.itemName}" — usa el boton + arriba`,
                      );
                    }}
                    onAddAll={(items) => {
                      toast.info(
                        `${items.length} items recurrentes — usa el modal de agregar`,
                      );
                    }}
                  />
                </div>
              )}

              {/* Smart Shopping Section (AI Weekly List) */}
              <SmartShoppingSection onRefreshMarket={onUpdate} />

              {/* Shopping Info Banner */}
              <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                <ShoppingCart size={16} />
                <span>
                  Marca lo que compraste. Se agregará automáticamente a tu
                  despensa.
                </span>
              </div>

              {/* Shopping Progress Header */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm mb-4">
                <span className="font-semibold text-green-700 whitespace-nowrap">
                  {checkedCount}/{totalCount}
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-700 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <button
                  onClick={generateSmartList}
                  disabled={smartListLoading}
                  className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-100 disabled:opacity-50"
                >
                  {smartListLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <ListChecks size={16} />
                  )}
                  Generar
                </button>
                <button
                  onClick={() => setConfirmAction({ type: "reset-market" })}
                  className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-red-100"
                >
                  <RotateCcw size={16} />
                  Reiniciar
                </button>
              </div>

              {/* De temporada este mes */}
              {(seasonalData.peak.length > 0 ||
                seasonalData.inSeason.length > 0) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
                    <span aria-hidden="true">&#x1F33E;</span>
                    De temporada en {seasonalData.monthName}
                  </h3>
                  {seasonalData.peak.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                        Temporada alta
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {seasonalData.peak.map((item) => (
                          <span
                            key={item.name}
                            className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1"
                          >
                            <span aria-hidden="true">&#x1F525;</span>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {seasonalData.inSeason.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">
                        Disponible
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {seasonalData.inSeason.map((item) => (
                          <span
                            key={item.name}
                            className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200 flex items-center gap-1"
                          >
                            <span aria-hidden="true">&#x1F33F;</span>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comparador automatico de precios */}
              <PriceComparisonCard items={items} minItems={5} />

              {/* Acciones rapidas: compartir lista + cocinar con inventario */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <ShareShoppingListButton
                  items={items
                    .filter((i) => !i.checked)
                    .map((i) => ({
                      name: i.name,
                      quantity: i.quantity || undefined,
                      category: i.category || undefined,
                      price: undefined,
                      checked: false,
                    }))}
                  weekLabel={new Date().toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                  })}
                />
                <CookWithThisButton
                  ingredients={items
                    .filter((i) => (i.currentNumber || 0) > 0)
                    .slice(0, 15)
                    .map((i) => i.name)}
                />
              </div>

              {/* Layout toggle: Categoria vs Pasillo */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleListLayoutChange("category")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    listLayout === "category"
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <LayoutList size={14} />
                  Categoria
                </button>
                <button
                  onClick={() => handleListLayoutChange("aisle")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    listLayout === "aisle"
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Map size={14} />
                  Pasillo del super
                </button>
              </div>

              {/* Boton "Estoy comprando" */}
              <button
                onClick={() => setShowSupermarketMode(true)}
                className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-gradient-to-r from-orange-500 to-emerald-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
              >
                <ShoppingBasket size={20} />
                Estoy comprando
              </button>

              {/* Shopping List - Aisle mode */}
              {listLayout === "aisle"
                ? aisleGroups.map(({ aisle, items: aisleItems }) => (
                    <div key={aisle} className="mb-4">
                      <div className="bg-orange-500 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
                        <span>{getCategoryEmoji(aisleItems[0])}</span>
                        {aisle}
                      </div>
                      <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                        {aisleItems.map((item) => (
                          <ShoppingItemRow
                            key={item.id}
                            item={item}
                            loading={loading}
                            onToggle={toggleItem}
                            onDelete={(i) =>
                              setConfirmAction({ type: "delete-item", item: i })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))
                : null}

              {/* Shopping List - Category mode */}
              {listLayout === "category"
                ? Object.entries(categories).map(
                    ([category, categoryItems]) => (
                      <div key={category} className="mb-4">
                        <div className="bg-orange-500 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
                          <span>{getCategoryEmoji(categoryItems[0])}</span>
                          {category}
                        </div>
                        <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                          {categoryItems.map((item) => (
                            <ShoppingItemRow
                              key={item.id}
                              item={item}
                              loading={loading}
                              onToggle={toggleItem}
                              onDelete={(i) =>
                                setConfirmAction({
                                  type: "delete-item",
                                  item: i,
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ),
                  )
                : null}
            </div>
          </>
        ) : viewMode === "pantry" ? (
          <>
            {/* Pantry View */}
            <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl mb-4 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Home size={16} />
                <span className="font-medium">Tu despensa actual</span>
              </div>
              <span className="text-xs text-orange-600">
                Usa los botones +/- para ajustar lo que tienes en casa
              </span>
            </div>

            {Object.entries(categories).map(([category, categoryItems]) => (
              <div key={category} className="mb-4">
                <div className="bg-orange-600 text-white px-4 py-3 rounded-t-lg font-semibold flex items-center gap-2">
                  <span>{getCategoryEmoji(categoryItems[0])}</span>
                  {category}
                </div>
                <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                  {categoryItems.map((item) => {
                    const currentNum = item.currentNumber || 0;
                    const requiredNum = parseQuantity(item.quantity);
                    const percentage =
                      requiredNum > 0 ? (currentNum / requiredNum) * 100 : 0;
                    const isLow = percentage < 20;
                    const isEmpty = currentNum === 0;

                    return (
                      <div
                        key={item.id}
                        className={`
                        p-4 border-b last:border-b-0 transition-colors
                        ${isEmpty ? "bg-red-50" : isLow ? "bg-orange-50" : ""}
                      `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {(isEmpty || isLow) && (
                              <AlertTriangle
                                size={16}
                                className={
                                  isEmpty ? "text-red-500" : "text-orange-500"
                                }
                              />
                            )}
                            <span className="font-medium">{item.name}</span>
                            {item.is_custom && (
                              <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Sparkles size={10} />
                                nuevo
                              </span>
                            )}
                            <SeasonalBadge itemName={item.name} compact />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              Necesitas: {item.quantity}
                            </span>
                            {item.is_custom && (
                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    type: "delete-item",
                                    item,
                                  })
                                }
                                disabled={loading === item.id}
                                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isEmpty
                                ? "bg-red-500"
                                : isLow
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between">
                          {editingItem === item.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                placeholder="Ej: 2.5 kg"
                                autoFocus
                              />
                              <button
                                onClick={() => saveEdit(item)}
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => adjustQuantity(item, -1)}
                                  disabled={
                                    loading === item.id || currentNum <= 0
                                  }
                                  className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                >
                                  <Minus size={18} />
                                </button>
                                <button
                                  onClick={() => startEdit(item)}
                                  className="px-4 py-2 bg-gray-100 rounded-lg font-semibold min-w-[100px] text-center hover:bg-gray-200"
                                >
                                  {item.currentQuantity || "0"}
                                </button>
                                <button
                                  onClick={() => adjustQuantity(item, 1)}
                                  disabled={loading === item.id}
                                  className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>
                              <button
                                onClick={() => startEdit(item)}
                                className="p-2 text-gray-400 hover:text-gray-600"
                              >
                                <Edit2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : (
          /* Price Comparison View */
          <PriceComparisonView />
        )}
      </div>

      {/* Modo supermercado pantalla completa */}
      {showSupermarketMode && (
        <SupermarketMode
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            checked: i.checked,
            category: i.category,
          }))}
          onToggleItem={toggleItemById}
          onClose={() => setShowSupermarketMode(false)}
        />
      )}

      {/* Speed Dial FAB */}
      <>
        {/* Backdrop overlay */}
        {fabOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
            onClick={() => setFabOpen(false)}
          />
        )}

        {/* FAB Container */}
        <div className="fixed bottom-36 right-5 z-50 flex flex-col-reverse items-end gap-3">
          {/* Speed Dial Options */}
          <div
            className={`flex flex-col-reverse items-end gap-3 transition-all duration-300 ${
              fabOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            {/* Scan Pantry Option */}
            <button
              onClick={() => {
                setShowScanModal(true);
                setFabOpen(false);
              }}
              className="flex items-center gap-3 group"
            >
              <span className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap transform transition-all duration-200 group-hover:scale-105">
                Escanear despensa
              </span>
              <div className="bg-green-500 text-white p-3.5 rounded-full shadow-lg transition-all duration-200 hover:bg-green-600 hover:scale-110">
                <Camera size={22} />
              </div>
            </button>

            {/* Add Custom Item Option */}
            <button
              onClick={() => {
                setShowAddModal(true);
                setFabOpen(false);
              }}
              className="flex items-center gap-3 group"
            >
              <span className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap transform transition-all duration-200 group-hover:scale-105">
                Agregar con IA
              </span>
              <div className="bg-purple-500 text-white p-3.5 rounded-full shadow-lg transition-all duration-200 hover:bg-purple-600 hover:scale-110">
                <Sparkles size={22} />
              </div>
            </button>
          </div>

          {/* Main FAB Button */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className={`bg-gradient-to-br from-orange-500 to-emerald-600 text-white p-4 rounded-full shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
              fabOpen ? "rotate-45" : "rotate-0"
            }`}
            aria-label={fabOpen ? "Cerrar opciones" : "Abrir opciones"}
          >
            <PlusIcon size={26} strokeWidth={2.5} />
          </button>
        </div>
      </>

      {/* Add Custom Item Modal */}
      {showAddModal && (
        <AddCustomItemModal
          onClose={() => setShowAddModal(false)}
          onAdded={onUpdate}
        />
      )}

      {/* Scan Pantry Modal */}
      {showScanModal && (
        <ScanPantryModal
          onClose={() => setShowScanModal(false)}
          onComplete={onUpdate}
        />
      )}

      {/* Smart Shopping List Modal */}
      {showSmartList && smartListData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg">Lista Inteligente</h3>
                <p className="text-sm text-white/80">
                  {smartListData.total_items} items para{" "}
                  {smartListData.estimated_meals} comidas
                </p>
              </div>
              <button
                onClick={() => setShowSmartList(false)}
                className="p-2 hover:bg-white/20 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {smartListData.priority_items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Prioridad Alta
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {smartListData.priority_items.map((item, i) => (
                      <span
                        key={i}
                        className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(smartListData.by_category).map(
                ([category, catItems]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-gray-700 text-sm mb-2">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {catItems.map((ci, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">
                              {ci.item}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                ci.urgency === "alta"
                                  ? "bg-red-100 text-red-700"
                                  : ci.urgency === "media"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {ci.urgency}
                            </span>
                          </div>
                          {ci.for_recipes.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Para: {ci.for_recipes.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}

              {smartListData.summary && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  {smartListData.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price Log Modal for regular market items */}
      {priceLogItem && (
        <PriceLogModal
          itemName={priceLogItem.name}
          onSave={handlePriceLog}
          onSkip={() => setPriceLogItem(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmAction}
        onConfirm={() => {
          if (confirmAction?.type === "reset-market") {
            resetMarket();
          } else if (
            confirmAction?.type === "delete-item" &&
            confirmAction.item
          ) {
            deleteCustomItem(confirmAction.item);
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
        title={
          confirmAction?.type === "reset-market"
            ? "Reiniciar lista"
            : "Eliminar item"
        }
        message={
          confirmAction?.type === "reset-market"
            ? "¿Reiniciar toda la lista de mercado?"
            : `¿Eliminar "${confirmAction?.item?.name}" de tu lista?`
        }
        confirmText={
          confirmAction?.type === "reset-market" ? "Reiniciar" : "Eliminar"
        }
        variant="danger"
      />
    </div>
  );
}

// Fila reutilizable para la lista de compras (modo categoria y modo pasillo)
function ShoppingItemRow({
  item,
  loading,
  onToggle,
  onDelete,
}: {
  item: MarketItem;
  loading: string | null;
  onToggle: (item: MarketItem) => void;
  onDelete: (item: MarketItem) => void;
}) {
  return (
    <div
      className={`
        flex items-center p-4 border-b last:border-b-0 transition-colors cursor-pointer
        ${item.checked ? "bg-green-50" : "hover:bg-gray-50"}
        ${item.is_custom ? "border-l-4 border-l-purple-400" : ""}
      `}
      onClick={() => !loading && onToggle(item)}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item)}
        disabled={loading === item.id}
        className="w-6 h-6 mr-3 accent-green-700 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-medium truncate ${item.checked ? "line-through text-gray-400" : ""}`}
          >
            {item.name}
          </span>
          {item.is_custom && (
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Sparkles size={10} />
              nuevo
            </span>
          )}
          <SeasonalBadge itemName={item.name} compact />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`
            text-sm px-3 py-1 rounded-full font-medium
            ${item.checked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}
          `}
        >
          {item.quantity}
        </span>
        {item.is_custom && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            disabled={loading === item.id}
            className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-500 rounded-md hover:bg-red-100 hover:text-red-600 disabled:opacity-30 text-sm"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// Utilidades para parsear cantidades
function parseQuantity(qty: string): number {
  if (!qty) return 0;
  // Extraer el número del string (ej: "2.5 kg" -> 2.5, "8 unid" -> 8)
  const match = qty.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function extractUnit(qty: string): string {
  if (!qty) return "";
  // Extraer la unidad (ej: "2.5 kg" -> "kg", "8 unid grandes" -> "unid grandes")
  const match = qty.match(/[\d.]+\s*(.*)/);
  return match ? match[1].trim() : "";
}
