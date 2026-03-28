-- Migration: CRM Real Authentication - Sprint 4
-- Creates a real Supabase auth user for marshall@preceptlegacy.com
-- and links it to a sales record with administrator privileges.
-- Run via: docker exec supabase_db_atomic-crm-demo psql -U postgres -d postgres -f migration-sprint4-crm-auth.sql

-- Step 1: Insert auth user
-- NOTE: Replace the UUID and password hash as needed for your environment.
-- Password below is hashed with bcrypt: WealthOps2024!
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marshall@preceptlegacy.com',
    crypt('WealthOps2024!', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Marshall McKinney"}',
    NOW(),
    NOW(),
    false,
    false
  )
  ON CONFLICT DO NOTHING;

  -- Step 2: Insert auth identity (required for email/password login)
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    new_user_id,
    new_user_id,
    json_build_object('sub', new_user_id::text, 'email', 'marshall@preceptlegacy.com'),
    'email',
    NOW(),
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'marshall@preceptlegacy.com'
      AND id != new_user_id
  );

  -- Step 3: Create sales record linked to the new auth user
  INSERT INTO sales (first_name, last_name, email, user_id, administrator)
  SELECT 'Marshall', 'McKinney', 'marshall@preceptlegacy.com', new_user_id, true
  WHERE NOT EXISTS (
    SELECT 1 FROM sales WHERE email = 'marshall@preceptlegacy.com'
  );
END $$;
