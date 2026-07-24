-- 0009_username_choice.sql
-- Stop auto-assigning player_* names; require users to pick a username in the app.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_username is not null and char_length(v_username) between 3 and 20
     and v_username ~ '^[a-zA-Z0-9_]+$' then
    insert into public.profiles (id, username)
    values (new.id, v_username);
  else
    insert into public.profiles (id, username)
    values (new.id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  end if;
  return new;
exception
  when unique_violation then
    insert into public.profiles (id, username)
    values (new.id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    return new;
end;
$$;

create or replace function public.ensure_profile(p_username text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := nullif(trim(p_username), '');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_username is not null
     and char_length(v_username) between 3 and 20
     and v_username ~ '^[a-zA-Z0-9_]+$' then
    insert into public.profiles (id, username)
    values (v_user_id, v_username)
    on conflict (id) do update set username = excluded.username
    where public.profiles.username like 'pending_%'
       or public.profiles.username like 'player_%';
  else
    insert into public.profiles (id, username)
    values (v_user_id, 'pending_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    on conflict (id) do nothing;
  end if;
end;
$$;

create or replace function public.set_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := trim(p_username);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_username) < 3 or char_length(v_username) > 20 then
    raise exception 'Username must be 3–20 characters';
  end if;

  if v_username !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Username can only contain letters, numbers, and underscores';
  end if;

  update public.profiles
  set username = v_username
  where id = v_user_id;

  if not found then
    insert into public.profiles (id, username)
    values (v_user_id, v_username);
  end if;
end;
$$;

grant execute on function public.set_username(text) to authenticated;
