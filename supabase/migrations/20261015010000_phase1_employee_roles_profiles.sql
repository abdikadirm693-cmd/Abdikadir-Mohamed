-- =====================================================================
-- SOMPLAY Phase 1 Migration: Employee Role, Profile Photos, and Active Status
-- Safe and Non-Destructive: Preserves all existing users, orders, and data
-- =====================================================================

-- 1. Safely update the role check constraint on the users table to allow 'employee'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'employee', 'admin'));

-- 2. Add profile_photo_url column to users table (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT DEFAULT '';

-- 3. Add is_active column to users table (if not exists, defaults to true)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 4. Create profile-photos storage bucket in storage.buckets (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 5. Row Level Security policy for profile-photos storage bucket (public read access)
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
CREATE POLICY "Public can view profile photos" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');

-- 6. Storage policy for authenticated uploads via service role or authenticated users
DROP POLICY IF EXISTS "Service role manages profile photos" ON storage.objects;
CREATE POLICY "Service role manages profile photos" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'profile-photos')
  WITH CHECK (bucket_id = 'profile-photos');
