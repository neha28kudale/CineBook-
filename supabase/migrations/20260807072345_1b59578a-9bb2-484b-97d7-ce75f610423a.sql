-- Cast & crew
CREATE TABLE public.movie_cast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Actor',
  character_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movie_cast TO anon;
GRANT SELECT ON public.movie_cast TO authenticated;
GRANT ALL ON public.movie_cast TO service_role;
ALTER TABLE public.movie_cast ENABLE ROW LEVEL SECURITY;
CREATE POLICY movie_cast_read ON public.movie_cast FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY movie_cast_write ON public.movie_cast FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY movie_cast_update ON public.movie_cast FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY movie_cast_delete ON public.movie_cast FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reviews
CREATE TABLE public.movie_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL DEFAULT 'Moviegoer',
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 10),
  review text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, user_id)
);
GRANT SELECT ON public.movie_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_reviews TO authenticated;
GRANT ALL ON public.movie_reviews TO service_role;
ALTER TABLE public.movie_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_read ON public.movie_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reviews_insert ON public.movie_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_update ON public.movie_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_delete ON public.movie_reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Promo codes
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount numeric,
  min_order numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promo_codes TO anon;
GRANT SELECT ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_read ON public.promo_codes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY promo_write ON public.promo_codes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY promo_update ON public.promo_codes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY promo_delete ON public.promo_codes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Booking discount fields
ALTER TABLE public.bookings
  ADD COLUMN promo_code text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- Movie certificate + formats
ALTER TABLE public.movies
  ADD COLUMN certificate text NOT NULL DEFAULT 'UA 13+',
  ADD COLUMN formats text NOT NULL DEFAULT '2D';

-- Validate a promo code (read-only, preview discount at checkout)
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text, _order_total numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _promo public.promo_codes%rowtype;
  _discount numeric;
begin
  select * into _promo from public.promo_codes where upper(code) = upper(trim(_code));
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid promo code');
  end if;
  if not _promo.is_active then
    return jsonb_build_object('ok', false, 'message', 'This offer is no longer active');
  end if;
  if _promo.valid_until is not null and _promo.valid_until < now() then
    return jsonb_build_object('ok', false, 'message', 'This offer has expired');
  end if;
  if _promo.max_uses is not null and _promo.used_count >= _promo.max_uses then
    return jsonb_build_object('ok', false, 'message', 'This offer has been fully redeemed');
  end if;
  if _order_total < _promo.min_order then
    return jsonb_build_object('ok', false, 'message', 'Minimum order of ₹' || _promo.min_order || ' required for this offer');
  end if;
  if _promo.discount_type = 'percent' then
    _discount := round(_order_total * _promo.discount_value / 100);
    if _promo.max_discount is not null then
      _discount := least(_discount, _promo.max_discount);
    end if;
  else
    _discount := least(_promo.discount_value, _order_total);
  end if;
  return jsonb_build_object('ok', true, 'code', upper(_promo.code), 'discount', _discount, 'description', _promo.description);
end;
$$;

-- Redeem a promo code (validates and increments usage atomically)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text, _order_total numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _promo public.promo_codes%rowtype;
  _discount numeric;
begin
  select * into _promo from public.promo_codes where upper(code) = upper(trim(_code)) for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid promo code');
  end if;
  if not _promo.is_active then
    return jsonb_build_object('ok', false, 'message', 'This offer is no longer active');
  end if;
  if _promo.valid_until is not null and _promo.valid_until < now() then
    return jsonb_build_object('ok', false, 'message', 'This offer has expired');
  end if;
  if _promo.max_uses is not null and _promo.used_count >= _promo.max_uses then
    return jsonb_build_object('ok', false, 'message', 'This offer has been fully redeemed');
  end if;
  if _order_total < _promo.min_order then
    return jsonb_build_object('ok', false, 'message', 'Minimum order of ₹' || _promo.min_order || ' required for this offer');
  end if;
  if _promo.discount_type = 'percent' then
    _discount := round(_order_total * _promo.discount_value / 100);
    if _promo.max_discount is not null then
      _discount := least(_discount, _promo.max_discount);
    end if;
  else
    _discount := least(_promo.discount_value, _order_total);
  end if;
  update public.promo_codes set used_count = used_count + 1 where id = _promo.id;
  return jsonb_build_object('ok', true, 'code', upper(_promo.code), 'discount', _discount, 'description', _promo.description);
end;
$$;

REVOKE ALL ON FUNCTION public.validate_promo_code(text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_promo_code(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text, numeric) TO authenticated;

-- Seed launch offers
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, max_discount, min_order, max_uses, valid_until) VALUES
  ('WELCOME200', 'Flat ₹200 off your first booking', 'flat', 200, NULL, 499, NULL, now() + interval '6 months'),
  ('MOVIEMANIA', '15% off tickets up to ₹250', 'percent', 15, 250, 299, NULL, now() + interval '6 months'),
  ('SNACKATTACK', '10% off up to ₹150 on orders above ₹399', 'percent', 10, 150, 399, NULL, now() + interval '6 months');

-- Seed cast & crew for all movies
INSERT INTO public.movie_cast (movie_id, name, role, character_name)
SELECT m.id, c.name, c.role, c.character_name
FROM public.movies m
JOIN (VALUES
  ('Midnight Heist', 'Arjun Mehra', 'Actor', 'Rohan "The Ghost" Verma'),
  ('Midnight Heist', 'Sara Ali', 'Actor', 'Inspector Nisha Rao'),
  ('Midnight Heist', 'Vikram Sethi', 'Actor', 'Mastermind Dev'),
  ('Midnight Heist', 'Kabir Bedi', 'Actor', 'Commissioner Shah'),
  ('Midnight Heist', 'Rohan Kapoor', 'Director', ''),
  ('Midnight Heist', 'A. R. Iyer', 'Music', ''),
  ('Nebula Rising', 'Ananya Iyer', 'Actor', 'Cmdr. Mira Chen'),
  ('Nebula Rising', 'Dev Patel', 'Actor', 'Dr. Elias Ward'),
  ('Nebula Rising', 'Zoya Khan', 'Actor', 'AI Voice — NOVA'),
  ('Nebula Rising', 'Ritika Sharma', 'Director', ''),
  ('Nebula Rising', 'Arjun Nair', 'Music', ''),
  ('Kingdom of Ash', 'Rohan Verma', 'Actor', 'Prince Kael'),
  ('Kingdom of Ash', 'Ishita Rao', 'Actor', 'Queen Sable'),
  ('Kingdom of Ash', 'Aditya Menon', 'Actor', 'The Ember King'),
  ('Kingdom of Ash', 'Meera Joshi', 'Actor', 'Sage Lyra'),
  ('Kingdom of Ash', 'Sanjay Leela Gupta', 'Director', ''),
  ('Kingdom of Ash', 'Vishal Chandran', 'Music', ''),
  ('Whispers in the Dark', 'Kavya Nair', 'Actor', 'Dr. Anika Sen'),
  ('Whispers in the Dark', 'Farhan Sheikh', 'Actor', 'Caretaker Bhola'),
  ('Whispers in the Dark', 'Nisha Agarwal', 'Actor', 'The Whisper'),
  ('Whispers in the Dark', 'Vikram Desai', 'Director', ''),
  ('Whispers in the Dark', 'Tara Bhatt', 'Music', ''),
  ('Beyond the Horizon', 'Aarav Sharma', 'Actor', 'Capt. Dev Malik'),
  ('Beyond the Horizon', 'Priya Nair', 'Actor', 'Geologist Tara'),
  ('Beyond the Horizon', 'Manoj Kumar', 'Actor', 'Base Commander'),
  ('Beyond the Horizon', 'Leela Krishnan', 'Director', ''),
  ('Beyond the Horizon', 'Rahul Dev', 'Music', ''),
  ('The Last Monsoon', 'Aditya Rao', 'Actor', 'Veer'),
  ('The Last Monsoon', 'Ananya Sharma', 'Actor', 'Meera'),
  ('The Last Monsoon', 'Supriya Pillai', 'Actor', 'Dadi Amma'),
  ('The Last Monsoon', 'Imran Qureshi', 'Director', ''),
  ('The Last Monsoon', 'Shreya Menon', 'Music', ''),
  ('Laugh Riot', 'Ravi Kishan', 'Actor', 'Chintu'),
  ('Laugh Riot', 'Neha Dhupia', 'Actor', 'Babli'),
  ('Laugh Riot', 'Johnny D’Souza', 'Actor', 'Inspector Pagle'),
  ('Laugh Riot', 'Paresh Rawal', 'Actor', 'Seth Dhanlakshmi'),
  ('Laugh Riot', 'Anees Bazmee', 'Director', ''),
  ('City of Lights', 'Ranbir Malhotra', 'Actor', 'Ayaan'),
  ('City of Lights', 'Alia Verma', 'Actor', 'Rhea'),
  ('City of Lights', 'Tabu Hashmi', 'Actor', 'Amma Jaan'),
  ('City of Lights', 'Zoya Akhtar', 'Director', ''),
  ('City of Lights', 'A. R. Rahman', 'Music', '')
) AS c(movie_title, name, role, character_name) ON m.title = c.movie_title;