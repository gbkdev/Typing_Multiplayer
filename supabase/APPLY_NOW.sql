-- 0008_fix_rls_recursion.sql
-- Fixes infinite RLS recursion on room_players and adds missing RPC helpers from 0007.

-- ============================================================
-- Security-definer helpers (bypass RLS for membership checks)
-- ============================================================
create or replace function public.is_room_member(
  p_room_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.room_players
    where room_id = p_room_id and user_id = coalesce(p_user_id, auth.uid())
  );
$$;

grant execute on function public.is_room_member(uuid, uuid) to authenticated, anon;

create or replace function public.ensure_profile(p_username text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, username)
  values (
    v_user_id,
    coalesce(
      nullif(trim(p_username), ''),
      'player_' || substr(v_user_id::text, 1, 8)
    )
  )
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.ensure_profile(text) to authenticated;

create or replace function public.create_room(
  p_visibility text,
  p_settings jsonb
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_room public.rooms;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile(null);

  v_code := '';
  for i in 1..6 loop
    v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;

  insert into public.rooms (host_id, visibility, settings, room_code)
  values (v_user_id, p_visibility, p_settings, v_code)
  returning * into v_room;

  insert into public.room_players (room_id, user_id, ready)
  values (v_room.id, v_user_id, true)
  on conflict (room_id, user_id) do update set ready = true;

  return v_room;
end;
$$;

grant execute on function public.create_room(text, jsonb) to authenticated;

-- ============================================================
-- Replace policies that caused infinite recursion
-- ============================================================
drop policy if exists "public rooms are readable" on public.rooms;
create policy "public rooms are readable"
  on public.rooms for select
  using (
    visibility = 'public'
    or host_id = auth.uid()
    or public.is_room_member(id, auth.uid())
  );

drop policy if exists "room members can read player list" on public.room_players;
create policy "room members can read player list"
  on public.room_players for select
  using (
    user_id = auth.uid()
    or public.is_room_member(room_id, auth.uid())
    or exists (
      select 1 from public.rooms r
      where r.id = room_players.room_id and r.visibility = 'public'
    )
  );

drop policy if exists "room members can read matches" on public.matches;
create policy "room members can read matches"
  on public.matches for select
  using (public.is_room_member(room_id, auth.uid()));

drop policy if exists "room members can read chat" on public.messages;
create policy "room members can read chat"
  on public.messages for select
  using (public.is_room_member(room_id, auth.uid()));

drop policy if exists "room members can send chat" on public.messages;
create policy "room members can send chat"
  on public.messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_room_member(room_id, auth.uid())
  );

-- ============================================================
-- Missing INSERT policies + RPCs (from 0007, idempotent)
-- ============================================================
drop policy if exists "host can create matches" on public.matches;
create policy "host can create matches"
  on public.matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );

drop policy if exists "room members can submit own match results" on public.match_results;
create policy "room members can submit own match results"
  on public.match_results for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = match_id and public.is_room_member(m.room_id, auth.uid())
    )
  );

create or replace function public.submit_match_result(
  p_match_id uuid,
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_mistakes integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_position integer;
  v_xp integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.matches m
    where m.id = p_match_id and public.is_room_member(m.room_id, v_user_id)
  ) then
    raise exception 'Not a member of this race';
  end if;

  perform 1 from public.matches where id = p_match_id for update;

  select coalesce(max(position), 0) + 1
  into v_position
  from public.match_results
  where match_id = p_match_id;

  v_xp := greatest(10, round(p_wpm)::int + case when v_position = 1 then 50 else 0 end);

  insert into public.match_results (match_id, user_id, wpm, raw_wpm, accuracy, mistakes, position, xp)
  values (p_match_id, v_user_id, p_wpm, p_raw_wpm, p_accuracy, p_mistakes, v_position, v_xp);

  return v_position;
end;
$$;

grant execute on function public.submit_match_result(uuid, numeric, numeric, numeric, integer) to authenticated;

create or replace function public.try_finish_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_finished integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_room_member(p_room_id, auth.uid()) then
    raise exception 'Not a room member';
  end if;

  select count(*), count(*) filter (where finished)
  into v_total, v_finished
  from public.room_players
  where room_id = p_room_id;

  if v_total > 0 and v_finished = v_total then
    update public.rooms
    set status = 'finished'
    where id = p_room_id and status = 'racing';

    update public.matches
    set ended_at = now()
    where id = (
      select id from public.matches
      where room_id = p_room_id and ended_at is null
      order by created_at desc
      limit 1
    );

    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.try_finish_room(uuid) to authenticated;

create or replace function public.reset_room_to_lobby(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rooms
    where id = p_room_id and host_id = auth.uid()
  ) then
    raise exception 'Only the host can reset the room';
  end if;

  update public.rooms
  set
    status = 'lobby',
    settings = settings - 'currentText' - 'currentMatchId'
  where id = p_room_id;

  update public.room_players
  set
    ready = false,
    progress = 0,
    wpm = 0,
    accuracy = 100,
    finished = false,
    position = null
  where room_id = p_room_id;
end;
$$;

grant execute on function public.reset_room_to_lobby(uuid) to authenticated;

create or replace function public.record_practice_result(
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_mistakes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_xp integer;
  v_total_races integer;
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile(null);

  v_xp := greatest(10, round(p_wpm)::int);

  update public.profiles
  set
    total_races = total_races + 1,
    average_wpm = ((average_wpm * total_races) + p_wpm) / (total_races + 1),
    highest_wpm = greatest(highest_wpm, p_wpm),
    average_accuracy = ((average_accuracy * total_races) + p_accuracy) / (total_races + 1),
    xp = xp + v_xp,
    level = greatest(1, floor(sqrt((xp + v_xp) / 100.0))::int + 1)
  where id = v_user_id
  returning total_races into v_total_races;

  insert into public.daily_stats (user_id, date, races, average_wpm, average_accuracy, best_wpm)
  values (v_user_id, current_date, 1, p_wpm, p_accuracy, p_wpm)
  on conflict (user_id, date) do update set
    races = daily_stats.races + 1,
    average_wpm = ((daily_stats.average_wpm * daily_stats.races) + p_wpm) / (daily_stats.races + 1),
    average_accuracy = ((daily_stats.average_accuracy * daily_stats.races) + p_accuracy) / (daily_stats.races + 1),
    best_wpm = greatest(daily_stats.best_wpm, p_wpm);

  if v_total_races = 1 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'first_race')
    on conflict do nothing;
  end if;

  if p_wpm >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'speed_100')
    on conflict do nothing;
  end if;

  if p_wpm >= 200 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'speed_200')
    on conflict do nothing;
  end if;

  if p_accuracy >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'perfect_accuracy')
    on conflict do nothing;
  end if;

  with streak_days as (
    select d::date as day
    from generate_series(current_date, current_date - 29, '-1 day'::interval) d
  ),
  active as (
    select sd.day
    from streak_days sd
    where exists (
      select 1 from public.daily_stats ds
      where ds.user_id = v_user_id and ds.date = sd.day and ds.races > 0
    )
    order by sd.day desc
  )
  select count(*)
  into v_streak
  from (
    select day, day - (row_number() over (order by day desc))::int as grp
    from active
  ) s
  group by grp
  order by min(day) desc
  limit 1;

  v_streak := coalesce(v_streak, 0);

  if v_streak >= 7 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'streak_7')
    on conflict do nothing;
  end if;

  if v_streak >= 30 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'streak_30')
    on conflict do nothing;
  end if;

  if (select count(*) from public.leaderboard_all_time where highest_wpm >= p_wpm) <= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'top_100')
    on conflict do nothing;
  end if;
end;
$$;

grant execute on function public.record_practice_result(numeric, numeric, numeric, integer) to authenticated;

create or replace function public.notify_achievement_earned()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  values (
    new.user_id,
    'achievement',
    jsonb_build_object('achievement_id', new.achievement_id)
  );
  return new;
end;
$$;

drop trigger if exists on_user_achievement_earned on public.user_achievements;
create trigger on_user_achievement_earned
  after insert on public.user_achievements
  for each row execute procedure public.notify_achievement_earned();
-- 0009_username_choice.sql
-- Stop auto-assigning player_* names; require users to pick a username in the app.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_username is not null and char_length(v_username) between 3 and 20
     and v_username ~ '^[a-zA-Z0-9_]+$' then
    insert into public.profiles (id, username)
    values (new.id, v_username);
  else
    insert into public.profiles (id, username)
    values (new.id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  end if;
  return new;
exception
  when unique_violation then
    insert into public.profiles (id, username)
    values (new.id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    return new;
end;
$$;

create or replace function public.ensure_profile(p_username text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := nullif(trim(p_username), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_username is not null
     and char_length(v_username) between 3 and 20
     and v_username ~ '^[a-zA-Z0-9_]+$' then
    insert into public.profiles (id, username)
    values (v_user_id, v_username)
    on conflict (id) do update set username = excluded.username
    where public.profiles.username like 'pending_%'
       or public.profiles.username like 'player_%';
  else
    insert into public.profiles (id, username)
    values (v_user_id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    on conflict (id) do nothing;
  end if;
end;
$$;

create or replace function public.set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := trim(p_username);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_username) < 3 or char_length(v_username) > 20 then
    raise exception 'Username must be 3–20 characters';
  end if;

  if v_username !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Username can only contain letters, numbers, and underscores';
  end if;

  update public.profiles
  set username = v_username
  where id = v_user_id;

  if not found then
    insert into public.profiles (id, username)
    values (v_user_id, v_username);
  end if;
end;
$$;

grant execute on function public.set_username(text) to authenticated;
-- 0010_username_duplicates.sql
-- Safe placeholders (no player_* collisions), clear errors when a username is taken.

create or replace function public.ensure_profile_row()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pending text;
  v_attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    return;
  end if;

  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 8 then
      raise exception 'Could not create profile placeholder';
    end if;
    v_pending := 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    begin
      insert into public.profiles (id, username)
      values (v_user_id, v_pending);
      return;
    exception
      when unique_violation then
        continue;
    end;
  end loop;
end;
$$;

grant execute on function public.ensure_profile_row() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_username is not null
     and char_length(v_username) between 3 and 20
     and v_username ~ '^[a-zA-Z0-9_]+$'
     and v_username !~ '^(player_|pending_)' then
    insert into public.profiles (id, username)
    values (new.id, v_username);
  else
    insert into public.profiles (id, username)
    values (new.id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  end if;
  return new;
exception
  when unique_violation then
    if v_username is not null then
      raise exception 'Username is already taken';
    end if;
    insert into public.profiles (id, username)
    values (new.id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    return new;
end;
$$;

create or replace function public.ensure_profile(p_username text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := nullif(trim(p_username), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_username is not null
     and char_length(v_username) between 3 and 20
     and v_username ~ '^[a-zA-Z0-9_]+$'
     and v_username !~ '^(player_|pending_)' then
    begin
      insert into public.profiles (id, username)
      values (v_user_id, v_username)
      on conflict (id) do update set username = excluded.username
      where public.profiles.username like 'pending_%'
         or public.profiles.username like 'player_%';
    exception
      when unique_violation then
        raise exception 'Username is already taken';
    end;
  else
    perform public.ensure_profile_row();
  end if;
end;
$$;

create or replace function public.set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := trim(p_username);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_username) < 3 or char_length(v_username) > 20 then
    raise exception 'Username must be 3–20 characters';
  end if;

  if v_username !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Username can only contain letters, numbers, and underscores';
  end if;

  if v_username ~ '^(player_|pending_)' then
    raise exception 'Choose a personal username, not a system placeholder';
  end if;

  begin
    update public.profiles
    set username = v_username
    where id = v_user_id;

    if not found then
      insert into public.profiles (id, username)
      values (v_user_id, v_username);
    end if;
  exception
    when unique_violation then
      raise exception 'Username is already taken';
  end;
end;
$$;

grant execute on function public.set_username(text) to authenticated;

-- Stop using ensure_profile(null) (old player_* defaults) inside RPCs.
create or replace function public.create_room(
  p_visibility text,
  p_settings jsonb
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_room public.rooms;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile_row();

  v_code := '';
  for i in 1..6 loop
    v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;

  insert into public.rooms (host_id, visibility, settings, room_code)
  values (v_user_id, p_visibility, p_settings, v_code)
  returning * into v_room;

  insert into public.room_players (room_id, user_id, ready)
  values (v_room.id, v_user_id, true)
  on conflict (room_id, user_id) do update set ready = true;

  return v_room;
end;
$$;

create or replace function public.record_practice_result(
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_mistakes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_xp integer;
  v_total_races integer;
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_profile_row();

  v_xp := greatest(10, round(p_wpm)::int);

  update public.profiles
  set
    total_races = total_races + 1,
    average_wpm = ((average_wpm * total_races) + p_wpm) / (total_races + 1),
    highest_wpm = greatest(highest_wpm, p_wpm),
    average_accuracy = ((average_accuracy * total_races) + p_accuracy) / (total_races + 1),
    xp = xp + v_xp,
    level = greatest(1, floor(sqrt((xp + v_xp) / 100.0))::int + 1)
  where id = v_user_id
  returning total_races into v_total_races;

  insert into public.daily_stats (user_id, date, races, average_wpm, average_accuracy, best_wpm)
  values (v_user_id, current_date, 1, p_wpm, p_accuracy, p_wpm)
  on conflict (user_id, date) do update set
    races = daily_stats.races + 1,
    average_wpm = ((daily_stats.average_wpm * daily_stats.races) + p_wpm) / (daily_stats.races + 1),
    average_accuracy = ((daily_stats.average_accuracy * daily_stats.races) + p_accuracy) / (daily_stats.races + 1),
    best_wpm = greatest(daily_stats.best_wpm, p_wpm);

  if v_total_races = 1 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'first_race')
    on conflict do nothing;
  end if;

  if p_wpm >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'speed_100')
    on conflict do nothing;
  end if;

  if p_wpm >= 200 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'speed_200')
    on conflict do nothing;
  end if;

  if p_accuracy >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'perfect_accuracy')
    on conflict do nothing;
  end if;

  with streak_days as (
    select d::date as day
    from generate_series(current_date, current_date - 29, '-1 day'::interval) d
  ),
  active as (
    select sd.day
    from streak_days sd
    where exists (
      select 1 from public.daily_stats ds
      where ds.user_id = v_user_id and ds.date = sd.day and ds.races > 0
    )
    order by sd.day desc
  )
  select count(*)
  into v_streak
  from (
    select day, day - (row_number() over (order by day desc))::int as grp
    from active
  ) s
  group by grp
  order by min(day) desc
  limit 1;

  v_streak := coalesce(v_streak, 0);

  if v_streak >= 7 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'streak_7')
    on conflict do nothing;
  end if;

  if v_streak >= 30 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'streak_30')
    on conflict do nothing;
  end if;

  if (select count(*) from public.leaderboard_all_time where highest_wpm >= p_wpm) <= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, 'top_100')
    on conflict do nothing;
  end if;
end;
$$;
