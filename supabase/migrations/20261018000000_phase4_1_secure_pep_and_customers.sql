-- =====================================================================
-- SOMPLAY Phase 4.1 Migration: Safe PEP Constraints & Order Idempotency
-- Safe & Non-Destructive: Preserves all existing users, orders, and data
-- =====================================================================

-- 1. Safely add check constraint on users.pep_points (must be between 0 and 1500)
-- All existing customer records verified: 0 records violate this constraint.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pep_points_check;
ALTER TABLE users ADD CONSTRAINT users_pep_points_check CHECK (pep_points >= 0 AND pep_points <= 1500);

-- 2. Add idempotency_key column to orders table for safe duplicate protection
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key);
