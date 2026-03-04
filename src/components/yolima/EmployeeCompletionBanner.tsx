"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Camera } from "lucide-react";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";

interface CompletionData {
  meals_completed: { breakfast?: boolean; lunch?: boolean; dinner?: boolean };
  tasks_completed: string[];
  preparations_completed: string[];
  photo_urls: string[];
  completed_at: string | null;
  notes: string | null;
}

/**
 * Banner shown to admin on TodayDashboard when an employee
 * has logged daily completion data (Modo Yolima).
 */
export default function EmployeeCompletionBanner() {
  const householdId = useHouseholdId();
  const [data, setData] = useState<CompletionData | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;

    const todayStr = new Date().toISOString().split("T")[0];

    const fetchCompletion = async () => {
      try {
        const params = new URLSearchParams({
          date: todayStr,
          household_id: householdId,
        });
        const res = await fetch(`/api/daily-completion?${params.toString()}`);
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Error fetching completion banner data:", err);
      }
    };

    fetchCompletion();
  }, [householdId]);

  if (!data) return null;

  const meals = data.meals_completed || {};
  const mealsCompleted = [meals.breakfast, meals.lunch, meals.dinner].filter(
    Boolean,
  ).length;
  const mealsTotal = 3;
  const tasksCompleted = data.tasks_completed?.length || 0;
  const prepsCompleted = data.preparations_completed?.length || 0;
  const hasPhotos = data.photo_urls && data.photo_urls.length > 0;
  const isFullyComplete = !!data.completed_at;

  // Only show if there's some activity
  if (mealsCompleted === 0 && tasksCompleted === 0 && prepsCompleted === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`rounded-2xl p-4 border-2 shadow-sm ${
          isFullyComplete
            ? "bg-green-50 border-green-300"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          {isFullyComplete ? (
            <CheckCircle2 size={24} className="text-green-600" />
          ) : (
            <span className="text-xl">👩‍🍳</span>
          )}
          <h3
            className={`font-semibold text-lg ${
              isFullyComplete ? "text-green-800" : "text-amber-800"
            }`}
          >
            {isFullyComplete
              ? "✅ Yolima completó su día"
              : "🏃‍♀️ Yolima está trabajando..."}
          </h3>
        </div>

        <div className="flex flex-wrap gap-3 ml-9">
          <span className="text-sm font-medium px-2 py-1 rounded-lg bg-white/60">
            🍽️ {mealsCompleted}/{mealsTotal} comidas
          </span>
          {tasksCompleted > 0 && (
            <span className="text-sm font-medium px-2 py-1 rounded-lg bg-white/60">
              🧹 {tasksCompleted} tareas
            </span>
          )}
          {prepsCompleted > 0 && (
            <span className="text-sm font-medium px-2 py-1 rounded-lg bg-white/60">
              📋 {prepsCompleted} prep.
            </span>
          )}
        </div>

        {/* Photo thumbnails */}
        {hasPhotos && (
          <div className="flex items-center gap-2 mt-3 ml-9">
            <Camera size={16} className="text-gray-500" />
            <div className="flex gap-2">
              {data.photo_urls.slice(0, 3).map((url, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewPhoto(url)}
                  className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              {data.photo_urls.length > 3 && (
                <span className="text-sm text-gray-500 self-center">
                  +{data.photo_urls.length - 3} más
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Photo preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewPhoto}
            alt="Vista previa"
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}
