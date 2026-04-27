-- =========================
-- RICH BIZNESS — FUNCTIONS / TRIGGERS
-- sql/110_functions.sql
-- =========================

-- UNIVERSAL UPDATED_AT FUNCTION
create or replace function public.rb_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- SAFE TRIGGER HELPER PATTERN
drop trigger if exists rb_profiles_updated_at on profiles;
create trigger rb_profiles_updated_at
before update on profiles
for each row execute function public.rb_set_updated_at();

drop trigger if exists rb_posts_updated_at on posts;
create trigger rb_posts_updated_at
before update on posts
for each row execute function public.rb_set_updated_at();

drop trigger if exists rb_live_streams_updated_at on live_streams;
create trigger rb_live_streams_updated_at
before update on live_streams
for each row execute function public.rb_set_updated_at();

drop trigger if exists rb_games_updated_at on games;
create trigger rb_games_updated_at
before update on games
for each row execute function public.rb_set_updated_at();

drop trigger if exists rb_radio_stations_updated_at on radio_stations;
create trigger rb_radio_stations_updated_at
before update on radio_stations
for each row execute function public.rb_set_updated_at();

-- =========================
-- FEED COUNTS
-- =========================

create or replace function public.rb_refresh_post_counts(target_post_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update posts
  set
    like_count = (
      select count(*)::int
      from post_reactions
      where post_id = target_post_id
    ),
    comment_count = (
      select count(*)::int
      from comments
      where post_id = target_post_id
    ),
    repost_count = (
      select count(*)::int
      from reposts
      where post_id = target_post_id
    ),
    updated_at = now()
  where id = target_post_id;
end;
$$;

create or replace function public.rb_post_reactions_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rb_refresh_post_counts(coalesce(new.post_id, old.post_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists rb_post_reactions_count on post_reactions;
create trigger rb_post_reactions_count
after insert or delete on post_reactions
for each row execute function public.rb_post_reactions_count_trigger();

drop trigger if exists rb_comments_count on comments;
create trigger rb_comments_count
after insert or delete on comments
for each row execute function public.rb_post_reactions_count_trigger();

drop trigger if exists rb_reposts_count on reposts;
create trigger rb_reposts_count
after insert or delete on reposts
for each row execute function public.rb_post_reactions_count_trigger();

-- =========================
-- LIVE VIEWER COUNT
-- =========================

create or replace function public.rb_refresh_live_viewers(target_stream_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count int;
begin
  select count(*)::int
  into active_count
  from live_view_sessions
  where stream_id = target_stream_id
  and is_active = true;

  update live_streams
  set
    viewer_count = active_count,
    peak_viewers = greatest(coalesce(peak_viewers, 0), active_count),
    last_activity_at = now(),
    updated_at = now()
  where id = target_stream_id;
end;
$$;

create or replace function public.rb_live_view_sessions_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rb_refresh_live_viewers(coalesce(new.stream_id, old.stream_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists rb_live_view_sessions_count on live_view_sessions;
create trigger rb_live_view_sessions_count
after insert or update or delete on live_view_sessions
for each row execute function public.rb_live_view_sessions_trigger();

-- =========================
-- LIVE CHAT COUNT
-- =========================

create or replace function public.rb_live_chat_count_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update live_streams
  set
    total_chat_messages = (
      select count(*)::int
      from live_chat_messages
      where stream_id = coalesce(new.stream_id, old.stream_id)
      and coalesce(is_deleted, false) = false
    ),
    last_activity_at = now(),
    updated_at = now()
  where id = coalesce(new.stream_id, old.stream_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists rb_live_chat_count on live_chat_messages;
create trigger rb_live_chat_count
after insert or update or delete on live_chat_messages
for each row execute function public.rb_live_chat_count_trigger();

-- =========================
-- GAME PLAY COUNT
-- =========================

create or replace function public.rb_game_score_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update games
  set
    play_count = coalesce(play_count, 0) + 1,
    last_played_at = now(),
    updated_at = now()
  where slug = new.game_slug;

  return new;
end;
$$;

drop trigger if exists rb_game_score_play_count on game_scores;
create trigger rb_game_score_play_count
after insert on game_scores
for each row execute function public.rb_game_score_trigger();

-- =========================
-- NOTIFY SCHEMA
-- =========================

NOTIFY pgrst, 'reload schema';
