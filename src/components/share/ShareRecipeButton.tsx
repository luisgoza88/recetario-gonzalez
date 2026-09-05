"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareRecipeButtonProps {
  recipeId: string;
  recipeName: string;
}

export function ShareRecipeButton({
  recipeId,
  recipeName,
}: ShareRecipeButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handleShare = async () => {
    setError(null);
    setBusy(true);
    let url: string;
    try {
      const response = await fetch("/api/recipe-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo compartir");
      url = new URL(data.url, window.location.origin).href;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo compartir");
      return;
    } finally {
      setBusy(false);
    }
    const title = `Mira esta receta: ${recipeName}`;

    // Usar Web Share API si esta disponible (movil)
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Usuario cancelo el share — no hacer nada
      }
    }

    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copiado al portapapeles!");
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <>
      <button
        disabled={busy}
        onClick={handleShare}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
      >
        <Share2 size={16} />
        Compartir
      </button>
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </>
  );
}
