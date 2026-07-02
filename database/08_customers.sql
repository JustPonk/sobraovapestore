-- Customer domain: customers, addresses, notes, tags and tag assignments

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE,
  customer_code text NOT NULL UNIQUE,
  email citext,
  first_name text,
  last_name text,
  company_name text,
  phone text,
  tax_id text,
  is_business boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  customer_status text NOT NULL DEFAULT 'active',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customers_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT customers_status_check CHECK (customer_status IN ('active', 'inactive', 'blocked'))
);

COMMENT ON TABLE customers IS 'Business customer master record. Can be linked to a Supabase profile or exist as a guest customer.';
COMMENT ON COLUMN customers.profile_id IS 'Optional one-to-one link to a profile when the customer has an authenticated account.';

CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(customer_status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  address_type address_type NOT NULL,
  label text,
  recipient_name text,
  line_1 text NOT NULL,
  line_2 text,
  city text,
  state_region text,
  postal_code text,
  country_code char(2) NOT NULL,
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customer_addresses_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT customer_addresses_country_code_check CHECK (country_code ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE customer_addresses IS 'Normalized customer address book used for billing, shipping, and archival order snapshots.';

CREATE TRIGGER customer_addresses_set_updated_at
BEFORE UPDATE ON customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_addresses_default_billing
ON customer_addresses(customer_id)
WHERE address_type = 'billing' AND is_default;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_addresses_default_shipping
ON customer_addresses(customer_id)
WHERE address_type = 'shipping' AND is_default;

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_address_type ON customer_addresses(address_type) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  note text NOT NULL,
  note_type text NOT NULL DEFAULT 'general',
  is_private boolean NOT NULL DEFAULT true,
  created_by_profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT customer_notes_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT customer_notes_profile_fk FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE customer_notes IS 'Internal CRM notes and service history associated with a customer.';

CREATE TRIGGER customer_notes_set_updated_at
BEFORE UPDATE ON customer_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_by_profile_id ON customer_notes(created_by_profile_id);

CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

COMMENT ON TABLE customer_tags IS 'Reusable tags for segmentation, VIP handling, and CRM workflows.';

CREATE TRIGGER customer_tags_set_updated_at
BEFORE UPDATE ON customer_tags
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS customer_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  customer_tag_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT customer_tag_assignments_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT customer_tag_assignments_tag_fk FOREIGN KEY (customer_tag_id) REFERENCES customer_tags(id) ON DELETE CASCADE,
  CONSTRAINT customer_tag_assignments_unique UNIQUE (customer_id, customer_tag_id)
);

COMMENT ON TABLE customer_tag_assignments IS 'Bridge table between customers and tags.';

CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_customer_id ON customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag_id ON customer_tag_assignments(customer_tag_id);
