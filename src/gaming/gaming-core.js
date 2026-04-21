import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 🎮 Launch game
export function playGame(slug) {
  window.location.href = `/games/${slug}/index.html`;
}

// 🏆 Save score
export async function saveScore(slug, scoreData) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    console.warn("User not signed in");
    return;
  }

  const payload = {
    user_id: user.id,
    game_slug: slug,
    ...scoreData
  };

  const { error } = await supabase.from("arcade_runs").insert(payload);

  if (error) console.error(error);
}

// 🌍 Global leaderboard
export async function loadGlobalLeaderboard(limit = 10) {
  const { data } = await supabase
    .from("arcade_runs")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);

  return data || [];
}

// 🎯 Per game leaderboard
export async function loadGameLeaderboard(slug, limit = 10) {
  const { data } = await supabase
    .from("arcade_runs")
    .select("*")
    .eq("game_slug", slug)
    .order("score", { ascending: false })
    .limit(limit);

  return data || [];
}
