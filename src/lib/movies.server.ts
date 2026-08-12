import { createPublicClient } from "@/lib/supabase-public.server";

type ShowJoin = {
  name: string;
  total_seats: number;
  theatres: {
    id: string;
    name: string;
    city: string;
    address: string;
    image_url?: string;
    video_url?: string;
  } | null;
} | null;

export function showStartISO(showDate: string, showTime: string): string {
  return `${showDate}T${showTime.length === 5 ? `${showTime}:00` : showTime}`;
}

export async function fetchMovies(status: "now_showing" | "upcoming") {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("status", status)
    .order("release_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchMoviesAndTheatres(query: string) {
  const supabase = createPublicClient();
  const q = query.trim();
  if (!q) return { movies: [], theatres: [] };

  const pattern = `%${q.replace(/[%_,"]/g, "")}%`;

  const moviesRes = await supabase
    .from("movies")
    .select("id, title, genre, language, poster_url, rating, status")
    .ilike("title", pattern)
    .order("release_date", { ascending: false })
    .limit(8);

  let movies = moviesRes.data ?? [];
  if (movies.length < 8 && !moviesRes.error) {
    const extraRes = await supabase
      .from("movies")
      .select("id, title, genre, language, poster_url, rating, status")
      .or(
        [
          `genre.ilike.${pattern}`,
          `language.ilike.${pattern}`,
          `cast_members.ilike.${pattern}`,
        ].join(","),
      )
      .order("release_date", { ascending: false })
      .limit(8);
    if (!extraRes.error && extraRes.data) {
      const seen = new Set(movies.map((m) => m.id));
      for (const m of extraRes.data) {
        if (!seen.has(m.id)) {
          movies.push(m);
          seen.add(m.id);
        }
      }
      movies = movies.slice(0, 8);
    }
  }

  if (moviesRes.error) throw new Error(moviesRes.error.message);

  let theatres: { id: string; name: string; city: string; address: string; image_url?: string }[] =
    [];
  const theatresRes = await supabase
    .from("theatres")
    .select("id, name, city, address")
    .or(`name.ilike.${pattern},city.ilike.${pattern},address.ilike.${pattern}`)
    .order("name")
    .limit(5);
  if (!theatresRes.error) {
    theatres = theatresRes.data ?? [];
  }

  return { movies, theatres };
}

export async function fetchTheatre(id: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("theatres")
    .select("*, screens(id, name, total_seats)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchTheatres() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("theatres")
    .select("id, name, city, address, image_url, video_url")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchMovie(id: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("movies").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchShowtimes(movieId: string, date: string, city?: string) {
  const supabase = createPublicClient();

  const { data: rows, error } = await supabase
    .from("shows")
    .select(
      "id, show_date, show_time, base_price, gold_price, premium_price, screen_id, screens(name, total_seats, theatres(id, name, city, address, image_url, video_url))",
    )
    .eq("movie_id", movieId)
    .eq("show_date", date)
    .order("show_time", { ascending: true });
  if (error) throw new Error(error.message);
  const shows = city
    ? (rows ?? []).filter(
        (s) =>
          (s.screens as unknown as ShowJoin)?.theatres?.city?.toLowerCase() === city.toLowerCase(),
      )
    : (rows ?? []);
  if (!shows.length) return [];

  const showIds = shows.map((s) => s.id);
  const { data: showSeats, error: seatsError } = await supabase
    .from("show_seats")
    .select("show_id, status, locked_until")
    .in("show_id", showIds);

  const now = Date.now();
  const takenByShow = new Map<string, number>();
  if (!seatsError) {
    for (const row of showSeats ?? []) {
      const locked =
        row.status === "locked" && row.locked_until && new Date(row.locked_until).getTime() > now;
      if (row.status === "booked" || locked) {
        takenByShow.set(row.show_id, (takenByShow.get(row.show_id) ?? 0) + 1);
      }
    }
  }

  return shows.map((show) => {
    const screen = show.screens as unknown as ShowJoin;
    const theatre = screen?.theatres;
    const total = screen?.total_seats ?? 0;
    const taken = takenByShow.get(show.id) ?? 0;
    return {
      id: show.id,
      show_date: show.show_date,
      show_time: show.show_time,
      base_price: show.base_price,
      gold_price: show.gold_price,
      premium_price: show.premium_price,
      screen_name: screen?.name ?? "Screen",
      theatre_id: theatre?.id ?? "",
      theatre_name: theatre?.name ?? "Theatre",
      city: theatre?.city ?? "",
      theatre_address: theatre?.address ?? "",
      theatre_image_url: theatre?.image_url ?? "",
      theatre_video_url: theatre?.video_url ?? "",
      total_seats: total,
      available_seats: Math.max(0, total - taken),
    };
  });
}

export async function fetchShowtimesInRange(movieId: string, dates: string[], city?: string) {
  const uniqueDates = [...new Set(dates.filter(Boolean))];
  const results = await Promise.all(
    uniqueDates.map(async (date) => {
      const shows = await fetchShowtimes(movieId, date, city);
      return { date, shows };
    }),
  );
  return results;
}

export async function fetchSeatMap(showId: string) {
  const supabase = createPublicClient();
  const { data: show, error: showError } = await supabase
    .from("shows")
    .select(
      "id, show_date, show_time, base_price, gold_price, premium_price, screen_id, movie_id, movies(title, rating, duration_min, certificate, language), screens(name, total_seats, theatres(id, name, city, address, image_url, video_url))",
    )
    .eq("id", showId)
    .single();
  if (showError) throw new Error(showError.message);

  const [{ data: seats, error: seatsError }, { data: showSeats, error: ssError }] =
    await Promise.all([
      supabase
        .from("seats")
        .select("id, row_label, seat_number, seat_type, is_aisle_gap")
        .eq("screen_id", show.screen_id)
        .order("row_label")
        .order("seat_number"),
      supabase
        .from("show_seats")
        .select("seat_id, status, locked_by, locked_until")
        .eq("show_id", showId),
    ]);
  if (seatsError) throw new Error(seatsError.message);
  if (ssError) throw new Error(ssError.message);

  return {
    show: {
      id: show.id,
      show_date: show.show_date,
      show_time: show.show_time,
      base_price: show.base_price,
      gold_price: show.gold_price,
      premium_price: show.premium_price,
      movie:
        (show.movies as unknown as {
          title: string;
          rating: string;
          duration_min: number;
          certificate: string;
          language: string;
        } | null) ?? null,
      screen: (show.screens as unknown as ShowJoin) ?? null,
    },
    seats: seats ?? [],
    showSeats: showSeats ?? [],
  };
}

export async function fetchFoodItems(includeUnavailable = false) {
  const supabase = createPublicClient();
  let query = supabase.from("food_items").select("*").order("category").order("price");
  if (!includeUnavailable) query = query.eq("is_available", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchCities() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("theatres").select("city").order("city");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((t) => t.city).filter((c) => c.trim().length > 0))];
}

export async function fetchMovieCast(movieId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("movie_cast")
    .select("id, name, role, character_name")
    .eq("movie_id", movieId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchMovieReviews(movieId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("movie_reviews")
    .select("id, user_id, reviewer_name, rating, review, created_at")
    .eq("movie_id", movieId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchActiveOffers() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, description, discount_type, discount_value, max_discount, min_order, valid_until",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const now = Date.now();
  return (data ?? []).filter((o) => !o.valid_until || new Date(o.valid_until).getTime() > now);
}

export async function fetchSimilarMovies(movieId: string) {
  const supabase = createPublicClient();
  const { data: movie, error } = await supabase
    .from("movies")
    .select("id, genre, status")
    .eq("id", movieId)
    .single();
  if (error) return [];
  const tokens = movie.genre
    .split(/[,/|·&]+/)
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
  const { data: others, error: othersError } = await supabase
    .from("movies")
    .select("*")
    .eq("status", "now_showing")
    .neq("id", movieId)
    .limit(20);
  if (othersError) return [];
  const scored = (others ?? [])
    .map((m) => {
      const mTokens = m.genre
        .split(/[,/|·&]+/)
        .map((g: string) => g.trim().toLowerCase())
        .filter(Boolean);
      const overlap = mTokens.filter((t: string) => tokens.includes(t)).length;
      return { movie: m, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || b.movie.rating - a.movie.rating);
  return scored.slice(0, 6).map((s) => s.movie);
}
