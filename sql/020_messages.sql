-- =========================
-- RICH BIZNESS — MESSAGES / DM SYSTEM
-- =========================

create table if not exists dm_threads (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references profiles(id) on delete set null,
  title text,
  is_group boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dm_threads enable row level security;

create table if not exists dm_thread_members (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references dm_threads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  last_read_at timestamptz,
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

alter table dm_thread_members enable row level security;

create table if not exists dm_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references dm_threads(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  body text,
  message_type text not null default 'text',
  media_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dm_messages enable row level security;

create table if not exists dm_message_reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references dm_messages(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reaction text not null default '❤️',
  created_at timestamptz not null default now(),
  unique (message_id, user_id, reaction)
);

alter table dm_message_reactions enable row level security;

create index if not exists idx_dm_threads_created_by on dm_threads(created_by);
create index if not exists idx_dm_thread_members_thread_id on dm_thread_members(thread_id);
create index if not exists idx_dm_thread_members_user_id on dm_thread_members(user_id);
create index if not exists idx_dm_messages_thread_id on dm_messages(thread_id);
create index if not exists idx_dm_messages_sender_id on dm_messages(sender_id);
create index if not exists idx_dm_messages_created_at on dm_messages(created_at desc);
create index if not exists idx_dm_message_reactions_message_id on dm_message_reactions(message_id);

drop policy if exists "dm_threads_select_members" on dm_threads;
create policy "dm_threads_select_members"
on dm_threads for select
using (
  exists (
    select 1
    from dm_thread_members m
    where m.thread_id = dm_threads.id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_threads_insert_auth" on dm_threads;
create policy "dm_threads_insert_auth"
on dm_threads for insert
with check (auth.uid() = created_by);

drop policy if exists "dm_threads_update_members" on dm_threads;
create policy "dm_threads_update_members"
on dm_threads for update
using (
  exists (
    select 1
    from dm_thread_members m
    where m.thread_id = dm_threads.id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_members_select_own_threads" on dm_thread_members;
create policy "dm_members_select_own_threads"
on dm_thread_members for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from dm_thread_members m
    where m.thread_id = dm_thread_members.thread_id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_members_insert_auth" on dm_thread_members;
create policy "dm_members_insert_auth"
on dm_thread_members for insert
with check (auth.uid() is not null);

drop policy if exists "dm_members_update_self" on dm_thread_members;
create policy "dm_members_update_self"
on dm_thread_members for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "dm_messages_select_members" on dm_messages;
create policy "dm_messages_select_members"
on dm_messages for select
using (
  exists (
    select 1
    from dm_thread_members m
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
    select 1
    from dm_thread_members m
    where m.thread_id = dm_messages.thread_id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_reactions_select_members" on dm_message_reactions;
create policy "dm_reactions_select_members"
on dm_message_reactions for select
using (
  exists (
    select 1
    from dm_messages msg
    join dm_thread_members m on m.thread_id = msg.thread_id
    where msg.id = dm_message_reactions.message_id
    and m.user_id = auth.uid()
  )
);

drop policy if exists "dm_reactions_insert_self" on dm_message_reactions;
create policy "dm_reactions_insert_self"
on dm_message_reactions for insert
with check (user_id = auth.uid());

drop policy if exists "dm_reactions_delete_self" on dm_message_reactions;
create policy "dm_reactions_delete_self"
on dm_message_reactions for delete
using (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
