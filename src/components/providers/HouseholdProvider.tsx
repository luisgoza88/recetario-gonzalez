"use client";

import { useEffect, ReactNode } from "react";
import { useHouseholdStore } from "@/lib/stores/useHouseholdStore";
import { initializeHouseholdContext } from "@/lib/services/household-service";
import { useAuth } from "@/contexts/AuthContext";

interface HouseholdProviderProps {
  children: ReactNode;
}

/**
 * SECURITY: Espera a que AuthContext confirme un usuario autenticado
 * antes de hacer fetch. Sin esto, la version anterior cargaba el primer
 * hogar de la DB para CUALQUIER visitor anonimo (fuga de datos).
 *
 * Si el usuario hace logout, el household se resetea via setHousehold(null).
 */
export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const {
    setHousehold,
    setUser,
    setLoading,
    setInitialized,
    setError,
    isInitialized,
  } = useHouseholdStore();
  const { user: authUser, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Esperar a que AuthContext termine de resolver la sesion
    if (authLoading) return;

    // Si no hay usuario autenticado, limpiar y no fetchear
    if (!authUser) {
      setHousehold(null);
      setUser(null);
      setInitialized(true);
      setLoading(false);
      return;
    }

    // Re-inicializar si el authUser cambio (ej: switch de cuenta)
    if (isInitialized) return;

    const initialize = async () => {
      try {
        setLoading(true);
        const { household, user } = await initializeHouseholdContext(
          authUser.id,
        );
        setHousehold(household);
        setUser(user);
        setInitialized(true);
      } catch (error) {
        console.error("Failed to initialize household context:", error);
        setError("Error al cargar el contexto del hogar");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [
    authUser,
    authLoading,
    isInitialized,
    setHousehold,
    setUser,
    setLoading,
    setInitialized,
    setError,
  ]);

  return <>{children}</>;
}

export default HouseholdProvider;
