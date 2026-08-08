import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { idInput, reviewInput } from "@/lib/schemas";
import { deleteReview, upsertReview } from "@/lib/reviews.server";

export const submitReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => reviewInput.parse(data))
  .handler(({ data, context }) => upsertReview(context.supabase, context.userId, data));

export const deleteReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data, context }) => deleteReview(context.supabase, context.userId, data.id));
