import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeYoutubeEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    const normalizedUrl = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (hostname.includes("youtu.be")) {
      const videoId = pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (hostname.includes("youtube.com")) {
      if (pathname === "/watch") {
        const videoId = parsed.searchParams.get("v");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
      }
      if (pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${pathname}`;
      }
      if (pathname.startsWith("/shorts/")) {
        const videoId = pathname.split("/")[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
      }
    }
  } catch {
    // ignore parse failures
  }

  return trimmed;
}
