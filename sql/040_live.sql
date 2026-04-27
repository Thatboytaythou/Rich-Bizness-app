-- =========================
-- RICH BIZNESS — LIVE SYSTEM SAFE PATCH
-- sql/040_live.sql
-- =========================

-- LIVE STREAMS
alter table live_streams add column if not exists livekit_room_sid text;
alter table live_streams add column if not exists scheduled_for timestamptz;
alter table live_streams add column if not exists is_replay_enabled boolean not null default true;
alter table live_streams add column if not exists last_activity_at timestamptz;
alter table live_streams add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table live_streams enable row level security;

alter table live_streams
drop constraint if exists live_streams_creator_id_fkey;

alter table live_streams
add constraint live_streams_creator_id_fkey
foreign key (creator_id) references profiles(id) on delete cascade;

-- LIVE MEMBERS
alter table live_stream_members add column if not exists status text not null default 'active';
alter table live_stream_members add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table live_stream_members add column if not exists slot_number int;

alter table live_stream_members enable row level security;

alter table live_stream_members
drop constraint if exists live_stream_members_stream_id_fkey;

alter table live_stream_members
add constraint live_stream_members_stream_id_fkey
foreign key (stream_id) references live_streams(id) on delete cascade;

alter table live_stream_members
drop constraint if exists live_stream_members_user_id_fkey;

alter table live_stream_members
add constraint live_stream_members_user_id_fkey
foreign key (user_id) references profiles(id) on delete cascade;

-- LIVE CHAT
alter table live_chat_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table live_chat_messages add column if not exists is_deleted boolean not null default false;
alter table live_chat_messages add column if not exists is_pinned boolean not null default false;
alter table live_chat_messages add column if not exists updated_at timestamptz not null default now();

alter table live_chat_messages enable row level security;

alter table live_chat_messages
drop constraint if exists live_chat_messages_stream_id_fkey;

alter table live_chat_messages
add constraint live_chat_messages_stream_id_fkey
foreign key (stream_id) references live_streams(id) on delete cascade;

alter table live_chat_messages
drop constraint if exists live_chat_messages_user_id_fkey;

alter table live_chat_messages
add constraint live_chat_messages_user_id_fkey
foreign key (user_id) references profiles(id) on delete set null;

-- VIEW SESSIONS
alter table live_view_sessions add column if not exists watch_seconds int not null default 0;
alter table live_view_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table live_view_sessions add column if not exists updated_at timestamptz not null default now();

alter table live_view_sessions enable row level security;

alter table live_view_sessions
drop constraint if exists live_view_sessions_stream_id_fkey;

alter table live_view_sessions
add constraint live_view_sessions_stream_id_fkey
foreign key (stream_id) references live_streams(id) on delete cascade;

alter table live_view_sessions
drop constraint if exists live_view_sessions_user_id_fkey;

alter table live_view_sessions
add constraint live_view_sessions_user_id_fkey
foreign key (user_id) references profiles(id) on delete set null;

-- PURCHASES
alter table live_stream_purchases add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table live_stream_purchases add column if not exists updated_at timestamptz not null default now();

alter table live_stream_purchases enable row level security;

alter table live_stream_purchases
drop constraint if exists live_stream_purchases_stream_id_fkey;

alter table live_stream_purchases
add constraint live_stream_purchases_stream_id_fkey
foreign key (stream_id) references live_streams(id) on delete cascade;

alter table live_stream_purchases
drop constraint if exists live_stream_purchases_user_id_fkey;

alter table live_stream_purchases
add constraint live_stream_purchases_user_id_fkey
foreign key (user_id) references profiles(id) on delete cascade;

-- ROOM ACCESS
alter table live_room_access enable row level security;

alter table live_room_access
drop constraint if exists live_room_access_room_id_fkey;

alter table live_room_access
add constraint live_room_access_room_id_fkey
foreign key (room_id) references live_streams(id) on delete cascade;

alter table live_room_access
drop constraint if exists live_room_access_user_id_fkey;

alter table live_room_access
add constraint live_room_access_user_id_fkey
foreign key (user_id) references profiles(id) on delete cascade;

-- INDEXES
create index if not exists idx_live_streams_creator_id on live_streams(creator_id);
create index if not exists idx_live_streams_slug on live_streams(slug);
create index if not exists idx_live_streams_status on live_streams(status);
create index if not exists idx_live_streams_created_at on live_streams(created_at desc);

create index if not exists idx_live_members_stream_id on live_stream_members(stream_id);
create index if not exists idx_live_members_user_id on live_stream_members(user_id);

create index if not exists idx_live_chat_stream_id on live_chat_messages(stream_id);
create index if not exists idx_live_chat_created_at on live_chat_messages(created_at desc);

create index if not exists idx_live_views_stream_id on live_view_sessions(stream_id);
create index if not exists idx_live_views_user_id on live_view_sessions(user_id);

create index if not exists idx_live_purchases_stream_id on live_stream_purchases(stream_id);
create index if not exists idx_live_purchases_user_id on live_stream_purchases(user_id);
create index if not exists idx_live_purchases_status on live_stream_purchases(status);

-- POLICIES
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

drop policy if exists "live_members_select_all" on live_stream_members;
create policy "live_members_select_all"
on live_stream_members for select
using (true);

drop policy if exists "live_members_insert_auth" on live_stream_members;
create policy "live_members_insert_auth"
on live_stream_members for insert
with check (auth.uid() is not null);

drop policy if exists "live_members_update_self_or_host" on live_stream_members;
create policy "live_members_update_self_or_host"
on live_stream_members for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from live_streams s
    where s.id = live_stream_members.stream_id
    and s.creator_id = auth.uid()
  )
);

drop policy if exists "live_chat_select_all" on live_chat_messages;
create policy "live_chat_select_all"
on live_chat_messages for select
using (true);

drop policy if exists "live_chat_insert_auth" on live_chat_messages;
create policy "live_chat_insert_auth"
on live_chat_messages for insert
with check (auth.uid() = user_id);

drop policy if exists "live_views_insert_any" on live_view_sessions;
create policy "live_views_insert_any"
on live_view_sessions for insert
with check (true);

drop policy if exists "live_views_select_host_or_self" on live_view_sessions;
create policy "live_views_select_host_or_self"
on live_view_sessions for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from live_streams s
    where s.id = live_view_sessions.stream_id
    and s.creator_id = auth.uid()
  )
);

drop policy if exists "live_purchases_select_self_or_host" on live_stream_purchases;
create policy "live_purchases_select_self_or_host"
on live_stream_purchases for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from live_streams s
    where s.id = live_stream_purchases.stream_id
    and s.creator_id = auth.uid()
  )
);

drop policy if exists "live_room_access_select_self" on live_room_access;
create policy "live_room_access_select_self"
on live_room_access for select
using (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
