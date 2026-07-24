-- 0005_realtime.sql
-- Add tables to the supabase_realtime publication so clients can subscribe
-- to postgres changes (room state, player progress, chat).

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- Ensure full row data is sent on updates (needed for progress/wpm deltas).
alter table public.room_players replica identity full;
alter table public.rooms replica identity full;
