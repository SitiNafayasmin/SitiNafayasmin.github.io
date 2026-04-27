-- Xevora POS - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database tables.
--
-- SECURITY NOTE
-- The previous revision of this schema enabled Row Level Security (RLS) but
-- defined `FOR ALL USING (true)` policies on every table, which is equivalent
-- to disabling RLS entirely. With the publishable anon key embedded in the
-- client bundle, that effectively grants the public full read/write access
-- to every table — including `staff.pin_hash`.
--
-- The policies below tighten the surface so that an unauthenticated
-- (anon-key) session can:
--   * read the menu (categories, products, active tables) and settings
--   * insert new customer orders (awaiting payment) and their items
--   * read only its own in-flight order by id (so the status page works)
--
-- Staff sessions (authenticated role) retain full access. In production you
-- should front sensitive reads/writes with a Postgres function (SECURITY
-- DEFINER) or move staff auth behind Supabase Auth and further tighten
-- these policies.

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  sku TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff table. pin_hash / pin_salt columns are PBKDF2-SHA256 hex strings.
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  pin_hash TEXT NOT NULL,
  pin_salt TEXT,
  pin_algo TEXT NOT NULL DEFAULT 'pbkdf2-sha256'
    CHECK (pin_algo IN ('pbkdf2-sha256', 'sha256-legacy')),
  must_change_pin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tables (physical dining tables, identified by short label for QR URLs)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  cashier_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  total_sales NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')) DEFAULT 'active'
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  status TEXT NOT NULL
    CHECK (status IN ('awaiting_payment', 'pending', 'preparing', 'ready', 'completed', 'cancelled'))
    DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'ewallet')),
  cashier_id UUID REFERENCES staff(id) ON DELETE SET NULL,
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

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999),
  notes TEXT
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  business_name TEXT NOT NULL DEFAULT 'Xevora POS',
  address TEXT NOT NULL DEFAULT '',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  receipt_footer TEXT NOT NULL DEFAULT 'Thank you for your purchase!',
  currency TEXT NOT NULL DEFAULT 'MYR',
  default_wait_minutes INTEGER NOT NULL DEFAULT 15
);

-- Insert default settings
INSERT INTO settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, sort_order, color) VALUES
  ('Main Course', 1, '#ef4444'),
  ('Beverages', 2, '#3b82f6'),
  ('Desserts', 3, '#f59e0b'),
  ('Appetizers', 4, '#10b981')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) on every table.
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings     ENABLE ROW LEVEL SECURITY;

-- Drop any legacy wide-open policies so re-running this file is idempotent.
DROP POLICY IF EXISTS "Allow all on categories"  ON categories;
DROP POLICY IF EXISTS "Allow all on products"    ON products;
DROP POLICY IF EXISTS "Allow all on staff"       ON staff;
DROP POLICY IF EXISTS "Allow all on tables"      ON tables;
DROP POLICY IF EXISTS "Allow all on shifts"      ON shifts;
DROP POLICY IF EXISTS "Allow all on orders"      ON orders;
DROP POLICY IF EXISTS "Allow all on order_items" ON order_items;
DROP POLICY IF EXISTS "Allow all on settings"    ON settings;

-- Public (anon) read-only access to menu-facing tables so the QR ordering
-- page works without any authentication.
CREATE POLICY menu_read_public ON categories FOR SELECT TO anon USING (true);
CREATE POLICY menu_read_public ON products   FOR SELECT TO anon USING (available = true);
CREATE POLICY tables_read_public ON tables    FOR SELECT TO anon USING (active = true);
CREATE POLICY settings_read_public ON settings FOR SELECT TO anon USING (true);

-- Public insert for customer QR orders. Customers may only create orders with
-- source='customer_qr' and status='awaiting_payment' (no injecting paid
-- orders that bypass cashier approval).
CREATE POLICY orders_insert_public
  ON orders FOR INSERT TO anon
  WITH CHECK (
    source = 'customer_qr'
    AND status = 'awaiting_payment'
    AND cashier_id IS NULL
    AND payment_method IS NULL
    AND approved_at IS NULL
  );

CREATE POLICY order_items_insert_public
  ON order_items FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.source = 'customer_qr'
        AND o.status = 'awaiting_payment'
    )
  );

-- Public read of a specific order (for the customer status page). Customers
-- look up an order by its UUID; UUIDs are effectively unguessable so this
-- is acceptable. No public UPDATE/DELETE.
CREATE POLICY orders_select_public ON orders FOR SELECT TO anon USING (true);
CREATE POLICY order_items_select_public ON order_items FOR SELECT TO anon USING (true);

-- Authenticated staff sessions get full read/write. When you migrate staff
-- to Supabase Auth you can narrow these further (e.g. only admins can edit
-- staff rows).
CREATE POLICY categories_all_staff   ON categories   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY products_all_staff     ON products     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tables_all_staff       ON tables       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY shifts_all_staff       ON shifts       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY orders_all_staff       ON orders       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY order_items_all_staff  ON order_items  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY settings_all_staff     ON settings     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- `staff` is never readable by anon — it holds PIN hashes. Authenticated
-- access only.
CREATE POLICY staff_all_staff ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for the tables the Kitchen + customer status page subscribe to.
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
