-- =====================================================================
-- SOMPLAY Phase 4 Migration: UC, WOW Coin, PEP Rewards & Redemption
-- Safe & Non-Destructive: Preserves all existing users, orders, and data
-- =====================================================================

-- 1. Ensure packages table has currency_type and supplier_cost_usd columns
ALTER TABLE packages ADD COLUMN IF NOT EXISTS currency_type TEXT NOT NULL DEFAULT 'uc';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS supplier_cost_usd NUMERIC(10, 2);

-- 2. Ensure orders table has pep_spent, pep_refunded, and is_pep_redemption columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pep_spent INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pep_refunded BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_pep_redemption BOOLEAN DEFAULT false;

-- 3. Upsert PEP Rewards wallet in wallets table
INSERT INTO wallets (
  id,
  name,
  short_name,
  operator,
  merchant_number,
  ussd_template,
  instructions_en,
  instructions_so,
  active,
  color,
  accent_color,
  is_configured,
  test_mode
) VALUES (
  'pep_rewards',
  'PEP Reward Points',
  'PEP',
  'Somplay Loyalty',
  'PEP_BALANCE',
  'PEP_REDEMPTION',
  'Direct redemption with your accumulated PEP reward points balance.',
  'Ku furro dhibcahaaga abaalmarinta PEP.',
  true,
  '#F59E0B',
  '#D97706',
  true,
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  active = true,
  is_configured = true;

-- 4. Initial UC and WOW Coin packages schedule
-- Supplier Costs: 60: $0.89, 325: $4.49, 660: $8.99, 1800: $22.49, 3850: $44.99, 8100: $89.99
-- Selling Prices: 60: $1.50, 325: $5.50, 660: $10.50, 1800: $25.00, 3850: $49.00, 8100: $97.00
-- PEP Rewards: 60: 6, 325: 10, 660: 15, 1800: 25, 3850: 40, 8100: 70 PEP
INSERT INTO packages (id, name, uc_amount, bonus_uc, price_usd, badge, image_url, active, order_index, currency_type, supplier_cost_usd)
VALUES
  ('pkg_60uc', '60 UC', 60, 0, 1.50, 'Starter', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 1, 'uc', 0.89),
  ('pkg_325uc', '300 + 25 Bonus UC', 300, 25, 5.50, 'Most Popular', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 2, 'uc', 4.49),
  ('pkg_660uc', '600 + 60 Bonus UC', 600, 60, 10.50, 'Best Value (Royale Pass)', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 3, 'uc', 8.99),
  ('pkg_1800uc', '1500 + 300 Bonus UC', 1500, 300, 25.00, 'Elite Gamer', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 4, 'uc', 22.49),
  ('pkg_3850uc', '3000 + 850 Bonus UC', 3000, 850, 49.00, 'Mega Pack', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 5, 'uc', 44.99),
  ('pkg_8100uc', '6000 + 2100 Bonus UC', 6000, 2100, 97.00, 'Legendary Crate', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 6, 'uc', 89.99),
  ('pkg_60wow', '60 WOW Coin', 60, 0, 1.50, 'Starter', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 11, 'wow_coin', 0.89),
  ('pkg_325wow', '300 + 25 Bonus WOW Coin', 300, 25, 5.50, 'Most Popular', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 12, 'wow_coin', 4.49),
  ('pkg_660wow', '600 + 60 Bonus WOW Coin', 600, 60, 10.50, 'Creator Pack', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 13, 'wow_coin', 8.99),
  ('pkg_1800wow', '1500 + 300 Bonus WOW Coin', 1500, 300, 25.00, 'World Builder', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 14, 'wow_coin', 22.49),
  ('pkg_3850wow', '3000 + 850 Bonus WOW Coin', 3000, 850, 49.00, 'Master Architect', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 15, 'wow_coin', 44.99),
  ('pkg_8100wow', '6000 + 2100 Bonus WOW Coin', 6000, 2100, 97.00, 'Universe Pack', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80', true, 16, 'wow_coin', 89.99)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  uc_amount = EXCLUDED.uc_amount,
  bonus_uc = EXCLUDED.bonus_uc,
  price_usd = EXCLUDED.price_usd,
  badge = EXCLUDED.badge,
  active = EXCLUDED.active,
  order_index = EXCLUDED.order_index;
