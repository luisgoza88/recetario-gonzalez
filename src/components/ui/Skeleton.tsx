"use client";

/**
 * Skeleton — Loading placeholders animados
 *
 * Sprint 8 (Lazyweb research): reemplazar spinners por skeleton screens
 * en superficies clave (cards, listas). Mejor percepcion de performance.
 *
 * Uso:
 *   <Skeleton className="h-4 w-3/4" />        // Linea de texto
 *   <Skeleton className="h-32 w-full rounded-xl" />  // Card
 *   <SkeletonCircle size={48} />              // Avatar
 *   <SkeletonRecipeCard />                    // Compuesto pre-armado
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return (
    <div
      className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/**
 * Card-shaped skeleton para listas de recetas o items
 * Mismo aspect que las recipe cards reales (Sprint 5)
 */
export function SkeletonRecipeCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-2.5 flex items-center gap-3">
      <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-3 w-12 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Lista de N skeleton cards (default 5)
 */
export function SkeletonRecipeList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRecipeCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for the WeeklyCardsView (7 day rows)
 */
export function SkeletonWeeklyCards() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="w-12 flex flex-col items-center gap-1">
              <Skeleton className="h-2 w-7 rounded" />
              <Skeleton className="h-6 w-7 rounded" />
            </div>
            <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for hero card (Today)
 */
export function SkeletonTodayHero() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
      <Skeleton className="w-full aspect-[4/3] rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
