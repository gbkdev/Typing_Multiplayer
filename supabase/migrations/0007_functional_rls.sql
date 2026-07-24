-- 0007_functional_rls.sql
-- Client-write policies and RPC helpers so multiplayer + solo practice work end-to-end.

-- ============================================================
-- Missing INSERT policies (0003 only defined SELECT)
-- ============================================================
create policy "host can create matches"
  on public.matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );

create policy "room members can submit own match results"
  on public.match_results for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      join public.room_players rp on rp.room_id = m.room_id
      where m.id = match_id and rp.user_id = auth.uid()
    )
  );

-- ============================================================
-- Atomic match result submission (avoids position races)
-- ============================================================
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
    join public.room_players rp on rp.room_id = m.room_id
    where m.id = p_match_id and rp.user_id = v_user_id
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

-- ============================================================
-- Finish room when every player has finished
-- ============================================================
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

  if not exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()
  ) then
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

-- ============================================================
-- Host-only rematch reset (clears all player rows)
-- ============================================================
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

-- ============================================================
-- Solo practice: roll stats into profile + daily_stats + achievements
-- ============================================================
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
  v_wins integer;
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

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
  returning total_races, wins into v_total_races, v_wins;

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

  -- Consecutive-day streak (count back from today)
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

-- Notify users when they earn an achievement
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

create trigger on_user_achievement_earned
  after insert on public.user_achievements
  for each row execute procedure public.notify_achievement_earned();
