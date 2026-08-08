import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMovies } from "@/lib/movies.functions";
import { deleteMovie, upsertMovie } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { normalizeYoutubeEmbedUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { z } from "zod";
import type { movieInput } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/admin/movies")({
  head: () => ({
    meta: [
      { title: "Manage Movies — CineBook Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMoviesPage,
});

type MovieForm = z.infer<typeof movieInput>;

const EMPTY: MovieForm = {
  title: "",
  description: "",
  genre: "",
  language: "English",
  duration_min: 150,
  rating: 7,
  cast_members: "",
  poster_url: "",
  trailer_url: "",
  release_date: "",
  status: "now_showing",
  certificate: "UA 13+",
  formats: "2D",
};

type MovieRow = {
  id: string;
  title: string;
  genre: string;
  language: string;
  duration_min: number;
  rating: number;
  status: string;
};

function AdminMoviesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MovieForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: movies, isLoading } = useQuery({
    queryKey: ["admin-movies"],
    queryFn: async () => {
      const [nowShowing, upcoming] = await Promise.all([
        listMovies({ data: { status: "now_showing" } }),
        listMovies({ data: { status: "upcoming" } }),
      ]);
      return [...nowShowing, ...upcoming] as unknown as MovieRow[];
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
    queryClient.invalidateQueries({ queryKey: ["movies"] });
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const normalizedTrailerUrl = normalizeYoutubeEmbedUrl(form.trailer_url);
      await upsertMovie({ data: { ...form, trailer_url: normalizedTrailerUrl } });
      toast.success(form.id ? "Movie updated." : "Movie added.");
      setOpen(false);
      setForm(EMPTY);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this movie? Shows linked to it must be removed first.")) return;
    try {
      await deleteMovie({ data: { id } });
      toast.success("Movie deleted.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-foreground">Movies</h1>
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add movie
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movies ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.title}</TableCell>
                  <TableCell>{m.genre}</TableCell>
                  <TableCell>{m.language}</TableCell>
                  <TableCell className="text-right">{m.duration_min} min</TableCell>
                  <TableCell className="text-right">{m.rating}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "now_showing" ? "default" : "secondary"}>
                      {m.status === "now_showing" ? "Now showing" : "Upcoming"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const full = (movies ?? []).find((x) => x.id === m.id);
                        setForm({ ...EMPTY, ...(full as unknown as Partial<MovieForm>), id: m.id });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit movie" : "Add movie"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.duration_min}
                  onChange={(e) =>
                    setForm({ ...form, duration_min: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rating">Rating (0–10)</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="release">Release date</Label>
                <Input
                  id="release"
                  type="date"
                  value={form.release_date}
                  onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as MovieForm["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now_showing">Now showing</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cast">Cast</Label>
              <Input
                id="cast"
                value={form.cast_members}
                onChange={(e) => setForm({ ...form, cast_members: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="poster">Poster image URL</Label>
              <Input
                id="poster"
                value={form.poster_url}
                onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
                placeholder="/images/posters/example.jpg"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="trailer">Trailer URL (YouTube embed)</Label>
              <Input
                id="trailer"
                value={form.trailer_url}
                onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Save movie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
