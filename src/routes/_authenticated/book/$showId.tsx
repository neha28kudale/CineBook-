import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Timer,
  Ticket,
  Popcorn,
  CreditCard,
  ArrowLeft,
  MapPin,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { getSeatMap, listFoodItems } from "@/lib/movies.functions";
import { confirmBookingFn, lockSeatsFn, releaseLocksFn } from "@/lib/booking.functions";
import { supabase } from "@/integrations/supabase/client";
import { SeatMap, type SeatInfo } from "@/components/seat-map";
import { FoodMenu } from "@/components/food-menu";
import { PaymentDialog, type PaymentMethod } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { seatPrice, inr, type SeatTier, TIER_LABELS } from "@/lib/pricing";
import { formatShowDate, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

const parentApi = getRouteApi("/_authenticated");

export const Route = createFileRoute("/_authenticated/book/$showId")({
  head: () => ({
    meta: [{ title: "Select seats — CineBook" }, { name: "robots", content: "noindex" }],
  }),
  component: BookingFlowPage,
});

type Step = "seats" | "food" | "pay";

const STEPS: { id: Step; label: string; icon: typeof Ticket }[] = [
  { id: "seats", label: "Seats", icon: Ticket },
  { id: "food", label: "Food & Drinks", icon: Popcorn },
  { id: "pay", label: "Payment", icon: CreditCard },
];

function BookingFlowPage() {
  const { showId } = Route.useParams();
  const { user } = parentApi.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("seats");
  const [selection, setSelection] = useState<string[]>([]);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [foodQty, setFoodQty] = useState<Record<string, number>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [locking, setLocking] = useState(false);
  const expiredRef = useRef(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["seat-map", showId],
    queryFn: () => getSeatMap({ data: { showId } }),
  });

  const { data: foodItems } = useQuery({
    queryKey: ["food-items"],
    queryFn: () => listFoodItems({ data: { includeUnavailable: false } }),
  });

  // Realtime seat updates — any lock/book on this show refreshes the map.
  useEffect(() => {
    const channel = supabase
      .channel(`show-seats-${showId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "show_seats", filter: `show_id=eq.${showId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["seat-map", showId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId, queryClient]);

  // Countdown ticker while seats are locked.
  useEffect(() => {
    if (!lockedUntil) return;
    expiredRef.current = false;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const remainingMs = lockedUntil ? lockedUntil.getTime() - now : 0;
  useEffect(() => {
    if (!lockedUntil || remainingMs > 0 || expiredRef.current) return;
    expiredRef.current = true;
    toast.error("Your seat hold expired. Please select your seats again.");
    setLockedUntil(null);
    setStep("seats");
    refetch();
  }, [lockedUntil, remainingMs, refetch]);

  const seatById = useMemo(() => {
    const map = new Map<string, SeatInfo>();
    for (const seat of data?.seats ?? []) map.set(seat.id, seat);
    return map;
  }, [data]);

  const selectedSeats = selection
    .map((id) => seatById.get(id))
    .filter((s): s is SeatInfo => !!s)
    .sort((a, b) => a.row_label.localeCompare(b.row_label) || a.seat_number - b.seat_number);

  const basePrice = data?.show.base_price ?? 0;
  const ticketTotal = selectedSeats.reduce(
    (sum, seat) => sum + seatPrice(basePrice, seat.seat_type, data?.show),
    0,
  );

  const foodLines = (foodItems ?? [])
    .filter((item) => (foodQty[item.id] ?? 0) > 0)
    .map((item) => ({ item, qty: foodQty[item.id] ?? 0 }));
  const foodTotal = foodLines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
  const grandTotal = ticketTotal + foodTotal;

  function toggleSeat(seatId: string) {
    setSelection((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : prev.length >= 10
          ? (toast.error("Maximum 10 seats per booking"), prev)
          : [...prev, seatId],
    );
  }

  async function handleLockSeats() {
    if (!selection.length) return;
    setLocking(true);
    try {
      const result = await lockSeatsFn({ data: { showId, seatIds: selection } });
      const until = result?.locked_until
        ? new Date(result.locked_until)
        : new Date(Date.now() + 10 * 60 * 1000);
      setLockedUntil(until);
      setStep("food");
      toast.success("Seats held for 10 minutes. Add snacks or continue to payment.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not lock those seats.");
      setSelection([]);
      refetch();
    } finally {
      setLocking(false);
    }
  }

  async function handleBackToSeats() {
    if (lockedUntil) {
      await releaseLocksFn({ data: { showId } }).catch(() => {});
      setLockedUntil(null);
    }
    setStep("seats");
    refetch();
  }

  async function handlePay(method: PaymentMethod, simulateFailure: boolean) {
    setProcessing(true);
    try {
      // Refresh the lock before charging, like a real gateway handshake.
      try {
        const result = await lockSeatsFn({ data: { showId, seatIds: selection } });
        if (result?.locked_until) setLockedUntil(new Date(result.locked_until));
      } catch {
        throw new Error("Your seat hold expired during payment. Please select seats again.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1800));

      if (simulateFailure) {
        await releaseLocksFn({ data: { showId } }).catch(() => {});
        setLockedUntil(null);
        setPayOpen(false);
        setStep("seats");
        toast.error("Payment failed (simulated). Your seat hold was released.");
        refetch();
        return;
      }

      const result = await confirmBookingFn({
        data: {
          showId,
          seatIds: selection,
          foodItems: foodLines.map((l) => ({ foodItemId: l.item.id, quantity: l.qty })),
          paymentMethod: method,
        },
      });
      toast.success("Booking confirmed! Enjoy the show.");
      navigate({ to: "/booking/$bookingId", params: { bookingId: result.bookingId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setLockedUntil(null);
      setStep("seats");
      refetch();
    } finally {
      setProcessing(false);
      setPayOpen(false);
    }
  }

  if (isLoading || !data) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </main>
    );
  }

  const { show } = data;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const mm = Math.max(0, Math.floor(remainingMs / 60000));
  const ss = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Show header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-wide text-foreground">{show.movie?.title}</h1>
        <p className="text-sm text-muted-foreground">
          {show.screen?.theatres?.name}, {show.screen?.theatres?.city} · {show.screen?.name} ·{" "}
          {formatShowDate(show.show_date)} · {formatTime(show.show_time)}
        </p>
        {show.screen?.theatres?.address && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            {show.screen.theatres.address}
          </p>
        )}
      </div>

      {/* Stepper */}
      <div className="mb-8 flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold sm:gap-2 sm:px-3 sm:text-xs",
                  i === stepIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : i < stepIndex
                      ? "border-seat-available/40 text-seat-available"
                      : "border-border text-muted-foreground",
                )}
              >
                <s.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-4 shrink-0 bg-border sm:w-6" />}
            </div>
          ))}
        </div>
        {lockedUntil && remainingMs > 0 && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold sm:ml-auto",
              remainingMs < 120000
                ? "animate-pulse-hold border-seat-booked/50 text-seat-booked"
                : "border-primary/40 text-primary",
            )}
          >
            <Timer className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              Hold expires in {mm}:{String(ss).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div>
          {step === "seats" && (
            <SeatMap
              seats={data.seats as SeatInfo[]}
              showSeats={data.showSeats}
              currentUserId={user.id}
              basePrice={basePrice}
              tierOverrides={data.show}
              selectedIds={selection}
              onToggle={toggleSeat}
            />
          )}

          {step === "food" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                <div>
                  <p className="font-semibold text-primary">
                    Pre-order now, skip the interval queue.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Your order is linked to your ticket — show the same QR code at the F&amp;B
                    counter and collect everything before the movie starts.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setStep("pay")}
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip &amp; pay now
                </Button>
              </div>
              <FoodMenu
                items={foodItems ?? []}
                quantities={foodQty}
                onChange={(id, qty) =>
                  setFoodQty((prev) => {
                    const next = { ...prev };
                    if (qty <= 0) delete next[id];
                    else next[id] = qty;
                    return next;
                  })
                }
              />
            </div>
          )}

          {step === "pay" && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-2xl tracking-wider text-card-foreground">
                Review &amp; pay
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your seats stay held while you pay. The timer keeps running — complete payment
                before it hits zero.
              </p>
              <div className="mt-6 space-y-2 text-sm">
                {selectedSeats.map((seat) => (
                  <div key={seat.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      Seat {seat.row_label}
                      {seat.seat_number} · {TIER_LABELS[seat.seat_type]}
                    </span>
                    <span>{inr(seatPrice(basePrice, seat.seat_type, data.show))}</span>
                  </div>
                ))}
                {foodLines.map((l) => (
                  <div key={l.item.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {l.item.name} × {l.qty}
                    </span>
                    <span>{inr(l.item.price * l.qty)}</span>
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                size="lg"
                onClick={() => setPayOpen(true)}
              >
                <CreditCard className="mr-2 h-4 w-4" /> Pay {inr(grandTotal)}
              </Button>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <h3 className="font-display text-xl tracking-wider text-card-foreground">
            Order summary
          </h3>
          <div className="mt-3 space-y-1.5 text-sm">
            {selectedSeats.length === 0 ? (
              <p className="text-muted-foreground">No seats selected yet.</p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}:{" "}
                  <span className="font-semibold text-card-foreground">
                    {selectedSeats.map((s) => `${s.row_label}${s.seat_number}`).join(", ")}
                  </span>
                </p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tickets</span>
                  <span>{inr(ticketTotal)}</span>
                </div>
              </>
            )}
            {foodLines.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Food &amp; drinks ({foodLines.reduce((s, l) => s + l.qty, 0)})
                </span>
                <span>{inr(foodTotal)}</span>
              </div>
            )}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{inr(grandTotal)}</span>
          </div>

          <div className="mt-4 space-y-2">
            {step === "seats" && (
              <Button
                className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                disabled={!selection.length || locking}
                onClick={handleLockSeats}
              >
                {locking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lock seats &amp; continue
              </Button>
            )}
            {step === "food" && (
              <>
                <Button
                  className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={() => setStep("pay")}
                >
                  Continue to payment
                </Button>
                <div className="relative py-1 text-center">
                  <span className="relative z-10 bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    or
                  </span>
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => setStep("pay")}
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <span className="flex items-center gap-2">
                    <SkipForward className="h-4 w-4" />
                    Skip food &amp; drinks
                  </span>
                  <span className="text-xs">Go straight to payment</span>
                </button>
                <Button variant="outline" className="w-full" onClick={handleBackToSeats}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Change seats
                </Button>
              </>
            )}
            {step === "pay" && (
              <Button variant="outline" className="w-full" onClick={() => setStep("food")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to food
              </Button>
            )}
          </div>
        </aside>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        amount={grandTotal}
        processing={processing}
        onPay={handlePay}
      />
    </main>
  );
}