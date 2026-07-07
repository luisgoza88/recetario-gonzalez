/**
 * src/components/ui/RecipeCard.tsx
 *
 * Patrón canónico para mostrar una receta como card en grid.
 * Reutilizable: recibe la receta por props y un onClick.
 */

"use client";

import Image from "next/image";
import { Timer } from "lucide-react";
import type { Recipe } from "@/types";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  imageSrc?: string; // override; por defecto usa recipe.image_url
}

export default function RecipeCard({
  recipe,
  onClick,
  imageSrc,
}: RecipeCardProps) {
  const img = imageSrc ?? recipe.image_url;
  const showThermomixBadge = recipe.thermomixCompatible === true;

  const tint =
    {
      breakfast: "from-amber-100 to-orange-50",
      lunch: "from-green-100 to-lime-50",
      dinner: "from-indigo-100 to-violet-50",
      dessert: "from-pink-100 to-rose-50",
      snack: "from-yellow-100 to-amber-50",
    }[recipe.type] ?? "from-stone-100 to-stone-50";

  const emoji =
    {
      breakfast: "🥚",
      lunch: "🥗",
      dinner: "🍽️",
      dessert: "🍰",
      snack: "🥨",
    }[recipe.type] ?? "🍴";

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden text-left active:scale-[0.98] transition-transform relative"
    >
      {/* Imagen / placeholder */}
      <div
        className={`h-24 w-full bg-gradient-to-br ${tint} relative overflow-hidden flex items-end p-3`}
      >
        {img ? (
          <Image
            src={img}
            alt={recipe.name}
            fill
            sizes="(max-width: 512px) 50vw, 256px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 8px)",
              }}
            />
            <div className="text-3xl absolute top-3 right-3 opacity-70">
              {emoji}
            </div>
          </>
        )}
      </div>

      {showThermomixBadge && (
        <span className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
          TM6
        </span>
      )}

      <div className="p-3">
        <p
          className="text-[13px] font-semibold text-[var(--ink)] leading-tight line-clamp-2 mb-1.5"
          style={{ minHeight: "2.6em" }}
        >
          {recipe.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
            {recipe.category}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 tabular-nums">
            <Timer size={9} />
            {totalTime}m
          </div>
        </div>
      </div>
    </button>
  );
}
