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
alter table posts add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_posts_category on posts(category);

NOTIFY pgrst, 'reload schema';
