-- =========================
-- RICH BIZNESS — SPORTS SAFE PATCH
-- sql/080_sports.sql
-- =========================

alter table sports_profiles add column if not exists user_id uuid;
alter table sports_profiles add column if not exists favorite_team text;
alter table sports_profiles add column if not exists favorite_sport text;
alter table sports_profiles add column if not exists fan_tag text;
alter table sports_profiles add column if not exists bio text;
alter table sports_profiles add column if not exists created_at timestamptz default now();
alter table sports_profiles add column if not exists updated_at timestamptz default now();
alter table sports_profiles enable row level security;

alter table sports_uploads add column if not exists user_id uuid;
alter table sports_uploads add column if not exists title text;
alter table sports_uploads add column if not exists caption text;
alter table sports_uploads add column if not exists sport_name text;
alter table sports_uploads add column if not exists team_name text;
alter table sports_uploads add column if not exists athlete_name text;
alter table sports_uploads add column if not exists position_name text;
alter table sports_uploads add column if not exists content_type text;
alter table sports_uploads add column if not exists clip_type text;
alter table sports_uploads add column if not exists file_url text;
alter table sports_uploads add column if not exists thumbnail_url text;
alter table sports_uploads add column if not exists views int default 0;
alter table sports_uploads add column if not exists likes int default 0;
alter table sports_uploads add column if not exists is_featured boolean default false;
alter table sports_uploads add column if not exists created_at timestamptz default now();
alter table sports_uploads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table sports_uploads enable row level security;

alter table sports_posts add column if not exists user_id uuid;
alter table sports_posts add column if not exists title text;
alter table sports_posts add column if not exists description text;
alter table sports_posts add column if not exists video_url text;
alter table sports_posts add column if not exists category text default 'general';
alter table sports_posts add column if not exists created_at timestamptz default now();
alter table sports_posts enable row level security;

alter table sports_picks add column if not exists user_id uuid;
alter table sports_picks add column if not exists title text;
alter table sports_picks add column if not exists sport text;
alter table sports_picks add column if not exists team_name text;
alter table sports_picks add column if not exists opponent text;
alter table sports_picks add column if not exists prediction text;
alter table sports_picks add column if not exists confidence int default 50;
alter table sports_picks add column if not exists result text default 'pending';
alter table sports_picks add column if not exists points int default 0;
alter table sports_picks add column if not exists favorite_team text;
alter table sports_picks add column if not exists created_at timestamptz default now();
alter table sports_picks enable row level security;

alter table sports_pick_results add column if not exists pick_id bigint;
alter table sports_pick_results add column if not exists user_id uuid;
alter table sports_pick_results add column if not exists result text;
alter table sports_pick_results add column if not exists points int default 0;
alter table sports_pick_results add column if not exists created_at timestamptz default now();
alter table sports_pick_results enable row level security;

alter table sports_brackets add column if not exists user_id uuid;
alter table sports_brackets add column if not exists title text;
alter table sports_brackets add column if not exists sport text;
alter table sports_brackets add column if not exists bracket_data jsonb not null default '{}'::jsonb;
alter table sports_brackets add column if not exists status text default 'draft';
alter table sports_brackets add column if not exists created_at timestamptz default now();
alter table sports_brackets enable row level security;

create index if not exists idx_sports_profiles_user_id on sports_profiles(user_id);
create index if not exists idx_sports_uploads_user_id on sports_uploads(user_id);
create index if not exists idx_sports_uploads_created_at on sports_uploads(created_at desc);
create index if not exists idx_sports_posts_user_id on sports_posts(user_id);
create index if not exists idx_sports_picks_user_id on sports_picks(user_id);
create index if not exists idx_sports_pick_results_pick_id on sports_pick_results(pick_id);
create index if not exists idx_sports_brackets_user_id on sports_brackets(user_id);

drop policy if exists "sports_profiles_select_all" on sports_profiles;
create policy "sports_profiles_select_all"
on sports_profiles for select
using (true);

drop policy if exists "sports_profiles_insert_self" on sports_profiles;
create policy "sports_profiles_insert_self"
on sports_profiles for insert
with check (user_id = auth.uid());

drop policy if exists "sports_profiles_update_self" on sports_profiles;
create policy "sports_profiles_update_self"
on sports_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "sports_uploads_select_all" on sports_uploads;
create policy "sports_uploads_select_all"
on sports_uploads for select
using (true);

drop policy if exists "sports_uploads_insert_self" on sports_uploads;
create policy "sports_uploads_insert_self"
on sports_uploads for insert
with check (user_id = auth.uid());

drop policy if exists "sports_posts_select_all" on sports_posts;
create policy "sports_posts_select_all"
on sports_posts for select
using (true);

drop policy if exists "sports_posts_insert_self" on sports_posts;
create policy "sports_posts_insert_self"
on sports_posts for insert
with check (user_id = auth.uid());

drop policy if exists "sports_picks_select_all" on sports_picks;
create policy "sports_picks_select_all"
on sports_picks for select
using (true);

drop policy if exists "sports_picks_insert_self" on sports_picks;
create policy "sports_picks_insert_self"
on sports_picks for insert
with check (user_id = auth.uid());

drop policy if exists "sports_brackets_select_all" on sports_brackets;
create policy "sports_brackets_select_all"
on sports_brackets for select
using (true);

drop policy if exists "sports_brackets_insert_self" on sports_brackets;
create policy "sports_brackets_insert_self"
on sports_brackets for insert
with check (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
