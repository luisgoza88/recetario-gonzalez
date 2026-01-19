/**
 * Household Store
 * Manages household and user state with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Household, User, HouseholdFeatures } from '../types/household';

interface HouseholdState {
  // Current household
  household: Household | null;
  // Current user
  user: User | null;
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  // Error
  error: string | null;

  // Actions
  setHousehold: (household: Household | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed helpers
  hasFeature: (feature: keyof HouseholdFeatures) => boolean;
  isOwner: () => boolean;
  isAdmin: () => boolean;
  canManageUsers: () => boolean;
  canManageHousehold: () => boolean;
}

const initialState = {
  household: null,
  user: null,
  isLoading: true,
  isInitialized: false,
  error: null,
};

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setHousehold: (household) => set({ household }),
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      setError: (error) => set({ error }),

      reset: () => set(initialState),

      hasFeature: (feature) => {
        const { household } = get();
        if (!household) return false;
        return household.features[feature] === true;
      },

      isOwner: () => {
        const { user } = get();
        return user?.role === 'owner';
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'owner' || user?.role === 'admin';
      },

      canManageUsers: () => {
        const { user } = get();
        return user?.role === 'owner' || user?.role === 'admin';
      },

      canManageHousehold: () => {
        const { user } = get();
        return user?.role === 'owner';
      },
    }),
    {
      name: 'household-storage',
      partialize: (state) => ({
        // Only persist essential data, not loading states
        household: state.household,
        user: state.user,
      }),
    }
  )
);

// Selector hooks for common patterns
export const useCurrentHousehold = () => useHouseholdStore((s) => s.household);
export const useCurrentUser = () => useHouseholdStore((s) => s.user);
export const useHouseholdId = () => useHouseholdStore((s) => s.household?.id);
export const useHasFeature = (feature: keyof HouseholdFeatures) =>
  useHouseholdStore((s) => s.hasFeature(feature));
