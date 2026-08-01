-- 0014_anticheat.sql
-- Server-side guards on submitted results, since a client could otherwise
-- call these RPCs directly with fabricated numbers. These are deliberately
-- generous bounds (not a full cheat-detection system) — the goal is to stop
-- obviously-impossible values from ever reaching the leaderboard, not to
-- second-guess genuinely fast typists.

create or replace function public.validate_result(
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_mistakes integer
)
returns void
language plpgsql
as $$
begin
  if p_wpm is null or p_wpm < 0 or p_wpm > 400 then
    raise exception 'Implausible WPM value.';
  end if;
  if p_raw_wpm is null or p_raw_wpm < 0 or p_raw_wpm > 500 then
    raise exception 'Implausible raw WPM value.';
  end if;
  if p_raw_wpm < p_wpm - 1 then
    raise exception 'Raw WPM cannot be lower than net WPM.';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'Accuracy must be between 0 and 100.';
  end if;
  if p_mistakes is not null and p_mistakes < 0 then
    raise exception 'Mistake count cannot be negative.';
  end if;
end;
$$;

-- ============================================================
-- record_practice_result: validate inputs + a light rate limit
-- (one result per user per 2 seconds) before anything else runs.
-- ============================================================
create or replace function public.record_practice_result(
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_mistakes integer,
  p_mode text default 'time',
  p_duration integer default null,
  p_word_count integer default null
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

  perform public.validate_result(p_wpm, p_raw_wpm, p_accuracy, p_mistakes);

  if exists (
    select 1 from public.practice_results
    where user_id = v_user_id and created_at > now() - interval '2 seconds'
  ) then
    raise exception 'Results are being submitted too quickly. Please slow down.';
  end if;

  perform public.ensure_profile_row();

  v_xp := greatest(10, round(p_wpm)::int);

  insert into public.practice_results (user_id, wpm, raw_wpm, accuracy, mistakes, mode, duration, word_count)
  values (v_user_id, p_wpm, p_raw_wpm, p_accuracy, p_mistakes, coalesce(p_mode, 'time'), p_duration, p_word_count);

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

grant execute on function public.record_practice_result(numeric, numeric, numeric, integer, text, integer, integer)
  to authenticated;

-- ============================================================
-- submit_match_result: same validation, plus you can only submit
-- a result for yourself once per match (existing position logic
-- already implies this, but we now also reject nonsense numbers).
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
  v_duration integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.validate_result(p_wpm, p_raw_wpm, p_accuracy, p_mistakes);

  if not exists (
    select 1
    from public.matches m
    where m.id = p_match_id and public.is_room_member(m.room_id, v_user_id)
  ) then
    raise exception 'Not a member of this race';
  end if;

  if exists (select 1 from public.match_results where match_id = p_match_id and user_id = v_user_id) then
    raise exception 'You already submitted a result for this race.';
  end if;

  perform 1 from public.matches where id = p_match_id for update;

  select coalesce(max(position), 0) + 1
  into v_position
  from public.match_results
  where match_id = p_match_id;

  v_xp := greatest(10, round(p_wpm)::int + case when v_position = 1 then 50 else 0 end);

  select (r.settings->>'duration')::int
  into v_duration
  from public.matches m
  join public.rooms r on r.id = m.room_id
  where m.id = p_match_id;

  insert into public.match_results (match_id, user_id, wpm, raw_wpm, accuracy, mistakes, position, xp, mode, duration)
  values (p_match_id, v_user_id, p_wpm, p_raw_wpm, p_accuracy, p_mistakes, v_position, v_xp, 'time', v_duration);

  return v_position;
end;
$$;

grant execute on function public.submit_match_result(uuid, numeric, numeric, numeric, integer) to authenticated;
