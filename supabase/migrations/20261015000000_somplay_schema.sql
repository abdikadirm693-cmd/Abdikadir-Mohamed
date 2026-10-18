-- =====================================================================
-- SOMPLAY Database Schema & Initial Data Migration for Supabase
-- Tables: users, packages, wallets, orders, advertisements
-- Security: Row Level Security (RLS) enabled on all tables
-- Privileged operations managed securely via server-side service key
-- =====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  saved_pubg_id TEXT DEFAULT '',
  saved_pubg_nickname TEXT DEFAULT '',
  pep_points INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user email lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- 2. PACKAGES TABLE
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  uc_amount INTEGER NOT NULL,
  bonus_uc INTEGER NOT NULL DEFAULT 0,
  price_usd NUMERIC(10, 2) NOT NULL,
  badge TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_order_index ON packages (order_index ASC);

-- 3. WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  merchant_number TEXT NOT NULL DEFAULT '',
  ussd_template TEXT NOT NULL,
  instructions_en TEXT DEFAULT '',
  instructions_so TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT DEFAULT '',
  package_id TEXT NOT NULL REFERENCES packages(id) ON UPDATE CASCADE,
  package_name TEXT NOT NULL,
  uc_amount INTEGER NOT NULL,
  bonus_uc INTEGER NOT NULL DEFAULT 0,
  total_uc INTEGER NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL,
  pubg_id TEXT NOT NULL,
  pubg_nickname TEXT DEFAULT '',
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON UPDATE CASCADE,
  wallet_name TEXT NOT NULL,
  merchant_number TEXT NOT NULL DEFAULT '',
  ussd_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'pending', 'completed', 'failed')),
  sender_phone TEXT DEFAULT '',
  receipt_screenshot TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  pep_awarded BOOLEAN NOT NULL DEFAULT false,
  pep_points_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- 5. ADVERTISEMENTS TABLE
CREATE TABLE IF NOT EXISTS advertisements (
  id TEXT PRIMARY KEY,
  title_so TEXT NOT NULL,
  title_en TEXT NOT NULL,
  subtitle_so TEXT NOT NULL,
  subtitle_en TEXT NOT NULL,
  badge_so TEXT NOT NULL,
  badge_en TEXT NOT NULL,
  link_text_so TEXT NOT NULL,
  link_text_en TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Least-Privilege Rules:
-- 1. Public anonymous clients can ONLY read active packages and active ads.
-- 2. Wallets, Users, and Orders have NO public access policies.
--    This completely shields merchant numbers, customer records, and payment submissions
--    from direct public queries.
-- 3. The backend Express server queries and mediates data via the service_role key.
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- PACKAGES: Public can only view active packages
DROP POLICY IF EXISTS "Public can view active packages" ON packages;
CREATE POLICY "Public can view active packages" ON packages
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- ADVERTISEMENTS: Public can only view active advertisements
DROP POLICY IF EXISTS "Public can view active advertisements" ON advertisements;
CREATE POLICY "Public can view active advertisements" ON advertisements
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- WALLETS: Drop any public SELECT policy to prevent exposing merchant payment details publicly.
-- All wallet access is controlled and mediated server-side through the Express API.
DROP POLICY IF EXISTS "Public can view active wallets" ON wallets;

-- USERS & ORDERS: No public policies. Completely protected from direct anonymous access.

-- =====================================================================
-- SEED INITIAL DATA (Idempotent: safe to run multiple times)
-- =====================================================================

-- Packages seed
INSERT INTO packages (id, name, uc_amount, bonus_uc, price_usd, badge, image_url, active, order_index)
VALUES
  ('pkg_60uc', '60 UC', 60, 0, 0.99, 'Starter', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 1),
  ('pkg_325uc', '300 + 25 Bonus UC', 300, 25, 4.99, 'Most Popular', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 2),
  ('pkg_660uc', '600 + 60 Bonus UC', 600, 60, 9.99, 'Best Value (Royale Pass)', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 3),
  ('pkg_1800uc', '1500 + 300 Bonus UC', 1500, 300, 24.99, 'Elite Gamer', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 4),
  ('pkg_3850uc', '3000 + 850 Bonus UC', 3000, 850, 49.99, 'Mega Pack', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 5),
  ('pkg_8100uc', '6000 + 2100 Bonus UC', 6000, 2100, 99.99, 'Legendary Crate', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  uc_amount = EXCLUDED.uc_amount,
  bonus_uc = EXCLUDED.bonus_uc,
  price_usd = EXCLUDED.price_usd,
  badge = EXCLUDED.badge,
  image_url = EXCLUDED.image_url,
  active = EXCLUDED.active,
  order_index = EXCLUDED.order_index;

-- Wallets seed: Only EVC Plus and Sahal are active; Zaad and eDahab are inactive.
-- All wallets remain unconfigured (merchant_number = '') and in test_mode = true until real merchant details are set by the owner.
INSERT INTO wallets (id, name, short_name, operator, merchant_number, ussd_template, instructions_en, instructions_so, active, color, accent_color, is_configured, test_mode)
VALUES
  ('evc_plus', 'Hormuud EVC Plus', 'EVC Plus', 'Hormuud Telecom', '', '*712*{merchant}*{amount}#',
   'Dial the USSD code on your Hormuud SIM, enter your 4-digit PIN in your phone dialer, then return here to submit your phone number.',
   'Wac lambarka USSD taleefankaaga Hormuud, geli PIN-kaaga sirta ah dialer-ka taleefankaaga, ka dib halkan dib ugu soo noqo si aad u geliso lambarkaaga.',
   true, '#008751', '#E8F5E9', false, true),
  ('sahal', 'Golis Sahal', 'Sahal', 'Golis Telecom', '', '*888*{merchant}*{amount}#',
   'Dial the Sahal USSD code, confirm payment on your phone dialer, and submit the confirmation here.',
   'Wac lambarka USSD ee Sahal, xaqiiji lacag bixinta taleefankaaga, kadibna ku soo gudbi xaqiijinta halkan.',
   true, '#D97706', '#FEF3C7', false, true),
  ('zaad', 'Telesom Zaad', 'Zaad Service', 'Telesom', '', '*880*{merchant}*{amount}#',
   'Dial the USSD code on your Telesom SIM, enter your PIN in your dialer, then return here with your sender number.',
   'Wac lambarka USSD taleefankaaga Telesom Zaad, ku geli PIN-ka taleefankaaga, ka dib halkan ku soo celi lambarkaaga.',
   false, '#1E40AF', '#EFF6FF', false, true),
  ('edahab', 'Dahabshiil eDahab', 'eDahab', 'Dahabshiil', '', '*104*{merchant}*{amount}#',
   'Dial the eDahab USSD code on your dialer, confirm with your secret PIN on your phone, then enter your sender number here.',
   'Wac lambarka USSD ee eDahab taleefankaaga, xaqiiji PIN-kaaga sirta ah, kadibna geli lambarkaaga diraha halkan.',
   false, '#059669', '#ECFDF5', false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  operator = EXCLUDED.operator,
  merchant_number = EXCLUDED.merchant_number,
  ussd_template = EXCLUDED.ussd_template,
  instructions_en = EXCLUDED.instructions_en,
  instructions_so = EXCLUDED.instructions_so,
  active = EXCLUDED.active,
  color = EXCLUDED.color,
  accent_color = EXCLUDED.accent_color,
  is_configured = EXCLUDED.is_configured,
  test_mode = EXCLUDED.test_mode,
  updated_at = NOW();

-- Advertisements seed
INSERT INTO advertisements (id, title_so, title_en, subtitle_so, subtitle_en, badge_so, badge_en, link_text_so, link_text_en, active)
VALUES
  ('ad_pubg_season',
   'Xilli Cusub oo PUBG Mobile ah!',
   'New PUBG Mobile Royale Pass Season!',
   'Hel UC-gaaga ugu dhaqsiyaha badan Somalia. Dhaafsiiso EVC Plus & Sahal.',
   'Get instant PUBG UC recharge in Somalia. Pay easily with EVC Plus & Sahal.',
   'DHAQSO & AAMIN',
   'FAST & SECURE',
   'Hadda Xaree',
   'Top-Up Now',
   true)
ON CONFLICT (id) DO UPDATE SET
  title_so = EXCLUDED.title_so,
  title_en = EXCLUDED.title_en,
  subtitle_so = EXCLUDED.subtitle_so,
  subtitle_en = EXCLUDED.subtitle_en,
  badge_so = EXCLUDED.badge_so,
  badge_en = EXCLUDED.badge_en,
  link_text_so = EXCLUDED.link_text_so,
  link_text_en = EXCLUDED.link_text_en,
  active = EXCLUDED.active,
  updated_at = NOW();
