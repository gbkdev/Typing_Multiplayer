-- 0004_functions.sql
-- Helper functions, triggers, and leaderboard views.

-- ============================================================
-- Room codes: private rooms are not readable via plain SELECT
-- unless you're already a member (see 0003_rls.sql), so joining
-- by invite code goes through this SECURITY DEFINER function,
-- which validates the code server-side before revealing the room id.
-- ============================================================
create function public.find_room_by_code(p_code text)
returns table (id uuid, status text, visibility text, settings jsonb)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.status, r.visibility, r.settings
  from public.rooms r
  where r.room_code = upper(p_code)
  limit 1;
$$;

grant execute on function public.find_room_by_code(text) to authenticated, anon;

create function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ============================================================
-- After a match_result is inserted, roll it into the player's
-- profile aggregates (races, wins, avg/highest wpm, xp/level).
-- ============================================================
create function public.apply_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_win boolean := new.position = 1;
begin
  update public.profiles
  set
    total_races = total_races + 1,
    wins = wins + case when v_is_win then 1 else 0 end,
    average_wpm = ((average_wpm * total_races) + new.wpm) / (total_races + 1),
    highest_wpm = greatest(highest_wpm, new.wpm),
    average_accuracy = ((average_accuracy * total_races) + new.accuracy) / (total_races + 1),
    xp = xp + new.xp,
    level = greatest(1, floor(sqrt((xp + new.xp) / 100.0))::int + 1)
  where id = new.user_id;

  insert into public.daily_stats (user_id, date, races, average_wpm, average_accuracy, best_wpm)
  values (new.user_id, current_date, 1, new.wpm, new.accuracy, new.wpm)
  on conflict (user_id, date) do update set
    races = daily_stats.races + 1,
    average_wpm = ((daily_stats.average_wpm * daily_stats.races) + new.wpm) / (daily_stats.races + 1),
    average_accuracy = ((daily_stats.average_accuracy * daily_stats.races) + new.accuracy) / (daily_stats.races + 1),
    best_wpm = greatest(daily_stats.best_wpm, new.wpm);

  return new;
end;
$$;

create trigger on_match_result_insert
  after insert on public.match_results
  for each row execute procedure public.apply_match_result();

-- ============================================================
-- Leaderboard views
-- ============================================================
create view public.leaderboard_all_time as
select id, username, avatar_url, country, highest_wpm, average_accuracy, wins, xp, level
from public.profiles
order by highest_wpm desc;

create view public.leaderboard_daily as
select
  p.id, p.username, p.avatar_url, p.country,
  ds.best_wpm, ds.average_accuracy, ds.races
from public.daily_stats ds
join public.profiles p on p.id = ds.user_id
where ds.date = current_date
order by ds.best_wpm desc;

create view public.leaderboard_weekly as
select
  p.id, p.username, p.avatar_url, p.country,
  max(ds.best_wpm) as best_wpm,
  avg(ds.average_accuracy) as average_accuracy,
  sum(ds.races) as races
from public.daily_stats ds
join public.profiles p on p.id = ds.user_id
where ds.date >= date_trunc('week', current_date)
group by p.id, p.username, p.avatar_url, p.country
order by best_wpm desc;

create view public.leaderboard_monthly as
select
  p.id, p.username, p.avatar_url, p.country,
  max(ds.best_wpm) as best_wpm,
  avg(ds.average_accuracy) as average_accuracy,
  sum(ds.races) as races
from public.daily_stats ds
join public.profiles p on p.id = ds.user_id
where ds.date >= date_trunc('month', current_date)
group by p.id, p.username, p.avatar_url, p.country
order by best_wpm desc;

grant select on public.leaderboard_all_time to authenticated, anon;
grant select on public.leaderboard_daily to authenticated, anon;
grant select on public.leaderboard_weekly to authenticated, anon;
grant select on public.leaderboard_monthly to authenticated, anon;
