'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  generateProactiveAlerts,
  getActiveAlerts,
  dismissAlert,
  requestNotificationPermission,
  type ProactiveAlert
} from '@/lib/ai-notifications';

interface UseProactiveAlertsOptions {
  refreshInterval?: number; // in milliseconds
  autoGenerateOnMount?: boolean;
}

export function useProactiveAlerts(options: UseProactiveAlertsOptions = {}) {
  const { refreshInterval = 5 * 60 * 1000, autoGenerateOnMount = true } = options;

  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate alerts on mount
  useEffect(() => {
    if (autoGenerateOnMount) {
      const loadAlerts = async () => {
        setIsLoading(true);
        try {
          const activeAlerts = await generateProactiveAlerts();
          setAlerts(activeAlerts);
          requestNotificationPermission();
        } catch (error) {
          console.error('Error generating alerts:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadAlerts();
    }
  }, [autoGenerateOnMount]);

  // Refresh alerts periodically
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      const activeAlerts = getActiveAlerts();
      setAlerts(activeAlerts);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleDismissAlert = useCallback((alertId: string) => {
    dismissAlert(alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const handleAlertAction = useCallback((alert: ProactiveAlert, onAction?: (action: string) => void) => {
    if (alert.actionable && onAction) {
      onAction(alert.actionable.action);
    }
    handleDismissAlert(alert.id);
    setShowAlerts(false);
  }, [handleDismissAlert]);

  const toggleAlerts = useCallback(() => {
    setShowAlerts(prev => !prev);
  }, []);

  const refreshAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeAlerts = await generateProactiveAlerts();
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error refreshing alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper functions for styling
  const getPriorityColor = (priority: ProactiveAlert['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return {
    alerts,
    showAlerts,
    isLoading,
    alertCount: alerts.length,
    handleDismissAlert,
    handleAlertAction,
    toggleAlerts,
    setShowAlerts,
    refreshAlerts,
    getPriorityColor,
  };
}
