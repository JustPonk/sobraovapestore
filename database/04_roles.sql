-- Roles and user-role assignments

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  type role_type NOT NULL DEFAULT 'employee',
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

-- Trigger to keep updated_at current
CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE roles IS 'List of roles used for RBAC: administrator, employee, customer, guest, etc.';
COMMENT ON COLUMN roles.type IS 'Categorized role type to help RLS mapping';

-- Many-to-many: profiles assigned to roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT user_roles_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT user_roles_unique UNIQUE (profile_id, role_id)
);

COMMENT ON TABLE user_roles IS 'Assignment table linking `profiles` and `roles`.';
