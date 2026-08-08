import { z } from "zod";

export const lockSeatsInput = z.object({
  showId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1, "Select at least one seat").max(10, "Max 10 seats per booking"),
});

export const releaseLocksInput = z.object({
  showId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).optional(),
});

export const confirmBookingInput = z.object({
  showId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1).max(10),
  foodItems: z
    .array(
      z.object({
        foodItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .max(20)
    .default([]),
  paymentMethod: z.enum(["card", "upi", "netbanking", "wallet"]),
  promoCode: z.string().trim().max(50).optional(),
});

export const movieInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(""),
  genre: z.string().trim().max(100).default(""),
  language: z.string().trim().max(50).default("English"),
  duration_min: z.number().int().min(1).max(600),
  rating: z.number().min(0).max(10).default(7),
  cast_members: z.string().trim().max(500).default(""),
  poster_url: z.string().trim().max(1000).default(""),
  trailer_url: z.string().trim().max(1000).default(""),
  release_date: z.string().trim().max(20).default(""),
  status: z.enum(["now_showing", "upcoming"]),
  certificate: z.string().trim().max(10).default("UA 13+"),
  formats: z.string().trim().max(60).default("2D"),
});

export const theatreInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  address: z.string().trim().max(500).default(""),
});

export const screenInput = z.object({
  id: z.string().uuid().optional(),
  theatre_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
});

export const seatLayoutInput = z.object({
  screenId: z.string().uuid(),
  seats: z
    .array(
      z.object({
        row_label: z.string().trim().min(1).max(3),
        seat_number: z.number().int().min(1).max(40),
        seat_type: z.enum(["silver", "gold", "premium"]),
      }),
    )
    .max(1000),
});

export const showInput = z.object({
  id: z.string().uuid().optional(),
  movie_id: z.string().uuid(),
  screen_id: z.string().uuid(),
  show_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  show_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  base_price: z.number().min(1).max(10000),
});

export const foodItemInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(50),
  price: z.number().min(0).max(10000),
  image_url: z.string().trim().max(1000).default(""),
  is_veg: z.boolean().default(true),
  is_available: z.boolean().default(true),
});

export const idInput = z.object({ id: z.string().uuid() });
export const showtimesInput = z.object({
  movieId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().trim().max(100).optional(),
});

export const reviewInput = z.object({
  movieId: z.string().uuid(),
  rating: z.number().int().min(1, "Pick a rating").max(10),
  review: z.string().trim().max(1000).default(""),
});

export const promoValidateInput = z.object({
  code: z.string().trim().min(1, "Enter a promo code").max(50),
  orderTotal: z.number().min(0),
});

export const promoInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(50),
  description: z.string().trim().max(300).default(""),
  discount_type: z.enum(["percent", "flat"]),
  discount_value: z.number().min(1).max(100000),
  max_discount: z.number().min(0).max(100000).nullable().default(null),
  min_order: z.number().min(0).max(1000000).default(0),
  max_uses: z.number().int().min(1).nullable().default(null),
  valid_until: z.string().trim().max(40).nullable().default(null),
  is_active: z.boolean().default(true),
});

export const addFoodInput = z.object({
  bookingId: z.string().uuid(),
  foodItems: z
    .array(
      z.object({
        foodItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1, "Select at least one item")
    .max(20),
  paymentMethod: z.enum(["card", "upi", "netbanking", "wallet"]),
});
