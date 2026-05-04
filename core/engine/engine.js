/* =========================
   RICH BIZNESS — MASTER ENGINE CORE
   This connects ALL engines together
========================= */

import { createUploadEngine } from "/core/engine/upload-engine.js";
import { createMonetizationEngine } from "/core/engine/monetization-engine.js";
import { createContentEngine } from "/core/engine/content-engine.js";
import { createRealtimeEngine } from "/core/engine/realtime-engine.js";

export function createEngine({ supabase, user }) {

  if (!supabase) throw new Error("Missing supabase");

  // =========================
  // INIT ALL ENGINES
  // =========================
  const monetization = createMonetizationEngine({ supabase, user });
  const content = createContentEngine({ supabase });
  const realtime = createRealtimeEngine({ supabase });

  const upload = createUploadEngine({
    supabase,
    user,
    monetization,
    content,
    realtime
  });

  // =========================
  // RETURN ONE SYSTEM
  // =========================
  return {
    upload,
    monetization,
    content,
    realtime
  };
}
