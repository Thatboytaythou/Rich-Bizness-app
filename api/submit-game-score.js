// =========================
// RICH BIZNESS — FINAL GAME SCORE API
// /api/submit-game-score.js
// =========================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      gameSlug,
      score = 0,
      mode = "arcade",
      metadata = {},
      duration = 0,
      userId = null
    } = req.body || {};

    if (!gameSlug) {
      return res.status(400).json({ error: "Missing gameSlug" });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY_NEW;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Missing Supabase environment variables"
      });
    }

    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // =========================
    // 1. INSERT GAME SESSION
    // =========================
    await supabase.from("game_sessions").insert({
      user_id: userId,
      game_slug: gameSlug,
      score,
      duration_seconds: duration,
      metadata,
      created_at: new Date().toISOString()
    });

    // =========================
    // 2. INSERT SCORE (LEADERBOARD)
    // =========================
    await supabase.from("game_scores").insert({
      user_id: userId,
      game_slug: gameSlug,
      score,
      mode,
      metadata,
      created_at: new Date().toISOString()
    });

    // =========================
    // 3. RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      gameSlug,
      score
    });

  } catch (err) {
    console.error("[submit-game-score] error:", err);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
