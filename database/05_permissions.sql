-- Permissions and mapping to roles

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- machine-friendly: e.g., 'orders.create'
  action text NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  resource text NOT NULL, -- e.g., 'orders', 'products'
  description text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE permissions IS 'Fine-grained permissions used by RBAC';

-- Associate permissions with roles (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Mapping table connecting roles to permissions.';
