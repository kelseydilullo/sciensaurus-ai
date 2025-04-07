-- RLS Policies for Sciensaurus Database
-- This file contains Row Level Security policies that should be applied to your Supabase tables

-- USERS TABLE
-- ===================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own user record
CREATE POLICY "Users can view their own user data" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- Allow authenticated users to insert their own user record
CREATE POLICY "Users can insert their own user data" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own user record
CREATE POLICY "Users can update their own user data" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- ARTICLE_SUMMARIES TABLE
-- ===================================================

-- Enable RLS on article_summaries table
ALTER TABLE public.article_summaries ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view any article summary
CREATE POLICY "Authenticated users can view any article summary" 
ON public.article_summaries FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert article summaries
CREATE POLICY "Authenticated users can insert article summaries" 
ON public.article_summaries FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update article summaries 
-- Note: This is permissive - you might want to restrict this in production
CREATE POLICY "Authenticated users can update article summaries" 
ON public.article_summaries FOR UPDATE 
USING (auth.role() = 'authenticated');

-- USERS_ARTICLES TABLE
-- ===================================================

-- Enable RLS on users_articles table
ALTER TABLE public.users_articles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own user-article relationships
CREATE POLICY "Users can view their own user-article relationships" 
ON public.users_articles FOR SELECT 
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own user-article relationships
CREATE POLICY "Users can insert their own user-article relationships" 
ON public.users_articles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own user-article relationships
CREATE POLICY "Users can update their own user-article relationships" 
ON public.users_articles FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure service role has full access to all tables
-- ===================================================
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.article_summaries TO service_role;
GRANT ALL ON public.users_articles TO service_role; 