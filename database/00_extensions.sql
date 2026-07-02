-- Enable required extensions for Sobrao platform
-- Using pgcrypto for gen_random_uuid(), pg_trgm for text search, and citext for case-insensitive email handling
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- Keep extension creation idempotent and safe for Supabase/Postgres 16
COMMENT ON FUNCTION gen_random_uuid() IS 'Provided by pgcrypto; used as default UUID generator';
