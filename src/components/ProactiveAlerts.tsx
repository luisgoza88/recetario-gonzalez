"use client";

import {
  AlertTriangle,
  ShoppingCart,
  Lightbulb,
  ChevronRight,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  useProactiveAlerts,
  type Alert,
  type AlertSeverity,
} from "@/lib/hooks/useProactiveAlerts";

interface ProactiveAlertsProps {
  onNavigateToMarket: () => void;
  onNavigateToSuggestions: () => void;
  compact?: boolean;
}

export default function ProactiveAlerts({
  onNavigateToMarket,
  onNavigateToSuggestions,
  compact = false,
}: ProactiveAlertsProps) {
  const { alerts, isLoading, dismiss } = useProactiveAlerts({
    autoGenerateOnMount: true,
    refreshIntervalMs: 0, // El componente no maneja refresco propio
  });

  // Mapear action.payload a los callbacks de navegacion del componente
  const resolveAction = (alert: Alert): (() => void) | undefined => {
    if (!alert.action) return undefined;
    const payload = alert.action.payload as
      { tab?: string; mode?: string } | undefined;
    if (payload?.tab === "suggestions") return onNavigateToSuggestions;
    if (payload?.tab === "market") return onNavigateToMarket;
    return undefined;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  const getSeverityStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-500",
          text: "text-red-800",
        };
      case "warning":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          icon: "text-orange-500",
          text: "text-orange-800",
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-500",
          text: "text-blue-800",
        };
    }
  };

  const getAlertIcon = (source: Alert["source"]) => {
    switch (source) {
      case "missing_ingredients":
        return <ShoppingCart size={18} />;
      case "inventory":
        return <AlertTriangle size={18} />;
      case "suggestions":
        return <Lightbulb size={18} />;
      case "menu":
        return <Clock size={18} />;
      default:
        return <Sparkles size={18} />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {alerts.slice(0, 2).map((alert) => {
          const styles = getSeverityStyles(alert.severity);
          const onClick = resolveAction(alert);
          return (
            <button
              key={alert.id}
              onClick={onClick}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${styles.bg} ${styles.border} border text-left hover:opacity-90 transition-opacity`}
            >
              <span className={styles.icon}>{getAlertIcon(alert.source)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${styles.text} truncate`}>
                  {alert.title}
                </p>
              </div>
              <ChevronRight size={16} className={styles.icon} />
            </button>
          );
        })}
        {alerts.length > 2 && (
          <p className="text-xs text-gray-500 text-center">
            +{alerts.length - 2} alerta
            {alerts.length - 2 > 1 ? "s" : ""} mas
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles size={16} className="text-purple-500" />
        <h3 className="text-sm font-medium text-gray-600">Alertas</h3>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const styles = getSeverityStyles(alert.severity);
          const onClick = resolveAction(alert);
          return (
            <div
              key={alert.id}
              className={`relative flex items-start gap-3 p-4 rounded-xl ${styles.bg} ${styles.border} border`}
            >
              <button
                onClick={() => dismiss(alert.id)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/50 text-gray-400"
              >
                <X size={14} />
              </button>

              <span className={`mt-0.5 ${styles.icon}`}>
                {getAlertIcon(alert.source)}
              </span>

              <div className="flex-1 min-w-0 pr-6">
                <p className={`font-medium ${styles.text}`}>{alert.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{alert.body}</p>

                {alert.action && onClick && (
                  <button
                    onClick={onClick}
                    className={`mt-2 text-sm font-medium ${styles.text} flex items-center gap-1 hover:underline`}
                  >
                    {alert.action.label}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
