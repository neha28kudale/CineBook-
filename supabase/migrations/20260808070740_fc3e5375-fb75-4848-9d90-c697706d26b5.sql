
create table public.theatre_polls (
  id uuid primary key default gen_random_uuid(),
  theatre_id uuid not null references public.theatres(id) on delete cascade,
  title text not null,
  description text not null default '',
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.theatre_polls to anon;
grant select, insert, update, delete on public.theatre_polls to authenticated;
grant all on public.theatre_polls to service_role;
alter table public.theatre_polls enable row level security;
create policy "polls readable" on public.theatre_polls for select using (true);
create policy "admins manage polls" on public.theatre_polls for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.theatre_polls(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, movie_id)
);
grant select on public.poll_options to anon;
grant select, insert, update, delete on public.poll_options to authenticated;
grant all on public.poll_options to service_role;
alter table public.poll_options enable row level security;
create policy "options readable" on public.poll_options for select using (true);
create policy "admins manage options" on public.poll_options for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.theatre_polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);
grant select on public.poll_votes to anon;
grant select, insert, update, delete on public.poll_votes to authenticated;
grant all on public.poll_votes to service_role;
alter table public.poll_votes enable row level security;
create policy "votes readable" on public.poll_votes for select using (true);
create policy "vote as self" on public.poll_votes for insert to authenticated with check (auth.uid() = user_id);
create policy "change own vote" on public.poll_votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "remove own vote" on public.poll_votes for delete to authenticated using (auth.uid() = user_id);

create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  theatre_id uuid not null references public.theatres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (theatre_id, user_id)
);
grant select on public.community_members to anon;
grant select, insert, delete on public.community_members to authenticated;
grant all on public.community_members to service_role;
alter table public.community_members enable row level security;
create policy "members readable" on public.community_members for select using (true);
create policy "join as self" on public.community_members for insert to authenticated with check (auth.uid() = user_id);
create policy "leave as self" on public.community_members for delete to authenticated using (auth.uid() = user_id);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  theatre_id uuid not null references public.theatres(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Movie fan',
  content text not null,
  created_at timestamptz not null default now()
);
grant select on public.community_posts to anon;
grant select, insert, update, delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;
alter table public.community_posts enable row level security;
create policy "posts readable" on public.community_posts for select using (true);
create policy "post as self" on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "edit own post" on public.community_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own post" on public.community_posts for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Movie fan',
  content text not null,
  created_at timestamptz not null default now()
);
grant select on public.community_comments to anon;
grant select, insert, update, delete on public.community_comments to authenticated;
grant all on public.community_comments to service_role;
alter table public.community_comments enable row level security;
create policy "comments readable" on public.community_comments for select using (true);
create policy "comment as self" on public.community_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own comment" on public.community_comments for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- admin for spyadmin@gmail.com on confirmation
create or replace function public.grant_admin_for_known_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and lower(new.email) = 'spyadmin@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.grant_admin_for_known_email() from public;

create trigger on_auth_user_created_grant_known_admin
after insert on auth.users
for each row execute function public.grant_admin_for_known_email();

create trigger on_auth_user_confirmed_grant_known_admin
after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_admin_for_known_email();

-- seed a poll per theatre
insert into public.theatre_polls (theatre_id, title, description, ends_at)
select t.id, 'Which movie should we screen next week?',
       'Vote for the film you want on our screens. Top pick gets extra shows.',
       now() + interval '7 days'
from public.theatres t;

insert into public.poll_options (poll_id, movie_id)
select p.id, m.id
from public.theatre_polls p
cross join lateral (select id from public.movies order by rating desc limit 4) m;
