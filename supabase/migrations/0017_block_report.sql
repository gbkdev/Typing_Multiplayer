-- 0017_block_report.sql
-- Lets a player block another player (stops DMs and friend requests both
-- ways, and removes any existing friendship) and report a player for abuse.

-- ============================================================
-- blocks
-- ============================================================
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index blocks_blocker_idx on public.blocks (blocker_id);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "users can see their own block list"
  on public.blocks for select
  using (blocker_id = auth.uid());

create policy "users can block others"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "users can unblock others"
  on public.blocks for delete
  using (blocker_id = auth.uid());

-- ============================================================
-- reports
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate_content', 'cheating', 'other')),
  details text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index reports_reported_idx on public.reports (reported_id);

alter table public.reports enable row level security;

-- Write-only from the client's perspective — a report is between the
-- reporter and moderators, not visible to either party in the app.
create policy "users can file reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ============================================================
-- A block ends any existing friendship immediately, both directions.
-- ============================================================
create or replace function public.handle_new_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create trigger on_block_created
  after insert on public.blocks
  for each row execute procedure public.handle_new_block();

-- ============================================================
-- Friend requests: reject if either side has blocked the other.
-- ============================================================
create or replace function public.can_friend(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

grant execute on function public.can_friend(uuid, uuid) to authenticated;

-- Replace (not add alongside) the original insert policy — RLS policies for
-- the same command are OR'd together, so leaving the old unrestricted one
-- in place would let a blocked user's request through anyway.
drop policy if exists "users can send friend requests" on public.friendships;
create policy "friend requests respect blocks"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and public.can_friend(requester_id, addressee_id)
  );

-- ============================================================
-- Direct messages: reject if either side has blocked the other,
-- in addition to the existing friends-only requirement.
-- ============================================================
drop policy if exists "friends can send direct messages" on public.direct_messages;
create policy "friends can send direct messages"
  on public.direct_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_friend(sender_id, recipient_id)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = recipient_id)
          or (f.addressee_id = auth.uid() and f.requester_id = recipient_id)
        )
    )
  );
