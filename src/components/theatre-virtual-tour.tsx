import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeYoutubeEmbedUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

type TheatreVirtualTourProps = {
  theatreName: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  compact?: boolean;
  className?: string;
};

export function TheatreVirtualTour({
  theatreName,
  imageUrl,
  videoUrl,
  compact = false,
  className,
}: TheatreVirtualTourProps) {
  const embedUrl = normalizeYoutubeEmbedUrl(videoUrl ?? "");
  const [open, setOpen] = useState(false);

  if (!embedUrl) return null;

  const poster = imageUrl || "/images/hero-lobby.jpg";

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border",
          compact ? "max-w-xs" : "w-full",
          className,
        )}
      >
        <img
          src={poster}
          alt={`${theatreName} interior`}
          className={cn("w-full object-cover", compact ? "aspect-video" : "aspect-video")}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50 transition-colors hover:bg-background/40"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg sm:h-14 sm:w-14">
            <PlayCircle className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <span className="text-xs font-semibold text-foreground sm:text-sm">Virtual tour</span>
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wider">
              {theatreName} — Virtual tour
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={embedUrl}
                title={`${theatreName} virtual tour`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
