import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clapperboard, MapPin, MonitorPlay } from "lucide-react";
import { listTheatres } from "@/lib/movies.functions";
import { TheatreVirtualTour } from "@/components/theatre-virtual-tour";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const theatresQuery = queryOptions({
  queryKey: ["theatres"],
  queryFn: () => listTheatres(),
});

export const Route = createFileRoute("/theatres/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(theatresQuery),
  head: () => ({
    meta: [
      { title: "Browse Theatres — CineBook" },
      {
        name: "description",
        content: "Explore cinemas near you — virtual tours, locations, screens, and showtimes.",
      },
    ],
  }),
  component: TheatresPage,
});

function TheatresPage() {
  const { data: theatres } = useSuspenseQuery(theatresQuery);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl tracking-wide text-foreground sm:text-5xl">
          OUR <span className="text-primary">THEATRES</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Take a virtual tour, check locations on the map, and find showtimes at a cinema near you.
        </p>
      </header>

      {theatres.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No theatres listed yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {theatres.map((theatre) => (
            <article
              key={theatre.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
              {theatre.image_url ? (
                <img
                  src={theatre.image_url}
                  alt={theatre.name}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-muted/30">
                  <Clapperboard className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <Badge variant="secondary" className="mb-2 w-fit gap-1">
                  <MapPin className="h-3 w-3" /> {theatre.city}
                </Badge>
                <h2 className="text-lg font-semibold text-card-foreground">{theatre.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{theatre.address}</p>

                {theatre.video_url && (
                  <div className="mt-4">
                    <TheatreVirtualTour
                      theatreName={theatre.name}
                      imageUrl={theatre.image_url}
                      videoUrl={theatre.video_url}
                      compact
                    />
                  </div>
                )}

                <Button asChild className="mt-4 w-full" variant="outline">
                  <Link to="/theatres/$theatreId" params={{ theatreId: theatre.id }}>
                    <MonitorPlay className="mr-2 h-4 w-4" /> View details &amp; map
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
