import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { getMovieReviews } from "@/lib/movies.functions";
import { submitReviewFn, deleteReviewFn } from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MovieReviewsProps = {
  movieId: string;
  userId?: string;
};

export function MovieReviews({ movieId, userId }: MovieReviewsProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(8);
  const [review, setReview] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["movie-reviews", movieId],
    queryFn: () => getMovieReviews({ data: { id: movieId } }),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitReviewFn({ data: { movieId, rating, review } }),
    onSuccess: () => {
      toast.success("Review submitted — thanks for your feedback!");
      queryClient.invalidateQueries({ queryKey: ["movie-reviews", movieId] });
      setShowForm(false);
      setReview("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit review"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReviewFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Review removed");
      queryClient.invalidateQueries({ queryKey: ["movie-reviews", movieId] });
    },
  });

  const avgRating =
    reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const userReview = reviews?.find((r) => r.user_id === userId);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wider text-foreground">
            Reviews &amp; feedback
          </h2>
          {avgRating != null && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              {avgRating.toFixed(1)} average from {reviews!.length} review
              {reviews!.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {userId && !userReview && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Write a review
          </Button>
        )}
      </div>

      {showForm && userId && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-medium text-card-foreground">Your rating</p>
          <div className="mb-4 flex flex-wrap gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                  n <= rating
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your thoughts about the movie (optional)…"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="mb-3 min-h-[80px] resize-none"
            maxLength={1000}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              Submit review
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : reviews?.length ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{r.reviewer_name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                    <Star className="h-3 w-3 fill-primary" />
                    {r.rating}/10
                  </p>
                </div>
                {userId && r.user_id === userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    onClick={() => deleteMutation.mutate(r.id)}
                    aria-label="Delete your review"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {r.review && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.review}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to share your thoughts!
        </p>
      )}
    </section>
  );
}
