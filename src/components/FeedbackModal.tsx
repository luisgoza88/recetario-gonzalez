"use client";

import { useState } from "react";
import { Check, Heart, UtensilsCrossed, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Recipe, MealType, MealFeedback } from "@/types";
import { analyzeNewFeedback } from "@/lib/feedback-learning";
import { BottomSheet } from "@/components/ui/BottomSheet";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

// -------------------------------------------------------
// Problemas predefinidos que el usuario puede seleccionar
// -------------------------------------------------------
const ISSUE_OPTIONS = [
  { id: "no_salt", label: "Faltó sal" },
  { id: "too_salty", label: "Mucha sal" },
  { id: "too_much", label: "Demasiada para 5 personas" },
  { id: "too_little", label: "Poca para 5 personas" },
  { id: "too_long", label: "Tardó mucho en cocinar" },
  { id: "missing_ingredient", label: "Faltó algún ingrediente" },
  { id: "too_hard", label: "Difícil de preparar" },
] as const;

type IssueId = (typeof ISSUE_OPTIONS)[number]["id"];

// -------------------------------------------------------
// Etiquetas textuales para cada puntuación
// -------------------------------------------------------
const STAR_LABELS: Record<number, string> = {
  1: "Muy mala",
  2: "Regular",
  3: "Aceptable",
  4: "Muy buena",
  5: "Excelente — favoritos",
};

// -------------------------------------------------------
// Props
// -------------------------------------------------------
interface FeedbackModalProps {
  date: string;
  mealType: MealType;
  recipe: Recipe;
  onClose: () => void;
  onSaved: () => void;
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------
export default function FeedbackModal({
  date,
  mealType,
  recipe,
  onClose,
  onSaved,
}: FeedbackModalProps) {
  const toast = useToast();

  const [starRating, setStarRating] = useState<number>(0);
  const [selectedIssues, setSelectedIssues] = useState<Set<IssueId>>(new Set());
  const [freeComment, setFreeComment] = useState("");
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mealLabels: Record<MealType, string> = {
    breakfast: "Desayuno",
    lunch: "Almuerzo",
    dinner: "Cena",
  };

  const isAIGenerated =
    recipe.source === "ai_generated" || recipe.id.startsWith("generated-");

  // -------------------------------------------------------
  // Toggle checkbox issues
  // -------------------------------------------------------
  const toggleIssue = (id: IssueId) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // -------------------------------------------------------
  // Build the combined comments string
  // -------------------------------------------------------
  const buildComments = (): string | null => {
    const parts: string[] = [];

    if (selectedIssues.size > 0) {
      const issueLabels = ISSUE_OPTIONS.filter((o) =>
        selectedIssues.has(o.id),
      ).map((o) => o.label);
      parts.push(`Problemas: ${issueLabels.join(", ")}.`);
    }

    if (freeComment.trim()) {
      parts.push(freeComment.trim());
    }

    return parts.length > 0 ? parts.join(" ") : null;
  };

  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);

    try {
      const comments = buildComments();

      // La tabla meal_feedback NO tiene columna recipe_name: incluirla hacía
      // fallar el insert entero (por eso no se guardaba ningún feedback). Se
      // omite. Además mapeamos los chips de porción a la columna estructurada
      // portion_rating para que el motor de aprendizaje (feedback-learning)
      // genere sugerencias en vez de quedarse siempre en 0.
      const portionRating = selectedIssues.has("too_much")
        ? "mucha"
        : selectedIssues.has("too_little")
          ? "poca"
          : null;

      const feedbackData: Record<string, unknown> = {
        date,
        meal_type: mealType,
        recipe_id: recipe.id,
        notes: comments,
        would_repeat: wouldRepeat,
      };

      if (portionRating) feedbackData.portion_rating = portionRating;
      if (starRating > 0) feedbackData.star_rating = starRating;
      if (isAIGenerated) feedbackData.source = "generated";

      const { error } = await supabase
        .from("meal_feedback")
        .insert(feedbackData);

      if (error) throw error;

      // Analyze feedback for automatic suggestions
      await analyzeAndGenerateSuggestions({
        id: "",
        date,
        meal_type: mealType,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        notes: comments || undefined,
      });

      setSaved(true);

      toast.success("Tu feedback ayuda a mejorar tus proximas recetas");

      setTimeout(() => {
        onSaved();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error saving feedback:", err);
      toast.error("No se pudo guardar el feedback. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const analyzeAndGenerateSuggestions = async (
    feedbackData: Partial<MealFeedback>,
  ) => {
    try {
      await analyzeNewFeedback(feedbackData as MealFeedback);
    } catch (err) {
      console.error("Error in feedback learning analysis:", err);
    }
  };

  // -------------------------------------------------------
  // Saved state
  // -------------------------------------------------------
  if (saved) {
    return (
      <BottomSheet open onClose={onClose} showCloseButton={false}>
        <div className="py-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="font-display text-xl font-semibold text-[var(--accent)]">
            Feedback guardado
          </h3>
          {starRating === 5 && (
            <p className="text-sm text-amber-600 mt-2">Añadida a Favoritos</p>
          )}
          {starRating > 0 && starRating <= 2 && (
            <p className="text-sm text-red-500 mt-2">
              Excluida de futuros menús por 30 días
            </p>
          )}
        </div>
      </BottomSheet>
    );
  }

  // -------------------------------------------------------
  // Footer (acciones)
  // -------------------------------------------------------
  const footer = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 bg-white border border-[var(--border)] py-3 rounded-xl text-sm font-medium text-[var(--ink-soft)] hover:bg-stone-50 transition-colors"
      >
        Más tarde
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex-[2] bg-[var(--accent)] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
      >
        {saving ? (
          <>
            <Spinner size="sm" color="white" />
            Guardando...
          </>
        ) : (
          <>
            <Check size={18} />
            Guardar feedback
          </>
        )}
      </button>
    </div>
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={`¿Cómo estuvo el ${mealLabels[mealType].toLowerCase()}?`}
      footer={footer}
    >
      <div className="space-y-5">
        {/* --- Recipe pill --- */}
        <div className="bg-stone-50 rounded-xl p-3 flex items-center gap-2.5">
          <UtensilsCrossed
            size={16}
            className="text-[var(--accent)] flex-shrink-0"
          />
          <p className="text-sm font-semibold text-[var(--ink)] leading-tight">
            {recipe.name}
          </p>
          {isAIGenerated && (
            <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              IA
            </span>
          )}
        </div>

        {/* --- Heart rating --- */}
        <div className="text-center">
          <p className="text-xs text-[var(--ink-soft)]">Tu calificación</p>
          <div
            className="flex items-center justify-center gap-2 mt-2"
            role="group"
            aria-label="Calificación de 1 a 5"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setStarRating(star)}
                aria-label={`${star} de 5`}
                className="transition-transform active:scale-90"
              >
                <Heart
                  size={36}
                  strokeWidth={1.5}
                  className={
                    star <= starRating
                      ? "text-red-500 fill-current"
                      : "text-stone-200"
                  }
                />
              </button>
            ))}
          </div>
          {starRating > 0 && (
            <p className="text-xs text-[var(--ink-soft)] mt-1.5 font-medium">
              {STAR_LABELS[starRating]}
            </p>
          )}
        </div>

        {/* --- Issue chips --- */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">
            Algo que mejorar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_OPTIONS.map((option) => {
              const active = selectedIssues.has(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleIssue(option.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- Would repeat chip --- */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">
            ¿Repetir?
          </p>
          <button
            onClick={() =>
              setWouldRepeat((prev) => (prev === true ? null : true))
            }
            aria-pressed={wouldRepeat === true}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              wouldRepeat === true
                ? "bg-green-500 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <RefreshCw size={14} />
            Volvería a cocinarla
          </button>
        </div>

        {/* --- Free comment --- */}
        <div>
          <label
            htmlFor="feedback-comment"
            className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold"
          >
            Notas (opcional)
          </label>
          <textarea
            id="feedback-comment"
            value={freeComment}
            onChange={(e) => setFreeComment(e.target.value)}
            placeholder="Por ejemplo: la próxima vez menos sal, le encantó a Luis…"
            rows={3}
            className="w-full mt-1 bg-stone-50 border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>
      </div>
    </BottomSheet>
  );
}
