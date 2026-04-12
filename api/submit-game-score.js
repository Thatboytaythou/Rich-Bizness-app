import { createClient } from "@supabase/supabase-js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeNowIso() {
  return new Date().toISOString();
}

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
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        error: "Invalid user session"
      });
    }

    const body = req.body || {};
    const game_slug = String(body.game_slug || "").trim();
    const parsedScore = Number(body.score);
    const meta = isPlainObject(body.meta) ? body.meta : {};

    if (!game_slug) {
      return res.status(400).json({ error: "Missing game_slug" });
    }

    if (!Number.isFinite(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ error: "Invalid score" });
    }

    const scoreValue = Math.floor(parsedScore);

    // 1) Insert score into game_scores
    const { data: insertedScore, error: insertScoreError } = await supabaseAdmin
      .from("game_scores")
      .insert([
        {
          user_id: user.id,
          game_slug,
          score: scoreValue,
          meta
        }
      ])
      .select()
      .single();

    if (insertScoreError) {
      console.error("submit-game-score insert error:", insertScoreError);
      return res.status(500).json({
        error: insertScoreError.message || "Failed to submit score"
      });
    }

    // 2) Find active challenges for this game
    const nowIso = safeNowIso();

    const { data: activeChallenges, error: activeChallengesError } = await supabaseAdmin
      .from("game_challenges")
      .select("*")
      .eq("game_slug", game_slug)
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`);

    if (activeChallengesError) {
      console.error("submit-game-score active challenge lookup error:", activeChallengesError);
      return res.status(500).json({
        error: activeChallengesError.message || "Failed to check active tournaments"
      });
    }

    const activeList = activeChallenges || [];
    const tournament_updates = [];

    // 3) For each active challenge:
    //    - if player already joined, update best_score if score is higher
    //    - if not joined, auto-create entry with best_score = score
    for (const challenge of activeList) {
      const { data: existingEntry, error: existingEntryError } = await supabaseAdmin
        .from("game_challenge_entries")
        .select("*")
        .eq("challenge_id", challenge.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingEntryError) {
        console.error("submit-game-score entry lookup error:", existingEntryError);
        return res.status(500).json({
          error: existingEntryError.message || "Failed checking tournament entry"
        });
      }

      if (!existingEntry) {
        const { data: createdEntry, error: createEntryError } = await supabaseAdmin
          .from("game_challenge_entries")
          .insert([
            {
              challenge_id: challenge.id,
              user_id: user.id,
              best_score: scoreValue
            }
          ])
          .select()
          .single();

        if (createEntryError) {
          console.error("submit-game-score create tournament entry error:", createEntryError);
          return res.status(500).json({
            error: createEntryError.message || "Failed creating tournament entry"
          });
        }

        tournament_updates.push({
          challenge_id: challenge.id,
          challenge_title: challenge.title || "Tournament",
          action: "created",
          best_score: createdEntry.best_score
        });

        continue;
      }

      const currentBest = Number(existingEntry.best_score || 0);
      if (scoreValue > currentBest) {
        const { data: updatedEntry, error: updateEntryError } = await supabaseAdmin
          .from("game_challenge_entries")
          .update({
            best_score: scoreValue
          })
          .eq("id", existingEntry.id)
          .select()
          .single();

        if (updateEntryError) {
          console.error("submit-game-score update tournament entry error:", updateEntryError);
          return res.status(500).json({
            error: updateEntryError.message || "Failed updating tournament entry"
          });
        }

        tournament_updates.push({
          challenge_id: challenge.id,
          challenge_title: challenge.title || "Tournament",
          action: "updated",
          previous_best_score: currentBest,
          best_score: updatedEntry.best_score
        });
      } else {
        tournament_updates.push({
          challenge_id: challenge.id,
          challenge_title: challenge.title || "Tournament",
          action: "kept",
          previous_best_score: currentBest,
          best_score: currentBest
        });
      }
    }

    return res.status(200).json({
      success: true,
      score: insertedScore,
      tournament_updates,
      active_tournament_count: activeList.length
    });
  } catch (error) {
    console.error("submit-game-score unexpected error:", error);
    return res.status(500).json({
      error: error?.message || "Unexpected score submit failure"
    });
  }
}
