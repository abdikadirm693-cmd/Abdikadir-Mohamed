-- =====================================================================
-- SOMPLAY Phase 4.2 Migration: Carousel Slides, Package Images & Field Labels
-- Safe & Non-Destructive: Preserves all existing users, orders, packages, and data
-- =====================================================================

-- 1. Ensure packages table has image_url column
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- 2. Create carousel_slides table (Supports up to 3 promotional slides)
CREATE TABLE IF NOT EXISTS carousel_slides (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  button_text TEXT DEFAULT '',
  target_url TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carousel_slides_order ON carousel_slides (order_index ASC);
CREATE INDEX IF NOT EXISTS idx_carousel_slides_active ON carousel_slides (active);

-- 3. Create checkout_field_labels table for customizable checkout field labels
CREATE TABLE IF NOT EXISTS checkout_field_labels (
  id TEXT PRIMARY KEY DEFAULT 'default',
  player_id_label_en TEXT NOT NULL DEFAULT 'PUBG Player ID (UID)',
  player_id_label_so TEXT NOT NULL DEFAULT 'Aqoonsiga Ciyaaryahanka PUBG (UID)',
  nickname_label_en TEXT NOT NULL DEFAULT 'PUBG In-Game Nickname',
  nickname_label_so TEXT NOT NULL DEFAULT 'Naaneysta Ciyaarta PUBG',
  player_id_placeholder_en TEXT DEFAULT 'Enter 5-15 digit PUBG UID',
  player_id_placeholder_so TEXT DEFAULT 'Geli 5-15 lambar oo PUBG UID ah',
  nickname_placeholder_en TEXT DEFAULT 'Optional in-game nickname',
  nickname_placeholder_so TEXT DEFAULT 'Ikhtiyaari (Naaneysta ciyaarta)',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default field labels if not exists
INSERT INTO checkout_field_labels (
  id,
  player_id_label_en,
  player_id_label_so,
  nickname_label_en,
  nickname_label_so,
  player_id_placeholder_en,
  player_id_placeholder_so,
  nickname_placeholder_en,
  nickname_placeholder_so
) VALUES (
  'default',
  'PUBG Player ID (UID)',
  'Aqoonsiga Ciyaaryahanka PUBG (UID)',
  'PUBG In-Game Nickname',
  'Naaneysta Ciyaarta PUBG',
  'Enter 5-15 digit PUBG UID',
  'Geli 5-15 lambar oo PUBG UID ah',
  'Optional in-game nickname',
  'Ikhtiyaari (Naaneysta ciyaarta)'
) ON CONFLICT (id) DO NOTHING;

-- 4. Row Level Security (RLS) Policies
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_field_labels ENABLE ROW LEVEL SECURITY;

-- Public can view active carousel slides
DROP POLICY IF EXISTS "Public can view active carousel slides" ON carousel_slides;
CREATE POLICY "Public can view active carousel slides" ON carousel_slides
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Public can view checkout field labels
DROP POLICY IF EXISTS "Public can view checkout field labels" ON checkout_field_labels;
CREATE POLICY "Public can view checkout field labels" ON checkout_field_labels
  FOR SELECT
  TO anon, authenticated
  USING (true);
