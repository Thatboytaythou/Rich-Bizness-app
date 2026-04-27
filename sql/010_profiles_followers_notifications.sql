-- =========================
-- RICH BIZNESS — PROFILES / FOLLOWERS / NOTIFICATIONS
-- =========================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  display_name text,
  full_name text,
  bio text,
  avatar_url text,
  profile_image_url text,
  profile_image text,
  cover_url text,
  website_url text,
  role text default 'user',
  is_creator boolean not null default false,
  is_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create table if not exists followers (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

alter table followers enable row level security;

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type text not null default 'system',
  title text,
  body text,
  link_url text,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_followers_follower_id on followers(follower_id);
create index if not exists idx_followers_following_id on followers(following_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_created_at on notifications(created_at desc);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    username,
    display_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all"
on profiles for select
using (true);

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "followers_select_all" on followers;
create policy "followers_select_all"
on followers for select
using (true);

drop policy if exists "followers_insert_self" on followers;
create policy "followers_insert_self"
on followers for insert
with check (auth.uid() = follower_id);

drop policy if exists "followers_delete_self" on followers;
create policy "followers_delete_self"
on followers for delete
using (auth.uid() = follower_id);

drop policy if exists "notifications_select_self" on notifications;
create policy "notifications_select_self"
on notifications for select
using (auth.uid() = user_id);

drop policy if exists "notifications_update_self" on notifications;
create policy "notifications_update_self"
on notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
