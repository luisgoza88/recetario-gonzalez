"use client";

import { useState } from "react";
import { X, Check, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Recipe, MealType, Ingredient, MealFeedback } from "@/types";
import { analyzeNewFeedback } from "@/lib/feedback-learning";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import FocusTrap from "@/components/ui/FocusTrap";
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
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [selectedIssues, setSelectedIssues] = useState<Set<IssueId>>(new Set());
  const [freeComment, setFreeComment] = useState("");
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEscapeKey(onClose);

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

      const feedbackData: Record<string, unknown> = {
        date,
        meal_type: mealType,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        notes: comments,
        would_repeat: wouldRepeat,
      };

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
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-700">
            Feedback guardado
          </h3>
          {starRating === 5 && (
            <p className="text-sm text-yellow-600 mt-2">Anadida a Favoritos</p>
          )}
          {starRating > 0 && starRating <= 2 && (
            <p className="text-sm text-red-500 mt-2">
              Excluida de futuros menus por 30 dias
            </p>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // Active star display (hover takes priority over selection)
  // -------------------------------------------------------
  const displayStar = hoverStar || starRating;

  return (
    <FocusTrap active={true}>
      <div
        className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 pb-24 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-xl">
          {/* Header */}
          <div className="bg-green-700 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80">{mealLabels[mealType]}</p>
              <h2
                id="feedback-modal-title"
                className="font-semibold text-lg leading-tight"
              >
                {recipe.name}
              </h2>
              {isAIGenerated && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                  Generada por IA
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 hover:bg-white/20 rounded-lg flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* --- Star rating --- */}
            <div>
              <p className="text-base font-semibold text-gray-800 mb-3">
                Como estuvo el {recipe.name}?
              </p>
              <div
                className="flex justify-center gap-2"
                role="group"
                aria-label="Calificacion de 1 a 5 estrellas"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStarRating(star)}
                    onMouseEnter={() => setHoverStar(star)}
                    onMouseLeave={() => setHoverStar(0)}
                    aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                    className={`p-1.5 rounded-lg transition-all transform active:scale-95 ${
                      star <= displayStar
                        ? "text-yellow-400 scale-110 drop-shadow-sm"
                        : "text-gray-300 hover:text-yellow-300"
                    }`}
                  >
                    <Star
                      size={40}
                      fill={star <= displayStar ? "currentColor" : "none"}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
              {displayStar > 0 && (
                <p className="text-center text-sm mt-2 text-gray-500 font-medium">
                  {STAR_LABELS[displayStar]}
                </p>
              )}
            </div>

            {/* --- Issues checkboxes --- */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Algo que mejorar?
              </p>
              <div className="space-y-2">
                {ISSUE_OPTIONS.map((option) => {
                  const checked = selectedIssues.has(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors select-none ${
                        checked
                          ? "bg-orange-50 border border-orange-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          checked
                            ? "bg-orange-500 border-orange-500"
                            : "border-gray-300"
                        }`}
                        aria-hidden="true"
                      >
                        {checked && <Check size={12} className="text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleIssue(option.id)}
                        aria-checked={checked}
                      />
                      <span className="text-sm text-gray-700">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* --- Free comment --- */}
            <div>
              <label
                htmlFor="feedback-comment"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Comentario (opcional)
              </label>
              <textarea
                id="feedback-comment"
                value={freeComment}
                onChange={(e) => setFreeComment(e.target.value)}
                placeholder="Ej: La salsa quedo muy salada, reducir la proxima vez..."
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl resize-none text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* --- Would repeat toggle --- */}
            <div>
              <label
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors select-none ${
                  wouldRepeat === true
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    wouldRepeat === true
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300"
                  }`}
                  aria-hidden="true"
                >
                  {wouldRepeat === true && (
                    <Check size={14} className="text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={wouldRepeat === true}
                  onChange={() =>
                    setWouldRepeat((prev) => (prev === true ? null : true))
                  }
                />
                <span className="text-sm font-medium text-gray-700">
                  Volveria a cocinarla
                </span>
              </label>
            </div>

            {/* --- Action buttons --- */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Saltar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" color="white" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Enviar feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
