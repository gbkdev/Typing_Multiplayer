-- 0006_achievements_and_notifications.sql

-- Notify the addressee whenever a friend request is created.
create function public.notify_friend_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  values (
    new.addressee_id,
    'friend_request',
    jsonb_build_object('friendship_id', new.id, 'requester_id', new.requester_id)
  );
  return new;
end;
$$;

create trigger on_friendship_request
  after insert on public.friendships
  for each row execute procedure public.notify_friend_request();

-- Notify the requester when their friend request is accepted.
create function public.notify_friend_accepted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, type, payload)
    values (new.requester_id, 'friend_accepted', jsonb_build_object('friendship_id', new.id));
  end if;
  return new;
end;
$$;

create trigger on_friendship_accepted
  after update on public.friendships
  for each row execute procedure public.notify_friend_accepted();

-- Auto-award achievements based on match results / profile aggregates.
create function public.award_achievements()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = new.user_id;

  -- First race
  if v_profile.total_races = 1 then
    insert into public.user_achievements (user_id, achievement_id)
    values (new.user_id, 'first_race')
    on conflict do nothing;
  end if;

  -- Speed milestones
  if new.wpm >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (new.user_id, 'speed_100')
    on conflict do nothing;
  end if;
  if new.wpm >= 200 then
    insert into public.user_achievements (user_id, achievement_id)
    values (new.user_id, 'speed_200')
    on conflict do nothing;
  end if;

  -- Perfect accuracy
  if new.accuracy >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (new.user_id, 'perfect_accuracy')
    on conflict do nothing;
  end if;

  -- 100 wins
  if v_profile.wins >= 100 then
    insert into public.user_achievements (user_id, achievement_id)
    values (new.user_id, 'wins_100')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Named to sort alphabetically after 'on_match_result_insert' (0004), since
-- Postgres fires same-event triggers in name order and this depends on
-- apply_match_result() having already updated the profile aggregates.
create trigger on_match_result_zz_award_achievements
  after insert on public.match_results
  for each row execute procedure public.award_achievements();
