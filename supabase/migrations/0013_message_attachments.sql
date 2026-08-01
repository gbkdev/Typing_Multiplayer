-- 0013_message_attachments.sql
-- Lets direct messages carry an attachment (image, gif, or generic file)
-- in addition to / instead of text.

-- ============================================================
-- Storage bucket. Kept private — access is controlled by RLS below,
-- not by a public URL, since these are private DM attachments.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('dm-attachments', 'dm-attachments', false, 10485760) -- 10 MB
on conflict (id) do nothing;

-- Objects are stored at `<sorted-pair-of-user-ids>/<uuid>-<filename>`, e.g.
-- `11111111-.../22222222-.../abc-photo.png`. The folder name embeds both
-- participants' full UUIDs, so a substring match against auth.uid() is a
-- reliable (and simple) way to scope access to just the two people in
-- that conversation.
create policy "participants can read their dm attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dm-attachments'
    and position(auth.uid()::text in (storage.foldername(name))[1]) > 0
  );

create policy "participants can upload their own dm attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dm-attachments'
    and position(auth.uid()::text in (storage.foldername(name))[1]) > 0
  );

create policy "participants can delete their own dm attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dm-attachments'
    and position(auth.uid()::text in (storage.foldername(name))[1]) > 0
  );

-- ============================================================
-- direct_messages: add attachment columns, and relax the content
-- check so an attachment-only message (no text) is allowed.
-- ============================================================
alter table public.direct_messages
  add column attachment_path text,
  add column attachment_type text check (attachment_type in ('image', 'gif', 'file')),
  add column attachment_name text;

alter table public.direct_messages alter column content set default '';

alter table public.direct_messages drop constraint direct_messages_content_check;
alter table public.direct_messages add constraint direct_messages_content_check
  check (char_length(content) <= 1000 and (char_length(content) > 0 or attachment_path is not null));

-- ============================================================
-- list_conversations(): re-defined to also surface the last
-- message's attachment type, so a picture-only message doesn't
-- show up as a blank preview in the inbox.
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
