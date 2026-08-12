import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  X,
  Building2,
} from "lucide-react";
import { listMovies, searchCatalog, listTheatres } from "@/lib/movies.functions";
import { MovieCard } from "@/components/movie-card";
import { TheatreVirtualTour } from "@/components/theatre-virtual-tour";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const navigate = useNavigate();
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: movies, isLoading, isError, error } = useQuery({
    queryKey: ["movies", status],
    queryFn: () => listMovies({ data: { status } }),
  });

  const { data: searchResults, isFetching: searchLoading, isError: searchError } = useQuery({
    queryKey: ["search", debouncedSearch],
    queryFn: () => searchCatalog({ data: { query: debouncedSearch } }),
    enabled: debouncedSearch.trim().length >= 2,
  });

  const { data: nowShowing } = useQuery({
    queryKey: ["movies", "now_showing"],
    queryFn: () => listMovies({ data: { status: "now_showing" } }),
  });

  const { data: allUpcoming } = useQuery({
    queryKey: ["movies", "upcoming"],
    queryFn: () => listMovies({ data: { status: "upcoming" } }),
  });

  const { data: theatres } = useQuery({
    queryKey: ["theatres"],
    queryFn: () => listTheatres(),
  });

  const slides = (nowShowing ?? []).slice(0, 5);
  const featured = slides[heroIndex] ?? slides[0];

  // Auto-rotate the hero every 5s; pause implicitly stops on unmount.
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Close the search dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  type SearchMovie = {
    id: string;
    title: string;
    genre: string;
    language: string;
    poster_url: string;
    rating: number;
    status: string;
  };

  const localSearchResults = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (q.length < 2) return [] as SearchMovie[];

    const pool = [...(nowShowing ?? []), ...(allUpcoming ?? []), ...(movies ?? [])];
    const seen = new Set<string>();
    return pool
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        const haystack = `${m.title} ${m.genre} ${m.language} ${m.cast_members ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        title: m.title,
        genre: m.genre,
        language: m.language,
        poster_url: m.poster_url,
        rating: m.rating,
        status: m.status,
      }));
  }, [debouncedSearch, nowShowing, allUpcoming, movies]);

  const movieResults = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [] as SearchMovie[];
    const server = searchResults?.movies ?? [];
    const merged = [...server];
    const seen = new Set(server.map((m) => m.id));
    for (const m of localSearchResults) {
      if (!seen.has(m.id)) merged.push(m);
    }
    return merged.slice(0, 8);
  }, [debouncedSearch, searchResults, localSearchResults]);

  const theatreResults =
    debouncedSearch.trim().length >= 2 ? (searchResults?.theatres ?? []) : [];
  const hasSearchResults = movieResults.length > 0 || theatreResults.length > 0;
  const searchPending = searchLoading && debouncedSearch.trim().length >= 2;

  function goToMovie(id: string) {
    setSearchOpen(false);
    setSearch("");
    navigate({ to: "/movies/$movieId", params: { movieId: id } });
  }

  function goToTheatre(id: string) {
    setSearchOpen(false);
    setSearch("");
    navigate({ to: "/theatres/$theatreId", params: { theatreId: id } });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Hero banner — rotating posters of now-showing movies */}
          <section className="relative overflow-hidden rounded-2xl border border-border">
            {slides.length > 0 ? (
              slides.map((m, i) => (
                <img
                  key={m.id}
                  src={m.poster_url}
                  alt={`${m.title} backdrop`}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-1000 ease-in-out",
                    i === heroIndex ? "opacity-100" : "opacity-0",
                  )}
                />
              ))
            ) : (
              <img
                src="/images/hero-lobby.jpg"
                alt="Cinema lobby"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div
              key={featured?.id ?? "empty"}
              className="animate-in fade-in slide-in-from-bottom-2 relative flex min-h-[240px] flex-col justify-center gap-3 p-5 duration-500 sm:min-h-[380px] sm:gap-4 sm:p-8"
            >
              <span className="w-fit rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                In cinemas now
              </span>
              <h1 className="font-display text-4xl leading-[0.95] text-foreground sm:text-6xl">
                {featured?.title ?? "Skip the queue."}
              </h1>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {featured ? (
                  <>
                    <span className="flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary">
                      <Star className="h-3 w-3 fill-primary" /> {featured.rating.toFixed(1)}
                    </span>
                    {featured.genre} ·{" "}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(featured.duration_min / 60)}h {featured.duration_min % 60}m
                    </span>{" "}
                    · {featured.language}
                  </>
                ) : (
                  "Pick seats, pre-order snacks, pay online."
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {featured?.id ? (
                  <>
                    <Button
                      asChild
                      className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Link to="/movies/$movieId" params={{ movieId: featured.id }}>
                        <Ticket className="mr-2 h-4 w-4" /> Book tickets
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="text-muted-foreground">
                      <Link to="/movies/$movieId" params={{ movieId: featured.id }}>
                        <Play className="mr-2 h-4 w-4" /> Watch trailer
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setStatus("now_showing")}
                  >
                    {isLoading ? "Loading movies…" : "Browse movies below"}
                  </Button>
                )}
              </div>
            </div>

            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous movie"
                  onClick={() => setHeroIndex((i) => (i - 1 + slides.length) % slides.length)}
                  className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur-sm transition-colors hover:bg-background sm:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next movie"
                  onClick={() => setHeroIndex((i) => (i + 1) % slides.length)}
                  className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur-sm transition-colors hover:bg-background sm:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {slides.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-label={`Show ${m.title}`}
                      onClick={() => setHeroIndex(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === heroIndex ? "w-6 bg-primary" : "w-1.5 bg-foreground/30",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Search bar */}
          <section ref={searchBoxRef} className="relative">
            <div className="relative rounded-xl border border-border bg-card p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => search.trim() && setSearchOpen(true)}
                  placeholder="Search movies, genres, theatres…"
                  className="h-11 border-border bg-background pl-10 pr-9"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearch("");
                      setSearchOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown results */}
            {searchOpen && debouncedSearch.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-card-lift">
                {searchPending && !hasSearchResults ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                  </div>
                ) : hasSearchResults ? (
                  <ul className="divide-y divide-border">
                    {theatreResults.map((t) => (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => goToTheatre(t.id)}
                          className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-primary/5"
                        >
                          <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-card-foreground">
                              {t.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              Theatre · {t.city}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                    {movieResults.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => goToMovie(m.id)}
                          className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-primary/5"
                        >
                          <img
                            src={m.poster_url}
                            alt=""
                            className="h-14 w-10 shrink-0 rounded-md object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-card-foreground">
                              {m.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {m.genre} · {m.language}
                              {m.status === "upcoming" ? " · Coming soon" : ""}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
                            <Star className="h-3 w-3 fill-primary" /> {m.rating.toFixed(1)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No results for "{debouncedSearch}".
                    {searchError ? " Server search unavailable — try refreshing." : ""}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Movies */}
          <section>
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-2xl tracking-wider text-foreground">
                  {status === "now_showing" ? "Now Showing" : "Coming Soon"}
                </h2>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="now_showing" className="flex-1 sm:flex-none">
                    Now Showing
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="flex-1 sm:flex-none">
                    Coming Soon
                  </TabsTrigger>
                </TabsList>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
                  ))}
                </div>
              ) : isError ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
                  <p className="text-sm font-medium text-foreground">Could not load movies</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {error instanceof Error ? error.message : "Check your Supabase .env setup and restart the dev server."}
                  </p>
                </div>
              ) : movies?.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {movies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              ) : (
                <p className="py-16 text-center text-muted-foreground">No movies in this section.</p>
              )}
            </Tabs>
          </section>

          {(theatres?.length ?? 0) > 0 && (
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl tracking-wider text-foreground">
                    Explore <span className="text-primary">Theatres</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Take a virtual tour before you book — see the lobby, screens, and location.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/theatres">View all theatres</Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {theatres!.slice(0, 3).map((theatre) => (
                  <article
                    key={theatre.id}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    {theatre.image_url ? (
                      <img
                        src={theatre.image_url}
                        alt={theatre.name}
                        className="aspect-[16/10] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-muted/30">
                        <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-semibold text-card-foreground">{theatre.name}</p>
                      <p className="text-xs text-muted-foreground">{theatre.city}</p>
                      {theatre.video_url && (
                        <div className="mt-3">
                          <TheatreVirtualTour
                            theatreName={theatre.name}
                            imageUrl={theatre.image_url}
                            videoUrl={theatre.video_url}
                            compact
                          />
                        </div>
                      )}
                      <Button asChild variant="ghost" size="sm" className="mt-3 h-8 w-full text-xs">
                        <Link to="/theatres/$theatreId" params={{ theatreId: theatre.id }}>
                          Details &amp; map
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

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
