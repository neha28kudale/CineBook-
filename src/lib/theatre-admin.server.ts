import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export async function getUserAdminRole(client: Client, userId: string) {
  const [{ data: isAdmin }, { data: isTheatreAdmin }] = await Promise.all([
    client.rpc("has_role", { _user_id: userId, _role: "admin" }),
    client.rpc("has_role", { _user_id: userId, _role: "theatre_admin" }),
  ]);
  return {
    isAdmin: !!isAdmin,
    isTheatreAdmin: !!isTheatreAdmin,
    isAnyAdmin: !!isAdmin || !!isTheatreAdmin,
  };
}

export async function getAssignedTheatreId(client: Client, userId: string) {
  const { data: roleRow, error: roleError } = await client
    .from("user_roles")
    .select("theatre_id")
    .eq("user_id", userId)
    .eq("role", "theatre_admin")
    .maybeSingle();
  if (roleError) throw new Error(roleError.message);
  if (roleRow?.theatre_id) return roleRow.theatre_id;

  const { data, error } = await client
    .from("theatre_admin_assignments")
    .select("theatre_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.theatre_id ?? null;
}

export async function fetchTheatreAdminDashboard(client: Client, theatreId: string) {
  const [theatreRes, showsRes, bookingsRes] = await Promise.all([
    client
      .from("theatres")
      .select("*, screens(id, name, total_seats)")
      .eq("id", theatreId)
      .single(),
    client
      .from("shows")
      .select(
        "id, show_date, show_time, base_price, movies(title), screens!inner(name, theatre_id)",
      )
      .eq("screens.theatre_id", theatreId)
      .gte("show_date", new Date().toISOString().slice(0, 10))
      .order("show_date")
      .order("show_time")
      .limit(50),
    client
      .from("bookings")
      .select(
        "id, status, total_amount, created_at, shows(show_date, show_time, movies(title), screens!inner(name, theatre_id))",
      )
      .eq("status", "confirmed")
      .eq("shows.screens.theatre_id", theatreId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (theatreRes.error) throw new Error(theatreRes.error.message);
  if (showsRes.error) throw new Error(showsRes.error.message);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);

  const confirmed = bookingsRes.data ?? [];
  const totalRevenue = confirmed.reduce((s, b) => s + b.total_amount, 0);

  return {
    theatre: theatreRes.data,
    upcomingShows: showsRes.data ?? [],
    recentBookings: confirmed,
    stats: {
      totalBookings: confirmed.length,
      totalRevenue,
      screenCount: theatreRes.data?.screens?.length ?? 0,
      upcomingShowCount: (showsRes.data ?? []).length,
    },
  };
}

export async function assignTheatreAdminByUserId(
  client: Client,
  userId: string,
  theatreId: string,
) {
  const { data: existingRole } = await client
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "theatre_admin")
    .maybeSingle();

  if (existingRole) {
    const { error: roleError } = await client
      .from("user_roles")
      .update({ theatre_id: theatreId })
      .eq("id", existingRole.id);
    if (roleError) throw new Error(roleError.message);
  } else {
    const { error: roleError } = await client
      .from("user_roles")
      .insert({ user_id: userId, role: "theatre_admin", theatre_id: theatreId });
    if (roleError) throw new Error(roleError.message);
  }

  const { error: assignError } = await client
    .from("theatre_admin_assignments")
    .upsert({ user_id: userId, theatre_id: theatreId }, { onConflict: "user_id,theatre_id" });
  if (assignError) throw new Error(assignError.message);

  return { ok: true };
}
