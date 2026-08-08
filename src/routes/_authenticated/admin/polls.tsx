import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Vote } from "lucide-react";
import { toast } from "sonner";
import { closePollAdmin, createPollAdmin, listPollsAdmin } from "@/lib/community.functions";
import { listTheatresAdmin } from "@/lib/admin.functions";
import { listMovies } from "@/lib/movies.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/polls")({
  component: AdminPolls,
});

function AdminPolls() {
  const qc = useQueryClient();
  const fetchPolls = useServerFn(listPollsAdmin);
  const fetchTheatres = useServerFn(listTheatresAdmin);
  const createPoll = useServerFn(createPollAdmin);
  const closePoll = useServerFn(closePollAdmin);

  const { data: polls, isLoading } = useQuery({ queryKey: ["admin-polls"], queryFn: () => fetchPolls() });
  const { data: theatres } = useQuery({ queryKey: ["admin-theatres"], queryFn: () => fetchTheatres() });
  const { data: movies } = useQuery({
    queryKey: ["movies", "now_showing"],
    queryFn: () => listMovies({ data: { status: "now_showing" } }),
  });
  const { data: upcoming } = useQuery({
    queryKey: ["movies", "upcoming"],
    queryFn: () => listMovies({ data: { status: "upcoming" } }),
  });
  const allMovies = [...(upcoming ?? []), ...(movies ?? [])];

  const [open, setOpen] = useState(false);
  const [theatreId, setTheatreId] = useState("");
  const [title, setTitle] = useState("Which movie should we screen next week?");
  const [description, setDescription] = useState("Vote for the film you want on our screens.");
  const [endsAt, setEndsAt] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const save = useMutation({
    mutationFn: () =>
      createPoll({
        data: { theatreId, title, description, endsAt: endsAt || undefined, movieIds: picked },
      }),
    onSuccess: async () => {
      toast.success("Poll published");
      setOpen(false);
      setPicked([]);
      await qc.invalidateQueries({ queryKey: ["admin-polls"] });
    },
    onError: () => toast.error("Pick a theatre and at least 2 movies."),
  });

  const close = useMutation({
    mutationFn: (pollId: string) => closePoll({ data: { pollId } }),
    onSuccess: async () => {
      toast.success("Poll closed");
      await qc.invalidateQueries({ queryKey: ["admin-polls"] });
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-foreground">MOVIE POLLS</h1>
          <p className="text-sm text-muted-foreground">
            See what audiences want at each theatre and plan your shows around it.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create a poll</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Theatre</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={theatreId}
                  onChange={(e) => setTheatreId(e.target.value)}
                >
                  <option value="">Select a theatre</option>
                  {(theatres ?? []).map((t: { id: string; name: string; city: string }) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Question</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Closes on</Label>
                <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Movie choices ({picked.length})</Label>
                <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-2">
                  {allMovies.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setPicked((p) =>
                          p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id],
                        )
                      }
                      className={cn(
                        "truncate rounded-md border px-2 py-1.5 text-left text-xs",
                        picked.includes(m.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={save.isPending || !theatreId || picked.length < 2}
                onClick={() => save.mutate()}
              >
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish poll
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : (
        <div className="space-y-4">
          {(polls ?? []).map((p) => (
            <article key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {p.theatres?.name} — {p.theatres?.city}
                  </p>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                    <Vote className="h-4 w-4 text-primary" /> {p.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {p.totalVotes} votes · {p.is_active ? "Open" : "Closed"}
                  </p>
                </div>
                {p.is_active ? (
                  <Button variant="outline" size="sm" onClick={() => close.mutate(p.id)}>
                    Close poll
                  </Button>
                ) : null}
              </div>
              <div className="mt-4 space-y-2">
                {p.options.map((o) => {
                  const pct = p.totalVotes ? Math.round((o.votes / p.totalVotes) * 100) : 0;
                  return (
                    <div key={o.title} className="relative overflow-hidden rounded-md border border-border px-3 py-2">
                      <span
                        className="absolute inset-y-0 left-0 bg-primary/10"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                      <div className="relative flex items-center justify-between text-sm">
                        <span className="text-card-foreground">{o.title}</span>
                        <span className="text-muted-foreground">
                          {o.votes} · {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
