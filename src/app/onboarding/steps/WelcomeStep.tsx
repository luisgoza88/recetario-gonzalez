"use client";

import {
  UtensilsCrossed,
  Sparkles,
  Bot,
  ShoppingCart,
  Calendar,
  Users,
  Shield,
  Zap,
} from "lucide-react";

export function WelcomeStep() {
  return (
    <div className="text-center py-8">
      {/* Animated logo */}
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl animate-pulse" />
        <div className="absolute inset-2 bg-white rounded-2xl flex items-center justify-center">
          <UtensilsCrossed size={48} className="text-green-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
          <Sparkles size={16} className="text-yellow-800" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-3">
        ¡Bienvenido a Recetario!
      </h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Tu asistente inteligente para organizar comidas, lista de compras y
        gestión del hogar.
      </p>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 gap-3 text-left max-w-sm mx-auto mb-8">
        {[
          {
            icon: <Bot className="text-purple-600" />,
            bg: "bg-purple-100",
            text: "IA que te ayuda a planificar",
          },
          {
            icon: <ShoppingCart className="text-blue-600" />,
            bg: "bg-blue-100",
            text: "Lista de compras automática",
          },
          {
            icon: <Calendar className="text-green-600" />,
            bg: "bg-green-100",
            text: "Menú semanal organizado",
          },
          {
            icon: <Users className="text-orange-600" />,
            bg: "bg-orange-100",
            text: "Gestión de empleados del hogar",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
          >
            <div
              className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
            >
              {item.icon}
            </div>
            <span className="text-gray-700 font-medium">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Shield size={16} className="text-green-600" />
          <span>Datos seguros</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap size={16} className="text-yellow-600" />
          <span>Gratis para empezar</span>
        </div>
      </div>
    </div>
  );
}
