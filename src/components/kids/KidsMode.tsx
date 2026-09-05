"use client";
import { householdDate } from "@/lib/menu-date";
import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Sparkles, ChefHat, Apple } from "lucide-react";
import type { Recipe } from "@/types";

interface KidsModeProps {
  todayRecipe?: Recipe;
  onClose: () => void;
}

interface Task {
  id: string;
  emoji: string;
  label: string;
  points: number;
}

export function KidsMode({ todayRecipe, onClose }: KidsModeProps) {
  const [points, setPoints] = useState(0);
  const [helped, setHelped] = useState<string[]>([]);

  const storageKey = `kids:${typeof window !== "undefined" ? localStorage.getItem("recetario-session-scope") : ""}:${householdDate()}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (
        saved &&
        Array.isArray(saved.helped) &&
        typeof saved.points === "number"
      ) {
        setHelped(saved.helped);
        setPoints(saved.points);
      }
    } catch {
      /* Corrupt local progress can safely start fresh. */
    }
  }, [storageKey]);
  const tasks: Task[] = todayRecipe
    ? [
        { id: "wash", emoji: "🥕", label: "Lavar las verduras", points: 5 },
        { id: "set-table", emoji: "🍽️", label: "Poner la mesa", points: 5 },
        { id: "stir", emoji: "🥄", label: "Revolver", points: 10 },
        { id: "decorate", emoji: "✨", label: "Decorar el plato", points: 10 },
      ]
    : [];

  const completeTask = (taskId: string, taskPoints: number) => {
    if (helped.includes(taskId)) return;
    setHelped((prev) => [...prev, taskId]);
    setPoints((p) => p + taskPoints);
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        helped: [...helped, taskId],
        points: points + taskPoints,
      }),
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-200 z-50 overflow-y-auto">
      <div className="max-w-md mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-purple-700">Hola Chef! 👨‍🍳</h1>
          <button
            onClick={onClose}
            aria-label="Cerrar modo ninos"
            className="p-2 bg-white rounded-full shadow hover:bg-gray-50 transition-colors"
          >
            <X size={24} className="text-purple-700" />
          </button>
        </div>

        {/* Puntaje */}
        <div className="bg-white rounded-3xl p-6 shadow-xl mb-6 text-center">
          <Sparkles size={48} className="mx-auto text-yellow-500 mb-2" />
          <p className="text-5xl font-bold text-purple-700">{points}</p>
          <p className="text-gray-600">puntos hoy</p>
        </div>

        {/* Hoy comemos */}
        {todayRecipe && (
          <div className="bg-white rounded-3xl p-6 shadow-xl mb-6">
            <p className="text-sm text-gray-500">Hoy de almuerzo</p>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat size={28} className="text-orange-500" />
              {todayRecipe.name}
            </h2>
            {todayRecipe.image_url && (
              <div className="relative w-full h-40 mt-3 rounded-2xl overflow-hidden">
                <Image
                  src={todayRecipe.image_url}
                  alt={todayRecipe.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* Tareas */}
        {tasks.length > 0 && (
          <>
            <h3 className="text-xl font-bold text-purple-700 mb-3">
              En que quieres ayudar?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {tasks.map((task) => {
                const done = helped.includes(task.id);
                return (
                  <button
                    key={task.id}
                    onClick={() => completeTask(task.id, task.points)}
                    disabled={done}
                    aria-pressed={done}
                    aria-label={`${task.label} — ${task.points} puntos${done ? " (completado)" : ""}`}
                    className={[
                      "rounded-3xl p-5 text-center shadow-lg transition-all",
                      done
                        ? "bg-green-100 border-4 border-green-500 scale-95"
                        : "bg-white hover:scale-105 active:scale-95",
                    ].join(" ")}
                  >
                    <div className="text-5xl mb-2">{task.emoji}</div>
                    <p className="font-bold text-gray-800">{task.label}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      +{task.points} ⭐
                    </p>
                    {done && (
                      <p className="text-green-600 text-sm font-bold mt-1">
                        Listo! ✅
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Recompensa */}
        {points >= 20 && (
          <div className="mt-6 p-6 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-3xl text-center shadow-xl animate-pulse">
            <Apple size={48} className="mx-auto mb-2" />
            <p className="text-xl font-bold text-orange-900">
              Eres un super chef! 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
