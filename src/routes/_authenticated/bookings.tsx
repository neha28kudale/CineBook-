import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Popcorn } from "lucide-react";
import { getMyBookings } from "@/lib/booking.functions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/pricing";
import { formatShowDate, formatTime, showDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — CineBook" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingsPage,
});

type BookingRow = Awaited<ReturnType<typeof getMyBookings>>[number];

type BookingShow = {
  show_date: string;
  show_time: string;
  movies: { title: string; poster_url: string; rating: number } | null;
  screens: { name: string; theatres: { name: string; city: string } | null } | null;
} | null;

function bookingShow(b: BookingRow): BookingShow {
  return b.shows as unknown as BookingShow;
}

function seatLabels(b: BookingRow): string {
  const seats = (b.booking_seats ?? []) as unknown as {
    seats: { row_label: string; seat_number: number } | null;
  }[];
  return seats
    .map((s) => (s.seats ? `${s.seats.row_label}${s.seats.seat_number}` : ""))
    .filter(Boolean)
    .join(", ");
}

function BookingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => getMyBookings(),
  });

  const now = Date.now();
  const filtered = (bookings ?? []).filter((b) => {
    const show = bookingShow(b);
    const start = show ? showDateTime(show.show_date, show.show_time).getTime() : 0;
    if (tab === "cancelled") return b.status === "cancelled";
    if (b.status !== "confirmed") return false;
    return tab === "upcoming" ? start >= now : start < now;
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-4xl tracking-wider text-foreground">My Bookings</h1>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {tab === "upcoming"
              ? "No upcoming bookings. Grab seats for a movie night!"
              : tab === "past"
                ? "No past bookings yet."
                : "No cancelled bookings."}
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse movies
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const show = bookingShow(b);
            const foodCount = ((b.food_orders ?? []) as unknown as { quantity: number }[]).reduce(
              (s, f) => s + f.quantity,
              0,
            );
            return (
              <Link
                key={b.id}
                to="/booking/$bookingId"
                params={{ bookingId: b.id }}
                className={cn(
                  "flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40",
                  b.status === "cancelled" && "opacity-60",
                )}
              >
                {show?.movies?.poster_url && (
                  <img
                    src={show.movies.poster_url}
                    alt=""
                    className="h-28 w-20 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-card-foreground">
                      {show?.movies?.title ?? "Movie"}
                    </h3>
                    <Badge
                      className={cn(
                        b.status === "confirmed"
                          ? "bg-seat-available/15 text-seat-available"
                          : "bg-seat-booked/15 text-seat-booked",
                      )}
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {show?.screens?.theatres?.name}, {show?.screens?.theatres?.city} ·{" "}
                    {show?.screens?.name}
                  </p>
                  {show && (
                    <p className="text-sm text-muted-foreground">
                      {formatShowDate(show.show_date)} · {formatTime(show.show_time)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Seats: {seatLabels(b)}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {foodCount > 0 && (
                        <>
                          <Popcorn className="h-3 w-3 text-primary" /> {foodCount} food item
                          {foodCount > 1 ? "s" : ""} pre-ordered
                        </>
                      )}
                    </span>
                    <span className="font-bold text-primary">{inr(b.total_amount)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
