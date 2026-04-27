-- =========================
-- RICH BIZNESS — FEED SYSTEM
-- sql/030_feed.sql
-- =========================

create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  body text,
  caption text,
  description text,
  category text not null default 'general',
  media_url text,
  image_url text,
  video_url text,
  file_url text,
  thumbnail_url text,
  content_type text,
  metadata jsonb not null default '{}'::jsonb,
  like_count int not null default 0,
  comment_count int not null default 0,
  repost_count int not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Patch existing posts table if it was created earlier
alter table posts add column if not exists user_id uuid;
alter table posts add column if not exists title text;
alter table posts add column if not exists body text;
alter table posts add column if not exists caption text;
alter table posts add column if not exists description text;
alter table posts add column if not exists category text not null default 'general';
alter table posts add column if not exists media_url text;
alter table posts add column if not exists image_url text;
alter table posts add column if not exists video_url text;
alter table posts add column if not exists file_url text;
alter table posts add column if not exists thumbnail_url text;
alter table posts add column if not exists content_type text;
alter table posts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table posts add column if not exists like_count int not null default 0;
alter table posts add column if not exists comment_count int not null default 0;
alter table posts add column if not exists repost_count int not null default 0;
alter table posts add column if not exists is_featured boolean not null default false;
alter table posts add column if not exists created_at timestamptz not null default now();
alter table posts add column if not exists updated_at timestamptz not null default now();

alter table posts
drop constraint if exists posts_user_id_fkey;

alter table posts
add constraint posts_user_id_fkey
foreign key (user_id)
references profiles(id)
on delete cascade;

alter table posts enable row level security;

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table comments enable row level security;

create table if not exists post_reactions (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table post_reactions enable row level security;

create table if not exists reposts (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table reposts enable row level security;

create index if not exists idx_posts_user_id on posts(user_id);
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_posts_category on posts(category);
create index if not exists idx_comments_post_id on comments(post_id);
create index if not exists idx_comments_user_id on comments(user_id);
create index if not exists idx_post_reactions_post_id on post_reactions(post_id);
create index if not exists idx_post_reactions_user_id on post_reactions(user_id);
create index if not exists idx_reposts_post_id on reposts(post_id);
create index if not exists idx_reposts_user_id on reposts(user_id);

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

drop policy if exists "posts_delete_self" on posts;
create policy "posts_delete_self"
on posts for delete
using (auth.uid() = user_id);

drop policy if exists "comments_select_all" on comments;
create policy "comments_select_all"
on comments for select
using (true);

drop policy if exists "comments_insert_self" on comments;
create policy "comments_insert_self"
on comments for insert
with check (auth.uid() = user_id);

drop policy if exists "comments_update_self" on comments;
create policy "comments_update_self"
on comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "comments_delete_self" on comments;
create policy "comments_delete_self"
on comments for delete
using (auth.uid() = user_id);

drop policy if exists "post_reactions_select_all" on post_reactions;
create policy "post_reactions_select_all"
on post_reactions for select
using (true);

drop policy if exists "post_reactions_insert_self" on post_reactions;
create policy "post_reactions_insert_self"
on post_reactions for insert
with check (auth.uid() = user_id);

drop policy if exists "post_reactions_delete_self" on post_reactions;
create policy "post_reactions_delete_self"
on post_reactions for delete
using (auth.uid() = user_id);

drop policy if exists "reposts_select_all" on reposts;
create policy "reposts_select_all"
on reposts for select
using (true);

drop policy if exists "reposts_insert_self" on reposts;
create policy "reposts_insert_self"
on reposts for insert
with check (auth.uid() = user_id);

drop policy if exists "reposts_delete_self" on reposts;
create policy "reposts_delete_self"
on reposts for delete
using (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
