-- ============================================================================
-- SOBRAO VAPE STORE — 00: Extensions & global setup
-- ============================================================================
-- pgcrypto gives us gen_random_uuid() for UUID primary keys.
-- pg_trgm speeds up ILIKE / fuzzy search on product names later on.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Dedicated schema for app-level tables (keeps things out of `public` if you
-- ever want tighter default-privilege control). Using `public` is also fine
-- for Supabase; we stay in `public` here since that's what PostgREST exposes
-- by default and what the Supabase client expects out of the box.
