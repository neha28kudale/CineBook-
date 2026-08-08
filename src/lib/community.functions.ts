import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-helpers.server";
import {
  castVote,
  createComment,
  createPost,
  fetchCommunities,
  fetchCommunityDetail,
  fetchMyCommunityState,
  fetchPollsAdmin,
  removePost,
  toggleMembership,
} from "@/lib/community.server";

const theatreInput = z.object({ theatreId: z.string().uuid() });

export const listCommunities = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ city: z.string().max(60).optional() }).parse(data ?? {}))
  .handler(({ data }) => fetchCommunities(data.city));

export const getCommunity = createServerFn({ method: "GET" })
  .inputValidator((data) => theatreInput.parse(data))
  .handler(({ data }) => fetchCommunityDetail(data.theatreId));

export const getMyCommunityState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => theatreInput.parse(data))
  .handler(({ data, context }) =>
    fetchMyCommunityState(context.supabase, context.userId, data.theatreId),
  );

export const toggleJoinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => theatreInput.parse(data))
  .handler(({ data, context }) =>
    toggleMembership(context.supabase, context.userId, data.theatreId),
  );

export const votePoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ pollId: z.string().uuid(), optionId: z.string().uuid() }).parse(data),
  )
  .handler(({ data, context }) =>
    castVote(context.supabase, context.userId, data.pollId, data.optionId),
  );

export const addCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ theatreId: z.string().uuid(), content: z.string().min(1).max(1000) }).parse(data),
  )
  .handler(({ data, context }) =>
    createPost(context.supabase, context.userId, data.theatreId, data.content.trim()),
  );

export const addCommunityComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ postId: z.string().uuid(), content: z.string().min(1).max(500) }).parse(data),
  )
  .handler(({ data, context }) =>
    createComment(context.supabase, context.userId, data.postId, data.content.trim()),
  );

export const deleteCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ postId: z.string().uuid() }).parse(data))
  .handler(({ data, context }) => removePost(context.supabase, data.postId));

export const listPollsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return fetchPollsAdmin(context.supabase);
  });

export const createPollAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        theatreId: z.string().uuid(),
        title: z.string().min(3).max(120),
        description: z.string().max(300).default(""),
        endsAt: z.string().optional(),
        movieIds: z.array(z.string().uuid()).min(2).max(8),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    await context.supabase
      .from("theatre_polls")
      .update({ is_active: false })
      .eq("theatre_id", data.theatreId);
    const { data: poll, error } = await context.supabase
      .from("theatre_polls")
      .insert({
        theatre_id: data.theatreId,
        title: data.title,
        description: data.description,
        ends_at: data.endsAt ? new Date(data.endsAt).toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: optErr } = await context.supabase
      .from("poll_options")
      .insert(data.movieIds.map((movieId) => ({ poll_id: poll.id, movie_id: movieId })));
    if (optErr) throw new Error(optErr.message);
    return { ok: true };
  });

export const closePollAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ pollId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("theatre_polls")
      .update({ is_active: false })
      .eq("id", data.pollId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
