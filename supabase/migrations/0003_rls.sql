-- 0003_rls.sql
-- Enable RLS on every table and define access policies.

alter table public.profiles enable row level security;
alter table public.texts enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;
alter table public.friendships enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_stats enable row level security;

-- ============================================================
-- profiles: publicly readable, only owner can edit
-- ============================================================
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- texts: publicly readable, no direct writes from clients
-- ============================================================
create policy "texts are publicly readable"
  on public.texts for select
  using (true);

-- ============================================================
-- rooms: public rooms readable by everyone; private rooms
-- readable only by members or via room_code lookup.
-- ============================================================
create policy "public rooms are readable"
  on public.rooms for select
  using (
    visibility = 'public'
    or host_id = auth.uid()
    or exists (
      select 1 from public.room_players rp
      where rp.room_id = rooms.id and rp.user_id = auth.uid()
    )
  );

create policy "authenticated users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (host_id = auth.uid());

create policy "only host can update room"
  on public.rooms for update
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "only host can delete room"
  on public.rooms for delete
  using (host_id = auth.uid());

-- ============================================================
-- room_players: only room members can read; users manage their
-- own row (join/leave/ready/progress updates).
-- ============================================================
create policy "room members can read player list"
  on public.room_players for select
  using (
    exists (
      select 1 from public.room_players rp2
      where rp2.room_id = room_players.room_id and rp2.user_id = auth.uid()
    )
    or exists (
      select 1 from public.rooms r
      where r.id = room_players.room_id and r.visibility = 'public'
    )
  );

create policy "users can join a room as themselves"
  on public.room_players for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can update their own room_player row"
  on public.room_players for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can leave a room"
  on public.room_players for delete
  using (user_id = auth.uid());

-- ============================================================
-- matches / match_results: readable by room members, written
-- server-side (edge functions using service role) in practice.
-- ============================================================
create policy "room members can read matches"
  on public.matches for select
  using (
    exists (
      select 1 from public.room_players rp
      where rp.room_id = matches.room_id and rp.user_id = auth.uid()
    )
  );

create policy "match results are publicly readable"
  on public.match_results for select
  using (true);

-- ============================================================
-- friendships: participants only
-- ============================================================
create policy "participants can read their friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "participants can update friendship status"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "participants can remove friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ============================================================
-- notifications: owner only
-- ============================================================
create policy "users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- messages: chat is visible only to room members; members can post
-- ============================================================
create policy "room members can read chat"
  on public.messages for select
  using (
    exists (
      select 1 from public.room_players rp
      where rp.room_id = messages.room_id and rp.user_id = auth.uid()
    )
  );

create policy "room members can send chat"
  on public.messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.room_players rp
      where rp.room_id = messages.room_id and rp.user_id = auth.uid()
    )
  );

-- ============================================================
-- achievements / user_achievements
-- ============================================================
create policy "achievements are publicly readable"
  on public.achievements for select
  using (true);

create policy "user achievements are publicly readable"
  on public.user_achievements for select
  using (true);

-- ============================================================
-- daily_stats: owner readable (aggregate leaderboards use a
-- separate public view — see 0004_functions.sql)
-- ============================================================
create policy "users can read own daily stats"
  on public.daily_stats for select
  using (auth.uid() = user_id);
