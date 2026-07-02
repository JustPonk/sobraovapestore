-- Profiles table storing user metadata separate from Supabase Auth

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid UNIQUE, -- maps to auth.users.id from Supabase
  email citext UNIQUE NOT NULL,
  first_name text,
  last_name text,
  preferred_name text,
  phone text,
  avatar_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

-- Keep updated_at current
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE profiles IS 'User profile details; separate from authentication provider.';
COMMENT ON COLUMN profiles.metadata IS 'Free-form JSON for user preferences, settings, and external IDs.';
