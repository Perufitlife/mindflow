-- =====================================================
-- UNBIND DATABASE SCHEMA
-- Voice-to-Action Productivity App
-- Trial-Only Model: 3 days free, then subscribe
-- Execute this in Supabase SQL Editor
-- =====================================================

-- 1. Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  language TEXT DEFAULT 'en',
  
  -- Session tracking
  daily_sessions_count INTEGER DEFAULT 0,
  last_session_date DATE,
  total_sessions INTEGER DEFAULT 0,
  
  -- Trial & Premium status
  trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- When trial started
  trial_sessions_used INTEGER DEFAULT 0,                     -- Sessions used during trial
  is_premium BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create sessions table (journal entries)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  transcript TEXT,
  summary TEXT,
  blocker TEXT,
  mood TEXT,
  tasks JSONB DEFAULT '[]'::jsonb,
  audio_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for profiles
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 5. Create RLS Policies for sessions
CREATE POLICY "Users can view own sessions" 
  ON public.sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
  ON public.sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
  ON public.sessions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" 
  ON public.sessions FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_start_date)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW()  -- Trial starts immediately on signup
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for updated_at on profiles
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_session_date ON public.profiles(last_session_date);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_start ON public.profiles(trial_start_date);

-- =====================================================
-- MIGRATION: Run this if you already have the tables
-- =====================================================
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_sessions_used INTEGER DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
-- UPDATE public.profiles SET trial_start_date = created_at WHERE trial_start_date IS NULL;
