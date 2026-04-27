-- =========================================
-- RICH BIZNESS — 070 GAMING ENGINE
-- =========================================

-- =========================
-- GAME SESSIONS (PLAY TRACKING)
-- =========================
create table if not exists game_sessions (
  id bigint generated always as identity primary key,
  user_id uuid,
  game_slug text not null,
  score int default 0,
  duration_seconds int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =========================
-- GAME SCORES (LEADERBOARD)
-- =========================
create table if not exists game_scores (
  id bigint generated always as identity primary key,
  user_id uuid,
  game_slug text not null,
  score int not null,
  mode text default 'arcade',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =========================
-- INDEXES (PERFORMANCE)
-- =========================
create index if not exists idx_game_scores_slug on game_scores (game_slug);
create index if not exists idx_game_scores_score on game_scores (score desc);

create index if not exists idx_game_sessions_slug on game_sessions (game_slug);

-- =========================
-- RLS ENABLE
-- =========================
alter table game_sessions enable row level security;
alter table game_scores enable row level security;

-- =========================
-- POLICIES
-- =========================

-- GAME SESSIONS
drop policy if exists "game_sessions_insert_self" on game_sessions;
create policy "game_sessions_insert_self"
on game_sessions for insert
with check (user_id = auth.uid());

drop policy if exists "game_sessions_select_self" on game_sessions;
create policy "game_sessions_select_self"
on game_sessions for select
using (user_id = auth.uid());

-- GAME SCORES
drop policy if exists "game_scores_insert_self" on game_scores;
create policy "game_scores_insert_self"
on game_scores for insert
with check (user_id = auth.uid());

drop policy if exists "game_scores_select_public" on game_scores;
create policy "game_scores_select_public"
on game_scores for select
using (true);

-- =========================
-- DONE
-- =========================
NOTIFY pgrst, 'reload schema';
