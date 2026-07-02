-- Audit and activity logging

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid,
  actor_role text,
  action text NOT NULL,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  record_pk text,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT audit_logs_actor_fk FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT audit_logs_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'OTHER'))
);

COMMENT ON TABLE audit_logs IS 'High-fidelity security and data-change audit trail for compliance and troubleshooting.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_profile_id ON audit_logs(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_schema_table ON audit_logs(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid,
  activity_type text NOT NULL,
  message text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT activity_logs_actor_fk FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT activity_logs_activity_type_check CHECK (length(trim(activity_type)) > 0)
);

COMMENT ON TABLE activity_logs IS 'Human-readable timeline of user and system activity for operational dashboards.';

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_profile_id ON activity_logs(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_occurred_at ON activity_logs(occurred_at DESC);
