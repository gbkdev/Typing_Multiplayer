-- 0015_weak_keys.sql
-- Tracks which characters a player mistypes most often, so the client can
-- generate a practice drill weighted toward their weak keys.

alter table public.profiles
  add column key_mistake_stats jsonb not null default '{}'::jsonb;

-- Postgres identifies functions by name + argument types, so adding a new
-- parameter creates an overload rather than replacing the old one. Drop the
-- previous signature explicitly to avoid ambiguous-function errors when
-- PostgREST calls this by name with named parameters.
drop function if exists public.record_practice_result(numeric, numeric, numeric, integer, text, integer, integer);
drop function if exists public.record_practice_result(numeric, numeric, numeric, integer);

create or replace function public.record_practice_result(
  p_wpm numeric,
  p_raw_wpm numeric,
  p_accuracy numeric,
  p_mistakes integer,
  p_mode text default 'time',
  p_duration integer default null,
  p_word_count integer default null,
  p_key_mistakes jsonb default '{}'::jsonb
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
  v_key text;
  v_count integer;
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

  -- Merge the per-character mistake counts from this test into the running total.
  if p_key_mistakes is not null and p_key_mistakes <> '{}'::jsonb then
    for v_key, v_count in select * from jsonb_each_text(p_key_mistakes)
    loop
      update public.profiles
      set key_mistake_stats = jsonb_set(
        key_mistake_stats,
        array[v_key],
        to_jsonb(coalesce((key_mistake_stats->>v_key)::int, 0) + v_count::int)
      )
      where id = v_user_id;
    end loop;
  end if;

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

grant execute on function public.record_practice_result(
  numeric, numeric, numeric, integer, text, integer, integer, jsonb
) to authenticated;
