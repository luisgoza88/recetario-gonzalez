"use client";

import { useState, useEffect } from "react";
import {
  Lightbulb,
  Check,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  ChefHat,
  RefreshCw,
  Calendar,
  Package,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  AdjustmentSuggestion,
  Recipe,
  Ingredient,
  PersonPortions,
} from "@/types";
import { ingredientPortions } from "@/lib/portions";
import {
  useProactiveSuggestions,
  ProactiveSuggestion,
  ProactiveSuggestionType,
  ProactiveSuggestionPriority,
} from "@/hooks/useProactiveSuggestions";
import { useToast } from "@/components/ui/Toast";

interface SuggestionsPanelProps {
  onUpdate?: () => void;
  onNavigate?: (tab: string, mode?: string) => void;
}

// ─── Metadatos de tipo (chip coloreado) ──────────────────────────────────────
const PROACTIVE_TYPE_META: Record<
  ProactiveSuggestionType,
  { label: string; Icon: LucideIcon; chip: string }
> = {
  menu_today: {
    label: "Menú de hoy",
    Icon: Calendar,
    chip: "bg-blue-100 text-blue-700",
  },
  menu_tomorrow: {
    label: "Preparación",
    Icon: AlertTriangle,
    chip: "bg-orange-100 text-orange-700",
  },
  low_stock: {
    label: "Stock bajo",
    Icon: Package,
    chip: "bg-red-100 text-red-700",
  },
  high_stock: {
    label: "Inventario alto",
    Icon: Sparkles,
    chip: "bg-purple-100 text-purple-700",
  },
  missing_ingredient: {
    label: "Falta ingrediente",
    Icon: ShoppingCart,
    chip: "bg-amber-100 text-amber-700",
  },
  weekly_prep: {
    label: "Plan semanal",
    Icon: Calendar,
    chip: "bg-blue-100 text-blue-700",
  },
  recipe_discovery: {
    label: "Descubre recetas",
    Icon: ChefHat,
    chip: "bg-green-100 text-green-700",
  },
  no_feedback: {
    label: "Feedback",
    Icon: MessageSquare,
    chip: "bg-yellow-100 text-yellow-700",
  },
};

const REACTIVE_TYPE_META: Record<
  string,
  { label: string; Icon: LucideIcon; chip: string }
> = {
  portion: {
    label: "Ajustar porción",
    Icon: ChefHat,
    chip: "bg-purple-100 text-purple-700",
  },
  market: {
    label: "Ajustar mercado",
    Icon: ShoppingCart,
    chip: "bg-blue-100 text-blue-700",
  },
  ingredient: {
    label: "Ajustar ingrediente",
    Icon: Lightbulb,
    chip: "bg-amber-100 text-amber-700",
  },
};

const PRIORITY_LABEL: Record<ProactiveSuggestionPriority, string> = {
  high: "alta prioridad",
  medium: "prioridad media",
  low: "prioridad baja",
};

const PRIORITY_COLOR: Record<ProactiveSuggestionPriority, string> = {
  high: "text-red-700",
  medium: "text-amber-700",
  low: "text-stone-500",
};

export default function SuggestionsPanel({
  onUpdate,
  onNavigate,
}: SuggestionsPanelProps) {
  const toast = useToast();
  // Sugerencias reactivas (basadas en feedback)
  const [reactiveSuggestions, setReactiveSuggestions] = useState<
    AdjustmentSuggestion[]
  >([]);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loadingReactive, setLoadingReactive] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  // Sugerencias proactivas (generadas automáticamente)
  const {
    suggestions: proactiveSuggestions,
    loading: loadingProactive,
    dismissSuggestion: dismissProactive,
    refresh: refreshProactive,
  } = useProactiveSuggestions();

  useEffect(() => {
    loadReactiveData();
  }, []);

  const loadReactiveData = async () => {
    setLoadingReactive(true);
    try {
      const { data: suggestionsData } = await supabase
        .from("adjustment_suggestions")
        .select("*")
        .eq("status", "pending")
        .order("feedback_count", { ascending: false });

      if (suggestionsData) {
        setReactiveSuggestions(suggestionsData);

        const recipeIds = [
          ...new Set(suggestionsData.map((s) => s.recipe_id).filter(Boolean)),
        ];
        if (recipeIds.length > 0) {
          const { data: recipesData } = await supabase
            .from("recipes")
            .select("*")
            .in("id", recipeIds);

          if (recipesData) {
            const recipesMap: Record<string, Recipe> = {};
            recipesData.forEach((r) => {
              recipesMap[r.id] = r;
            });
            setRecipes(recipesMap);
          }
        }
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoadingReactive(false);
    }
  };

  const applySuggestion = async (suggestion: AdjustmentSuggestion) => {
    setApplying(suggestion.id);

    try {
      if (suggestion.suggestion_type === "portion" && suggestion.recipe_id) {
        await applyPortionChange(suggestion);
      } else if (
        suggestion.suggestion_type === "market" &&
        suggestion.recipe_id
      ) {
        await applyMarketChange(suggestion);
      }

      await supabase
        .from("adjustment_suggestions")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", suggestion.id);

      setReactiveSuggestions((prev) =>
        prev.filter((s) => s.id !== suggestion.id),
      );
      onUpdate?.();
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast.error("No se pudo aplicar la sugerencia. Intenta de nuevo.");
    } finally {
      setApplying(null);
    }
  };

  const applyPortionChange = async (suggestion: AdjustmentSuggestion) => {
    const recipe = recipes[suggestion.recipe_id!];
    if (!recipe) return;

    const changePercent = suggestion.change_percent || 0;
    const multiplier = 1 + changePercent / 100;

    // Escala la cantidad de CADA miembro del hogar, sea cual sea su nombre.
    // Antes solo escalaba "luis" y "mariana": en un hogar con otros miembros,
    // sus porciones se quedaban sin ajustar.
    const updatedIngredients = (recipe.ingredients as Ingredient[]).map(
      (ing) => {
        const scaled: PersonPortions = {};
        for (const [key, amount] of Object.entries(ingredientPortions(ing))) {
          scaled[key] = adjustQuantityString(amount, multiplier);
        }
        return {
          name: ing.name,
          per_person: scaled,
          total: ing.total
            ? adjustQuantityString(ing.total, multiplier)
            : undefined,
        };
      },
    );

    await supabase
      .from("recipes")
      .update({
        ingredients: updatedIngredients,
        updated_at: new Date().toISOString(),
      })
      .eq("id", suggestion.recipe_id);
  };

  const applyMarketChange = async (suggestion: AdjustmentSuggestion) => {
    const recipe = recipes[suggestion.recipe_id!];
    if (!recipe) return;

    const changePercent = suggestion.change_percent || -20;
    const multiplier = 1 + changePercent / 100;

    const ingredientNames = (recipe.ingredients as Ingredient[]).map((i) =>
      i.name.toLowerCase(),
    );

    const { data: items } = await supabase
      .from("market_items")
      .select("id, name, quantity");

    if (items) {
      for (const item of items) {
        const itemNameLower = item.name.toLowerCase();
        const matches = ingredientNames.some(
          (ing) => itemNameLower.includes(ing) || ing.includes(itemNameLower),
        );

        if (matches) {
          const newQuantity = adjustQuantityString(item.quantity, multiplier);
          await supabase
            .from("market_items")
            .update({ quantity: newQuantity })
            .eq("id", item.id);
        }
      }
    }
  };

  const adjustQuantityString = (qty: string, multiplier: number): string => {
    const match = qty.match(/^([\d.]+)\s*(.*)$/);
    if (!match) return qty;

    const num = parseFloat(match[1]);
    const unit = match[2];
    const newNum = Math.round(num * multiplier * 10) / 10;

    return `${newNum}${unit ? " " + unit : ""}`;
  };

  const dismissReactiveSuggestion = async (suggestionId: string) => {
    // Optimista: quitar la sugerencia de inmediato, guardando el estado previo
    const previous = reactiveSuggestions;
    setReactiveSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

    try {
      const { error } = await supabase
        .from("adjustment_suggestions")
        .update({ status: "dismissed" })
        .eq("id", suggestionId);
      if (error) throw error;
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
      toast.error("No se pudo descartar la sugerencia. Intenta de nuevo.");
      // Rollback: volver a mostrar la sugerencia
      setReactiveSuggestions(previous);
    }
  };

  const handleProactiveAction = (suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;

    switch (suggestion.action.type) {
      case "navigate":
        const payload = suggestion.action.payload as
          { tab: string; mode?: string } | undefined;
        if (payload?.tab && onNavigate) {
          onNavigate(payload.tab, payload.mode);
        }
        break;
      case "dismiss":
        dismissProactive(suggestion.id);
        break;
      case "generate_recipe":
        if (onNavigate) {
          onNavigate("calendar");
        }
        break;
      case "add_to_cart":
        if (onNavigate) {
          onNavigate("market", "shopping");
        }
        break;
    }
  };

  const isLoading = loadingReactive || loadingProactive;
  const totalProactive = proactiveSuggestions.length;
  const totalReactive = reactiveSuggestions.length;
  const totalNew = totalProactive + totalReactive;
  const hasAnySuggestion = totalNew > 0;

  const refreshAll = () => {
    refreshProactive();
    loadReactiveData();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--border)] bg-white px-5 pt-4 pb-3">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
            Sugerencias
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-soft)]">
            IA proactiva · {totalNew} nueva{totalNew === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-1 text-[13px] font-medium text-[var(--accent)]"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />{" "}
          Refrescar
        </button>
      </div>

      {/* Banner IA morado */}
      <div className="border-b border-purple-100 bg-gradient-to-br from-purple-50 to-violet-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-white">
            <Sparkles size={16} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-purple-900">
              Asistente analizó tu cocina
            </p>
            <p className="text-[11.5px] text-purple-700">
              {isLoading ? "Analizando…" : "Actualizado · hace unos momentos"}
            </p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-3 px-5 py-4 pb-32">
        {isLoading ? (
          <div className="py-12 text-center text-[var(--ink-soft)]">
            <RefreshCw className="mx-auto mb-2 animate-spin" size={24} />
            <p className="text-[14px]">Cargando sugerencias…</p>
          </div>
        ) : !hasAnySuggestion ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-[14px] text-stone-500">
              Sin sugerencias pendientes
            </p>
            <p className="mt-1 text-[12px] text-stone-400">
              El sistema te avisará cuando haya algo importante.
            </p>
          </div>
        ) : (
          <>
            {/* Sugerencias PROACTIVAS */}
            {proactiveSuggestions.map((s) => {
              const meta = PROACTIVE_TYPE_META[s.type];
              const Icon = meta?.Icon ?? Lightbulb;
              return (
                <article
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"
                >
                  <div className="px-4 pt-3.5 pb-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta?.chip ?? "bg-stone-100 text-stone-700"}`}
                      >
                        <Icon size={11} /> {meta?.label ?? "Sugerencia"}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_COLOR[s.priority]}`}
                      >
                        {PRIORITY_LABEL[s.priority]}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold leading-tight text-[var(--ink)]">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-[var(--ink-soft)]">
                      {s.description}
                    </p>
                  </div>
                  <div className="flex divide-x divide-[var(--border)] border-t border-[var(--border)]">
                    <button
                      onClick={() => dismissProactive(s.id)}
                      className="flex-1 py-2.5 text-[13px] font-medium text-stone-500 active:bg-stone-50"
                    >
                      Descartar
                    </button>
                    {s.action ? (
                      <button
                        onClick={() => handleProactiveAction(s)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[var(--accent)] active:bg-stone-50"
                      >
                        {s.action.label} <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => dismissProactive(s.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[var(--accent)] active:bg-stone-50"
                      >
                        <Check size={14} /> Entendido
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Sugerencias REACTIVAS (basadas en feedback) */}
            {reactiveSuggestions.map((s) => {
              const meta =
                REACTIVE_TYPE_META[s.suggestion_type] ??
                REACTIVE_TYPE_META.ingredient;
              const Icon = meta.Icon;
              const recipe = s.recipe_id ? recipes[s.recipe_id] : null;
              const isPositive = (s.change_percent || 0) > 0;
              const isApplying = applying === s.id;
              const impactText = s.change_percent
                ? `${isPositive ? "Aumentar" : "Reducir"} cantidades en ${Math.abs(s.change_percent)}%`
                : `${s.feedback_count} reporte${s.feedback_count === 1 ? "" : "s"} de feedback`;
              return (
                <article
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"
                >
                  <div className="px-4 pt-3.5 pb-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.chip}`}
                      >
                        <Icon size={11} /> {meta.label}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                        basado en feedback
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold leading-tight text-[var(--ink)]">
                      {recipe?.name ?? "Ajuste sugerido"}
                    </h3>
                    {s.change_percent ? (
                      <div
                        className={`mt-1.5 flex items-center gap-1.5 text-[13px] font-medium ${isPositive ? "text-green-700" : "text-red-700"}`}
                      >
                        {isPositive ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        <span>{impactText}</span>
                      </div>
                    ) : null}
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                      {s.reason}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-stone-500">
                      <Zap size={11} className="text-amber-500" />{" "}
                      <span>{impactText}</span>
                    </div>
                  </div>
                  <div className="flex divide-x divide-[var(--border)] border-t border-[var(--border)]">
                    <button
                      onClick={() => dismissReactiveSuggestion(s.id)}
                      disabled={isApplying}
                      className="flex-1 py-2.5 text-[13px] font-medium text-stone-500 active:bg-stone-50 disabled:opacity-50"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={() => applySuggestion(s)}
                      disabled={isApplying}
                      className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[var(--accent)] active:bg-stone-50 disabled:opacity-50"
                    >
                      {isApplying ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}{" "}
                      Aplicar
                    </button>
                  </div>
                </article>
              );
            })}

            <p className="px-4 pt-1 text-center text-[11.5px] text-stone-400">
              Las alertas se actualizan automáticamente. Los ajustes aplicados
              modifican recetas y cantidades.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
