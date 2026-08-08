import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addFoodInput,
  confirmBookingInput,
  idInput,
  lockSeatsInput,
  promoValidateInput,
  releaseLocksInput,
} from "@/lib/schemas";
import {
  addFoodToBooking,
  cancelBooking,
  confirmBooking,
  fetchBooking,
  fetchMyBookings,
  lockSeats,
  releaseLocks,
  validatePromo,
} from "@/lib/booking.server";

export const lockSeatsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => lockSeatsInput.parse(data))
  .handler(({ data, context }) => lockSeats(context.supabase, data.showId, data.seatIds));

export const releaseLocksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => releaseLocksInput.parse(data))
  .handler(({ data, context }) =>
    releaseLocks(context.supabase, context.userId, data.showId, data.seatIds),
  );

export const confirmBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => confirmBookingInput.parse(data))
  .handler(({ data, context }) =>
    confirmBooking(context.supabase, context.userId, {
      showId: data.showId,
      seatIds: data.seatIds,
      foodItems: data.foodItems,
      paymentMethod: data.paymentMethod,
      promoCode: data.promoCode,
    }),
  );

export const validatePromoFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => promoValidateInput.parse(data))
  .handler(({ data, context }) => validatePromo(context.supabase, data.code, data.orderTotal));

export const addFoodToBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => addFoodInput.parse(data))
  .handler(({ data, context }) =>
    addFoodToBooking(context.supabase, context.userId, {
      bookingId: data.bookingId,
      foodItems: data.foodItems,
      paymentMethod: data.paymentMethod,
    }),
  );

export const getMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => fetchMyBookings(context.supabase, context.userId));

export const getBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data, context }) => fetchBooking(context.supabase, context.userId, data.id));

export const cancelBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data, context }) => cancelBooking(context.supabase, context.userId, data.id));
