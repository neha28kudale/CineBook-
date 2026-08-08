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

export function seatPrice(basePrice: number, tier: SeatTier): number {
  return Math.round(basePrice * TIER_MULTIPLIERS[tier]);
}

export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export const LOCK_TTL_MINUTES = 10;
export const CANCELLATION_WINDOW_HOURS = 6;
