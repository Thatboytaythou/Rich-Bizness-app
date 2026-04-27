-- =========================
-- RICH BIZNESS — FINAL POLICIES SAFE PATCH
-- sql/100_policies.sql
-- =========================

-- Make sure schema cache sees new relationships
NOTIFY pgrst, 'reload schema';

-- =========================
-- PROFILES
-- =========================
alter table profiles enable row level security;

drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all"
on profiles for select
using (true);

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================
-- FEED
-- =========================
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_reactions enable row level security;
alter table reposts enable row level security;

drop policy if exists "posts_select_all" on posts;
create policy "posts_select_all"
on posts for select
using (true);

drop policy if exists "posts_insert_self" on posts;
create policy "posts_insert_self"
on posts for insert
with check (auth.uid() = user_id);

drop policy if exists "posts_update_self" on posts;
create policy "posts_update_self"
on posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "comments_select_all" on comments;
create policy "comments_select_all"
on comments for select
using (true);

drop policy if exists "comments_insert_self" on comments;
create policy "comments_insert_self"
on comments for insert
with check (auth.uid() = user_id);

drop policy if exists "post_reactions_select_all" on post_reactions;
create policy "post_reactions_select_all"
on post_reactions for select
using (true);

drop policy if exists "post_reactions_insert_self" on post_reactions;
create policy "post_reactions_insert_self"
on post_reactions for insert
with check (auth.uid() = user_id);

drop policy if exists "reposts_select_all" on reposts;
create policy "reposts_select_all"
on reposts for select
using (true);

drop policy if exists "reposts_insert_self" on reposts;
create policy "reposts_insert_self"
on reposts for insert
with check (auth.uid() = user_id);

-- =========================
-- MESSAGES
-- =========================
alter table dm_threads enable row level security;
alter table dm_thread_members enable row level security;
alter table dm_messages enable row level security;

drop policy if exists "dm_threads_select_members" on dm_threads;
create policy "dm_threads_select_members"
on dm_threads for select
using (
  exists (
    select 1 from dm_thread_members m
    where m.thread_id = dm_threads.id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_threads_insert_auth" on dm_threads;
create policy "dm_threads_insert_auth"
on dm_threads for insert
with check (auth.uid() = created_by);

drop policy if exists "dm_members_select_related" on dm_thread_members;
create policy "dm_members_select_related"
on dm_thread_members for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from dm_thread_members m
    where m.thread_id = dm_thread_members.thread_id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_members_insert_auth" on dm_thread_members;
create policy "dm_members_insert_auth"
on dm_thread_members for insert
with check (auth.uid() is not null);

drop policy if exists "dm_messages_select_members" on dm_messages;
create policy "dm_messages_select_members"
on dm_messages for select
using (
  exists (
    select 1 from dm_thread_members m
    where m.thread_id = dm_messages.thread_id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_messages_insert_members" on dm_messages;
create policy "dm_messages_insert_members"
on dm_messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from dm_thread_members m
    where m.thread_id = dm_messages.thread_id
    and m.user_id = auth.uid()
  )
);

-- =========================
-- NOTIFICATIONS
-- =========================
alter table notifications enable row level security;

drop policy if exists "notifications_select_self" on notifications;
create policy "notifications_select_self"
on notifications for select
using (auth.uid() = user_id);

drop policy if exists "notifications_update_self" on notifications;
create policy "notifications_update_self"
on notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================
-- LIVE
-- =========================
alter table live_streams enable row level security;
alter table live_stream_members enable row level security;
alter table live_chat_messages enable row level security;
alter table live_view_sessions enable row level security;
alter table live_stream_purchases enable row level security;

drop policy if exists "live_streams_select_all" on live_streams;
create policy "live_streams_select_all"
on live_streams for select
using (true);

drop policy if exists "live_streams_insert_self" on live_streams;
create policy "live_streams_insert_self"
on live_streams for insert
with check (auth.uid() = creator_id);

drop policy if exists "live_streams_update_self" on live_streams;
create policy "live_streams_update_self"
on live_streams for update
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

drop policy if exists "live_chat_select_all" on live_chat_messages;
create policy "live_chat_select_all"
on live_chat_messages for select
using (true);

drop policy if exists "live_chat_insert_auth" on live_chat_messages;
create policy "live_chat_insert_auth"
on live_chat_messages for insert
with check (auth.uid() = user_id);

-- =========================
-- MUSIC / RADIO
-- =========================
alter table music_tracks enable row level security;
alter table music_streams enable row level security;
alter table radio_stations enable row level security;
alter table radio_station_tracks enable row level security;
alter table radio_plays enable row level security;

drop policy if exists "music_tracks_select_all" on music_tracks;
create policy "music_tracks_select_all"
on music_tracks for select
using (true);

drop policy if exists "music_tracks_insert_self" on music_tracks;
create policy "music_tracks_insert_self"
on music_tracks for insert
with check (user_id = auth.uid());

drop policy if exists "radio_stations_select_active" on radio_stations;
create policy "radio_stations_select_active"
on radio_stations for select
using (is_active = true or creator_id = auth.uid());

drop policy if exists "radio_plays_insert_any" on radio_plays;
create policy "radio_plays_insert_any"
on radio_plays for insert
with check (true);

-- =========================
-- GAMING
-- =========================
alter table games enable row level security;
alter table game_scores enable row level security;
alter table game_sessions enable row level security;
alter table gaming_uploads enable row level security;

drop policy if exists "games_select_public" on games;
create policy "games_select_public"
on games for select
using (visibility = 'public' or creator_id = auth.uid());

drop policy if exists "game_scores_select_all" on game_scores;
create policy "game_scores_select_all"
on game_scores for select
using (true);

drop policy if exists "game_scores_insert_self" on game_scores;
create policy "game_scores_insert_self"
on game_scores for insert
with check (user_id = auth.uid() or user_id is null);

-- =========================
-- SPORTS
-- =========================
alter table sports_profiles enable row level security;
alter table sports_uploads enable row level security;
alter table sports_posts enable row level security;
alter table sports_picks enable row level security;

drop policy if exists "sports_uploads_select_all" on sports_uploads;
create policy "sports_uploads_select_all"
on sports_uploads for select
using (true);

drop policy if exists "sports_uploads_insert_self" on sports_uploads;
create policy "sports_uploads_insert_self"
on sports_uploads for insert
with check (user_id = auth.uid());

drop policy if exists "sports_picks_select_all" on sports_picks;
create policy "sports_picks_select_all"
on sports_picks for select
using (true);

-- =========================
-- GALLERY / STORE
-- =========================
alter table artworks enable row level security;
alter table artwork_likes enable row level security;
alter table artwork_purchases enable row level security;
alter table products enable row level security;
alter table store_orders enable row level security;

drop policy if exists "artworks_select_all" on artworks;
create policy "artworks_select_all"
on artworks for select
using (true);

drop policy if exists "artworks_insert_self" on artworks;
create policy "artworks_insert_self"
on artworks for insert
with check (user_id = auth.uid());

drop policy if exists "products_select_active" on products;
create policy "products_select_active"
on products for select
using (active = true or is_active = true or creator_id = auth.uid() or user_id = auth.uid() or seller_user_id = auth.uid());

drop policy if exists "store_orders_select_creator" on store_orders;
create policy "store_orders_select_creator"
on store_orders for select
using (creator_id = auth.uid());

-- =========================
-- MONETIZATION
-- =========================
alter table payments enable row level security;
alter table tips enable row level security;
alter table premium_content enable row level security;
alter table creator_memberships enable row level security;
alter table fan_subscriptions enable row level security;

drop policy if exists "payments_select_self" on payments;
create policy "payments_select_self"
on payments for select
using (user_id = auth.uid());

drop policy if exists "tips_select_related" on tips;
create policy "tips_select_related"
on tips for select
using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "premium_content_select_active" on premium_content;
create policy "premium_content_select_active"
on premium_content for select
using (is_active = true or creator_id = auth.uid());

-- =========================
-- FINAL SCHEMA REFRESH
-- =========================
NOTIFY pgrst, 'reload schema';
