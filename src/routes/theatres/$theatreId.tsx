import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clapperboard, MapPin, MonitorPlay, Users } from "lucide-react";
import { getTheatre } from "@/lib/movies.functions";
import { TheatreMap } from "@/components/theatre-map";
import { TheatreVirtualTour } from "@/components/theatre-virtual-tour";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const theatreQuery = (theatreId: string) =>
  queryOptions({
    queryKey: ["theatre", theatreId],
    queryFn: () => getTheatre({ data: { id: theatreId } }),
  });

export const Route = createFileRoute("/theatres/$theatreId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(theatreQuery(params.theatreId)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Theatre"} — CineBook` },
      {
        name: "description",
        content: `Visit ${loaderData?.name ?? "theatre"} — view location, screens, and amenities.`,
      },
    ],
  }),
  component: TheatreDetailPage,
});

function TheatreDetailPage() {
  const { theatreId } = Route.useParams();
  const { data: theatre } = useSuspenseQuery(theatreQuery(theatreId));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">
      <section className="relative overflow-hidden rounded-2xl border border-border">
        {theatre.image_url ? (
          <img
            src={theatre.image_url}
            alt={theatre.name}
            className="aspect-[21/9] w-full object-cover sm:aspect-[3/1]"
          />
        ) : (
          <div className="flex aspect-[21/9] items-center justify-center bg-card sm:aspect-[3/1]">
            <Clapperboard className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-5 sm:p-8">
          <Badge variant="secondary" className="mb-2 gap-1">
            <MapPin className="h-3 w-3" /> {theatre.city}
          </Badge>
          <h1 className="font-display text-4xl tracking-wider text-foreground sm:text-5xl">
            {theatre.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{theatre.address}</p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {theatre.video_url && (
            <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 className="font-display mb-3 text-xl tracking-wider text-card-foreground">
                Virtual tour
              </h2>
              <TheatreVirtualTour
                theatreName={theatre.name}
                imageUrl={theatre.image_url}
                videoUrl={theatre.video_url}
              />
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="font-display mb-4 text-xl tracking-wider text-card-foreground">
              Location &amp; directions
            </h2>
            <TheatreMap
              name={theatre.name}
              address={theatre.address}
              city={theatre.city}
              latitude={theatre.latitude}
              longitude={theatre.longitude}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-wider text-card-foreground">Screens</h2>
            <ul className="mt-3 space-y-2">
              {(theatre.screens ?? []).map((screen) => (
                <li
                  key={screen.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <MonitorPlay className="h-4 w-4 text-primary" />
                    {screen.name}
                  </span>
                  <span className="text-muted-foreground">{screen.total_seats} seats</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-xl tracking-wider text-card-foreground">Community</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join fellow moviegoers, vote on upcoming films, and share reviews.
            </p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link to="/community/$theatreId" params={{ theatreId }}>
                <Users className="mr-2 h-4 w-4" /> View community
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
