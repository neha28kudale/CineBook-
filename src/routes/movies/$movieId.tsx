import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  Star,
  Clock,
  CalendarDays,
  PlayCircle,
  Users,
  Film,
  MapPin,
  Clapperboard,
} from "lucide-react";
import { getMovie, listShowtimes, getMovieCast } from "@/lib/movies.functions";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { normalizeYoutubeEmbedUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { nextDays, formatTime, showDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

const movieQuery = (movieId: string) =>
  queryOptions({
    queryKey: ["movie", movieId],
    queryFn: () => getMovie({ data: { id: movieId } }),
  });

export const Route = createFileRoute("/movies/$movieId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(movieQuery(params.movieId)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Movie"} — CineBook` },
      {
        name: "description",
        content: loaderData?.description?.slice(0, 150) ?? "Book tickets on CineBook.",
      },
      { property: "og:title", content: `${loaderData?.title ?? "Movie"} — CineBook` },
      {
        property: "og:description",
        content: loaderData?.description?.slice(0, 150) ?? "Book tickets on CineBook.",
      },
      { property: "og:type", content: "video.movie" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MovieDetailPage,
});

function MovieDetailPage() {
  const { movieId } = Route.useParams();
  const { data: movie } = useSuspenseQuery(movieQuery(movieId));
  const trailerUrl = normalizeYoutubeEmbedUrl(movie.trailer_url ?? "");
  const [date, setDate] = useState(nextDays(1)[0]!.value);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const navigate = useNavigate();
  const days = nextDays(5);

  const { data: showtimes, isLoading: showsLoading } = useQuery({
    queryKey: ["showtimes", movieId, date],
    queryFn: () => listShowtimes({ data: { movieId, date } }),
    enabled: movie.status === "now_showing",
  });

  const { data: cast } = useQuery({
    queryKey: ["movie-cast", movieId],
    queryFn: () => getMovieCast({ data: { id: movieId } }),
  });
  const director = cast?.find((c) => c.role === "Director");
  const actors = (cast ?? []).filter((c) => c.role !== "Director").slice(0, 8);

  const hours = Math.floor(movie.duration_min / 60);
  const mins = movie.duration_min % 60;

  async function handleShowtime(showId: string) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      navigate({ to: "/book/$showId", params: { showId } });
    } else {
      navigate({ to: "/auth", search: { redirect: `/book/${showId}` } });
    }
  }

  const now = Date.now();
  const visibleShows = (showtimes ?? []).filter(
    (s) => showDateTime(s.show_date, s.show_time).getTime() > now - 30 * 60 * 1000,
  );
  const byTheatre = new Map<string, { address: string; shows: typeof visibleShows }>();
  for (const show of visibleShows) {
    const key = `${show.theatre_name} · ${show.city}`;
    const existing = byTheatre.get(key);
    if (existing) {
      existing.shows.push(show);
    } else {
      byTheatre.set(key, { address: show.theatre_address ?? "", shows: [show] });
    }
  }

  return (
    <main>
      {/* Backdrop */}
      <div className="relative overflow-hidden">
        <img
          src={movie.poster_url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row">
          <img
            src={movie.poster_url}
            alt={`${movie.title} poster`}
            className="w-48 shrink-0 rounded-xl border border-border shadow-card-lift sm:w-64"
          />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-5xl tracking-wide text-foreground sm:text-6xl">
                {movie.title}
              </h1>
              <span className="flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-sm font-bold text-primary">
                <Star className="h-4 w-4 fill-primary" /> {movie.rating.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{movie.genre}</Badge>
              <Badge variant="secondary">{movie.language}</Badge>
              {movie.certificate && (
                <Badge variant="secondary" className="gap-1">
                  <Film className="h-3 w-3" /> {movie.certificate}
                </Badge>
              )}
              {movie.formats && <Badge variant="secondary">{movie.formats}</Badge>}
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> {hours}h {mins}m
              </Badge>
              {movie.release_date && (
                <Badge variant="secondary" className="gap-1">
                  <CalendarDays className="h-3 w-3" /> {movie.release_date}
                </Badge>
              )}
            </div>
            {director && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clapperboard className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="text-foreground">Director:</span> {director.name}
                </span>
              </p>
            )}
            {movie.cast_members && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Users className="mt-0.5 h-4 w-4 shrink-0" />
                {movie.cast_members}
              </p>
            )}
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {movie.description}
            </p>
            {trailerUrl && (
              <Button
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setTrailerOpen(true)}
              >
                <PlayCircle className="mr-2 h-4 w-4" /> Watch trailer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cast & crew */}
      {actors.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-display mb-4 text-2xl tracking-wider text-foreground">Cast</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {actors.map((c) => (
              <div key={c.id} className="w-28 shrink-0 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-2 truncate text-xs font-semibold text-card-foreground">{c.name}</p>
                {c.character_name && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    as {c.character_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Showtimes */}
      {movie.status === "now_showing" && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="font-display mb-4 text-3xl tracking-wider text-foreground">
            Book tickets
          </h2>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d.value}
                onClick={() => setDate(d.value)}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-lg border px-4 py-2 text-sm transition-colors",
                  date === d.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <span className="text-[10px] uppercase tracking-wider">{d.weekday}</span>
                <span className="font-semibold">{d.label}</span>
              </button>
            ))}
          </div>

          {showsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : byTheatre.size === 0 ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No shows scheduled for this date. Try another day.
            </p>
          ) : (
            <div className="space-y-4">
              {[...byTheatre.entries()].map(([theatre, group]) => (
                <div key={theatre} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-card-foreground">{theatre}</p>
                  {group.address && (
                    <p className="mb-3 mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 text-primary" />
                      {group.address}
                    </p>
                  )}
                  <div className={cn("flex flex-wrap gap-3", !group.address && "mt-3")}>
                    {group.shows.map((show) => {
                      const fillingFast = show.available_seats <= 15;
                      const soldOut = show.available_seats === 0;
                      return (
                        <button
                          key={show.id}
                          disabled={soldOut}
                          onClick={() => handleShowtime(show.id)}
                          className={cn(
                            "flex flex-col items-center rounded-lg border px-4 py-2 transition-colors",
                            soldOut
                              ? "cursor-not-allowed border-border text-muted-foreground/50"
                              : "border-seat-available/40 text-seat-available hover:bg-seat-available/10",
                          )}
                        >
                          <span className="text-sm font-bold">{formatTime(show.show_time)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {show.screen_name} ·{" "}
                            {soldOut
                              ? "Sold out"
                              : fillingFast
                                ? "Filling fast"
                                : `${show.available_seats} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trailer dialog */}
      <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wider">
              {movie.title} — Trailer
            </DialogTitle>
          </DialogHeader>
          {trailerOpen && (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={trailerUrl}
                title={`${movie.title} trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
