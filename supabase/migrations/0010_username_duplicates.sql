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
