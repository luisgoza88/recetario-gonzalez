"use client";

import { Users } from "lucide-react";

interface HouseholdStepProps {
  householdName: string;
  setHouseholdName: (name: string) => void;
  membersCount: number;
  setMembersCount: (count: number) => void;
}

export function HouseholdStep({
  householdName,
  setHouseholdName,
  membersCount,
  setMembersCount,
}: HouseholdStepProps) {
  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Tu hogar</h2>
      <p className="text-gray-600 mb-6">Cuéntanos sobre tu familia</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del hogar
          </label>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Ej: Familia González, Mi Casa..."
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ¿Cuántas personas comen regularmente?
          </label>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setMembersCount(Math.max(1, membersCount - 1))}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-2xl font-medium"
              >
                −
              </button>
              <div className="text-center">
                <span className="text-5xl font-bold text-green-600">
                  {membersCount}
                </span>
                <p className="text-sm text-gray-500 mt-1">personas</p>
              </div>
              <button
                onClick={() => setMembersCount(membersCount + 1)}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-2xl font-medium"
              >
                +
              </button>
            </div>

            {/* Visual representation */}
            <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
              {Array.from({ length: Math.min(membersCount, 10) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Users size={16} className="text-green-600" />
                  </div>
                ),
              )}
              {membersCount > 10 && (
                <span className="text-sm text-gray-500 ml-2">
                  +{membersCount - 10}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
