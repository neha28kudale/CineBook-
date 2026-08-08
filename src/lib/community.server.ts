import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createPublicClient } from "@/lib/supabase-public.server";

type Client = SupabaseClient<Database>;

export type PollOptionResult = {
  optionId: string;
  movieId: string;
  title: string;
  posterUrl: string;
  genre: string;
  language: string;
  votes: number;
  percent: number;
};

export type TheatreCommunity = {
  id: string;
  name: string;
  city: string;
  address: string;
  members: number;
  posts: number;
  poll: {
    id: string;
    title: string;
    description: string;
    endsAt: string | null;
    totalVotes: number;
    leader: string | null;
  } | null;
};

export async function fetchCommunities(city?: string): Promise<TheatreCommunity[]> {
  const supabase = createPublicClient();
  let theatreQuery = supabase.from("theatres").select("id, name, city, address").order("name");
  if (city && city !== "All") theatreQuery = theatreQuery.eq("city", city);
  const { data: theatres, error } = await theatreQuery;
  if (error) throw new Error(error.message);
  if (!theatres?.length) return [];

  const ids = theatres.map((t) => t.id);
  const [{ data: members }, { data: posts }, { data: polls }] = await Promise.all([
    supabase.from("community_members").select("theatre_id").in("theatre_id", ids),
    supabase.from("community_posts").select("theatre_id").in("theatre_id", ids),
    supabase
      .from("theatre_polls")
      .select("id, theatre_id, title, description, ends_at")
      .in("theatre_id", ids)
      .eq("is_active", true),
  ]);

  const pollIds = (polls ?? []).map((p) => p.id);
  const { data: votes } = pollIds.length
    ? await supabase.from("poll_votes").select("poll_id, option_id").in("poll_id", pollIds)
    : { data: [] as { poll_id: string; option_id: string }[] };
  const { data: options } = pollIds.length
    ? await supabase.from("poll_options").select("id, poll_id, movies(title)").in("poll_id", pollIds)
    : { data: [] as { id: string; poll_id: string; movies: { title: string } | null }[] };

  const count = (rows: { theatre_id: string }[] | null, id: string) =>
    (rows ?? []).filter((r) => r.theatre_id === id).length;

  return theatres.map((t) => {
    const poll = (polls ?? []).find((p) => p.theatre_id === t.id) ?? null;
    let pollInfo: TheatreCommunity["poll"] = null;
    if (poll) {
      const pollVotes = (votes ?? []).filter((v) => v.poll_id === poll.id);
      const tally = new Map<string, number>();
      pollVotes.forEach((v) => tally.set(v.option_id, (tally.get(v.option_id) ?? 0) + 1));
      let leaderOption: string | null = null;
      let best = -1;
      tally.forEach((n, optionId) => {
        if (n > best) {
          best = n;
          leaderOption = optionId;
        }
      });
      const leaderRow = (options ?? []).find((o) => o.id === leaderOption);
      pollInfo = {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        endsAt: poll.ends_at,
        totalVotes: pollVotes.length,
        leader: leaderRow?.movies?.title ?? null,
      };
    }
    return {
      id: t.id,
      name: t.name,
      city: t.city,
      address: t.address,
      members: count(members, t.id),
      posts: count(posts, t.id),
      poll: pollInfo,
    };
  });
}

export async function fetchCommunityDetail(theatreId: string) {
  const supabase = createPublicClient();
  const { data: theatre, error } = await supabase
    .from("theatres")
    .select("id, name, city, address")
    .eq("id", theatreId)
    .single();
  if (error) throw new Error(error.message);

  const { data: poll } = await supabase
    .from("theatre_polls")
    .select("id, title, description, ends_at, is_active")
    .eq("theatre_id", theatreId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let results: PollOptionResult[] = [];
  let totalVotes = 0;
  if (poll) {
    const [{ data: options }, { data: votes }] = await Promise.all([
      supabase
        .from("poll_options")
        .select("id, movie_id, movies(title, poster_url, genre, language)")
        .eq("poll_id", poll.id),
      supabase.from("poll_votes").select("option_id").eq("poll_id", poll.id),
    ]);
    totalVotes = votes?.length ?? 0;
    results = (options ?? []).map((o) => {
      const n = (votes ?? []).filter((v) => v.option_id === o.id).length;
      return {
        optionId: o.id,
        movieId: o.movie_id,
        title: o.movies?.title ?? "Movie",
        posterUrl: o.movies?.poster_url ?? "",
        genre: o.movies?.genre ?? "",
        language: o.movies?.language ?? "",
        votes: n,
        percent: totalVotes ? Math.round((n / totalVotes) * 100) : 0,
      };
    });
    results.sort((a, b) => b.votes - a.votes);
  }

  const { data: members } = await supabase
    .from("community_members")
    .select("user_id")
    .eq("theatre_id", theatreId);

  const { data: posts } = await supabase
    .from("community_posts")
    .select("id, user_id, author_name, content, created_at, community_comments(id, author_name, content, created_at, user_id)")
    .eq("theatre_id", theatreId)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    theatre,
    poll: poll ? { ...poll, totalVotes } : null,
    results,
    memberCount: members?.length ?? 0,
    posts: (posts ?? []).map((p) => ({
      ...p,
      community_comments: [...(p.community_comments ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    })),
  };
}

export async function fetchMyCommunityState(
  supabase: Client,
  userId: string,
  theatreId: string,
) {
  const { data: member } = await supabase
    .from("community_members")
    .select("id")
    .eq("theatre_id", theatreId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: poll } = await supabase
    .from("theatre_polls")
    .select("id")
    .eq("theatre_id", theatreId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let myOptionId: string | null = null;
  if (poll) {
    const { data: vote } = await supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", poll.id)
      .eq("user_id", userId)
      .maybeSingle();
    myOptionId = vote?.option_id ?? null;
  }
  return { joined: !!member, myOptionId };
}

export async function toggleMembership(supabase: Client, userId: string, theatreId: string) {
  const { data: existing } = await supabase
    .from("community_members")
    .select("id")
    .eq("theatre_id", theatreId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("community_members").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { joined: false };
  }
  const { error } = await supabase
    .from("community_members")
    .insert({ theatre_id: theatreId, user_id: userId });
  if (error) throw new Error(error.message);
  return { joined: true };
}

export async function castVote(
  supabase: Client,
  userId: string,
  pollId: string,
  optionId: string,
) {
  const { data: existing } = await supabase
    .from("poll_votes")
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("poll_votes")
      .update({ option_id: optionId })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("poll_votes")
      .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

async function displayName(supabase: Client, userId: string) {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const name = data?.full_name?.trim();
  return name && name.length ? name : "Movie fan";
}

export async function createPost(
  supabase: Client,
  userId: string,
  theatreId: string,
  content: string,
) {
  const { error } = await supabase.from("community_posts").insert({
    theatre_id: theatreId,
    user_id: userId,
    author_name: await displayName(supabase, userId),
    content,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function createComment(
  supabase: Client,
  userId: string,
  postId: string,
  content: string,
) {
  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    user_id: userId,
    author_name: await displayName(supabase, userId),
    content,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function removePost(supabase: Client, postId: string) {
  const { error } = await supabase.from("community_posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ---------- Admin ----------
export async function fetchPollsAdmin(supabase: Client) {
  const { data, error } = await supabase
    .from("theatre_polls")
    .select("id, title, description, ends_at, is_active, created_at, theatre_id, theatres(name, city)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((p) => p.id);
  const { data: options } = ids.length
    ? await supabase.from("poll_options").select("id, poll_id, movies(title)").in("poll_id", ids)
    : { data: [] as { id: string; poll_id: string; movies: { title: string } | null }[] };
  const { data: votes } = ids.length
    ? await supabase.from("poll_votes").select("poll_id, option_id").in("poll_id", ids)
    : { data: [] as { poll_id: string; option_id: string }[] };

  return (data ?? []).map((p) => {
    const opts = (options ?? []).filter((o) => o.poll_id === p.id);
    const rows = opts
      .map((o) => ({
        title: o.movies?.title ?? "Movie",
        votes: (votes ?? []).filter((v) => v.option_id === o.id).length,
      }))
      .sort((a, b) => b.votes - a.votes);
    return { ...p, options: rows, totalVotes: rows.reduce((s, r) => s + r.votes, 0) };
  });
}
