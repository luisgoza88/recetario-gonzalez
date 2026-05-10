"use client";
import { Share2 } from "lucide-react";

interface ShareRecipeButtonProps {
  recipeId: string;
  recipeName: string;
}

export function ShareRecipeButton({
  recipeId,
  recipeName,
}: ShareRecipeButtonProps) {
  const handleShare = async () => {
    const url = `${window.location.origin}/r/${recipeId}`;
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
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
    >
      <Share2 size={16} />
      Compartir
    </button>
  );
}
