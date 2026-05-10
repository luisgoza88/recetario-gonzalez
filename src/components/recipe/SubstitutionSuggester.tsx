"use client";
import { useState } from "react";
import { RefreshCw, X, Loader2 } from "lucide-react";

interface Substitution {
  name: string;
  ratio: string;
  notes: string;
}

interface SubstitutionSuggesterProps {
  ingredient: string;
  recipeName?: string;
}

export function SubstitutionSuggester({
  ingredient,
  recipeName,
}: SubstitutionSuggesterProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<
    "unavailable" | "allergy" | "diet" | "preference"
  >("unavailable");

  const fetchSubstitutions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest-substitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient, recipeName, reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al obtener sustituciones");
      }

      const data = await res.json();
      setSubstitutions(data.substitutions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setSubstitutions([]);
    setError(null);
    fetchSubstitutions();
  };

  const handleClose = () => {
    setOpen(false);
    setSubstitutions([]);
    setError(null);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="ml-1 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
        title={`Buscar sustitutos para ${ingredient}`}
      >
        <RefreshCw size={12} />
        Sustituir
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Sustitutos para{" "}
                <span className="text-emerald-600">{ingredient}</span>
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Razon del sustituto */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(
                [
                  { value: "unavailable", label: "No disponible" },
                  { value: "allergy", label: "Alergia" },
                  { value: "diet", label: "Dieta" },
                  { value: "preference", label: "Preferencia" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setReason(opt.value);
                    setSubstitutions([]);
                    setError(null);
                  }}
                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    reason === opt.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "text-gray-600 border-gray-300 hover:border-emerald-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {reason !== "unavailable" &&
              substitutions.length === 0 &&
              !loading && (
                <button
                  onClick={fetchSubstitutions}
                  className="w-full py-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors mb-4"
                >
                  Buscar con esta razon
                </button>
              )}

            {/* Contenido */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
                <span className="ml-2 text-sm text-gray-500">
                  Consultando IA...
                </span>
              </div>
            )}

            {error && (
              <div className="py-3 px-4 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            {!loading && substitutions.length > 0 && (
              <div className="space-y-3">
                {substitutions.map((sub, i) => (
                  <div
                    key={i}
                    className="p-3 border border-gray-100 rounded-xl bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {sub.name}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-mono">
                        {sub.ratio}
                      </span>
                    </div>
                    {sub.notes && (
                      <p className="text-xs text-gray-500">{sub.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
