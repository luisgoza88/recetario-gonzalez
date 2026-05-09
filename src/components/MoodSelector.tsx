"use client";

import { MOODS, Mood, getMoodDescription } from "@/lib/moods";
import { MoodChip } from "@/components/ui/MoodChip";

interface MoodSelectorProps {
  selected?: Mood;
  onChange: (mood: Mood | undefined) => void;
  showDescription?: boolean;
}

export function MoodSelector({
  selected,
  onChange,
  showDescription,
}: MoodSelectorProps) {
  const handleClick = (mood: Mood) => {
    onChange(selected === mood ? undefined : mood);
  };

  const description = selected ? getMoodDescription(selected) : null;

  return (
    <div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="group"
        aria-label="Seleccionar mood"
      >
        {MOODS.map((m) => (
          <MoodChip
            key={m.id}
            mood={m.id}
            selected={selected === m.id}
            onClick={() => handleClick(m.id)}
          />
        ))}
      </div>
      {showDescription && description && (
        <p className="mt-2 text-xs text-gray-500 italic">{description}</p>
      )}
    </div>
  );
}
