import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import QRCode from "react-qr-code";
import { Printer, Popcorn, MapPin, Loader2, Ban } from "lucide-react";
import { toast } from "sonner";
import { cancelBookingFn, getBooking } from "@/lib/booking.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { inr, TIER_LABELS, type SeatTier } from "@/lib/pricing";
import { formatShowDate, formatTime, showDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/booking/$bookingId")({
  head: () => ({
    meta: [
      { title: "Your Ticket — CineBook" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-4xl tracking-wider">Booking not found</h1>
      <p className="mt-2 text-muted-foreground">
        This booking doesn't exist or doesn't belong to your account.
      </p>
      <Link
        to="/bookings"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        My bookings
      </Link>
    </main>
  ),
});

type Booking = NonNullable<Awaited<ReturnType<typeof getBooking>>>;

type TicketShow = {
  show_date: string;
  show_time: string;
  base_price: number;
  movies: { title: string; poster_url: string; rating: number } | null;
  screens: { name: string; theatres: { name: string; city: string; address: string | null } | null } | null;
} | null;

const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  upi: "UPI",
  netbanking: "Net Banking",
  wallet: "Wallet",
};

function TicketPage() {
  const { bookingId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const result = await getBooking({ data: { id: bookingId } });
      if (!result) throw new Error("Booking not found");
      return result as Booking;
    },
  });

  if (isLoading || !booking) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-[480px] rounded-2xl" />
      </main>
    );
  }

  const show = booking.shows as unknown as TicketShow;
  const seats = (booking.booking_seats ?? []) as unknown as {
    price: number;
    seats: { row_label: string; seat_number: number; seat_type: SeatTier } | null;
  }[];
  const foods = (booking.food_orders ?? []) as unknown as {
    quantity: number;
    price_at_order: number;
    food_items: { name: string; category: string } | null;
  }[];
  const payment = (booking.payments as unknown as {
    status: string;
    method: string;
    amount: number;
    transaction_ref: string;
  }[])?.[0];

  const start = show ? showDateTime(show.show_date, show.show_time) : null;
  const cancellable =
    booking.status === "confirmed" && !!start && start.getTime() - Date.now() > 6 * 3600_000;

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelBookingFn({ data: { id: bookingId } });
      toast.success("Booking cancelled. Refund initiated (simulated).");
      await queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setCancelling(false);
    }
  }

  const shortId = booking.id.slice(0, 8).toUpperCase();
  const cancelled = booking.status === "cancelled";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="font-display text-4xl tracking-wider text-foreground">Your Ticket</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
          {cancellable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-seat-booked/40 text-seat-booked hover:bg-seat-booked/10"
                >
                  <Ban className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your seats will be released and a full refund will be simulated. This can't
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep booking</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancelling && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Yes, cancel booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {cancelled && (
        <div className="mb-4 rounded-xl border border-seat-booked/40 bg-seat-booked/10 p-3 text-center text-sm font-semibold text-seat-booked print:hidden">
          This booking was cancelled — the seats have been released and payment refunded.
        </div>
      )}

      {/* Ticket */}
      <div className="print-area overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header band */}
        <div className="flex items-center justify-between bg-primary px-6 py-4">
          <span className="font-display text-2xl tracking-[0.25em] text-primary-foreground">
            CINEBOOK
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">
            {shortId}
          </span>
        </div>

        <div className={cn("relative p-6", cancelled && "opacity-50 grayscale")}>
          <div className="flex gap-6">
            {/* Left: details */}
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Movie</p>
                <h2 className="font-display text-3xl tracking-wide text-card-foreground">
                  {show?.movies?.title}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Date</p>
                  <p className="font-semibold text-card-foreground">
                    {show && formatShowDate(show.show_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Time</p>
                  <p className="font-semibold text-card-foreground">
                    {show && formatTime(show.show_time)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Theatre
                  </p>
                  <p className="flex items-center gap-1 font-semibold text-card-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {show?.screens?.theatres?.name}, {show?.screens?.theatres?.city} ·{" "}
                    {show?.screens?.name}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Seats ({seats.length})
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {seats.map((s, i) =>
                    s.seats ? (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-primary/40 text-card-foreground"
                      >
                        {s.seats.row_label}
                        {s.seats.seat_number} · {TIER_LABELS[s.seats.seat_type]}
                      </Badge>
                    ) : null,
                  )}
                </div>
              </div>

              {foods.length > 0 && (
                <div>
                  <p className="flex items-center gap-1 text-xs uppercase tracking-widest text-primary">
                    <Popcorn className="h-3.5 w-3.5" /> F&amp;B pickup — same QR at the counter
                  </p>
                  <div className="mt-1 space-y-0.5 text-sm">
                    {foods.map((f, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {f.food_items?.name} × {f.quantity}
                        </span>
                        <span className="text-card-foreground">{inr(f.price_at_order * f.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: QR */}
            <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-2">
              <div className="rounded-lg bg-white p-2.5">
                <QRCode value={booking.id} size={104} />
              </div>
              <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                Scan for entry + food pickup
              </p>
            </div>
          </div>

          {/* Perforation */}
          <div className="my-5 border-t-2 border-dashed border-border" />

          <div className="flex items-end justify-between text-sm">
            <div className="space-y-1 text-muted-foreground">
              <p>
                Payment: {payment ? METHOD_LABELS[payment.method] ?? payment.method : "—"} ·{" "}
                <span className="capitalize">{payment?.status ?? "pending"}</span>
              </p>
              {payment && (
                <p className="font-mono text-[11px]">TXN {payment.transaction_ref}</p>
              )}
              <Badge
                className={cn(
                  cancelled
                    ? "bg-seat-booked/15 text-seat-booked"
                    : "bg-seat-available/15 text-seat-available",
                )}
              >
                {booking.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Total paid
              </p>
              <p className="font-display text-3xl text-primary">{inr(booking.total_amount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3 print:hidden">
        <Button variant="outline" onClick={() => navigate({ to: "/bookings" })}>
          All my bookings
        </Button>
        <Button
          onClick={() => navigate({ to: "/" })}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Book another movie
        </Button>
      </div>
    </main>
  );
}
