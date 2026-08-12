import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin-helpers.server";
import { theatreMediaInput } from "@/lib/schemas";
import {
  assignTheatreAdminByUserId,
  fetchTheatreAdminDashboard,
  getAssignedTheatreId,
  getUserAdminRole,
} from "@/lib/theatre-admin.server";

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getUserAdminRole(context.supabase, context.userId);
    const theatreId = roles.isTheatreAdmin
      ? await getAssignedTheatreId(context.supabase, context.userId)
      : null;
    return { ...roles, assignedTheatreId: theatreId };
  });

export const theatreAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getUserAdminRole(context.supabase, context.userId);
    if (!roles.isTheatreAdmin && !roles.isAdmin) {
      throw new Error("Forbidden: theatre admin access required");
    }

    const theatreId =
      roles.isAdmin && !roles.isTheatreAdmin
        ? null
        : await getAssignedTheatreId(context.supabase, context.userId);

    if (!theatreId) {
      throw new Error("No theatre assigned to this account. Contact a system admin.");
    }

    return fetchTheatreAdminDashboard(context.supabase, theatreId);
  });

export const assignTheatreAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), theatreId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    return assignTheatreAdminByUserId(context.supabase, data.userId, data.theatreId);
  });

export const listTheatreAdminAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("theatre_admin_assignments")
      .select("id, user_id, theatre_id, theatres(name, city)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateTheatreMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => theatreMediaInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getUserAdminRole(context.supabase, context.userId);
    if (!roles.isAdmin && !roles.isTheatreAdmin) {
      throw new Error("Forbidden");
    }

    if (!roles.isAdmin) {
      const assignedId = await getAssignedTheatreId(context.supabase, context.userId);
      if (!assignedId || assignedId !== data.id) {
        throw new Error("You can only edit your assigned theatre.");
      }
    }

    const { id, ...fields } = data;
    const { error } = await context.supabase.from("theatres").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
