-- Per-tier pricing for shows: base_price is used for Silver, these two are
-- optional overrides for Gold and Premium seats. When null, the app falls
-- back to the multiplier defined in src/lib/pricing.ts.
ALTER TABLE public.shows
  ADD COLUMN gold_price numeric(10,2) NULL,
  ADD COLUMN premium_price numeric(10,2) NULL;
