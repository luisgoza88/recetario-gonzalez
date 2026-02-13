'use client';

import { Zap, LogIn, Package, History, FileText, Eye } from 'lucide-react';

interface HomeQuickActionsProps {
  hasTasksToday: boolean;
  onOpenRoutines: () => void;
  onOpenCheckIn: () => void;
  onOpenSupplies: () => void;
  onOpenHistory: () => void;
  onOpenReports: () => void;
  onOpenInspection: () => void;
}

export default function HomeQuickActions({
  hasTasksToday,
  onOpenRoutines,
  onOpenCheckIn,
  onOpenSupplies,
  onOpenHistory,
  onOpenReports,
  onOpenInspection,
}: HomeQuickActionsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm mb-4 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Herramientas Rápidas</h3>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onOpenRoutines}
          className="flex flex-col items-center p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
        >
          <Zap size={24} className="text-amber-600 mb-1" />
          <span className="text-xs text-amber-700 font-medium">Rutinas</span>
        </button>
        <button
          onClick={onOpenCheckIn}
          className="flex flex-col items-center p-3 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
        >
          <LogIn size={24} className="text-teal-600 mb-1" />
          <span className="text-xs text-teal-700 font-medium">Asistencia</span>
        </button>
        <button
          onClick={onOpenSupplies}
          className="flex flex-col items-center p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          <Package size={24} className="text-emerald-600 mb-1" />
          <span className="text-xs text-emerald-700 font-medium">Productos</span>
        </button>
        <button
          onClick={onOpenHistory}
          className="flex flex-col items-center p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          <History size={24} className="text-indigo-600 mb-1" />
          <span className="text-xs text-indigo-700 font-medium">Historial</span>
        </button>
        <button
          onClick={onOpenReports}
          className="flex flex-col items-center p-3 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors"
        >
          <FileText size={24} className="text-pink-600 mb-1" />
          <span className="text-xs text-pink-700 font-medium">Reportes</span>
        </button>
        <button
          onClick={onOpenInspection}
          disabled={!hasTasksToday}
          className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
            hasTasksToday
              ? 'bg-purple-50 hover:bg-purple-100'
              : 'bg-gray-50 opacity-50 cursor-not-allowed'
          }`}
        >
          <Eye size={24} className={hasTasksToday ? 'text-purple-600' : 'text-gray-400'} />
          <span className={`text-xs font-medium ${hasTasksToday ? 'text-purple-700' : 'text-gray-400'}`}>Inspección</span>
        </button>
      </div>
    </div>
  );
}
