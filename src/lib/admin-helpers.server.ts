import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export async function requireAdmin(client: Client, userId: string) {
  const [{ data: isAdmin }, { data: isTheatreAdmin }] = await Promise.all([
    client.rpc("has_role", { _user_id: userId, _role: "admin" }),
    client.rpc("has_role", { _user_id: userId, _role: "theatre_admin" }),
  ]);
  if (!isAdmin && !isTheatreAdmin) throw new Error("Forbidden: admin access required");
}

export async function fetchReports(client: Client) {
  const [bookingsRes, showSeatsRes, foodRes] = await Promise.all([
    client
      .from("bookings")
      .select("id, status, total_amount, created_at, shows(show_date, show_time, movies(title))"),
    client
      .from("show_seats")
      .select("show_id, status, shows(show_date, show_time, movies(title), screens(name, total_seats))")
      .eq("status", "booked"),
    client
      .from("food_orders")
      .select("quantity, price_at_order, food_items(name), bookings(status)"),
  ]);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (showSeatsRes.error) throw new Error(showSeatsRes.error.message);
  if (foodRes.error) throw new Error(foodRes.error.message);

  const confirmed = (bookingsRes.data ?? []).filter((b) => b.status === "confirmed");
  const totalRevenue = confirmed.reduce((s, b) => s + b.total_amount, 0);
  const totalBookings = confirmed.length;
  const totalTickets = (showSeatsRes.data ?? []).length;

  // Revenue by day
  const revenueByDay = new Map<string, number>();
  for (const b of confirmed) {
    const show = b.shows as unknown as { show_date: string } | null;
    if (!show) continue;
    revenueByDay.set(show.show_date, (revenueByDay.get(show.show_date) ?? 0) + b.total_amount);
  }
  const dailyRevenue = [...revenueByDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, revenue]) => ({ date, revenue }));

  // Bookings + revenue by movie
  const byMovie = new Map<string, { bookings: number; revenue: number }>();
  for (const b of confirmed) {
    const show = b.shows as unknown as { movies: { title: string } | null } | null;
    const title = show?.movies?.title ?? "Unknown";
    const cur = byMovie.get(title) ?? { bookings: 0, revenue: 0 };
    cur.bookings += 1;
    cur.revenue += b.total_amount;
    byMovie.set(title, cur);
  }
  const movieStats = [...byMovie.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // Occupancy by show
  const byShow = new Map<
    string,
    { label: string; booked: number; total: number }
  >();
  for (const row of showSeatsRes.data ?? []) {
    const show = row.shows as unknown as {
      show_date: string;
      show_time: string;
      movies: { title: string } | null;
      screens: { name: string; total_seats: number } | null;
    } | null;
    if (!show) continue;
    const cur =
      byShow.get(row.show_id) ?? {
        label: `${show.movies?.title ?? "Movie"} · ${show.show_date} ${show.show_time.slice(0, 5)}`,
        booked: 0,
        total: show.screens?.total_seats ?? 0,
      };
    cur.booked += 1;
    byShow.set(row.show_id, cur);
  }
  const occupancy = [...byShow.values()]
    .map((v) => ({ ...v, pct: v.total ? Math.round((v.booked / v.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // Food revenue by item (confirmed bookings only)
  const byItem = new Map<string, { qty: number; revenue: number }>();
  let foodRevenue = 0;
  for (const row of foodRes.data ?? []) {
    const booking = row.bookings as unknown as { status: string } | null;
    if (booking?.status !== "confirmed") continue;
    const item = row.food_items as unknown as { name: string } | null;
    const name = item?.name ?? "Item";
    const cur = byItem.get(name) ?? { qty: 0, revenue: 0 };
    cur.qty += row.quantity;
    cur.revenue += row.quantity * row.price_at_order;
    byItem.set(name, cur);
    foodRevenue += row.quantity * row.price_at_order;
  }
  const foodStats = [...byItem.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalBookings,
    totalTickets,
    foodRevenue,
    ticketRevenue: totalRevenue - foodRevenue,
    dailyRevenue,
    movieStats,
    occupancy,
    foodStats,
  };
}
