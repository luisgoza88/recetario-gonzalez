'use client';

import { useEffect, ReactNode } from 'react';
import { useHouseholdStore } from '@/lib/stores/useHouseholdStore';
import { initializeHouseholdContext } from '@/lib/services/household-service';

interface HouseholdProviderProps {
  children: ReactNode;
}

export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const { setHousehold, setUser, setLoading, setInitialized, setError, isInitialized } =
    useHouseholdStore();

  useEffect(() => {
    // Don't re-initialize if already done
    if (isInitialized) return;

    const initialize = async () => {
      try {
        setLoading(true);
        const { household, user } = await initializeHouseholdContext();
        setHousehold(household);
        setUser(user);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize household context:', error);
        setError('Error al cargar el contexto del hogar');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [isInitialized, setHousehold, setUser, setLoading, setInitialized, setError]);

  return <>{children}</>;
}

export default HouseholdProvider;
