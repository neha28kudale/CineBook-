import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  upsertScreen,
  listTheatresAdmin,
  saveSeatLayout,
  upsertTheatre,
} from "@/lib/admin.functions";
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
import { TIER_LABELS, type SeatTier } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/theatres")({
  head: () => ({
    meta: [
      { title: "Manage Theatres — CineBook Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTheatresPage,
});

type TheatreRow = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  screens: { id: string; name: string; total_seats: number }[];
};

function AdminTheatresPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [screenName, setScreenName] = useState("");
  const [screenTheatreId, setScreenTheatreId] = useState("");
  const [layoutScreenId, setLayoutScreenId] = useState("");
  const [layoutRows, setLayoutRows] = useState("6");
  const [layoutCols, setLayoutCols] = useState("12");
  const [layoutTier, setLayoutTier] = useState<SeatTier>("silver");
  const [busy, setBusy] = useState(false);

  const { data: theatres, isLoading } = useQuery({
    queryKey: ["admin-theatres"],
    queryFn: () => listTheatresAdmin(),
  });
  const rows = (theatres ?? []) as unknown as TheatreRow[];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-theatres"] });
  }

  async function handleAddTheatre() {
    if (!name.trim() || !city.trim()) {
      toast.error("Name and city are required.");
      return;
    }
    setBusy(true);
    try {
      await upsertTheatre({ data: { name, city, address } });
      toast.success("Theatre added.");
      setName("");
      setCity("");
      setAddress("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddScreen() {
    if (!screenTheatreId || !screenName.trim()) {
      toast.error("Pick a theatre and name the screen.");
      return;
    }
    setBusy(true);
    try {
      await upsertScreen({ data: { theatre_id: screenTheatreId, name: screenName } });
      toast.success("Screen added.");
      setScreenName("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateLayout() {
    const rowsN = Number(layoutRows);
    const colsN = Number(layoutCols);
    if (!layoutScreenId || !rowsN || !colsN) {
      toast.error("Pick a screen and grid size.");
      return;
    }
    setBusy(true);
    try {
      const seats: { row_label: string; seat_number: number; seat_type: SeatTier }[] = [];
      for (let r = 0; r < rowsN; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 1; c <= colsN; c++) {
          seats.push({ row_label: rowLabel, seat_number: c, seat_type: layoutTier });
        }
      }
      await saveSeatLayout({ data: { screenId: layoutScreenId, seats } });
      toast.success(`Layout saved: ${seats.length} ${TIER_LABELS[layoutTier]} seats.`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl tracking-wider text-foreground">Theatres &amp; Seats</h1>

      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-card-foreground">{t.name}</p>
              <p className="text-sm text-muted-foreground">
                {t.city} · {t.address ?? "—"}
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {t.screens.map((s) => (
                  <p key={s.id}>
                    {s.name}: {s.total_seats} seats
                  </p>
                ))}
                {t.screens.length === 0 && <p>No screens yet.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-foreground">Add theatre</h2>
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Button onClick={handleAddTheatre} disabled={busy} className="w-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add theatre
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-foreground">Add screen</h2>
          <Select value={screenTheatreId} onValueChange={setScreenTheatreId}>
            <SelectTrigger>
              <SelectValue placeholder="Theatre" />
            </SelectTrigger>
            <SelectContent>
              {rows.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Screen name (e.g. Screen 3)"
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
          />
          <Button onClick={handleAddScreen} disabled={busy} className="w-full">
            <Plus className="mr-1.5 h-4 w-4" /> Add screen
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-card-foreground">Generate seat layout</h2>
          <Select value={layoutScreenId} onValueChange={setLayoutScreenId}>
            <SelectTrigger>
              <SelectValue placeholder="Screen" />
            </SelectTrigger>
            <SelectContent>
              {rows.flatMap((t) =>
                t.screens.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {t.name} · {s.name}
                  </SelectItem>
                )),
              )}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Rows</Label>
              <Input type="number" value={layoutRows} onChange={(e) => setLayoutRows(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Seats/row</Label>
              <Input type="number" value={layoutCols} onChange={(e) => setLayoutCols(e.target.value)} />
            </div>
          </div>
          <Select value={layoutTier} onValueChange={(v) => setLayoutTier(v as SeatTier)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TIER_LABELS) as SeatTier[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TIER_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateLayout} disabled={busy} className="w-full">
            <Trash2 className="mr-1.5 h-4 w-4" /> Replace layout
          </Button>
        </div>
      </div>
    </div>
  );
}
