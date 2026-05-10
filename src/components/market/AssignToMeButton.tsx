"use client";
import { UserCheck } from "lucide-react";
import { useShoppingAssignments } from "@/lib/hooks/useShoppingAssignments";

interface AssignToMeButtonProps {
  shoppingListId: string;
  itemId: string;
}

export function AssignToMeButton({
  shoppingListId,
  itemId,
}: AssignToMeButtonProps) {
  const { isMine, assign, unassign } = useShoppingAssignments(shoppingListId);
  const mine = isMine(itemId);

  return (
    <button
      onClick={() => (mine ? unassign({ itemId }) : assign({ itemId }))}
      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${
        mine
          ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      <UserCheck size={12} className="inline" />
      {mine ? "Mio" : "Asignarme"}
    </button>
  );
}
