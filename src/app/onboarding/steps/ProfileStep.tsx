"use client";

import { Star, Heart, ClipboardList, Check } from "lucide-react";
import type { ProfileType } from "../types";

interface ProfileStepProps {
  profileType: ProfileType;
  setProfileType: (type: ProfileType) => void;
}

export function ProfileStep({ profileType, setProfileType }: ProfileStepProps) {
  const options = [
    {
      id: "admin" as const,
      icon: <Star className="text-yellow-600" />,
      bg: "bg-yellow-100",
      title: "Administrador del hogar",
      description: "Organizo las comidas, compras y gestiono empleados",
    },
    {
      id: "family" as const,
      icon: <Heart className="text-pink-600" />,
      bg: "bg-pink-100",
      title: "Miembro de la familia",
      description: "Quiero ver el menú, recetas y lista de compras",
    },
    {
      id: "employee" as const,
      icon: <ClipboardList className="text-blue-600" />,
      bg: "bg-blue-100",
      title: "Empleado del hogar",
      description: "Necesito ver mis tareas asignadas",
    },
  ];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Quién eres?</h2>
      <p className="text-gray-600 mb-6">
        Esto nos ayuda a personalizar tu experiencia
      </p>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => setProfileType(option.id)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
              profileType === option.id
                ? "border-green-500 bg-green-50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 ${option.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{option.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {option.description}
                </p>
              </div>
              {profileType === option.id && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
