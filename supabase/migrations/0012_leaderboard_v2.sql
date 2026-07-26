-- 0012_leaderboard_v2.sql
-- Adds real per-test-type leaderboards (e.g. "time 15" vs "time 60"),
-- an "everyone / friends only" scope, and logs every solo test (previously
-- only rolling aggregates were kept, so there was no history to rank by
-- test config).

-- ============================================================
-- practice_results: one row per completed solo test.
-- ============================================================
create table public.practice_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wpm numeric not null,
  raw_wpm numeric not null,
  accuracy numeric not null,
  mistakes integer not null default 0,
  mode text not null default 'time' check (mode in ('time', 'words')),
  duration integer,
  word_count integer,
  created_at timestamptz not null default now()
);

create index practice_results_user_idx on public.practice_results (user_id);
create index practice_results_leaderboard_idx
  on public.practice_results (mode, duration, word_count, created_at desc);

alter table public.practice_results enable row level security;

create policy "practice results are publicly readable for leaderboards"
  on public.practice_results for select
  using (true);

create policy "users insert their own practice results"
  on public.practice_results for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- Track test config on multiplayer results too, so both sources
-- can be ranked together.
-- ============================================================
alter table public.match_results
  add column mode text not null default 'time' check (mode in ('time', 'words')),
  add column duration integer,
  add column word_count integer;

-- ============================================================
-- record_practice_result: now also logs a practice_results row,
-- carrying the test's mode/duration/word_count. All prior
-- aggregate + achievement logic is unchanged.
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
-- submit_match_result: now stamps each row with the room's mode
-- (always 'time' today) and duration, pulled from room settings.
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

-- ============================================================
-- Unified, filterable leaderboard: solo + multiplayer results,
-- by period / test config, with each player's single best run.
-- ============================================================
create or replace function public.leaderboard_query(
  p_period text default 'all_time',   -- 'daily' | 'weekly' | 'monthly' | 'all_time'
  p_mode text default 'time',         -- 'time' | 'words'
  p_duration integer default 15,      -- used when p_mode = 'time'
  p_word_count integer default null,  -- used when p_mode = 'words'
  p_limit integer default 100
)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  country text,
  level integer,
  best_wpm numeric,
  best_raw_wpm numeric,
  best_accuracy numeric,
  races bigint,
  achieved_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with period_start as (
    select case p_period
      when 'daily' then date_trunc('day', now())
      when 'weekly' then date_trunc('week', now())
      when 'monthly' then date_trunc('month', now())
      else '-infinity'::timestamptz
    end as ts
  ),
  combined as (
    select user_id, wpm, raw_wpm, accuracy, created_at
    from public.practice_results, period_start
    where mode = p_mode
      and (p_mode <> 'time' or duration = p_duration)
      and (p_mode <> 'words' or word_count = p_word_count)
      and created_at >= period_start.ts
    union all
    select user_id, wpm, raw_wpm, accuracy, created_at
    from public.match_results, period_start
    where mode = p_mode
      and (p_mode <> 'time' or duration = p_duration)
      and (p_mode <> 'words' or word_count = p_word_count)
      and created_at >= period_start.ts
  ),
  best_per_user as (
    select distinct on (user_id)
      user_id, wpm as best_wpm, raw_wpm as best_raw_wpm, accuracy as best_accuracy, created_at as achieved_at
    from combined
    order by user_id, wpm desc, created_at asc
  ),
  race_counts as (
    select user_id, count(*) as races
    from combined
    group by user_id
  )
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.country,
    p.level,
    b.best_wpm,
    b.best_raw_wpm,
    b.best_accuracy,
    rc.races,
    b.achieved_at
  from best_per_user b
  join public.profiles p on p.id = b.user_id
  join race_counts rc on rc.user_id = b.user_id
  order by b.best_wpm desc
  limit p_limit;
$$;

grant execute on function public.leaderboard_query(text, text, integer, integer, integer) to authenticated, anon;
