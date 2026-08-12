-- Theatre media, geo fields, and theatre-admin assignments
alter table public.theatres
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists image_url text not null default '',
  add column if not exists video_url text not null default '';

create table if not exists public.theatre_admin_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theatre_id uuid not null references public.theatres(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, theatre_id)
);

grant select on public.theatre_admin_assignments to authenticated;
grant all on public.theatre_admin_assignments to service_role;
alter table public.theatre_admin_assignments enable row level security;

create policy "theatre_admin_assignments_select" on public.theatre_admin_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'theatre_admin')
  );

create policy "theatre_admin_assignments_write" on public.theatre_admin_assignments
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Seed geo + media for existing theatres
update public.theatres set
  latitude = 18.9220, longitude = 72.8347,
  image_url = '/images/hero-lobby.jpg',
  video_url = 'https://www.youtube.com/embed/eRsGyueVLvQ'
where name = 'CineGrand Downtown';

update public.theatres set
  latitude = 12.9716, longitude = 77.5946,
  image_url = '/images/hero-lobby.jpg',
  video_url = 'https://www.youtube.com/embed/aqz-KE-bpKQ'
where name = 'StarLine Multiplex';

update public.theatres set
  latitude = 28.6139, longitude = 77.2090,
  image_url = '/images/hero-lobby.jpg',
  video_url = 'https://www.youtube.com/embed/R6MlU_U1xaM'
where name = 'Orbit Cinemas';
