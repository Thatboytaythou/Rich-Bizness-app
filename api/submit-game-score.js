export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      gameSlug,
      score = 0,
      mode = "Arcade",
      metadata = {},
      userId = null
    } = req.body || {};

    if (!gameSlug) {
      return res.status(400).json({ error: "Missing gameSlug" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_NEW;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: "Missing Supabase server environment variables" });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, title, slug, play_count")
      .eq("slug", gameSlug)
      .maybeSingle();

    if (gameError) {
      return res.status(500).json({ error: gameError.message });
    }

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const safeScore = Number(score) || 0;
    const safeUserId = userId || null;

    if (safeUserId) {
      const { error: scoreError } = await supabase
        .from("game_scores")
        .insert({
          game_id: game.id,
          user_id: safeUserId,
          score: safeScore,
          mode,
          game_title: game.title,
          metadata
        });

      if (scoreError) {
        console.error("[submit-game-score] game_scores insert error:", scoreError);
      }

      const { error: runError } = await supabase
        .from("arcade_runs")
        .insert({
          user_id: safeUserId,
          game_slug: game.slug,
          game_id: game.id,
          score: safeScore,
          metadata
        });

      if (runError) {
        console.error("[submit-game-score] arcade_runs insert error:", runError);
      }
    }

    const { error: updateGameError } = await supabase
      .from("games")
      .update({
        play_count: Number(game.play_count || 0) + 1,
        last_played_at: new Date().toISOString()
      })
      .eq("id", game.id);

    if (updateGameError) {
      console.error("[submit-game-score] games update error:", updateGameError);
    }

    return res.status(200).json({
      ok: true,
      gameId: game.id,
      gameSlug: game.slug,
      score: safeScore
    });
  } catch (error) {
    console.error("[submit-game-score] fatal error:", error);
    return res.status(500).json({ error: error.message || "Unknown server error" });
  }
}
