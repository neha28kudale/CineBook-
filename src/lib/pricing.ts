export const TIER_MULTIPLIERS = {
  silver: 1,
  gold: 1.5,
  premium: 2.2,
} as const;

export type SeatTier = keyof typeof TIER_MULTIPLIERS;

export const TIER_LABELS: Record<SeatTier, string> = {
  silver: "Silver",
  gold: "Gold",
  premium: "Recliner",
};

export type TierPriceOverrides = {
  gold_price?: number | null;
  premium_price?: number | null;
};

/**
 * Silver always derives from basePrice. Gold/Premium use the admin-set
 * override for that show when present, otherwise fall back to the default
 * multiplier off basePrice.
 */
export function seatPrice(
  basePrice: number,
  tier: SeatTier,
  overrides?: TierPriceOverrides,
): number {
  if (tier === "gold" && overrides?.gold_price != null) return Math.round(overrides.gold_price);
  if (tier === "premium" && overrides?.premium_price != null)
    return Math.round(overrides.premium_price);
  return Math.round(basePrice * TIER_MULTIPLIERS[tier]);
}

export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export const LOCK_TTL_MINUTES = 10;
export const CANCELLATION_WINDOW_HOURS = 6;
