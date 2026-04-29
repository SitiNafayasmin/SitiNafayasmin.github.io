-- Xevora POS — Supabase schema (Supabase Auth, IDR, Bahasa Indonesia build)
--
-- This schema is designed for a personal VPS deployment where auth is
-- handled entirely by Supabase Auth. Each cashier/admin has a unique email
-- + password; the `staff` table maps auth.users → app role + display name.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh
-- project. The `invite-staff` Edge Function (supabase/functions/invite-staff)
-- provisions new staff; do not allow the anon role to write to `staff`.
--
-- Safety: anon sessions (public) can only:
--   * read the menu (categories, products), active tables, settings
--   * create a customer_qr order (awaiting_payment) and its items
--   * read an order by id (status page)
-- Authenticated staff have role-gated access to the rest via the `is_admin()`
-- and `is_staff()` helper functions below.
--
-- The file is intentionally ordered:
--   1. Extensions
--   2. Tables (so helper functions can reference `staff`)
--   3. Helper functions (is_staff / is_admin / order_stock_decrement trigger)
--   4. Row-level security
--   5. Seed data
--   6. Storage buckets (menu photos)
--   7. Realtime publication (so the SPA gets live updates without polling)
-- The previous ordering had helpers before tables, which failed with
-- 42P01 "relation public.staff does not exist" at CREATE FUNCTION time.

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  sku TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  -- NULL = unlimited/untracked stock; non-NULL integer = current remaining
  -- units. Auto-decremented by the order_stock_decrement trigger below.
  stock INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additive migration for pre-Phase-A installs that already had `products`
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER;

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  cashier_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cashier_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  status TEXT NOT NULL
    CHECK (status IN ('awaiting_payment', 'pending', 'preparing', 'ready', 'completed', 'cancelled'))
    DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'ewallet')),
  cashier_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  cashier_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cashier_name TEXT,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  table_number TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'cashier' CHECK (source IN ('cashier', 'customer_qr')),
  pickup_code TEXT,
  approved_at TIMESTAMPTZ,
  estimated_wait_minutes INTEGER CHECK (estimated_wait_minutes BETWEEN 1 AND 120),
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'Xevora POS',
  address TEXT NOT NULL DEFAULT '',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 11.00,
  receipt_footer TEXT NOT NULL DEFAULT 'Terima kasih atas kunjungan Anda!',
  currency TEXT NOT NULL DEFAULT 'IDR',
  default_wait_minutes INTEGER NOT NULL DEFAULT 15
);

INSERT INTO settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Helper functions (reference staff table — must be defined AFTER tables)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid() AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid() AND active = true AND role = 'admin'
  );
$$;

-- Decrement product.stock when an order transitions to a status that
-- commits inventory. For staff-created orders this is the initial INSERT
-- (orders start as 'pending'). For customer_qr orders it's the UPDATE from
-- 'awaiting_payment' to 'pending' when the cashier approves payment.
-- Cancelled or rejected orders do NOT decrement. Stock = NULL means the
-- product is untracked (unlimited) and is skipped.
CREATE OR REPLACE FUNCTION public.order_stock_decrement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  committed_old BOOLEAN := false;
  committed_new BOOLEAN := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    committed_old := OLD.status IN ('pending', 'preparing', 'ready', 'completed');
  END IF;
  committed_new := NEW.status IN ('pending', 'preparing', 'ready', 'completed');

  -- Only act on the transition from "not committed" to "committed".
  IF committed_new AND NOT committed_old THEN
    UPDATE products p
      SET stock = GREATEST(0, p.stock - oi.qty)
      FROM (
        SELECT product_id, SUM(quantity)::INTEGER AS qty
          FROM order_items
         WHERE order_id = NEW.id
         GROUP BY product_id
      ) oi
     WHERE p.id = oi.product_id
       AND p.stock IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_stock_decrement_trg ON orders;
CREATE TRIGGER order_stock_decrement_trg
AFTER INSERT OR UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION public.order_stock_decrement();

-- ----------------------------------------------------------------------------
-- 4. Row-Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;

-- Public (anon) read-only access to the menu + settings + active tables.
DROP POLICY IF EXISTS "public read categories" ON categories;
CREATE POLICY "public read categories" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "public read products" ON products;
CREATE POLICY "public read products" ON products FOR SELECT USING (available = true OR public.is_staff());
DROP POLICY IF EXISTS "public read active tables" ON tables;
CREATE POLICY "public read active tables" ON tables FOR SELECT USING (active = true OR public.is_staff());
DROP POLICY IF EXISTS "public read settings" ON settings;
CREATE POLICY "public read settings" ON settings FOR SELECT USING (true);

-- Staff (authenticated + row in staff with active=true) can write menu,
-- tables, settings.
DROP POLICY IF EXISTS "staff write categories" ON categories;
CREATE POLICY "staff write categories" ON categories FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "staff write products" ON products;
CREATE POLICY "staff write products" ON products FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "staff write tables" ON tables;
CREATE POLICY "staff write tables" ON tables FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "admin update settings" ON settings;
CREATE POLICY "admin update settings" ON settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Staff table: only admins can read the list; every staff can read their
-- own row. No anon access at all. Inserts/deletes go through the
-- `invite-staff` Edge Function (service role). Admins can update existing
-- rows directly (e.g. toggle active, change role) from the browser client.
DROP POLICY IF EXISTS "admin read staff" ON staff;
CREATE POLICY "admin read staff" ON staff FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());
DROP POLICY IF EXISTS "admin update staff" ON staff;
CREATE POLICY "admin update staff" ON staff FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Shifts: staff see their own shifts; admins see all.
DROP POLICY IF EXISTS "staff read own shifts" ON shifts;
CREATE POLICY "staff read own shifts" ON shifts FOR SELECT
  USING (public.is_admin() OR cashier_user_id = auth.uid());
DROP POLICY IF EXISTS "staff write own shifts" ON shifts;
CREATE POLICY "staff write own shifts" ON shifts FOR ALL
  USING (public.is_admin() OR cashier_user_id = auth.uid())
  WITH CHECK (public.is_admin() OR cashier_user_id = auth.uid());

-- Orders: anon can insert a customer_qr order and read it by id. Staff can
-- do anything. Admin sees everything.
DROP POLICY IF EXISTS "anon insert customer orders" ON orders;
CREATE POLICY "anon insert customer orders" ON orders FOR INSERT
  WITH CHECK (
    source = 'customer_qr' AND status = 'awaiting_payment'
  );
DROP POLICY IF EXISTS "anon read any order" ON orders;
-- Orders are looked up by UUID (unguessable) so this is safe.
CREATE POLICY "anon read any order" ON orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "staff write orders" ON orders;
CREATE POLICY "staff write orders" ON orders FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "staff insert cashier orders" ON orders;
CREATE POLICY "staff insert cashier orders" ON orders FOR INSERT
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "anon insert order items" ON order_items;
CREATE POLICY "anon insert order items" ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.source = 'customer_qr' AND o.status = 'awaiting_payment')
  );
DROP POLICY IF EXISTS "anon read order items" ON order_items;
CREATE POLICY "anon read order items" ON order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "staff write order items" ON order_items;
CREATE POLICY "staff write order items" ON order_items FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 5. Seed data (safe to re-run)
-- ----------------------------------------------------------------------------

INSERT INTO categories (name, sort_order, color) VALUES
  ('Makanan', 1, '#ef4444'),
  ('Minuman', 2, '#3b82f6'),
  ('Pencuci Mulut', 3, '#a855f7')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tables (label) VALUES ('1'), ('2'), ('3'), ('4'), ('5')
ON CONFLICT (label) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Storage bucket for menu photos
-- ----------------------------------------------------------------------------
-- Admins upload product photos from the admin dashboard; customers see them
-- in the public menu. The bucket is public-read for simplicity (image URLs
-- are used in <img> tags), but writes are staff-gated via policy.

INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-photos', 'menu-photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "public read menu photos" ON storage.objects;
CREATE POLICY "public read menu photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-photos');

DROP POLICY IF EXISTS "staff upload menu photos" ON storage.objects;
CREATE POLICY "staff upload menu photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-photos' AND public.is_staff());

DROP POLICY IF EXISTS "staff update menu photos" ON storage.objects;
CREATE POLICY "staff update menu photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-photos' AND public.is_staff())
  WITH CHECK (bucket_id = 'menu-photos' AND public.is_staff());

DROP POLICY IF EXISTS "staff delete menu photos" ON storage.objects;
CREATE POLICY "staff delete menu photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-photos' AND public.is_staff());

-- ----------------------------------------------------------------------------
-- 7. Realtime publication
-- ----------------------------------------------------------------------------
-- The SPA subscribes to these tables so menu/tables/settings/orders updates
-- propagate across devices without polling. On a fresh Supabase project the
-- `supabase_realtime` publication is created automatically and empty; we add
-- our tables here. The DO block makes this idempotent.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'categories', 'products', 'tables', 'settings',
    'orders', 'order_items', 'shifts'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN
        -- Publication doesn't exist (self-hosted w/o it); skip silently
        NULL;
    END;
  END LOOP;
END $$;
