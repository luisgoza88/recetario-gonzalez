"use client";

import { Mood, getMoodEmoji, getMoodLabel } from "@/lib/moods";

interface MoodChipProps {
  mood: Mood;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function MoodChip({
  mood,
  selected,
  onClick,
  size = "md",
}: MoodChipProps) {
  const emoji = getMoodEmoji(mood);
  const label = getMoodLabel(mood);

  const baseClasses =
    "inline-flex items-center gap-1 rounded-full font-medium transition-all border";

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs";

  const stateClasses = selected
    ? "bg-green-700 text-white border-green-700 shadow-sm"
    : onClick
      ? "bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 cursor-pointer"
      : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <button
      type="button"
      role={onClick ? "checkbox" : undefined}
      aria-checked={onClick ? selected : undefined}
      aria-label={`Mood: ${label}`}
      onClick={onClick}
      disabled={!onClick}
      className={`${baseClasses} ${sizeClasses} ${stateClasses} ${!onClick ? "cursor-default" : ""}`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
