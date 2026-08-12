import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  upsertScreen,
  listTheatresAdmin,
  saveSeatLayout,
  upsertTheatre,
} from "@/lib/admin.functions";
import { assignTheatreAdminFn, listTheatreAdminAssignments, updateTheatreMedia } from "@/lib/theatre-admin.functions";
import { TheatreMediaEditor } from "@/components/theatre-media-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  latitude: number | null;
  longitude: number | null;
  image_url: string;
  video_url: string;
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
  const [adminUserId, setAdminUserId] = useState("");
  const [adminTheatreId, setAdminTheatreId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: theatres, isLoading } = useQuery({
    queryKey: ["admin-theatres"],
    queryFn: () => listTheatresAdmin(),
  });
  const { data: assignments } = useQuery({
    queryKey: ["theatre-admin-assignments"],
    queryFn: () => listTheatreAdminAssignments(),
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

  async function handleAssignTheatreAdmin() {
    if (!adminUserId.trim() || !adminTheatreId) {
      toast.error("Enter a user UUID and pick a theatre.");
      return;
    }
    setBusy(true);
    try {
      await assignTheatreAdminFn({ data: { userId: adminUserId.trim(), theatreId: adminTheatreId } });
      toast.success("Theatre admin assigned.");
      setAdminUserId("");
      queryClient.invalidateQueries({ queryKey: ["theatre-admin-assignments"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTheatreMedia(
    theatre: TheatreRow,
    values: {
      address: string;
      latitude: number | null;
      longitude: number | null;
      image_url: string;
      video_url: string;
    },
  ) {
    setBusy(true);
    try {
      await updateTheatreMedia({
        data: {
          id: theatre.id,
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
          image_url: values.image_url,
          video_url: values.video_url,
        },
      });
      toast.success(`Map & tour saved for ${theatre.name}.`);
      refresh();
      queryClient.invalidateQueries({ queryKey: ["theatres"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
      throw err;
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-card-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.city} · {t.address ?? "—"}
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Map &amp; tour
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle className="font-display text-2xl tracking-wider">
                        {t.name} — Map &amp; virtual tour
                      </DialogTitle>
                    </DialogHeader>
                    <TheatreMediaEditor
                      key={t.id}
                      theatre={t}
                      busy={busy}
                      onSave={(values) => handleSaveTheatreMedia(t, values)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                {t.video_url ? (
                  <span className="rounded border border-seat-available/30 px-1.5 py-0.5 text-seat-available">
                    Tour set
                  </span>
                ) : (
                  <span className="rounded border border-border px-1.5 py-0.5">No tour</span>
                )}
                {t.latitude != null && t.longitude != null ? (
                  <span className="rounded border border-primary/30 px-1.5 py-0.5 text-primary">
                    Map pin set
                  </span>
                ) : (
                  <span className="rounded border border-border px-1.5 py-0.5">Address-only map</span>
                )}
              </div>
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

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-card-foreground">Assign theatre admin</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Grant a user the theatre_admin role and link them to a specific theatre. They can sign in
          and access the Theatre Dashboard.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="User UUID (from Supabase auth)"
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
          />
          <Select value={adminTheatreId} onValueChange={setAdminTheatreId}>
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
          <Button onClick={handleAssignTheatreAdmin} disabled={busy}>
            Assign admin
          </Button>
        </div>
        {(assignments?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {assignments!.map((a) => {
              const theatre = a.theatres as unknown as { name: string; city: string } | null;
              return (
                <li key={a.id}>
                  User {a.user_id.slice(0, 8)}… → {theatre?.name ?? "Theatre"} ({theatre?.city})
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
