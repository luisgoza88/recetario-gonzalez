"use client";

import { Check } from "lucide-react";

export function CompleteStep() {
  return (
    <div className="py-12 text-center">
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
        <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center">
          <Check size={56} className="text-white" />
        </div>
      </div>
      <h2 className="text-3xl font-bold text-gray-800 mb-3">¡Excelente!</h2>
      <p className="text-gray-600 text-lg mb-2">Tu hogar está configurado</p>
      <p className="text-gray-500">Redirigiendo a tu dashboard...</p>

      {/* Loading dots */}
      <div className="flex items-center justify-center gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
