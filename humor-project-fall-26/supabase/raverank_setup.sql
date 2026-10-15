-- RaveRank setup for Supabase. Run this in Supabase Dashboard > SQL Editor.
-- Safe to run repeatedly; existing project tables are not dropped.
create extension if not exists pgcrypto;

create table if not exists public.festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  country text not null default '',
  start_date date not null,
  end_date date,
  genres text[] not null default '{}',
  image_url text,
  description text,
  votes integer not null default 0 check (votes >= 0),
  created_at timestamptz not null default now(),
  constraint festivals_valid_dates check (end_date is null or end_date >= start_date)
);
create unique index if not exists festivals_name_date_unique on public.festivals (lower(name), start_date);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  genres text[] not null default '{}',
  image_url text,
  votes integer not null default 0 check (votes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_festivals (
  user_id uuid not null references auth.users(id) on delete cascade,
  festival_id uuid not null references public.festivals(id) on delete cascade,
  attended_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

create table if not exists public.festival_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  festival_id uuid not null references public.festivals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

create table if not exists public.artist_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create table if not exists public.festival_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  start_date date not null,
  suggested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Existing AI caption tables from the starter project. Create them if missing.
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  vibe text not null default 'main-stage energy',
  output_text text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  score integer not null default 0
);
alter table public.ai_generations add column if not exists score integer not null default 0;
create table if not exists public.ai_votes (
  generation_id uuid not null references public.ai_generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value integer not null default 1 check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (generation_id, user_id)
);

-- Vote counters are maintained by the database, so rankings persist across reloads.
create or replace function public.raverank_adjust_festival_votes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.festivals set votes = votes + 1 where id = new.festival_id; return new;
  elsif tg_op = 'DELETE' then update public.festivals set votes = greatest(0, votes - 1) where id = old.festival_id; return old; end if;
  return null;
end; $$;
drop trigger if exists raverank_festival_vote_count on public.festival_votes;
create trigger raverank_festival_vote_count after insert or delete on public.festival_votes for each row execute function public.raverank_adjust_festival_votes();

create or replace function public.raverank_adjust_artist_votes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.artists set votes = votes + 1 where id = new.artist_id; return new;
  elsif tg_op = 'DELETE' then update public.artists set votes = greatest(0, votes - 1) where id = old.artist_id; return old; end if;
  return null;
end; $$;
drop trigger if exists raverank_artist_vote_count on public.artist_votes;
create trigger raverank_artist_vote_count after insert or delete on public.artist_votes for each row execute function public.raverank_adjust_artist_votes();

create or replace function public.raverank_adjust_ai_score() returns trigger language plpgsql security definer set search_path = public as $$
declare old_value integer := 0; new_value integer := 0;
begin
  if tg_op = 'INSERT' then update public.ai_generations set score = score + new.value where id = new.generation_id; return new;
  elsif tg_op = 'DELETE' then update public.ai_generations set score = score - old.value where id = old.generation_id; return old;
  elsif tg_op = 'UPDATE' then update public.ai_generations set score = score - old.value + new.value where id = new.generation_id; return new; end if;
  return null;
end; $$;
drop trigger if exists raverank_ai_vote_score on public.ai_votes;
create trigger raverank_ai_vote_score after insert or update or delete on public.ai_votes for each row execute function public.raverank_adjust_ai_score();

alter table public.festivals enable row level security;
alter table public.artists enable row level security;
alter table public.user_festivals enable row level security;
alter table public.festival_votes enable row level security;
alter table public.artist_votes enable row level security;
alter table public.festival_suggestions enable row level security;
alter table public.ai_generations enable row level security;
alter table public.ai_votes enable row level security;

drop policy if exists "Festivals are public to read" on public.festivals;
create policy "Festivals are public to read" on public.festivals for select using (true);
drop policy if exists "Artists are public to read" on public.artists;
create policy "Artists are public to read" on public.artists for select using (true);
drop policy if exists "Users read own attendance" on public.user_festivals;
create policy "Users read own attendance" on public.user_festivals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users manage own attendance" on public.user_festivals;
create policy "Users manage own attendance" on public.user_festivals for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Festival votes are public to read" on public.festival_votes;
create policy "Festival votes are public to read" on public.festival_votes for select using (true);
drop policy if exists "Users cast own festival votes" on public.festival_votes;
create policy "Users cast own festival votes" on public.festival_votes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove own festival votes" on public.festival_votes;
create policy "Users remove own festival votes" on public.festival_votes for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "Artist votes are public to read" on public.artist_votes;
create policy "Artist votes are public to read" on public.artist_votes for select using (true);
drop policy if exists "Users cast own artist votes" on public.artist_votes;
create policy "Users cast own artist votes" on public.artist_votes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove own artist votes" on public.artist_votes;
create policy "Users remove own artist votes" on public.artist_votes for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "Users submit festival suggestions" on public.festival_suggestions;
create policy "Users submit festival suggestions" on public.festival_suggestions for insert to authenticated with check (auth.uid() = suggested_by);
drop policy if exists "Users read own festival suggestions" on public.festival_suggestions;
create policy "Users read own festival suggestions" on public.festival_suggestions for select to authenticated using (auth.uid() = suggested_by);
drop policy if exists "AI generations are public to read" on public.ai_generations;
create policy "AI generations are public to read" on public.ai_generations for select using (true);
drop policy if exists "Users create own AI generations" on public.ai_generations;
create policy "Users create own AI generations" on public.ai_generations for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Users read own AI votes" on public.ai_votes;
create policy "Users read own AI votes" on public.ai_votes for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own AI votes" on public.ai_votes;
create policy "Users create own AI votes" on public.ai_votes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own AI votes" on public.ai_votes;
create policy "Users update own AI votes" on public.ai_votes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own AI votes" on public.ai_votes;
create policy "Users delete own AI votes" on public.ai_votes for delete to authenticated using (auth.uid() = user_id);

-- Example catalog records for 2026. Vote totals intentionally start at zero.
insert into public.festivals (name, city, country, start_date, end_date, genres, description) values
('Ultra Music Festival', 'Miami, Florida', 'USA', '2026-03-27', '2026-03-29', array['House','Techno','EDM'], 'Downtown Miami meets the global dance scene.'),
('EDC Las Vegas', 'Las Vegas, Nevada', 'USA', '2026-05-15', '2026-05-17', array['EDM','Bass','Trance'], 'Three nights under the electric sky.'),
('Tomorrowland', 'Boom', 'Belgium', '2026-07-17', '2026-07-26', array['House','Trance','Techno'], 'A world of music, fantasy and connection.')
on conflict do nothing;
insert into public.artists (name, genres) values
('John Summit', array['House','Tech House']),
('Fred again..', array['Electronic','UK Garage']),
('Martin Garrix', array['Progressive House','EDM']),
('Amelie Lens', array['Techno'])
on conflict (name) do nothing;

-- Note: never put a service_role key in browser code. Use only the anon/publishable key client-side.
