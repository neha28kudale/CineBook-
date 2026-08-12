import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, requireAccessScope, fetchReports } from "@/lib/admin-helpers.server";
import {
  foodItemInput,
  idInput,
  movieInput,
  promoInput,
  screenInput,
  seatLayoutInput,
  showInput,
  theatreInput,
} from "@/lib/schemas";

// ---------- Admin gate ----------
export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return !!data;
  });

// ---------- Reports ----------
export const adminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return fetchReports(context.supabase);
  });

// ---------- Movies ----------
export const upsertMovie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => movieInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...row } = data;
    const query = id
      ? context.supabase.from("movies").update(row).eq("id", id)
      : context.supabase.from("movies").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMovie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("movies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Theatres & screens ----------
export const listTheatresAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("theatres")
      .select("*, screens(id, name, total_seats)")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTheatre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => theatreInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...row } = data;
    const query = id
      ? context.supabase.from("theatres").update(row).eq("id", id)
      : context.supabase.from("theatres").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTheatre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("theatres").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertScreen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => screenInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...row } = data;
    const query = id
      ? context.supabase.from("screens").update(row).eq("id", id)
      : context.supabase.from("screens").insert({ ...row, total_seats: 0 });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteScreen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("screens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getScreenSeats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: seats, error } = await context.supabase
      .from("seats")
      .select("id, row_label, seat_number, seat_type, is_aisle_gap")
      .eq("screen_id", data.id)
      .order("row_label")
      .order("seat_number");
    if (error) throw new Error(error.message);
    return seats ?? [];
  });

export const saveSeatLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => seatLayoutInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error: delError } = await context.supabase
      .from("seats")
      .delete()
      .eq("screen_id", data.screenId);
    if (delError) {
      throw new Error(
        "Could not replace the layout — seats may be in use by scheduled shows or bookings.",
      );
    }
    if (data.seats.length) {
      const { error: insError } = await context.supabase
        .from("seats")
        .insert(data.seats.map((s) => ({ ...s, screen_id: data.screenId, is_aisle_gap: false })));
      if (insError) throw new Error(insError.message);
    }
    await context.supabase
      .from("screens")
      .update({ total_seats: data.seats.length })
      .eq("id", data.screenId);
    return { ok: true, count: data.seats.length };
  });

// ---------- Shows ----------
export const listShowsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("shows")
      .select(
        "id, show_date, show_time, base_price, gold_price, premium_price, movie_id, screen_id, movies(title), screens(name, theatres(name))",
      )
      .order("show_date", { ascending: false })
      .order("show_time", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => showInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...row } = data;
    const query = id
      ? context.supabase.from("shows").update(row).eq("id", id)
      : context.supabase.from("shows").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("shows").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Food ----------
export const upsertFoodItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => foodItemInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...row } = data;
    const query = id
      ? context.supabase.from("food_items").update(row).eq("id", id)
      : context.supabase.from("food_items").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFoodItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("food_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Promo codes ----------
export const listPromosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => promoInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const row = { ...rest, code: rest.code.toUpperCase() };
    const query = id
      ? context.supabase.from("promo_codes").update(row).eq("id", id)
      : context.supabase.from("promo_codes").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("promo_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Theatre Dashboard & Theatre Admin Management ----------

export const theatreDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const scope = await requireAccessScope(context.supabase, context.userId);
    const theatreId = scope.role === "theatre_admin" ? scope.theatreId : undefined;

    // Fetch theatre info if scoped
    let theatre = null;
    if (theatreId) {
      const { data } = await context.supabase
        .from("theatres")
        .select("id, name, address, city, state")
        .eq("id", theatreId)
        .single();
      theatre = data;
    }

    // Fetch reports scoped to theatre (if applicable)
    const reports = await fetchReports(context.supabase, theatreId);

    // Fetch upcoming/recent shows for this theatre
    let showsQuery = context.supabase
      .from("shows")
      .select(
        "id, show_date, show_time, base_price, movie_id, screen_id, movies(title), screens(name, theatre_id)",
      )
      .order("show_date", { ascending: false })
      .order("show_time", { ascending: false })
      .limit(30);

    if (theatreId) {
      // Filter to this theatre's screens
      const { data: theatreScreens } = await context.supabase
        .from("screens")
        .select("id")
        .eq("theatre_id", theatreId);
      if (theatreScreens?.length) {
        const screenIds = theatreScreens.map((s) => s.id);
        showsQuery = showsQuery.in("screen_id", screenIds);
      } else {
        // Theatre has no screens, return empty shows
        return { scope, theatre, reports, shows: [] };
      }
    }

    const { data: shows } = await showsQuery;

    return {
      scope,
      theatre,
      reports,
      shows: shows ?? [],
    };
  });

// Schema for theatre admin assignment
const assignTheatreAdminInput = z.object({
  email: z.string().email(),
  theatreId: z.string().uuid(),
});

export const listTheatreAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);

    // Get all theatre_admin role assignments
    const { data: assignments, error } = await context.supabase
      .from("user_roles")
      .select("id, user_id, theatre_id, theatres(id, name)")
      .eq("role", "theatre_admin");

    if (error) throw new Error(error.message);

    // For each assignment, get the user email from Supabase Auth
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const result = [];
    for (const assignment of assignments ?? []) {
      try {
        const user = await supabaseAdmin.auth.admin.getUserById(assignment.user_id);
        result.push({
          id: assignment.id,
          userId: assignment.user_id,
          email: user.user?.email ?? "Unknown",
          theatre: assignment.theatres as unknown as { id: string; name: string } | null,
        });
      } catch {
        // User might have been deleted, skip
        continue;
      }
    }

    return result;
  });

export const assignTheatreAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => assignTheatreAdminInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    const { email, theatreId } = data;

    // Look up the user by email using service role auth
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find((u) => u.email === email);

    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    // Check if theatre exists
    const { data: theatre, error: theatreError } = await context.supabase
      .from("theatres")
      .select("id")
      .eq("id", theatreId)
      .single();

    if (theatreError || !theatre) {
      throw new Error("Theatre not found");
    }

    // Upsert the user_roles row using service role (bypasses RLS)
    const { error: upsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "theatre_admin", theatre_id: theatreId },
        { onConflict: "user_id,role" },
      );

    if (upsertError) throw new Error(upsertError.message);

    return { ok: true, userId: user.id, email };
  });

export const removeTheatreAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
