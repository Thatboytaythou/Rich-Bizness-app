-- =========================
-- RICH BIZNESS — MONETIZATION SAFE PATCH (FIXED)
-- NO VIEW ERRORS
-- =========================

-- =========================
-- PAYMENTS
-- =========================
alter table payments add column if not exists stripe_payment_intent_id text;
alter table payments add column if not exists stripe_checkout_session_id text;
alter table payments add column if not exists stripe_customer_id text;
alter table payments add column if not exists currency text default 'usd';
alter table payments add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table payments add column if not exists source_type text;
alter table payments add column if not exists source_id text;
alter table payments add column if not exists updated_at timestamptz not null default now();

alter table payments enable row level security;

-- =========================
-- STRIPE CONNECT (CREATORS)
-- =========================
alter table artist_payout_accounts add column if not exists onboarding_complete boolean default false;
alter table artist_payout_accounts add column if not exists details_submitted boolean default false;
alter table artist_payout_accounts add column if not exists charges_enabled boolean default false;
alter table artist_payout_accounts add column if not exists payouts_enabled boolean default false;
alter table artist_payout_accounts add column if not exists country text;
alter table artist_payout_accounts add column if not exists default_currency text default 'usd';
alter table artist_payout_accounts add column if not exists created_at timestamptz default now();
alter table artist_payout_accounts add column if not exists updated_at timestamptz default now();

alter table artist_payout_accounts enable row level security;

-- =========================
-- PAYOUT REQUESTS
-- =========================
alter table payout_requests add column if not exists artist_user_id uuid;
alter table payout_requests add column if not exists amount_cents int default 0;
alter table payout_requests add column if not exists currency text default 'usd';
alter table payout_requests add column if not exists status text default 'pending';
alter table payout_requests add column if not exists stripe_transfer_id text;
alter table payout_requests add column if not exists stripe_destination_account_id text;
alter table payout_requests add column if not exists note text;
alter table payout_requests add column if not exists admin_notes text;
alter table payout_requests add column if not exists created_at timestamptz default now();
alter table payout_requests add column if not exists processed_at timestamptz;

alter table payout_requests enable row level security;

-- =========================
-- TIPS
-- =========================
alter table tips add column if not exists stripe_checkout_session_id text;
alter table tips add column if not exists stripe_payment_intent_id text;
alter table tips add column if not exists currency text default 'usd';
alter table tips add column if not exists status text default 'pending';

alter table tips enable row level security;

-- =========================
-- PREMIUM CONTENT
-- =========================
alter table premium_content add column if not exists creator_id uuid;
alter table premium_content add column if not exists content_type text default 'general';
alter table premium_content add column if not exists content_id bigint default 0;
alter table premium_content add column if not exists price_cents int default 0;
alter table premium_content add column if not exists is_active boolean default true;

alter table premium_content enable row level security;

-- =========================
-- CREATOR MEMBERSHIPS
-- =========================
alter table creator_memberships add column if not exists creator_id uuid;
alter table creator_memberships add column if not exists user_id uuid;
alter table creator_memberships add column if not exists tier_name text default 'supporter';
alter table creator_memberships add column if not exists is_active boolean default true;
alter table creator_memberships add column if not exists expires_at timestamptz;

alter table creator_memberships enable row level security;

-- =========================
-- FAN SUBSCRIPTIONS
-- =========================
alter table fan_subscriptions add column if not exists stripe_subscription_id text;
alter table fan_subscriptions add column if not exists status text default 'active';

alter table fan_subscriptions enable row level security;

-- =========================
-- MUSIC UNLOCKS
-- =========================
alter table music_unlocks add column if not exists source_payment_id bigint;

alter table music_unlocks enable row level security;

-- =========================
-- PREMIUM TRACK PURCHASES
-- =========================
alter table premium_track_purchases add column if not exists stripe_session_id text;
alter table premium_track_purchases add column if not exists status text default 'paid';

alter table premium_track_purchases enable row level security;

-- =========================
-- PRODUCTS
-- =========================
alter table products add column if not exists seller_user_id uuid;
alter table products add column if not exists kind text default 'product';
alter table products add column if not exists price_cents int default 0;
alter table products add column if not exists currency text default 'usd';
alter table products add column if not exists active boolean default true;

alter table products enable row level security;

-- =========================
-- STORE ORDERS
-- =========================
alter table store_orders add column if not exists stripe_payment_intent_id text;
alter table store_orders add column if not exists currency text default 'usd';
alter table store_orders add column if not exists payment_status text default 'pending';
alter table store_orders add column if not exists order_status text default 'created';

alter table store_orders enable row level security;

-- =========================
-- LIVE PURCHASES (SAFE ADD)
-- =========================
alter table live_stream_purchases add column if not exists stripe_payment_intent_id text;
alter table live_stream_purchases add column if not exists stripe_customer_id text;
alter table live_stream_purchases add column if not exists metadata jsonb default '{}'::jsonb;

-- =========================
-- INDEXES (FAST MONEY QUERIES)
-- =========================
create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_tips_to_user on tips(to_user_id);
create index if not exists idx_store_orders_creator on store_orders(creator_id);
create index if not exists idx_payout_requests_user on payout_requests(artist_user_id);

-- =========================
-- BASIC POLICIES (SAFE)
-- =========================
drop policy if exists "payments_select_self" on payments;
create policy "payments_select_self"
on payments for select
using (user_id = auth.uid());

drop policy if exists "tips_select_related" on tips;
create policy "tips_select_related"
on tips for select
using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "store_orders_select_creator" on store_orders;
create policy "store_orders_select_creator"
on store_orders for select
using (creator_id = auth.uid());

NOTIFY pgrst, 'reload schema';
