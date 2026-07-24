-- 0001_init.sql
-- Core schema: profiles, texts, rooms, room_players, matches, match_results

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  country text,
  total_races integer not null default 0,
  wins integer not null default 0,
  average_wpm numeric not null default 0,
  highest_wpm numeric not null default 0,
  average_accuracy numeric not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'player_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- texts (typing content)
-- ============================================================
create table public.texts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  language text not null default 'en',
  kind text not null default 'words' check (kind in ('words', 'quote', 'custom')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- rooms
-- ============================================================
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'countdown', 'racing', 'finished')),
  room_code text not null unique,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  settings jsonb not null default '{
    "textMode": "time",
    "duration": 30,
    "wordCount": null,
    "difficulty": "medium",
    "maxPlayers": 8,
    "countdownSeconds": 3
  }'::jsonb,
  created_at timestamptz not null default now()
);

create index rooms_status_idx on public.rooms (status);
create index rooms_visibility_idx on public.rooms (visibility);

-- ============================================================
-- room_players
-- ============================================================
create table public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress numeric not null default 0,
  accuracy numeric not null default 100,
  wpm numeric not null default 0,
  finished boolean not null default false,
  position integer,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index room_players_room_idx on public.room_players (room_id);

-- ============================================================
-- matches / match_results
-- ============================================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  text_id uuid references public.texts(id),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  wpm numeric not null,
  raw_wpm numeric not null,
  accuracy numeric not null,
  mistakes integer not null default 0,
  position integer not null,
  xp integer not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index match_results_user_idx on public.match_results (user_id);
create index match_results_match_idx on public.match_results (match_id);
