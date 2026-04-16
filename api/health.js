export default async function handler(req, res) {
  try {
    const checks = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      LIVEKIT_URL: !!process.env.LIVEKIT_URL,
      LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: !!process.env.LIVEKIT_API_SECRET,
      APP_URL: !!process.env.APP_URL
    };

    const missingCritical = [];
    const missingRecommended = [];

    if (!checks.SUPABASE_URL) missingCritical.push("SUPABASE_URL");
    if (!checks.SUPABASE_ANON_KEY) missingCritical.push("SUPABASE_ANON_KEY");

    if (!checks.SUPABASE_SERVICE_ROLE_KEY) missingRecommended.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!checks.STRIPE_SECRET_KEY) missingRecommended.push("STRIPE_SECRET_KEY");
    if (!checks.STRIPE_WEBHOOK_SECRET) missingRecommended.push("STRIPE_WEBHOOK_SECRET");
    if (!checks.LIVEKIT_URL) missingRecommended.push("LIVEKIT_URL");
    if (!checks.LIVEKIT_API_KEY) missingRecommended.push("LIVEKIT_API_KEY");
    if (!checks.LIVEKIT_API_SECRET) missingRecommended.push("LIVEKIT_API_SECRET");
    if (!checks.APP_URL) missingRecommended.push("APP_URL");

    const overallStatus =
      missingCritical.length > 0
        ? "critical"
        : missingRecommended.length > 0
          ? "warning"
          : "healthy";

    return res.status(200).json({
      ok: missingCritical.length === 0,
      status: overallStatus,
      service: "Rich Bizness API",
      route: "/api/health",
      method: req.method,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      node_env: process.env.NODE_ENV || "development",
      checks,
      missing_critical: missingCritical,
      missing_recommended: missingRecommended
    });
  } catch (error) {
    console.error("Health API fatal error:", error);

    return res.status(500).json({
      ok: false,
      status: "error",
      service: "Rich Bizness API",
      route: "/api/health",
      error: error.message || "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
}
