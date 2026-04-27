-- =========================================
-- RICH BIZNESS — GALLERY + STORE SYSTEM
-- sql/090_gallery_store.sql
-- =========================================

-- =========================
-- ARTWORKS (GALLERY CORE)
-- =========================
create table if not exists artworks (
  id bigint generated always as identity primary key,
  user_id uuid,
  title text,
  description text,
  image_url text,
  price_cents int default 0,
  is_paid boolean default false,
  is_featured boolean default false,
  created_at timestamptz default now()
);

alter table artworks enable row level security;

-- =========================
-- ARTWORK LIKES
-- =========================
create table if not exists artwork_likes (
  id bigint generated always as identity primary key,
  artwork_id bigint references artworks(id) on delete cascade,
  user_id uuid,
  created_at timestamptz default now()
);

alter table artwork_likes enable row level security;

-- =========================
-- ARTWORK PURCHASES
-- =========================
create table if not exists artwork_purchases (
  id bigint generated always as identity primary key,
  artwork_id bigint references artworks(id) on delete cascade,
  buyer_user_id uuid,
  stripe_session_id text,
  amount_cents int,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table artwork_purchases enable row level security;

-- =========================
-- PRODUCTS (STORE)
-- =========================
create table if not exists products (
  id bigint generated always as identity primary key,
  creator_id uuid,
  name text,
  description text,
  price_cents int not null,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table products enable row level security;

-- =========================
-- STORE ORDERS
-- =========================
create table if not exists store_orders (
  id bigint generated always as identity primary key,
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  product_id bigint references products(id),
  product_name text,
  amount_total int,
  currency text default 'usd',
  quantity int default 1,
  payment_status text,
  order_status text default 'pending',
  customer_email text,
  creator_id uuid,
  created_at timestamptz default now()
);

alter table store_orders enable row level security;

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_artworks_user on artworks(user_id);
create index if not exists idx_artworks_created on artworks(created_at desc);

create index if not exists idx_products_creator on products(creator_id);
create index if not exists idx_orders_creator on store_orders(creator_id);

-- =========================
-- POLICIES
-- =========================

-- ARTWORKS
drop policy if exists "artworks_select_all" on artworks;
create policy "artworks_select_all"
on artworks for select
using (true);

drop policy if exists "artworks_insert_self" on artworks;
create policy "artworks_insert_self"
on artworks for insert
with check (user_id = auth.uid());

-- ARTWORK LIKES
drop policy if exists "artwork_likes_insert_self" on artwork_likes;
create policy "artwork_likes_insert_self"
on artwork_likes for insert
with check (user_id = auth.uid());

drop policy if exists "artwork_likes_select_all" on artwork_likes;
create policy "artwork_likes_select_all"
on artwork_likes for select
using (true);

-- ARTWORK PURCHASES
drop policy if exists "artwork_purchases_insert" on artwork_purchases;
create policy "artwork_purchases_insert"
on artwork_purchases for insert
with check (true);

drop policy if exists "artwork_purchases_select_self" on artwork_purchases;
create policy "artwork_purchases_select_self"
on artwork_purchases for select
using (buyer_user_id = auth.uid());

-- PRODUCTS
drop policy if exists "products_select_all" on products;
create policy "products_select_all"
on products for select
using (is_active = true);

drop policy if exists "products_insert_self" on products;
create policy "products_insert_self"
on products for insert
with check (creator_id = auth.uid());

-- STORE ORDERS
drop policy if exists "store_orders_select_creator" on store_orders;
create policy "store_orders_select_creator"
on store_orders for select
using (creator_id = auth.uid());

drop policy if exists "store_orders_insert" on store_orders;
create policy "store_orders_insert"
on store_orders for insert
with check (true);

-- =========================
-- DONE
-- =========================
NOTIFY pgrst, 'reload schema';
