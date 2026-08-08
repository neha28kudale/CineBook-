import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { seatPrice, type SeatTier } from "@/lib/pricing";

type Client = SupabaseClient<Database>;

type PromoResult = {
  ok: boolean;
  message?: string;
  code?: string;
  discount?: number;
  description?: string;
};

export async function validatePromo(client: Client, code: string, orderTotal: number) {
  const { data, error } = await client.rpc("validate_promo_code", {
    _code: code,
    _order_total: orderTotal,
  });
  if (error) throw new Error(error.message);
  return data as PromoResult;
}

export async function addFoodToBooking(
  client: Client,
  userId: string,
  input: {
    bookingId: string;
    foodItems: { foodItemId: string; quantity: number }[];
    paymentMethod: string;
  },
) {
  const { data: booking, error } = await client
    .from("bookings")
    .select("id, status, total_amount, shows(show_date, show_time)")
    .eq("id", input.bookingId)
    .eq("user_id", userId)
    .single();
  if (error || !booking) throw new Error("Booking not found");
  if (booking.status !== "confirmed") {
    throw new Error("Food can only be added to confirmed bookings");
  }
  const show = booking.shows as unknown as { show_date: string; show_time: string } | null;
  if (show && new Date(`${show.show_date}T${show.show_time}`).getTime() <= Date.now()) {
    throw new Error("This show has already started");
  }

  const ids = input.foodItems.map((f) => f.foodItemId);
  const { data: items, error: foodError } = await client
    .from("food_items")
    .select("id, price, is_available")
    .in("id", ids);
  if (foodError) throw new Error(foodError.message);
  const rows = input.foodItems
    .map((f) => {
      const item = items?.find((i) => i.id === f.foodItemId && i.is_available);
      return item
        ? {
            booking_id: input.bookingId,
            food_item_id: item.id,
            quantity: f.quantity,
            price_at_order: item.price,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (!rows.length) throw new Error("Selected items are no longer available");
  const foodTotal = rows.reduce((sum, r) => sum + r.price_at_order * r.quantity, 0);

  const { error: foError } = await client.from("food_orders").insert(rows);
  if (foError) throw new Error(foError.message);

  const { error: updError } = await client
    .from("bookings")
    .update({ total_amount: booking.total_amount + foodTotal })
    .eq("id", input.bookingId);
  if (updError) throw new Error(updError.message);

  const { error: payError } = await client.from("payments").insert({
    booking_id: input.bookingId,
    method: input.paymentMethod,
    amount: foodTotal,
    status: "completed",
    transaction_ref: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
  });
  if (payError) throw new Error(payError.message);

  return { ok: true, added: foodTotal };
}

const BOOKING_SELECT = `
  id, status, total_amount, promo_code, discount_amount, created_at, show_id,
  shows(show_date, show_time, base_price,
    movies(title, poster_url, rating),
    screens(name, theatres(name, city))),
  booking_seats(price, seats(row_label, seat_number, seat_type)),
  payments(method, amount, status, transaction_ref, paid_at),
  food_orders(quantity, price_at_order, food_items(name))
`;

export async function lockSeats(client: Client, showId: string, seatIds: string[]) {
  const { data, error } = await client.rpc("lock_show_seats", {
    _show_id: showId,
    _seat_ids: seatIds,
    _ttl_minutes: 10,
  });
  if (error) throw new Error(error.message);
  const result = data as { locked_until?: string; error?: string } | null;
  if (result?.error) throw new Error(result.error);
  return result;
}

export async function releaseLocks(
  client: Client,
  userId: string,
  showId: string,
  seatIds?: string[],
) {
  let query = client
    .from("show_seats")
    .delete()
    .eq("show_id", showId)
    .eq("locked_by", userId)
    .eq("status", "locked");
  if (seatIds?.length) query = query.in("seat_id", seatIds);
  const { error } = await query;
  if (error) throw new Error(error.message);
  return { released: true };
}

export async function confirmBooking(
  client: Client,
  userId: string,
  input: {
    showId: string;
    seatIds: string[];
    foodItems: { foodItemId: string; quantity: number }[];
    paymentMethod: string;
    promoCode?: string | undefined;
  },
) {
  const { data: show, error: showError } = await client
    .from("shows")
    .select("id, base_price, gold_price, premium_price, show_date, show_time")
    .eq("id", input.showId)
    .single();
  if (showError) throw new Error("Show not found");

  // Verify the caller still holds valid locks on every requested seat.
  const now = new Date().toISOString();
  const { data: locks, error: lockError } = await client
    .from("show_seats")
    .select("seat_id, locked_until")
    .eq("show_id", input.showId)
    .eq("locked_by", userId)
    .eq("status", "locked")
    .in("seat_id", input.seatIds)
    .gt("locked_until", now);
  if (lockError) throw new Error(lockError.message);
  if ((locks?.length ?? 0) !== input.seatIds.length) {
    throw new Error("Your seat lock has expired. Please select the seats again.");
  }

  const { data: seats, error: seatsError } = await client
    .from("seats")
    .select("id, seat_type")
    .in("id", input.seatIds);
  if (seatsError || !seats?.length) throw new Error("Seats not found");

  const ticketTotal = seats.reduce(
    (sum, seat) => sum + seatPrice(show.base_price, seat.seat_type as SeatTier, show),
    0,
  );

  let foodTotal = 0;
  let foodRows: { food_item_id: string; quantity: number; price_at_order: number }[] = [];
  if (input.foodItems.length) {
    const ids = input.foodItems.map((f) => f.foodItemId);
    const { data: items, error: foodError } = await client
      .from("food_items")
      .select("id, price, is_available")
      .in("id", ids);
    if (foodError) throw new Error(foodError.message);
    foodRows = input.foodItems
      .map((f) => {
        const item = items?.find((i) => i.id === f.foodItemId && i.is_available);
        return item
          ? { food_item_id: item.id, quantity: f.quantity, price_at_order: item.price }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    foodTotal = foodRows.reduce((sum, r) => sum + r.price_at_order * r.quantity, 0);
  }

  const totalAmount = ticketTotal + foodTotal;

  // Redeem promo code atomically (checks validity, expiry, min order, usage cap).
  let discount = 0;
  let appliedCode: string | null = null;
  if (input.promoCode) {
    const { data: promoResult, error: promoError } = await client.rpc("redeem_promo_code", {
      _code: input.promoCode,
      _order_total: totalAmount,
    });
    if (promoError) throw new Error(promoError.message);
    const promo = promoResult as PromoResult;
    if (!promo.ok) throw new Error(promo.message ?? "Promo code could not be applied");
    discount = promo.discount ?? 0;
    appliedCode = promo.code ?? input.promoCode.toUpperCase();
  }
  const finalAmount = Math.max(0, totalAmount - discount);

  const { data: booking, error: bookingError } = await client
    .from("bookings")
    .insert({
      user_id: userId,
      show_id: input.showId,
      status: "confirmed",
      total_amount: finalAmount,
      promo_code: appliedCode,
      discount_amount: discount,
    })
    .select("id")
    .single();
  if (bookingError) throw new Error(bookingError.message);

  const { error: bsError } = await client.from("booking_seats").insert(
    seats.map((seat) => ({
      booking_id: booking.id,
      seat_id: seat.id,
      price: seatPrice(show.base_price, seat.seat_type as SeatTier, show),
    })),
  );
  if (bsError) throw new Error(bsError.message);

  const { error: ssError } = await client
    .from("show_seats")
    .update({ status: "booked", booking_id: booking.id, locked_until: null })
    .eq("show_id", input.showId)
    .eq("locked_by", userId)
    .eq("status", "locked")
    .in("seat_id", input.seatIds);
  if (ssError) throw new Error(ssError.message);

  const { error: payError } = await client.from("payments").insert({
    booking_id: booking.id,
    method: input.paymentMethod,
    amount: finalAmount,
    status: "completed",
    transaction_ref: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
  });
  if (payError) throw new Error(payError.message);

  if (foodRows.length) {
    const { error: foError } = await client
      .from("food_orders")
      .insert(foodRows.map((r) => ({ ...r, booking_id: booking.id })));
    if (foError) throw new Error(foError.message);
  }

  return { bookingId: booking.id, totalAmount };
}

export async function fetchMyBookings(client: Client, userId: string) {
  const { data, error } = await client
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBooking(client: Client, userId: string, bookingId: string) {
  const { data, error } = await client
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .eq("user_id", userId)
    .single();
  if (error) throw new Error("Booking not found");
  return data;
}

export async function cancelBooking(client: Client, userId: string, bookingId: string) {
  const { data: booking, error } = await client
    .from("bookings")
    .select("id, status, shows(show_date, show_time)")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .single();
  if (error || !booking) throw new Error("Booking not found");
  if (booking.status !== "confirmed") throw new Error("Only confirmed bookings can be cancelled");

  const show = booking.shows as unknown as { show_date: string; show_time: string } | null;
  if (!show) throw new Error("Show not found");
  const start = new Date(`${show.show_date}T${show.show_time}`);
  const cutoff = Date.now() + 6 * 60 * 60 * 1000;
  if (start.getTime() <= cutoff) {
    throw new Error("Bookings can only be cancelled up to 6 hours before the show");
  }

  const { error: updError } = await client
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);
  if (updError) throw new Error(updError.message);

  await client.from("payments").update({ status: "refunded" }).eq("booking_id", bookingId);
  const { error: freeError } = await client
    .from("show_seats")
    .delete()
    .eq("booking_id", bookingId)
    .eq("status", "booked");
  if (freeError) throw new Error(freeError.message);

  return { cancelled: true };
}
