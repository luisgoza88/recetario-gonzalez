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
        .select("tier, status, trial_ends_at, current_period_end")
        .eq("household_id", householdId)
        .in("status", ["active", "trial"])
        .maybeSingle();
      if (!data || !["free", "premium", "family"].includes(data.tier))
        return "free";
      const expiry =
        data.status === "trial" ? data.trial_ends_at : data.current_period_end;
      if (expiry && new Date(expiry).getTime() <= Date.now()) return "free";
      return data.tier as Tier;
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
