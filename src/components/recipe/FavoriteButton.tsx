"use client";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/hooks/useFavorites";

interface FavoriteButtonProps {
  recipeId: string;
  size?: number;
  className?: string;
}

export function FavoriteButton({
  recipeId,
  size = 24,
  className = "",
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();
  const fav = isFavorite(recipeId);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(recipeId);
      }}
      disabled={isLoading}
      className={`p-2 rounded-full transition-all hover:scale-110 disabled:opacity-50 ${className}`}
      aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
    >
      <Heart
        size={size}
        className={fav ? "fill-red-500 text-red-500" : "text-gray-400"}
      />
    </button>
  );
}
