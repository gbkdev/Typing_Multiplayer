-- REPAIR_direct_messages.sql
-- Run this in the Supabase SQL editor if you hit errors like
-- "column dm.read_at does not exist" or similar schema-mismatch errors
-- for direct messages. It's idempotent — safe to run even if some of
-- this already exists in your database.

-- ============================================================
-- Table + columns
-- ============================================================
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table public.direct_messages add column if not exists read_at timestamptz;
alter table public.direct_messages add column if not exists attachment_path text;
alter table public.direct_messages add column if not exists attachment_type text;
alter table public.direct_messages add column if not exists attachment_name text;

alter table public.direct_messages drop constraint if exists direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_content_check
  check (char_length(content) <= 1000 and (char_length(content) > 0 or attachment_path is not null));

alter table public.direct_messages drop constraint if exists direct_messages_attachment_type_check;
alter table public.direct_messages add constraint direct_messages_attachment_type_check
  check (attachment_type in ('image', 'gif', 'file') or attachment_type is null);

alter table public.direct_messages drop constraint if exists direct_messages_check;
alter table public.direct_messages add constraint direct_messages_check
  check (sender_id <> recipient_id);

create index if not exists direct_messages_conversation_idx
  on public.direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index if not exists direct_messages_unread_idx
  on public.direct_messages (recipient_id, sender_id) where read_at is null;

-- ============================================================
-- RLS
-- ============================================================
alter table public.direct_messages enable row level security;

drop policy if exists "participants can read their direct messages" on public.direct_messages;
create policy "participants can read their direct messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "friends can send direct messages" on public.direct_messages;
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

drop policy if exists "recipient can mark messages read" on public.direct_messages;
create policy "recipient can mark messages read"
  on public.direct_messages for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ============================================================
-- Realtime
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

alter table public.direct_messages replica identity full;

-- ============================================================
-- Storage bucket + policies for attachments
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('dm-attachments', 'dm-attachments', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "participants can read their dm attachments" on storage.objects;
create policy "participants can read their dm attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dm-attachments'
    and position(auth.uid()::text in (storage.foldername(name))[1]) > 0
  );

drop policy if exists "participants can upload their own dm attachments" on storage.objects;
create policy "participants can upload their own dm attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and position(auth.uid()::text in (storage.foldername(name))[1]) > 0
  );

drop policy if exists "participants can delete their own dm attachments" on storage.objects;
create policy "participants can delete their own dm attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dm-attachments'
    and position(auth.uid()::text in (storage.foldername(name))[1]) > 0
  );

-- ============================================================
-- Notification trigger on new DM
-- ============================================================
alter table public.notifications drop constraint if exists notifications_type_check;
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

drop trigger if exists on_direct_message_sent on public.direct_messages;
create trigger on_direct_message_sent
  after insert on public.direct_messages
  for each row execute procedure public.notify_direct_message();

-- ============================================================
-- Functions the app calls: list_conversations(), mark_conversation_read()
-- ============================================================
create or replace function public.list_conversations()
returns table (
  other_user_id uuid,
  other_username text,
  other_avatar_url text,
  last_content text,
  last_attachment_type text,
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
    last_msg.attachment_type as last_attachment_type,
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
    select content, attachment_type, created_at, sender_id
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
