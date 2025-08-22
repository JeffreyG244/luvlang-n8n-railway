-- CHECK DATABASE STRUCTURE BEFORE APPLYING SECURITY FIXES
-- Run this first to see what tables and columns actually exist

-- 1. List all tables in public schema
SELECT 'TABLES IN PUBLIC SCHEMA:' as info;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Check which tables have RLS enabled
SELECT 'RLS STATUS:' as info;
SELECT 
    schemaname||'.'||tablename as table_name,
    rowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- 3. Check columns in user_profiles table (if it exists)
SELECT 'USER_PROFILES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 4. Check columns in profiles table (alternative name)
SELECT 'PROFILES COLUMNS:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. List all tables with their primary key columns
SELECT 'PRIMARY KEYS:' as info;
SELECT 
    t.table_name,
    c.column_name as primary_key_column
FROM information_schema.tables t
JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name
JOIN information_schema.key_column_usage c ON tc.constraint_name = c.constraint_name
WHERE t.table_schema = 'public' 
AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY t.table_name;

-- 6. Check for auth-related columns across all tables
SELECT 'AUTH RELATED COLUMNS:' as info;
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (column_name ILIKE '%user%' OR column_name ILIKE '%auth%' OR column_name ILIKE '%id%')
ORDER BY table_name, column_name;

-- 7. Check existing policies
SELECT 'EXISTING POLICIES:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;