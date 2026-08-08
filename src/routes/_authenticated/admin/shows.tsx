import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMovies } from "@/lib/movies.functions";
import { deleteShow, listShowsAdmin, listTheatresAdmin, upsertShow } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { inr, seatPrice } from "@/lib/pricing";
import { formatShowDate, formatTime, toLocalDateString } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/admin/shows")({
  head: () => ({
    meta: [{ title: "Manage Shows — CineBook Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminShowsPage,
});

type TheatreRow = {
  id: string;
  name: string;
  screens: { id: string; name: string }[];
};

type ShowRow = {
  id: string;
  show_date: string;
  show_time: string;
  base_price: number;
  gold_price: number | null;
  premium_price: number | null;
  movies: { title: string } | null;
  screens: { name: string; theatres: { name: string } | null } | null;
};

function AdminShowsPage() {
  const queryClient = useQueryClient();
  const [movieId, setMovieId] = useState("");
  const [screenId, setScreenId] = useState("");
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [time, setTime] = useState("19:00");
  const [price, setPrice] = useState("250");
  const [goldPrice, setGoldPrice] = useState("");
  const [premiumPrice, setPremiumPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: shows, isLoading } = useQuery({
    queryKey: ["admin-shows"],
    queryFn: () => listShowsAdmin(),
  });
  const { data: movies } = useQuery({
    queryKey: ["admin-movies-list"],
    queryFn: async () => [
      ...(await listMovies({ data: { status: "now_showing" } })),
      ...(await listMovies({ data: { status: "upcoming" } })),
    ],
  });
  const { data: theatres } = useQuery({
    queryKey: ["admin-theatres"],
    queryFn: () => listTheatresAdmin(),
  });

  const showRows = (shows ?? []) as unknown as ShowRow[];
  const theatreRows = (theatres ?? []) as unknown as TheatreRow[];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-shows"] });
  }

  async function handleAdd() {
    if (!movieId || !screenId || !date || !time) {
      toast.error("Fill in movie, screen, date and time.");
      return;
    }
    setBusy(true);
    try {
      await upsertShow({
        data: {
          movie_id: movieId,
          screen_id: screenId,
          show_date: date,
          show_time: time.length === 5 ? `${time}:00` : time,
          base_price: Number(price) || 0,
          gold_price: goldPrice.trim() ? Number(goldPrice) : null,
          premium_price: premiumPrice.trim() ? Number(premiumPrice) : null,
        },
      });
      toast.success("Show created.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this show? All its bookings will be removed.")) return;
    try {
      await deleteShow({ data: { id } });
      toast.success("Show deleted.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl tracking-wider text-foreground">Shows</h1>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-6">
        <p className="text-xs text-muted-foreground md:col-span-6">
          Set a base (Silver) price, then optionally override Gold and Premium — leave them blank to
          fall back to the default multiplier.
        </p>
        <div className="grid gap-1 md:col-span-2">
          <Label className="text-xs">Movie</Label>
          <Select value={movieId} onValueChange={setMovieId}>
            <SelectTrigger>
              <SelectValue placeholder="Movie" />
            </SelectTrigger>
            <SelectContent>
              {(movies ?? []).map((m: { id: string; title: string }) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label className="text-xs">Screen</Label>
          <Select value={screenId} onValueChange={setScreenId}>
            <SelectTrigger>
              <SelectValue placeholder="Screen" />
            </SelectTrigger>
            <SelectContent>
              {theatreRows.flatMap((t) =>
                t.screens.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {t.name} · {s.name}
                  </SelectItem>
                )),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-tier-silver">Silver price (₹)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-tier-gold">Gold price (₹)</Label>
          <Input
            type="number"
            placeholder="auto (1.5×)"
            value={goldPrice}
            onChange={(e) => setGoldPrice(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs text-tier-premium">Platinum price (₹)</Label>
          <Input
            type="number"
            placeholder="auto (2.2×)"
            value={premiumPrice}
            onChange={(e) => setPremiumPrice(e.target.value)}
          />
        </div>
        <div className="flex items-end md:col-span-6">
          <Button onClick={handleAdd} disabled={busy} className="w-fit">
            <Plus className="mr-1.5 h-4 w-4" /> Add show
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movie</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right text-tier-silver">Silver</TableHead>
                <TableHead className="text-right text-tier-gold">Gold</TableHead>
                <TableHead className="text-right text-tier-premium">Platinum</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.movies?.title}</TableCell>
                  <TableCell>
                    {s.screens?.theatres?.name} · {s.screens?.name}
                  </TableCell>
                  <TableCell>{formatShowDate(s.show_date)}</TableCell>
                  <TableCell>{formatTime(s.show_time)}</TableCell>
                  <TableCell className="text-right">{inr(s.base_price)}</TableCell>
                  <TableCell className="text-right">
                    {inr(seatPrice(s.base_price, "gold", s))}
                  </TableCell>
                  <TableCell className="text-right">
                    {inr(seatPrice(s.base_price, "premium", s))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {showRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No shows scheduled.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
