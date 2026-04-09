import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function toCents(value) {
  const num = Number(value || 0);
  return Math.round(num);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      artistUserId,
      amountCents,
      currency = "usd",
      note = ""
    } = req.body || {};

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Missing Supabase server env vars." });
    }

    if (!artistUserId) {
      return res.status(400).json({ error: "Missing artistUserId." });
    }

    const cents = toCents(amountCents);
    if (!cents || cents <= 0) {
      return res.status(400).json({ error: "Invalid amountCents." });
    }

    const safeCurrency = String(currency || "usd").trim().toLowerCase();
    const safeNote = String(note || "").slice(0, 500);

    const payoutAccountRes = await supabase
      .from("artist_payout_accounts")
      .select("*")
      .eq("user_id", artistUserId)
      .maybeSingle();

    if (payoutAccountRes.error) throw payoutAccountRes.error;

    const payoutAccount = payoutAccountRes.data;
    if (!payoutAccount) {
      return res.status(400).json({ error: "No payout account found." });
    }

    if (!payoutAccount.payouts_enabled) {
      return res.status(400).json({ error: "Payout account is not ready yet." });
    }

    const balanceRes = await supabase
      .from("creator_available_balances")
      .select("*")
      .eq("artist_user_id", artistUserId)
      .maybeSingle();

    if (balanceRes.error) throw balanceRes.error;

    const availableCents = Number(balanceRes.data?.available_cents || 0);
    if (cents > availableCents) {
      return res.status(400).json({ error: "Amount exceeds available balance." });
    }

    const pendingRes = await supabase
      .from("payout_requests")
      .select("amount_cents,status")
      .eq("artist_user_id", artistUserId)
      .in("status", ["pending", "submitted"]);

    if (pendingRes.error) throw pendingRes.error;

    const pendingTotal = (pendingRes.data || []).reduce(
      (sum, row) => sum + Number(row.amount_cents || 0),
      0
    );

    if (cents > Math.max(availableCents - pendingTotal, 0)) {
      return res.status(400).json({
        error: "Amount exceeds remaining balance after pending payouts."
      });
    }

    const insertRes = await supabase
      .from("payout_requests")
      .insert({
        artist_user_id: artistUserId,
        amount_cents: cents,
        currency: safeCurrency,
        status: "pending",
        stripe_destination_account_id: payoutAccount.stripe_account_id,
        note: safeNote
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
