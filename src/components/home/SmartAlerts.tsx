'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle, AlertCircle, Info, TrendingUp, TrendingDown,
  Users, Clock, Calendar, ChevronRight, X, Brain, RefreshCw,
  CheckCircle2
} from 'lucide-react';
import {
  predictWorkloadIssues,
  calculateWorkloadBalance,
  getIntelligenceSummary,
  WorkloadPrediction,
  WorkloadBalance,
  EmployeeScore
} from '@/lib/home/intelligence';

interface SmartAlertsProps {
  householdId: string;
  onNavigateToDate?: (date: string) => void;
}

export default function SmartAlerts({ householdId, onNavigateToDate }: SmartAlertsProps) {
  const [predictions, setPredictions] = useState<WorkloadPrediction[]>([]);
  const [todayWorkload, setTodayWorkload] = useState<WorkloadBalance[]>([]);
  const [employeeScores, setEmployeeScores] = useState<EmployeeScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Load predictions for next 7 days
      const preds = await predictWorkloadIssues(householdId, today, 7);
      setPredictions(preds);

      // Load today's workload
      const workload = await calculateWorkloadBalance(householdId, today);
      setTodayWorkload(workload);

      // Load employee scores via summary
      const summary = await getIntelligenceSummary(householdId);
      setEmployeeScores(summary.employeeScores);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading smart alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (householdId) {
      loadData();
    }
  }, [householdId]);

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'medium':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'low':
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overload':
        return <TrendingUp size={14} className="text-red-500" />;
      case 'underload':
        return <TrendingDown size={14} className="text-blue-500" />;
      case 'imbalance':
        return <Users size={14} className="text-yellow-500" />;
      case 'bottleneck':
        return <Clock size={14} className="text-orange-500" />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays < 7) return date.toLocaleDateString('es-CO', { weekday: 'long' });
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const highPriorityAlerts = predictions.filter(p => p.severity === 'high');
  const otherAlerts = predictions.filter(p => p.severity !== 'high');

  // Calculate overall health score
  const healthScore = Math.max(0, 100 - (highPriorityAlerts.length * 20) - (otherAlerts.length * 5));

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Analizando cargas de trabajo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer ${
          healthScore >= 80 ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
          healthScore >= 50 ? 'bg-gradient-to-r from-yellow-50 to-amber-50' :
          'bg-gradient-to-r from-red-50 to-orange-50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            healthScore >= 80 ? 'bg-green-100' :
            healthScore >= 50 ? 'bg-yellow-100' :
            'bg-red-100'
          }`}>
            <Brain size={20} className={
              healthScore >= 80 ? 'text-green-600' :
              healthScore >= 50 ? 'text-yellow-600' :
              'text-red-600'
            } />
          </div>
          <div>
            <div className="font-semibold text-gray-800">
              Inteligencia del Hogar
            </div>
            <div className="text-sm text-gray-600">
              {highPriorityAlerts.length === 0 && otherAlerts.length === 0 ? (
                <span className="text-green-600">Todo optimizado</span>
              ) : (
                <>
                  {highPriorityAlerts.length > 0 && (
                    <span className="text-red-600 mr-2">
                      {highPriorityAlerts.length} alerta{highPriorityAlerts.length > 1 ? 's' : ''} crítica{highPriorityAlerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {otherAlerts.length > 0 && (
                    <span className="text-yellow-600">
                      {otherAlerts.length} sugerencia{otherAlerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-bold ${
            healthScore >= 80 ? 'text-green-600' :
            healthScore >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {healthScore}%
          </div>
          <ChevronRight
            size={20}
            className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-gray-100">
          {/* Today's Workload Summary */}
          {todayWorkload.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={14} />
                Carga de Trabajo Hoy
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {todayWorkload.map(workload => (
                  <div
                    key={workload.employeeId}
                    className={`p-3 rounded-lg border ${
                      workload.isOverloaded ? 'bg-red-50 border-red-200' :
                      workload.isUnderloaded ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{workload.employeeName}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        workload.zone === 'interior' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {workload.zone === 'interior' ? 'Int' : 'Ext'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            workload.utilizationPercent > 100 ? 'bg-red-500' :
                            workload.utilizationPercent > 80 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, workload.utilizationPercent)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        workload.utilizationPercent > 100 ? 'text-red-600' :
                        workload.utilizationPercent > 80 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {workload.utilizationPercent}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {workload.assignedMinutes} / {workload.availableMinutes} min
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions / Alerts */}
          {predictions.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Predicciones (próximos 7 días)
              </h4>
              <div className="space-y-2">
                {predictions.slice(0, expanded ? 10 : 3).map((prediction, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getSeverityColor(prediction.severity)} cursor-pointer hover:opacity-80`}
                    onClick={() => onNavigateToDate?.(prediction.date)}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(prediction.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">
                            {formatDate(prediction.date)}
                          </span>
                          {getTypeIcon(prediction.type)}
                        </div>
                        <p className="text-sm text-gray-800">{prediction.message}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          💡 {prediction.suggestedAction}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle2 size={24} className="text-green-600" />
              <div>
                <p className="font-medium text-green-800">Sin alertas</p>
                <p className="text-sm text-green-600">
                  La carga de trabajo está bien distribuida para los próximos 7 días
                </p>
              </div>
            </div>
          )}

          {/* Employee Performance */}
          {employeeScores.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users size={14} />
                Rendimiento de Empleados
              </h4>
              <div className="space-y-2">
                {employeeScores.map(score => (
                  <div key={score.employeeId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{score.employeeName}</span>
                      <span className={`text-lg font-bold ${
                        score.overallScore >= 70 ? 'text-green-600' :
                        score.overallScore >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {score.overallScore}%
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Calidad</div>
                        <div className="font-medium">
                          {score.metrics.avgRating > 0 ? `${score.metrics.avgRating}/5` : '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Velocidad</div>
                        <div className="font-medium">{score.metrics.speedScore}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Fiabilidad</div>
                        <div className="font-medium">{score.metrics.reliabilityScore}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Consistencia</div>
                        <div className="font-medium">{score.metrics.consistencyScore}%</div>
                      </div>
                    </div>
                    {score.totalTasksCompleted > 0 && (
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        {score.totalTasksCompleted} tareas completadas • {Math.round(score.totalMinutesWorked / 60)}h trabajadas
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {lastUpdated && `Actualizado: ${lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadData();
              }}
              className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:text-purple-700"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
