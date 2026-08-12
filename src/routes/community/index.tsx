import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, MessageSquare, Users, Vote, MonitorPlay } from "lucide-react";
import { listCommunities } from "@/lib/community.functions";
import { Button } from "@/components/ui/button";

const communitiesQuery = queryOptions({
  queryKey: ["communities"],
  queryFn: () => listCommunities({ data: {} }),
});

export const Route = createFileRoute("/community/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(communitiesQuery),
  head: () => ({
    meta: [
      { title: "Theatre Communities & Movie Polls — CineBook" },
      {
        name: "description",
        content:
          "Join your nearby theatre's community, vote in movie polls to decide what plays next, and chat with fellow movie fans.",
      },
      { property: "og:title", content: "Theatre Communities & Movie Polls — CineBook" },
      {
        property: "og:description",
        content: "Vote for the next movie at your local theatre and join the community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityIndex,
});

function CommunityIndex() {
  const { data } = useSuspenseQuery(communitiesQuery);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl tracking-wide text-foreground">
          THEATRE <span className="text-primary">COMMUNITIES</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Vote for the movie you want on screen next week, and hang out with other film fans at the
          theatre near you. Theatres use these polls to plan their shows.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((c) => (
          <article
            key={c.id}
            className="flex flex-col rounded-xl border border-border bg-card p-5"
          >
            <h2 className="text-lg font-semibold text-card-foreground">{c.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {c.address}, {c.city}
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {c.members} members
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> {c.posts} posts
              </span>
            </div>

            <div className="mt-4 flex-1 rounded-lg border border-border/70 bg-muted/40 p-3">
              {c.poll ? (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Vote className="h-3.5 w-3.5" /> Poll open
                  </p>
                  <p className="mt-1 text-sm text-card-foreground">{c.poll.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.poll.totalVotes} votes
                    {c.poll.leader ? ` · leading: ${c.poll.leader}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No poll running right now.</p>
              )}
            </div>

            <Button asChild className="mt-4 w-full">
              <Link to="/community/$theatreId" params={{ theatreId: c.id }}>
                Open community
              </Link>
            </Button>
            <Button asChild className="mt-2 w-full" variant="outline">
              <Link to="/theatres/$theatreId" params={{ theatreId: c.id }}>
                <MonitorPlay className="mr-2 h-4 w-4" /> Virtual tour &amp; map
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </main>
  );
}
