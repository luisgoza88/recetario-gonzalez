"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useHouseholdId } from "@/lib/stores/useHouseholdStore";
import {
  TIER_LIMITS,
  type Tier,
  type TierLimits,
  canAccess,
} from "@/lib/subscription/tier-features";

export function useSubscription() {
  const householdId = useHouseholdId();

  const { data: tier = "free" as Tier } = useQuery({
    queryKey: ["subscription", householdId],
    queryFn: async (): Promise<Tier> => {
      if (!householdId) return "free";
      const { data } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("household_id", householdId)
        .in("status", ["active", "trial"])
        .maybeSingle();
      return (data?.tier as Tier) ?? "free";
    },
    enabled: !!householdId,
  });

  const limits = TIER_LIMITS[tier];

  return {
    tier,
    limits,
    isPremium: tier !== "free",
    can: (feature: keyof TierLimits) => canAccess(tier, feature),
  };
}
