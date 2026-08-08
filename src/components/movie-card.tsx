import { Link } from "@tanstack/react-router";
import { Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type MovieCardData = {
  id: string;
  title: string;
  genre: string;
  language: string;
  duration_min: number;
  rating: number;
  poster_url: string;
  release_date: string;
  status: "now_showing" | "upcoming";
};

export function MovieCard({ movie }: { movie: MovieCardData }) {
  const hours = Math.floor(movie.duration_min / 60);
  const mins = movie.duration_min % 60;

  return (
    <Link
      to="/movies/$movieId"
      params={{ movieId: movie.id }}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-lift"
    >
      <div className="poster-shine relative aspect-[2/3] overflow-hidden">
        <img
          src={movie.poster_url}
          alt={`${movie.title} poster`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
          <Star className="h-3 w-3 fill-primary" />
          {movie.rating.toFixed(1)}
        </div>
        {movie.status === "upcoming" && (
          <Badge className="absolute right-2 top-2 bg-secondary text-secondary-foreground">
            Coming soon
          </Badge>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate font-semibold text-card-foreground group-hover:text-primary">
          {movie.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {movie.genre} · {movie.language}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {hours}h {mins}m
        </p>
      </div>
    </Link>
  );
}
