/*
  # Fix Auth Identities and Password Hashing

  ## Overview
  The mock auth users are missing identity records in auth.identities, which
  Supabase Auth requires to authenticate users. This migration adds the missing
  identity records and re-hashes passwords with the correct bcrypt cost factor.

  ## Changes
  1. Insert identity records for all 6 mock users into auth.identities
  2. Re-hash all passwords with bcrypt cost factor 10

  ## Security Notes
  - Identity records link users to their email provider
  - Passwords are re-hashed with proper cost factor for Supabase compatibility
*/

-- Fix password hashes to use bcrypt cost factor 10 (Supabase standard)
UPDATE auth.users SET encrypted_password = crypt('BuildTrack2026!', gen_salt('bf', 10))
WHERE email IN (
  'admin@buildtrack.com.au',
  'sarah@buildtrack.com.au',
  'tom@buildtrack.com.au',
  'jake@buildtrack.com.au',
  'ryan@buildtrack.com.au',
  'emma@buildtrack.com.au'
);

-- Insert missing identity records (email column is generated, so omit it)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT
  u.id,
  u.id,
  u.id::text,
  'email',
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false,
    'iss', 'https://scvucwstyfdzxfpjcgmh.supabase.co/auth/v1',
    'aud', 'authenticated',
    'full_name', (u.raw_user_meta_data->>'full_name')
  ),
  NULL,
  now(),
  now()
FROM auth.users u
WHERE u.email IN (
  'admin@buildtrack.com.au',
  'sarah@buildtrack.com.au',
  'tom@buildtrack.com.au',
  'jake@buildtrack.com.au',
  'ryan@buildtrack.com.au',
  'emma@buildtrack.com.au'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);
