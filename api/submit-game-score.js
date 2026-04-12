import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid user session"
      });
    }

    const { game_slug, score, meta } = req.body || {};

    if (!game_slug || typeof game_slug !== "string") {
      return res.status(400).json({ error: "Missing game_slug" });
    }

    const parsedScore = Number(score);
    if (!Number.isFinite(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ error: "Invalid score" });
    }

    const safeMeta =
      meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};

    const { data, error } = await supabaseAdmin
      .from("game_scores")
      .insert([
        {
          user_id: user.id,
          game_slug,
          score: Math.floor(parsedScore),
          meta: safeMeta
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("submit-game-score insert error:", error);
      return res.status(500).json({
        error: error.message || "Failed to submit score"
      });
    }

    return res.status(200).json({
      success: true,
      score: data
    });
  } catch (error) {
    console.error("submit-game-score error:", error);
    return res.status(500).json({
      error: error?.message || "Unexpected score submit failure"
    });
  }
}
