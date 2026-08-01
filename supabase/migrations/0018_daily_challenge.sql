-- 0018_daily_challenge.sql
-- One fixed text per calendar day that every player races against, with its
-- own small leaderboard — makes the "daily" period genuinely comparable
-- (today's leaderboard periods rank by best WPM on different random text;
-- this is the same text for everyone).

create table public.daily_challenges (
  challenge_date date primary key default current_date,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.daily_challenges enable row level security;

create policy "daily challenges are publicly readable"
  on public.daily_challenges for select
  using (true);

create table public.daily_challenge_results (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null references public.daily_challenges(challenge_date) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  wpm numeric not null,
  raw_wpm numeric not null,
  accuracy numeric not null,
  mistakes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_date, user_id)
);

create index daily_challenge_results_date_idx on public.daily_challenge_results (challenge_date, wpm desc);

alter table public.daily_challenge_results enable row level security;

create policy "daily challenge results are publicly readable"
  on public.daily_challenge_results for select
  using (true);

create policy "users submit their own daily challenge result"
  on public.daily_challenge_results for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can improve their own daily challenge result"
  on public.daily_challenge_results for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- A small curated pool the challenge text is deterministically picked
-- from, so the same calendar date always resolves to the same pick even
-- under concurrent first-requests (see get_daily_challenge below).
-- ============================================================
create or replace function public.get_daily_challenge()
returns public.daily_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.daily_challenges;
  v_pool text[] := array[
    'The only way to do great work is to love what you do.',
    'Simplicity is the ultimate sophistication in every design that lasts.',
    'The best time to plant a tree was twenty years ago. The second best time is now.',
    'Practice does not make perfect. Only perfect practice makes perfect.',
    'What we think, we become, one careful choice at a time.',
    'Well begun is half done, and a good start carries you far.',
    'A journey of a thousand miles begins with a single step forward.',
    'Fortune favors the bold who keep moving even when the path is unclear.',
    'Small daily improvements are the key to staggering long-term results.',
    'The expert in anything was once a beginner who refused to quit.',
    'Discipline is choosing between what you want now and what you want most.',
    'Every accomplishment starts with the decision to try something new.',
    'Focus on being productive instead of busy, and the results will follow.',
    'The secret of getting ahead is getting started on the task at hand.',
    'Do not watch the clock; do what it does and keep going.'
  ];
begin
  select * into v_row from public.daily_challenges where challenge_date = current_date;
  if found then
    return v_row;
  end if;

  insert into public.daily_challenges (challenge_date, text)
  values (
    current_date,
    v_pool[1 + (extract(epoch from current_date::timestamptz)::bigint % array_length(v_pool, 1))]
  )
  on conflict (challenge_date) do nothing;

  select * into v_row from public.daily_challenges where challenge_date = current_date;
  return v_row;
end;
$$;

grant execute on function public.get_daily_challenge() to authenticated, anon;

-- ============================================================
-- Submit (or improve) today's result. Keeps your best attempt only.
-- ============================================================
create or replace function public.submit_daily_challenge_result(
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
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.validate_result(p_wpm, p_raw_wpm, p_accuracy, p_mistakes);
  perform public.ensure_profile_row();
  perform public.get_daily_challenge(); -- ensure today's row exists

  insert into public.daily_challenge_results (challenge_date, user_id, wpm, raw_wpm, accuracy, mistakes)
  values (current_date, v_user_id, p_wpm, p_raw_wpm, p_accuracy, p_mistakes)
  on conflict (challenge_date, user_id) do update set
    wpm = greatest(daily_challenge_results.wpm, excluded.wpm),
    raw_wpm = case when excluded.wpm > daily_challenge_results.wpm then excluded.raw_wpm else daily_challenge_results.raw_wpm end,
    accuracy = case when excluded.wpm > daily_challenge_results.wpm then excluded.accuracy else daily_challenge_results.accuracy end,
    mistakes = case when excluded.wpm > daily_challenge_results.wpm then excluded.mistakes else daily_challenge_results.mistakes end;
end;
$$;

grant execute on function public.submit_daily_challenge_result(numeric, numeric, numeric, integer) to authenticated;

-- ============================================================
-- Today's mini-leaderboard.
-- ============================================================
create or replace function public.daily_challenge_leaderboard(p_limit integer default 100)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  wpm numeric,
  accuracy numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.user_id, p.username, p.avatar_url, r.wpm, r.accuracy, r.created_at
  from public.daily_challenge_results r
  join public.profiles p on p.id = r.user_id
  where r.challenge_date = current_date
  order by r.wpm desc
  limit p_limit;
$$;

grant execute on function public.daily_challenge_leaderboard(integer) to authenticated, anon;
