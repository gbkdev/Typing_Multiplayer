-- 0002_social.sql
-- Friendships, notifications, chat messages, achievements, daily stats

-- ============================================================
-- friendships
-- ============================================================
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

-- ============================================================
-- notifications
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accepted', 'room_invite', 'achievement', 'system')),
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read);

-- ============================================================
-- messages (room chat)
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'chat' check (kind in ('chat', 'system_join', 'system_leave')),
  content text not null check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);

create index messages_room_idx on public.messages (room_id, created_at);

-- ============================================================
-- achievements (catalog) + user_achievements (earned)
-- ============================================================
create table public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default 'trophy'
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id);

-- ============================================================
-- daily_stats (per-user, per-day rollups for heatmap/history)
-- ============================================================
create table public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  races integer not null default 0,
  average_wpm numeric not null default 0,
  average_accuracy numeric not null default 0,
  best_wpm numeric not null default 0,
  unique (user_id, date)
);

create index daily_stats_user_idx on public.daily_stats (user_id, date);
