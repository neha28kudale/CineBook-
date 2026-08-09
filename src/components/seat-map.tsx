import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Armchair } from "lucide-react";
import { cn } from "@/lib/utils";
import { seatPrice, inr, type SeatTier, type TierPriceOverrides } from "@/lib/pricing";

export type SeatInfo = {
  id: string;
  row_label: string;
  seat_number: number;
  seat_type: SeatTier;
  is_aisle_gap: boolean;
};

export type ShowSeatInfo = {
  seat_id: string;
  status: "locked" | "booked";
  locked_by: string | null;
  locked_until: string | null;
};

type SeatStatus = "available" | "selected" | "booked" | "held";

export function SeatMap({
  seats,
  showSeats,
  currentUserId,
  basePrice,
  tierOverrides,
  selectedIds,
  onToggle,
}: {
  seats: SeatInfo[];
  showSeats: ShowSeatInfo[];
  currentUserId: string | null;
  basePrice: number;
  tierOverrides?: TierPriceOverrides;
  selectedIds: string[];
  onToggle: (seatId: string) => void;
}) {
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const stateBySeat = useMemo(() => {
    const map = new Map<string, SeatStatus>();
    const now = Date.now();
    const held = new Map<string, string | null>();
    for (const ss of showSeats) {
      if (ss.status === "booked") {
        map.set(ss.seat_id, "booked");
      } else if (ss.locked_until && new Date(ss.locked_until).getTime() > now) {
        held.set(ss.seat_id, ss.locked_by);
      }
    }
    for (const seat of seats) {
      if (map.has(seat.id)) continue;
      if (selected.has(seat.id)) {
        map.set(seat.id, "selected");
      } else if (held.has(seat.id)) {
        map.set(seat.id, held.get(seat.id) === currentUserId ? "selected" : "held");
      } else {
        map.set(seat.id, "available");
      }
    }
    return map;
  }, [seats, showSeats, selected, currentUserId]);

  const rows = useMemo(() => {
    const byRow = new Map<string, SeatInfo[]>();
    for (const seat of seats) {
      const list = byRow.get(seat.row_label) ?? [];
      list.push(seat);
      byRow.set(seat.row_label, list);
    }
    return [...byRow.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rowSeats]) => ({
        label,
        tier: rowSeats.find((s) => !s.is_aisle_gap)?.seat_type ?? "silver",
        seats: rowSeats.sort((a, b) => a.seat_number - b.seat_number),
      }));
  }, [seats]);

  function handleClick(seat: SeatInfo) {
    const status = stateBySeat.get(seat.id);
    if (status === "booked" || status === "held") {
      setShakingId(seat.id);
      setTimeout(() => setShakingId(null), 500);
      return;
    }
    onToggle(seat.id);
  }

  const tierChip: Record<SeatTier, string> = {
    silver: "text-tier-silver border-tier-silver/40",
    gold: "text-tier-gold border-tier-gold/40",
    premium: "text-tier-premium border-tier-premium/40",
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function check() {
      if (!el) return;
      setIsScrollable(el.scrollWidth > el.clientWidth + 1);
    }
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [rows]);

  return (
    <div className="space-y-7 sm:space-y-6">
      {/* Screen */}
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="screen-glow animate-screen-flicker mx-auto h-16 w-4/5 rounded-t-full" />
        <div className="mx-auto -mt-14 flex h-14 items-end justify-center pb-1">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Screen this way
          </span>
        </div>
      </div>

      {/* Seat grid */}
      {isScrollable && (
        <p className="-mb-2 text-center text-[11px] font-medium text-muted-foreground sm:hidden">
          ← Swipe to see all seats →
        </p>
      )}
      <div className="relative -mx-4 sm:mx-0">
        <div ref={scrollRef} className="seat-grid-scroll overflow-x-auto px-4 py-1 sm:px-0">
          <div className="mx-auto w-fit space-y-1.5 sm:space-y-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-1.5 sm:gap-2.5">
                <span
                  className={cn(
                    "mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[10px] font-bold sm:mr-1.5 sm:h-6 sm:w-6",
                    tierChip[row.tier],
                  )}
                >
                  {row.label}
                </span>
                {row.seats.map((seat) => {
                  if (seat.is_aisle_gap) {
                    return <div key={seat.id} className="w-3 shrink-0 sm:w-6" />;
                  }
                  const status = stateBySeat.get(seat.id) ?? "available";
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      aria-label={`Seat ${seat.row_label}${seat.seat_number} — ${status}`}
                      disabled={false}
                      onClick={() => handleClick(seat)}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-t-lg border text-[11px] font-semibold transition-colors sm:h-10 sm:w-10 sm:text-sm",
                        shakingId === seat.id && "animate-shake",
                        status === "available" &&
                          "border-seat-available/50 bg-seat-available/10 text-seat-available hover:bg-seat-available/30",
                        status === "selected" &&
                          "animate-seat-pop border-primary bg-primary text-primary-foreground shadow-marquee",
                        status === "booked" &&
                          "cursor-not-allowed border-seat-booked/40 bg-seat-booked/25 text-seat-booked/70",
                        status === "held" &&
                          "animate-pulse-hold cursor-not-allowed border-seat-locked/50 bg-seat-locked/25 text-seat-locked",
                      )}
                    >
                      {status === "selected" ? <Check className="h-3.5 w-3.5" /> : seat.seat_number}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {isScrollable && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent sm:hidden" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent sm:hidden" />
          </>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-card/50 px-4 py-4 text-xs font-medium text-foreground sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-3 sm:px-4 sm:py-3 sm:text-sm">
        <span className="flex items-center gap-2.5">
          <span className="h-5 w-5 shrink-0 rounded-t-lg border-2 border-seat-available/60 bg-seat-available/10 sm:h-6 sm:w-6" />
          Available
        </span>
        <span className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-t-lg border-2 border-primary bg-primary sm:h-6 sm:w-6">
            <Check className="h-3 w-3 text-primary-foreground sm:h-3.5 sm:w-3.5" />
          </span>
          Selected
        </span>
        <span className="flex items-center gap-2.5">
          <span className="h-5 w-5 shrink-0 rounded-t-lg border-2 border-seat-booked/50 bg-seat-booked/25 sm:h-6 sm:w-6" />
          Booked
        </span>
        <span className="flex items-center gap-2.5">
          <span className="h-5 w-5 shrink-0 rounded-t-lg border-2 border-seat-locked/60 bg-seat-locked/25 sm:h-6 sm:w-6" />
          On hold
        </span>
      </div>

      {/* Tier pricing */}
      <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
        {(["silver", "gold", "premium"] as SeatTier[]).map((tier) => (
          <span
            key={tier}
            className={cn(
              "flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
              tierChip[tier],
            )}
          >
            <Armchair className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">
              {tier === "premium" ? "Platinum" : tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
            <span className="opacity-70">·</span>
            <span className="whitespace-nowrap">{inr(seatPrice(basePrice, tier, tierOverrides))}</span>
          </span>
        ))}
      </div>
    </div>
  );
}