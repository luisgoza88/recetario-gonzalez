'use client';

import { useState, useEffect } from 'react';
import {
  X, History, Star, Calendar, User, Clock,
  ChevronDown, Filter, TrendingUp, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Space, HomeEmployee } from '@/types';

interface CleaningHistoryProps {
  householdId: string;
  spaces: Space[];
  employees: HomeEmployee[];
  onClose: () => void;
  initialSpaceId?: string;
}

interface HistoryRecord {
  id: string;
  space_id: string;
  task_name: string;
  employee_id?: string;
  completed_at: string;
  actual_minutes?: number;
  rating?: number;
  notes?: string;
}

interface SpaceStats {
  spaceId: string;
  lastCleaned?: string;
  avgRating: number;
  totalCleanings: number;
  daysSinceLastClean: number;
}

export default function CleaningHistory({
  householdId,
  spaces,
  employees,
  onClose,
  initialSpaceId
}: CleaningHistoryProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [stats, setStats] = useState<SpaceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<string>(initialSpaceId || 'all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    loadHistory();
  }, [selectedSpace, dateRange, householdId]);

  const loadHistory = async () => {
    setLoading(true);

    let query = supabase
      .from('cleaning_history')
      .select('*')
      .eq('household_id', householdId)
      .order('completed_at', { ascending: false });

    if (selectedSpace !== 'all') {
      query = query.eq('space_id', selectedSpace);
    }

    // Date filter
    const now = new Date();
    if (dateRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('completed_at', weekAgo.toISOString());
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte('completed_at', monthAgo.toISOString());
    }

    const { data } = await query.limit(100);
    if (data) setHistory(data);

    // Calculate stats per space
    const { data: allHistory } = await supabase
      .from('cleaning_history')
      .select('*')
      .eq('household_id', householdId);

    if (allHistory) {
      const spaceStats: SpaceStats[] = spaces.map(space => {
        const spaceHistory = allHistory.filter(h => h.space_id === space.id);
        const ratings = spaceHistory.filter(h => h.rating).map(h => h.rating!);
        const lastClean = spaceHistory.length > 0
          ? spaceHistory.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
          : null;

        const daysSince = lastClean
          ? Math.floor((now.getTime() - new Date(lastClean.completed_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        return {
          spaceId: space.id,
          lastCleaned: lastClean?.completed_at,
          avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
          totalCleanings: spaceHistory.length,
          daysSinceLastClean: daysSince
        };
      });

      setStats(spaceStats);
    }

    setLoading(false);
  };

  const getSpace = (spaceId: string) => spaces.find(s => s.id === spaceId);
  const getEmployee = (empId?: string) => empId ? employees.find(e => e.id === empId) : null;
  const getSpaceStats = (spaceId: string) => stats.find(s => s.spaceId === spaceId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Spaces needing attention (not cleaned in a while)
  const needsAttention = stats
    .filter(s => s.daysSinceLastClean > 7)
    .sort((a, b) => b.daysSinceLastClean - a.daysSinceLastClean);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History size={20} />
            <span className="font-semibold">Historial de Limpieza</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          {/* Space Filter */}
          <div className="relative">
            <select
              value={selectedSpace}
              onChange={(e) => setSelectedSpace(e.target.value)}
              className="w-full p-3 pr-10 border rounded-xl appearance-none bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los espacios</option>
              {spaces.map(space => (
                <option key={space.id} value={space.id}>
                  {space.space_type?.icon} {space.custom_name || space.space_type?.name}
                </option>
              ))}
            </select>
            <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Date Range */}
          <div className="flex gap-2">
            {[
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'all', label: 'Todo' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value as typeof dateRange)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            </div>
          ) : (
            <>
              {/* Needs Attention Section */}
              {selectedSpace === 'all' && needsAttention.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} />
                    Necesitan Atención
                  </h3>
                  <div className="space-y-2">
                    {needsAttention.slice(0, 3).map(stat => {
                      const space = getSpace(stat.spaceId);
                      return (
                        <div key={stat.spaceId} className="flex items-center justify-between bg-white rounded-lg p-2">
                          <span className="text-sm">
                            {space?.space_type?.icon} {space?.custom_name || space?.space_type?.name}
                          </span>
                          <span className="text-xs text-amber-700 font-medium">
                            {stat.daysSinceLastClean} días sin limpiar
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Space Stats */}
              {selectedSpace !== 'all' && (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-indigo-700">
                        {getSpaceStats(selectedSpace)?.totalCleanings || 0}
                      </div>
                      <p className="text-xs text-indigo-600">Limpiezas</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-700 flex items-center justify-center gap-1">
                        {getSpaceStats(selectedSpace)?.avgRating.toFixed(1) || '-'}
                        <Star size={16} className="fill-amber-400 text-amber-400" />
                      </div>
                      <p className="text-xs text-indigo-600">Promedio</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-700">
                        {getSpaceStats(selectedSpace)?.daysSinceLastClean || '-'}
                      </div>
                      <p className="text-xs text-indigo-600">Días desde última</p>
                    </div>
                  </div>
                </div>
              )}

              {/* History List */}
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No hay registros de limpieza</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(record => {
                    const space = getSpace(record.space_id);
                    const emp = getEmployee(record.employee_id);

                    return (
                      <div key={record.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{record.task_name}</span>
                              {record.rating && (
                                <span className="flex items-center gap-0.5 text-sm text-amber-600">
                                  <Star size={14} className="fill-amber-400 text-amber-400" />
                                  {record.rating}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {space?.space_type?.icon} {space?.custom_name || space?.space_type?.name}
                            </p>
                            {emp && (
                              <p className="text-xs text-gray-500 mt-1">
                                Por: {emp.name}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{formatDate(record.completed_at)}</p>
                            {record.actual_minutes && (
                              <p className="text-xs">{record.actual_minutes} min</p>
                            )}
                          </div>
                        </div>
                        {record.notes && (
                          <p className="mt-2 text-sm text-gray-600 bg-white rounded p-2">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
