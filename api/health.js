export default function handler(req, res) {
  try {
    res.status(200).json({
      status: "ok",
      message: "Server is running 🚀",

      // Check environment variables (DO NOT expose secrets fully)
      env: {
        hasLivekitKey: !!process.env.LIVEKIT_API_KEY,
        hasLivekitSecret: !!process.env.LIVEKIT_API_SECRET,
        hasLivekitUrl: !!process.env.LIVEKIT_URL,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasSupabase: !!process.env.SUPABASE_URL,
      },

      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}
