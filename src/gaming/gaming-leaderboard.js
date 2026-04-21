import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getActiveUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (error) {
    console.error("[gaming-leaderboard] getActiveUser error:", error);
    return null;
  }
}

async function getProfileName(userId) {
  if (!userId) return "Player";

  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle();

    return (
      data?.display_name ||
      data?.username ||
      "Player"
    );
  } catch (error) {
    console.error("[gaming-leaderboard] getProfileName error:", error);
    return "Player";
  }
}

export async function saveGameScore({
  gameSlug,
  score,
  meta = {},
}) {
  if (!gameSlug) {
    console.error("[gaming-leaderboard] missing gameSlug");
    return { error: new Error("Missing gameSlug") };
  }

  const user = await getActiveUser();
  if (!user) {
    return { error: new Error("User not signed in") };
  }

  const payload = {
    user_id: user.id,
    game_slug: gameSlug,
    score: Number(score || 0),
    meta,
  };

  const { data, error } = await supabase
    .from("game_scores")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[gaming-leaderboard] saveGameScore error:", error);
    return { error };
  }

  return { data, error: null };
}

export async function loadGameLeaderboard({
  gameSlug,
  limit = 10,
}) {
  if (!gameSlug) {
    return [];
  }

  const { data, error } = await supabase
    .from("game_scores")
    .select("id, user_id, game_slug, score, created_at, meta")
    .eq("game_slug", gameSlug)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[gaming-leaderboard] loadGameLeaderboard error:", error);
    return [];
  }

  const rows = await Promise.all(
    (data || []).map(async (row, index) => {
      const metaName =
        row?.meta?.profile_name ||
        row?.meta?.display_name ||
        row?.meta?.username;

      const profileName =
        metaName ||
        (await getProfileName(row.user_id)) ||
        `Player ${String(row.user_id || "").slice(0, 6)}`;

      return {
        rank: index + 1,
        ...row,
        profile_name: profileName,
      };
    })
  );

  return rows;
}

export async function loadGlobalLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from("game_scores")
    .select("id, user_id, game_slug, score, created_at, meta")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[gaming-leaderboard] loadGlobalLeaderboard error:", error);
    return [];
  }

  const rows = await Promise.all(
    (data || []).map(async (row, index) => {
      const metaName =
        row?.meta?.profile_name ||
        row?.meta?.display_name ||
        row?.meta?.username;

      const profileName =
        metaName ||
        (await getProfileName(row.user_id)) ||
        `Player ${String(row.user_id || "").slice(0, 6)}`;

      return {
        rank: index + 1,
        ...row,
        profile_name: profileName,
      };
    })
  );

  return rows;
}

export function renderLeaderboard(container, rows, emptyText = "No scores yet.") {
  if (!container) return;

  if (!rows || !rows.length) {
    container.innerHTML = `<div class="tiny">${emptyText}</div>`;
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      return `
        <div class="leader-item">
          <div>
            <div class="name">#${row.rank} ${row.profile_name}</div>
            <div class="meta">${row.game_slug} • ${new Date(row.created_at).toLocaleDateString()}</div>
          </div>
          <div class="score">${Number(row.score || 0).toLocaleString()}</div>
        </div>
      `;
    })
    .join("");
}
