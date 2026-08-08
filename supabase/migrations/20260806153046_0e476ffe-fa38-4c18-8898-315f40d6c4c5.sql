create type public.app_role as enum ('admin','theatre_admin','customer');
create type public.movie_status as enum ('now_showing','upcoming');
create type public.seat_type as enum ('silver','gold','premium');
create type public.show_seat_status as enum ('locked','booked');
create type public.booking_status as enum ('pending','confirmed','cancelled');

-- PROFILES & ROLES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  if (select count(*) from auth.users) <= 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'customer');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "user_roles_select" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- MOVIES
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  genre text not null default '',
  language text not null default 'English',
  duration_min integer not null default 120,
  rating numeric(3,1) not null default 7.0,
  poster_url text not null default '',
  trailer_url text not null default '',
  cast_members text not null default '',
  status movie_status not null default 'now_showing',
  release_date date not null default current_date,
  created_at timestamptz not null default now()
);
grant select on public.movies to anon, authenticated;
grant insert, update, delete on public.movies to authenticated;
grant all on public.movies to service_role;
alter table public.movies enable row level security;
create policy "movies_read" on public.movies for select to anon, authenticated using (true);
create policy "movies_write" on public.movies for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "movies_update" on public.movies for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "movies_delete" on public.movies for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- THEATRES / SCREENS / SEATS
create table public.theatres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  city text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.theatres to anon, authenticated;
grant insert, update, delete on public.theatres to authenticated;
grant all on public.theatres to service_role;
alter table public.theatres enable row level security;
create policy "theatres_read" on public.theatres for select to anon, authenticated using (true);
create policy "theatres_write" on public.theatres for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "theatres_update" on public.theatres for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "theatres_delete" on public.theatres for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.screens (
  id uuid primary key default gen_random_uuid(),
  theatre_id uuid not null references public.theatres(id) on delete cascade,
  name text not null,
  total_seats integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.screens to anon, authenticated;
grant insert, update, delete on public.screens to authenticated;
grant all on public.screens to service_role;
alter table public.screens enable row level security;
create policy "screens_read" on public.screens for select to anon, authenticated using (true);
create policy "screens_write" on public.screens for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "screens_update" on public.screens for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "screens_delete" on public.screens for delete to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens(id) on delete cascade,
  row_label text not null,
  seat_number integer not null,
  seat_type seat_type not null default 'silver',
  is_aisle_gap boolean not null default false,
  unique (screen_id, row_label, seat_number)
);
grant select on public.seats to anon, authenticated;
grant insert, update, delete on public.seats to authenticated;
grant all on public.seats to service_role;
alter table public.seats enable row level security;
create policy "seats_read" on public.seats for select to anon, authenticated using (true);
create policy "seats_write" on public.seats for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "seats_update" on public.seats for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "seats_delete" on public.seats for delete to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));

-- SHOWS
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  screen_id uuid not null references public.screens(id) on delete cascade,
  show_date date not null,
  show_time time not null,
  base_price numeric(10,2) not null default 200,
  created_at timestamptz not null default now()
);
grant select on public.shows to anon, authenticated;
grant insert, update, delete on public.shows to authenticated;
grant all on public.shows to service_role;
alter table public.shows enable row level security;
create policy "shows_read" on public.shows for select to anon, authenticated using (true);
create policy "shows_write" on public.shows for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "shows_update" on public.shows for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "shows_delete" on public.shows for delete to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));

-- BOOKINGS
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  total_amount numeric(10,2) not null default 0,
  status booking_status not null default 'confirmed',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "bookings_select" on public.bookings for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'));
create policy "bookings_insert" on public.bookings for insert to authenticated with check (user_id = auth.uid());
create policy "bookings_update" on public.bookings for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- SHOW SEATS (live seat state)
create table public.show_seats (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete cascade,
  status show_seat_status not null,
  locked_by uuid references auth.users(id) on delete set null,
  locked_until timestamptz,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (show_id, seat_id)
);
grant select on public.show_seats to anon, authenticated;
grant update, delete on public.show_seats to authenticated;
grant all on public.show_seats to service_role;
alter table public.show_seats enable row level security;
create policy "show_seats_read" on public.show_seats for select to anon, authenticated using (true);
create policy "show_seats_update_own" on public.show_seats for update to authenticated
  using (locked_by = auth.uid()) with check (locked_by = auth.uid());
create policy "show_seats_release_lock" on public.show_seats for delete to authenticated
  using (locked_by = auth.uid());

-- BOOKING SEATS
create table public.booking_seats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete cascade,
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.booking_seats to authenticated;
grant all on public.booking_seats to service_role;
alter table public.booking_seats enable row level security;
create policy "booking_seats_select" on public.booking_seats for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'))));
create policy "booking_seats_insert" on public.booking_seats for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

-- PAYMENTS
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  method text not null default 'upi',
  amount numeric(10,2) not null default 0,
  status text not null default 'success',
  transaction_ref text not null default '',
  paid_at timestamptz not null default now()
);
grant select, insert on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments_select" on public.payments for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'))));
create policy "payments_insert" on public.payments for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

-- FOOD
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Snacks',
  price numeric(10,2) not null default 0,
  image_url text not null default '',
  is_veg boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.food_items to anon, authenticated;
grant insert, update, delete on public.food_items to authenticated;
grant all on public.food_items to service_role;
alter table public.food_items enable row level security;
create policy "food_read" on public.food_items for select to anon, authenticated using (true);
create policy "food_write" on public.food_items for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "food_update" on public.food_items for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "food_delete" on public.food_items for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.food_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete cascade,
  quantity integer not null default 1,
  price_at_order numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.food_orders to authenticated;
grant all on public.food_orders to service_role;
alter table public.food_orders enable row level security;
create policy "food_orders_select" on public.food_orders for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'theatre_admin'))));
create policy "food_orders_insert" on public.food_orders for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));

-- SEAT LOCKING FUNCTIONS
create or replace function public.lock_show_seats(_show_id uuid, _seat_ids uuid[], _ttl_minutes integer default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _sid uuid;
  _rec public.show_seats%rowtype;
  _now timestamptz := now();
  _until timestamptz;
  _blocked jsonb := '[]'::jsonb;
begin
  if _uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  delete from public.show_seats
  where show_id = _show_id and status = 'locked' and locked_until < _now;

  foreach _sid in array _seat_ids loop
    select * into _rec from public.show_seats where show_id = _show_id and seat_id = _sid;
    if found then
      if _rec.status = 'booked' then
        _blocked := _blocked || jsonb_build_array(jsonb_build_object('seat', _sid, 'reason', 'booked'));
      elsif _rec.status = 'locked' and _rec.locked_by is distinct from _uid then
        _blocked := _blocked || jsonb_build_array(jsonb_build_object('seat', _sid, 'reason', 'locked'));
      end if;
    end if;
  end loop;

  if jsonb_array_length(_blocked) > 0 then
    return jsonb_build_object('ok', false, 'reason', 'unavailable', 'blocked', _blocked);
  end if;

  _until := _now + make_interval(mins => _ttl_minutes);
  foreach _sid in array _seat_ids loop
    insert into public.show_seats (show_id, seat_id, status, locked_by, locked_until)
    values (_show_id, _sid, 'locked', _uid, _until)
    on conflict (show_id, seat_id) do update
      set status = 'locked', locked_by = _uid, locked_until = _until, booking_id = null;
  end loop;

  return jsonb_build_object('ok', true, 'locked_until', _until);
end;
$$;

create or replace function public.release_expired_locks()
returns void language sql security definer set search_path = public as $$
  delete from public.show_seats where status = 'locked' and locked_until < now();
$$;

grant execute on function public.lock_show_seats(uuid, uuid[], integer) to authenticated;
grant execute on function public.release_expired_locks() to authenticated;

alter publication supabase_realtime add table public.show_seats;

-- SEED DATA
insert into public.movies (title, description, genre, language, duration_min, rating, poster_url, trailer_url, cast_members, status, release_date) values
('Nebula Rising', 'A stranded astronaut discovers a derelict ship carrying a signal that predates humanity — and something is still answering it. A sweeping sci-fi epic about loneliness, first contact, and the cost of curiosity.', 'Sci-Fi', 'English', 142, 8.4, '/images/posters/nebula-rising.jpg', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'Arjun Mehta, Sofia Reyes, Daniel Okafor', 'now_showing', current_date - 12),
('The Last Monsoon', 'Two childhood sweethearts reunite in their rain-soaked hometown after a decade apart, only to find the flood that once separated them is returning. A tender romance drama.', 'Romance', 'Hindi', 138, 7.9, '/images/posters/last-monsoon.jpg', 'https://www.youtube.com/embed/eRsGyueVLvQ', 'Priya Sharma, Rohan Kapoor, Meena Iyer', 'now_showing', current_date - 8),
('Midnight Heist', 'A retired thief assembles a crew of misfits for one impossible job: rob the city''s most secure vault during a total blackout. Taut, twisty, and relentlessly fun.', 'Action', 'English', 121, 7.6, '/images/posters/midnight-heist.jpg', 'https://www.youtube.com/embed/R6MlU_U1xaM', 'Vikram Rathore, Lena Cruz, Marcus Bell', 'now_showing', current_date - 5),
('Whispers in the Dark', 'A sound archivist restoring old tapes begins to hear a voice that answers her questions — before she asks them. A slow-burn supernatural horror.', 'Horror', 'English', 109, 7.2, '/images/posters/whispers-dark.jpg', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'Anaya Bose, Claire Whitfield', 'now_showing', current_date - 3),
('Laugh Riot', 'Three failing stand-up comedians accidentally kidnap a crime lord''s prized parrot — the only witness to his crimes. Chaos, chase sequences, and non-stop gags.', 'Comedy', 'Hindi', 116, 7.0, '/images/posters/laugh-riot.jpg', 'https://www.youtube.com/embed/eRsGyueVLvQ', 'Kabir Anand, Dolly Singh, Feroz Khan', 'now_showing', current_date - 15),
('Kingdom of Ash', 'An exiled queen marches on the capital with an army of outcasts and a dragon that refuses to fight. A fantasy epic of fire, loyalty, and ruin.', 'Fantasy', 'English', 158, 8.8, '/images/posters/kingdom-ash.jpg', 'https://www.youtube.com/embed/R6MlU_U1xaM', 'Elena Vasquez, Tom Aldridge, Hana Sato', 'now_showing', current_date - 20),
('Beyond the Horizon', 'A young cartographer joins a skyship expedition to chart the edge of the world — where maps simply stop. Grand adventure arrives this winter.', 'Adventure', 'English', 131, 8.1, '/images/posters/beyond-horizon.jpg', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'Noah Fernandes, Ivy Chen', 'upcoming', current_date + 21),
('City of Lights', 'A street musician and a ballet dancer chase their dreams through one magical, musical night in the city that never sleeps.', 'Musical', 'Hindi', 127, 7.8, '/images/posters/city-lights.jpg', 'https://www.youtube.com/embed/eRsGyueVLvQ', 'Aisha Rahman, Dev Malhotra', 'upcoming', current_date + 35);

insert into public.theatres (name, address, city) values
('CineGrand Downtown', '12 Marina Parade Road', 'Mumbai'),
('StarLine Multiplex', '88 Orbit Mall, Sector 5', 'Bengaluru'),
('Orbit Cinemas', '4 Nebula Avenue', 'Delhi');

insert into public.screens (theatre_id, name)
select t.id, s.name from public.theatres t cross join (values ('Screen 1'),('Screen 2')) as s(name) order by t.name, s.name;

insert into public.seats (screen_id, row_label, seat_number, seat_type, is_aisle_gap)
select s.id, chr(64 + r), c,
  case when r <= 3 then 'silver'::seat_type when r <= 8 then 'gold'::seat_type else 'premium'::seat_type end,
  (c = 5 or c = 9)
from public.screens s
cross join generate_series(1,10) r
cross join generate_series(1,12) c;

update public.screens sc set total_seats = (select count(*) from public.seats st where st.screen_id = sc.id and not st.is_aisle_gap);

insert into public.shows (movie_id, screen_id, show_date, show_time, base_price)
select m.id, sc.id, current_date + d, t.slot, (170 + (m.rn * 20))::numeric
from (select id, row_number() over (order by title) rn from public.movies where status = 'now_showing') m
join (select s.id, row_number() over (order by th.name, s.name) rn from public.screens s join public.theatres th on th.id = s.theatre_id) sc on sc.rn = m.rn
cross join generate_series(0,4) d
cross join (values ('10:00'::time),('13:30'::time),('18:00'::time),('21:30'::time)) as t(slot);

insert into public.food_items (name, category, price, image_url, is_veg, is_available) values
('Butter Popcorn (Large)', 'Popcorn', 250, '/images/food/popcorn.jpg', true, true),
('Cola (500ml)', 'Beverages', 120, '/images/food/cola.jpg', true, true),
('Loaded Nachos', 'Snacks', 280, '/images/food/nachos.jpg', true, true),
('Peri-Peri Fries', 'Snacks', 180, '/images/food/fries.jpg', true, true),
('Margherita Pizza (Personal)', 'Snacks', 320, '/images/food/pizza.jpg', true, true),
('Grilled Chicken Burger', 'Snacks', 300, '/images/food/burger.jpg', false, true),
('Cold Coffee', 'Beverages', 160, '/images/food/cold-coffee.jpg', true, true),
('Movie Combo: Popcorn + Cola', 'Combos', 330, '/images/food/combo.jpg', true, true);