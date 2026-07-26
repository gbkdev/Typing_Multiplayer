-- 0011_direct_messages.sql
-- Player-to-player direct messages (separate from in-room race chat).

-- ============================================================
-- direct_messages
-- ============================================================
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

-- Fast lookup of a conversation between two specific users, newest last.
create index direct_messages_conversation_idx
  on public.direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

-- Fast "unread from this person" lookups.
create index direct_messages_unread_idx
  on public.direct_messages (recipient_id, sender_id) where read_at is null;

alter table public.direct_messages enable row level security;
alter table public.direct_messages replica identity full;
alter publication supabase_realtime add table public.direct_messages;

-- ============================================================
-- RLS: only the two participants can ever see a message.
-- Sending requires an accepted friendship (keeps DMs to people
-- you've actually connected with, not open to anyone).
-- ============================================================
create policy "participants can read their direct messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "friends can send direct messages"
  on public.direct_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = recipient_id)
          or (f.addressee_id = auth.uid() and f.requester_id = recipient_id)
        )
    )
  );

create policy "recipient can mark messages read"
  on public.direct_messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ============================================================
-- Notify the recipient when they get a new direct message.
-- ============================================================
alter table public.notifications
  drop constraint notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'room_invite', 'achievement', 'system', 'direct_message'));

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  values (
    new.recipient_id,
    'direct_message',
    jsonb_build_object('sender_id', new.sender_id, 'preview', left(new.content, 80))
  );
  return new;
end;
$$;

create trigger on_direct_message_sent
  after insert on public.direct_messages
  for each row execute procedure public.notify_direct_message();

-- ============================================================
-- Conversation list: one row per person you've messaged, with
-- the latest message and how many are unread from them.
-- ============================================================
create or replace function public.list_conversations()
returns table (
  other_user_id uuid,
  other_username text,
  other_avatar_url text,
  last_content text,
  last_created_at timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as other_user_id,
    p.username as other_username,
    p.avatar_url as other_avatar_url,
    last_msg.content as last_content,
    last_msg.created_at as last_created_at,
    last_msg.sender_id as last_sender_id,
    coalesce(unread.unread_count, 0) as unread_count
  from (
    select distinct
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_id
    from public.direct_messages
    where sender_id = auth.uid() or recipient_id = auth.uid()
  ) partners
  join public.profiles p on p.id = partners.other_id
  join lateral (
    select content, created_at, sender_id
    from public.direct_messages dm
    where (dm.sender_id = auth.uid() and dm.recipient_id = partners.other_id)
       or (dm.sender_id = partners.other_id and dm.recipient_id = auth.uid())
    order by dm.created_at desc
    limit 1
  ) last_msg on true
  left join lateral (
    select count(*) as unread_count
    from public.direct_messages dm
    where dm.sender_id = partners.other_id and dm.recipient_id = auth.uid() and dm.read_at is null
  ) unread on true
  order by last_msg.created_at desc;
$$;

grant execute on function public.list_conversations() to authenticated;

-- Mark every unread message from one sender as read, in one round trip.
create or replace function public.mark_conversation_read(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.direct_messages
  set read_at = now()
  where recipient_id = auth.uid()
    and sender_id = p_other_user_id
    and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;
