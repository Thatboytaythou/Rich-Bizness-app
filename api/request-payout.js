
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { artistUserId, amountCents, currency = "usd", note = "" } = req.body || {};

    if (!artistUserId) {
      return res.status(400).json({ error: "Missing artistUserId." });
    }

    const cents = Math.round(Number(amountCents || 0));
    if (!cents || cents <= 0) {
      return res.status(400).json({ error: "Invalid amountCents." });
    }

    const payoutAccountRes = await supabase
      .from("artist_payout_accounts")
      .select("*")
      .eq("user_id", artistUserId)
      .maybeSingle();

    if (payoutAccountRes.error) throw payoutAccountRes.error;
    if (!payoutAccountRes.data) {
      return res.status(400).json({ error: "No payout account found." });
    }

    const balanceRes = await supabase
      .from("creator_available_balances")
      .select("*")
      .eq("artist_user_id", artistUserId)
      .maybeSingle();

    if (balanceRes.error) throw balanceRes.error;

    const available = Number(balanceRes.data?.available_cents || 0);
    if (cents > available) {
      return res.status(400).json({ error: "Amount exceeds available balance." });
    }

    const insertRes = await supabase
      .from("payout_requests")
      .insert({
        artist_user_id: artistUserId,
        amount_cents: cents,
        currency,
        status: "pending",
        stripe_destination_account_id: payoutAccountRes.data.stripe_account_id,
        note,
      })
      .select()
      .single();

    if (insertRes.error) throw insertRes.error;

    return res.status(200).json({
      ok: true,
      payout_request: insertRes.data
    });
  } catch (error) {
    console.error("request-payout error", error);
    return res.status(500).json({
      error: error?.message || "Failed to request payout."
    });
  }
}
