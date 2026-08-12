import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

type TheatreMapProps = {
  name: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
};

function mapsEmbedUrl(props: TheatreMapProps): string {
  if (props.latitude != null && props.longitude != null) {
    return `https://maps.google.com/maps?q=${props.latitude},${props.longitude}&z=15&output=embed`;
  }
  const query = encodeURIComponent(`${props.name}, ${props.address}, ${props.city}`);
  return `https://maps.google.com/maps?q=${query}&z=15&output=embed`;
}

function directionsUrl(props: TheatreMapProps): string {
  if (props.latitude != null && props.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${props.latitude},${props.longitude}`;
  }
  const query = encodeURIComponent(`${props.name}, ${props.address}, ${props.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
}

export function TheatreMap(props: TheatreMapProps) {
  const embed = mapsEmbedUrl(props);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          title={`Map — ${props.name}`}
          src={embed}
          className="aspect-[16/10] w-full sm:aspect-video"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            {props.address}
            {props.city ? `, ${props.city}` : ""}
          </span>
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
          <a href={directionsUrl(props)} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5" /> Get directions
          </a>
        </Button>
      </div>
    </div>
  );
}
