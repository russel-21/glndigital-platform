-- Create profiles table supporting multiple roles & active connections tracking
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL, -- Ex: "+237 692062677" with country code
  company_name TEXT, -- Optional company name for invoices
  roles TEXT[] NOT NULL DEFAULT '{student}', -- Supports array: ex: '{student,partner}'
  "current_role" TEXT NOT NULL DEFAULT 'student', -- The role currently active (switched)
  -- Quoted: current_role is a reserved Postgres keyword (like current_user) and
  -- is parsed as CURRENT_ROLE, not a column name, unless quoted. This migration
  -- was never actually run as-is against any Postgres (the live `profiles` table
  -- was created some other way); fixed here so a fresh `supabase db reset` or a
  -- new environment doesn't hit this syntax error.
  active_sessions TEXT[] NOT NULL DEFAULT '{}', -- Tracks active device tokens
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert/update their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
