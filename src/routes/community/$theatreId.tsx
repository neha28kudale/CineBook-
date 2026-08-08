import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, MessageSquare, Send, Users, Vote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  addCommunityComment,
  addCommunityPost,
  getCommunity,
  getMyCommunityState,
  toggleJoinCommunity,
  votePoll,
} from "@/lib/community.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const communityQuery = (theatreId: string) =>
  queryOptions({
    queryKey: ["community", theatreId],
    queryFn: () => getCommunity({ data: { theatreId } }),
  });

export const Route = createFileRoute("/community/$theatreId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(communityQuery(params.theatreId)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.theatre?.name ?? "Theatre"} Community — CineBook` },
      {
        name: "description",
        content: `Vote on the next movie and chat with fans at ${
          loaderData?.theatre?.name ?? "your theatre"
        }.`,
      },
      {
        property: "og:title",
        content: `${loaderData?.theatre?.name ?? "Theatre"} Community — CineBook`,
      },
      {
        property: "og:description",
        content: "Movie polls and community chat for your nearby theatre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { theatreId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(communityQuery(theatreId));

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: u }) => setUserId(u.user?.id ?? null));
  }, []);

  const myState = useServerFn(getMyCommunityState);
  const { data: mine } = useQuery({
    queryKey: ["community-me", theatreId, userId],
    queryFn: () => myState({ data: { theatreId } }),
    enabled: !!userId,
  });

  const doVote = useServerFn(votePoll);
  const doJoin = useServerFn(toggleJoinCommunity);
  const doPost = useServerFn(addCommunityPost);
  const doComment = useServerFn(addCommunityComment);

  const [busy, setBusy] = useState(false);
  const [postText, setPostText] = useState("");
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  function requireAuth() {
    if (!userId) {
      toast.error("Sign in to join the conversation.");
      navigate({ to: "/auth", search: { redirect: `/community/${theatreId}` } });
      return false;
    }
    return true;
  }

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["community", theatreId] }),
      qc.invalidateQueries({ queryKey: ["community-me", theatreId] }),
    ]);
  }

  async function handleVote(optionId: string) {
    if (!requireAuth() || !data.poll) return;
    setBusy(true);
    try {
      await doVote({ data: { pollId: data.poll.id, optionId } });
      toast.success("Vote recorded — the theatre can see it.");
      await refresh();
    } catch {
      toast.error("Could not record your vote.");
    }
    setBusy(false);
  }

  async function handleJoin() {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      const res = await doJoin({ data: { theatreId } });
      toast.success(res.joined ? "You joined the community!" : "You left the community.");
      await refresh();
    } catch {
      toast.error("Something went wrong.");
    }
    setBusy(false);
  }

  async function handlePost() {
    if (!requireAuth() || !postText.trim()) return;
    setBusy(true);
    try {
      await doPost({ data: { theatreId, content: postText.trim() } });
      setPostText("");
      await refresh();
    } catch {
      toast.error("Could not post.");
    }
    setBusy(false);
  }

  async function handleComment(postId: string) {
    if (!requireAuth() || !commentText.trim()) return;
    setBusy(true);
    try {
      await doComment({ data: { postId, content: commentText.trim() } });
      setCommentText("");
      setCommentFor(null);
      await refresh();
    } catch {
      toast.error("Could not comment.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-3xl tracking-wide text-card-foreground">
          {data.theatre.name}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> {data.theatre.address}, {data.theatre.city}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> {data.memberCount} members
          </span>
          <Button onClick={handleJoin} disabled={busy} variant={mine?.joined ? "outline" : "default"}>
            {mine?.joined ? "Leave community" : "Join community"}
          </Button>
        </div>
      </header>

      {/* Poll */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-wide text-card-foreground">
          <Vote className="h-5 w-5 text-primary" /> Movie poll
        </h2>
        {data.poll ? (
          <>
            <p className="mt-1 text-sm text-card-foreground">{data.poll.title}</p>
            <p className="text-xs text-muted-foreground">
              {data.poll.description} · {data.poll.totalVotes} votes
              {data.poll.ends_at
                ? ` · closes ${new Date(data.poll.ends_at).toLocaleDateString()}`
                : ""}
            </p>

            <div className="mt-5 space-y-3">
              {data.results.map((r) => {
                const picked = mine?.myOptionId === r.optionId;
                return (
                  <button
                    key={r.optionId}
                    type="button"
                    onClick={() => handleVote(r.optionId)}
                    disabled={busy}
                    className={cn(
                      "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-3 text-left transition-colors",
                      picked
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/60",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${r.percent}%` }}
                      aria-hidden
                    />
                    {r.posterUrl ? (
                      <img
                        src={r.posterUrl}
                        alt={`${r.title} poster`}
                        loading="lazy"
                        className="relative h-16 w-11 shrink-0 rounded object-cover"
                      />
                    ) : null}
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-card-foreground">
                        {r.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {r.genre} · {r.language}
                      </span>
                    </span>
                    <span className="relative shrink-0 text-right">
                      <span className="block text-sm font-bold text-primary">{r.percent}%</span>
                      <span className="block text-xs text-muted-foreground">{r.votes} votes</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {mine?.myOptionId ? (
              <p className="mt-3 text-xs text-muted-foreground">
                You already voted — tap another movie to change your vote.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No poll is running at this theatre.</p>
        )}
      </section>

      {/* Community feed */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-wide text-card-foreground">
          <MessageSquare className="h-5 w-5 text-primary" /> Community wall
        </h2>

        <div className="mt-4 space-y-2">
          <Textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Share what you want to watch, find people for a show, or review a film…"
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handlePost} disabled={busy || !postText.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Post
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {data.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts yet — be the first to start the conversation.
            </p>
          ) : null}
          {data.posts.map((p) => (
            <article key={p.id} className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold text-primary">{p.author_name}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-card-foreground">{p.content}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(p.created_at).toLocaleString()}
              </p>

              {p.community_comments.length > 0 ? (
                <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
                  {p.community_comments.map((c) => (
                    <div key={c.id}>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {c.author_name}:{" "}
                      </span>
                      <span className="text-sm text-card-foreground">{c.content}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {commentFor === p.id ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a reply…"
                  />
                  <Button size="sm" onClick={() => handleComment(p.id)} disabled={busy}>
                    Reply
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-3 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => {
                    if (!requireAuth()) return;
                    setCommentFor(p.id);
                    setCommentText("");
                  }}
                >
                  Reply
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
