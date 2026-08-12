import { useMemo, useState } from "react";
import { MapPin, MonitorPlay, Save } from "lucide-react";
import { TheatreMap } from "@/components/theatre-map";
import { TheatreVirtualTour } from "@/components/theatre-virtual-tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type TheatreMediaFields = {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  video_url?: string | null;
};

type TheatreMediaEditorProps = {
  theatre: TheatreMediaFields;
  onSave: (values: {
    address: string;
    latitude: number | null;
    longitude: number | null;
    image_url: string;
    video_url: string;
  }) => Promise<void>;
  busy?: boolean;
};

function parseCoord(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function TheatreMediaEditor({ theatre, onSave, busy = false }: TheatreMediaEditorProps) {
  const [address, setAddress] = useState(theatre.address ?? "");
  const [latitude, setLatitude] = useState(
    theatre.latitude != null ? String(theatre.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    theatre.longitude != null ? String(theatre.longitude) : "",
  );
  const [imageUrl, setImageUrl] = useState(theatre.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(theatre.video_url ?? "");

  const previewLat = parseCoord(latitude);
  const previewLng = parseCoord(longitude);

  const mapPreview = useMemo(
    () => ({
      name: theatre.name,
      address: address || theatre.address || "",
      city: theatre.city,
      latitude: previewLat,
      longitude: previewLng,
    }),
    [theatre.name, theatre.city, theatre.address, address, previewLat, previewLng],
  );

  async function handleSave() {
    await onSave({
      address: address.trim(),
      latitude: previewLat,
      longitude: previewLng,
      image_url: imageUrl.trim(),
      video_url: videoUrl.trim(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`address-${theatre.id}`}>Street address</Label>
          <Textarea
            id={`address-${theatre.id}`}
            rows={2}
            placeholder="123 Main Street"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used for directions when map coordinates are not set.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`lat-${theatre.id}`}>Latitude</Label>
          <Input
            id={`lat-${theatre.id}`}
            inputMode="decimal"
            placeholder="19.0760"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`lng-${theatre.id}`}>Longitude</Label>
          <Input
            id={`lng-${theatre.id}`}
            inputMode="decimal"
            placeholder="72.8777"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Tip: open Google Maps, right-click the theatre location, and copy the coordinates for an
          accurate map pin.
        </p>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`image-${theatre.id}`}>Cover image URL</Label>
          <Input
            id={`image-${theatre.id}`}
            placeholder="/images/hero-lobby.jpg or https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Shown on the theatre page and as the virtual tour thumbnail.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`video-${theatre.id}`}>Virtual tour video URL</Label>
          <Input
            id={`video-${theatre.id}`}
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste a YouTube watch or embed link. Customers will see a playable virtual tour.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Map preview
          </p>
          <TheatreMap {...mapPreview} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <MonitorPlay className="h-4 w-4 text-primary" /> Virtual tour preview
          </p>
          {videoUrl.trim() ? (
            <TheatreVirtualTour
              theatreName={theatre.name}
              imageUrl={imageUrl}
              videoUrl={videoUrl}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Add a YouTube video URL to preview the virtual tour.
            </p>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={busy} className="w-full sm:w-auto">
        <Save className="mr-2 h-4 w-4" /> Save map &amp; virtual tour
      </Button>
    </div>
  );
}
