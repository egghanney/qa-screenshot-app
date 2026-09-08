-- Migration: 01_auth_profiles_and_admin.sql
-- Description: Create public.qa_profiles table and auto-sync trigger with auth.users

-- 1. Create public.qa_profiles table
CREATE TABLE IF NOT EXISTS public.qa_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'tester' CHECK (role IN ('admin', 'tester', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_qa_profiles_email ON public.qa_profiles(email);
CREATE INDEX IF NOT EXISTS idx_qa_profiles_role ON public.qa_profiles(role);

-- Enable RLS on qa_profiles (allow authenticated read)
ALTER TABLE public.qa_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qa_profiles' AND policyname = 'Allow authenticated read on qa_profiles'
  ) THEN
    CREATE POLICY "Allow authenticated read on qa_profiles" 
    ON public.qa_profiles FOR SELECT 
    TO authenticated 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qa_profiles' AND policyname = 'Allow service role full access on qa_profiles'
  ) THEN
    CREATE POLICY "Allow service role full access on qa_profiles" 
    ON public.qa_profiles FOR ALL 
    TO postgres, service_role 
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 2. Trigger function to synchronize auth.users with public.qa_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
BEGIN
  -- Determine role: egghanney@gmail.com is unconditionally 'admin'
  IF LOWER(NEW.email) = 'egghanney@gmail.com' THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tester');
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Auto-confirm email so admin-created users can log in immediately
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW())
  WHERE id = NEW.id AND email_confirmed_at IS NULL;

  -- Insert or update public.qa_profiles
  INSERT INTO public.qa_profiles (id, email, full_name, role, status, created_at, updated_at)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    user_name,
    assigned_role,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.qa_profiles.full_name),
    role = CASE 
      WHEN LOWER(EXCLUDED.email) = 'egghanney@gmail.com' THEN 'admin' 
      ELSE EXCLUDED.role 
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
