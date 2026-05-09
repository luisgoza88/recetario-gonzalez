"use client";

import { ChevronRight } from "lucide-react";
import type { MessageAction } from "@/lib/hooks/useAIChat";

interface ActionButtonProps {
  action: MessageAction;
  onAction: (action: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function ActionButton({
  action,
  onAction,
  disabled,
  size = "md",
}: ActionButtonProps) {
  const variants = {
    primary: "bg-purple-600 text-white hover:bg-purple-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
  };

  const sizeClasses =
    size === "sm" ? "px-2 py-1 text-xs gap-1" : "px-3 py-1.5 text-xs gap-1.5";

  return (
    <button
      onClick={() => onAction(action.action)}
      disabled={disabled}
      className={`
        rounded-lg font-medium transition-colors
        flex items-center disabled:opacity-50
        ${sizeClasses}
        ${variants[action.variant || "secondary"]}
      `}
    >
      {action.label}
      <ChevronRight size={size === "sm" ? 12 : 14} />
    </button>
  );
}
