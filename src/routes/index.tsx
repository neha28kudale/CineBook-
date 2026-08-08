import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Popcorn,
  QrCode,
  Armchair,
  Play,
  Ticket,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { listMovies } from "@/lib/movies.functions";
import { MovieCard } from "@/components/movie-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CineBook — Book Movie Tickets, Seats & Snacks Online" },
      {
        name: "description",
        content:
          "Browse now-showing movies, pick seats on a live seat map, pre-order food & beverages, pay online and walk in with a digital ticket.",
      },
      { property: "og:title", content: "CineBook — Book Movie Tickets, Seats & Snacks Online" },
      {
        property: "og:description",
        content: "Live seat maps, F&B pre-orders, and digital tickets — skip every queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const PERKS = [
  { icon: Armchair, title: "Live seat lock", text: "Seats held for 10 min while you book." },
  { icon: Popcorn, title: "Food & drinks", text: "Pre-order and pick up — no queues." },
  { icon: ShieldCheck, title: "Secure payment", text: "Simple, safe, contactless checkout." },
  { icon: QrCode, title: "QR ticket", text: "Show one code and walk right in." },
];

const OFFERS = [
  { code: "CINE150", title: "Flat ₹150 OFF", text: "On a minimum of 2 tickets" },
  { code: null, title: "Food combos from ₹99", text: "Popcorn + drink pairings" },
  { code: null, title: "Up to 50% OFF", text: "On select theatres midweek" },
];

function HomePage() {
  const [status, setStatus] = useState<"now_showing" | "upcoming">("now_showing");
  const [search, setSearch] = useState("");

  const { data: movies, isLoading } = useQuery({
    queryKey: ["movies", status, search],
    queryFn: () => listMovies({ data: { status, search: search || undefined } }),
  });

  const featured = movies?.[0];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Hero banner */}
          <section className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={featured?.poster_url ?? "/images/hero-lobby.jpg"}
              alt={featured ? `${featured.title} backdrop` : "Cinema lobby"}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="relative flex min-h-[300px] flex-col justify-center gap-4 p-8 sm:min-h-[360px] sm:max-w-lg">
              <span className="w-fit rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                In cinemas now
              </span>
              <h1 className="font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">
                {featured?.title ?? "Skip the queue."}
              </h1>
              <p className="text-sm text-muted-foreground">
                {featured
                  ? `${featured.genre} · ${Math.floor(featured.duration_min / 60)}h ${
                      featured.duration_min % 60
                    }m · ${featured.language}`
                  : "Pick seats, pre-order snacks, pay online."}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Link
                    to="/movies/$movieId"
                    params={{ movieId: featured?.id ?? "" }}
                  >
                    <Ticket className="mr-2 h-4 w-4" /> Book tickets
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="text-muted-foreground">
                  <Link to="/movies/$movieId" params={{ movieId: featured?.id ?? "" }}>
                    <Play className="mr-2 h-4 w-4" /> Watch trailer
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Search bar */}
          <section className="rounded-xl border border-border bg-card p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for movies…"
                className="h-11 border-border bg-background pl-10"
              />
            </div>
          </section>

          {/* Movies */}
          <section>
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl tracking-wider text-foreground">
                  {status === "now_showing" ? "Now Showing" : "Coming Soon"}
                </h2>
                <TabsList>
                  <TabsTrigger value="now_showing">Now Showing</TabsTrigger>
                  <TabsTrigger value="upcoming">Coming Soon</TabsTrigger>
                </TabsList>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
                  ))}
                </div>
              ) : movies?.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <p className="py-16 text-center text-muted-foreground">
                  No movies found{search ? ` for “${search}”` : ""}.
                </p>
              )}
            </Tabs>
          </section>

          {/* Perks strip */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((perk) => (
              <div key={perk.title} className="rounded-xl border border-border bg-card p-4">
                <perk.icon className="mb-2 h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">{perk.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{perk.text}</p>
              </div>
            ))}
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-wider text-card-foreground">
              Ready for your next movie?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick seats, add snacks, get your QR ticket.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/bookings">
                  <Ticket className="mr-2 h-4 w-4" /> My bookings
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/">Browse movies</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-wider text-card-foreground">
              Offers for you
            </h2>
            <div className="mt-3 space-y-3">
              {OFFERS.map((offer) => (
                <div
                  key={offer.title}
                  className="flex gap-3 rounded-lg border border-border bg-background/40 p-3"
                >
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">{offer.title}</p>
                    <p className="text-xs text-muted-foreground">{offer.text}</p>
                    {offer.code && (
                      <p className="mt-1 inline-block rounded border border-dashed border-primary/40 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-primary">
                        {offer.code}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
