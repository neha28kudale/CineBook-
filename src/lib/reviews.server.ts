import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export async function upsertReview(
  client: Client,
  userId: string,
  input: { movieId: string; rating: number; review: string },
) {
  const { data: profile } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  const reviewerName = profile?.full_name?.trim() || "Moviegoer";

  const { error } = await client.from("movie_reviews").upsert(
    {
      movie_id: input.movieId,
      user_id: userId,
      reviewer_name: reviewerName,
      rating: input.rating,
      review: input.review,
    },
    { onConflict: "movie_id,user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteReview(client: Client, userId: string, reviewId: string) {
  const { error } = await client
    .from("movie_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
