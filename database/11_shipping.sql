-- Shipping domain: zones, zone-country mapping and rates

CREATE TABLE IF NOT EXISTS shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

COMMENT ON TABLE shipping_zones IS 'Geographic shipping groups used to price and restrict delivery options.';

CREATE TRIGGER shipping_zones_set_updated_at
BEFORE UPDATE ON shipping_zones
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS shipping_zone_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_zone_id uuid NOT NULL,
  country_code char(2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT shipping_zone_countries_zone_fk FOREIGN KEY (shipping_zone_id) REFERENCES shipping_zones(id) ON DELETE CASCADE,
  CONSTRAINT shipping_zone_countries_unique UNIQUE (shipping_zone_id, country_code),
  CONSTRAINT shipping_zone_countries_code_check CHECK (country_code ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE shipping_zone_countries IS 'Normalized country membership for each shipping zone.';

CREATE INDEX IF NOT EXISTS idx_shipping_zone_countries_zone_id ON shipping_zone_countries(shipping_zone_id);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_zone_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  carrier_name text,
  service_level text,
  rate_type text NOT NULL DEFAULT 'flat',
  amount numeric(18,2) NOT NULL,
  currency_code char(3) NOT NULL,
  min_order_amount numeric(18,2),
  max_order_amount numeric(18,2),
  min_weight_grams numeric(18,4),
  max_weight_grams numeric(18,4),
  estimated_days_min integer,
  estimated_days_max integer,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT shipping_rates_zone_fk FOREIGN KEY (shipping_zone_id) REFERENCES shipping_zones(id) ON DELETE CASCADE,
  CONSTRAINT shipping_rates_rate_type_check CHECK (rate_type IN ('flat', 'weight', 'price', 'free')),
  CONSTRAINT shipping_rates_amount_check CHECK (amount >= 0),
  CONSTRAINT shipping_rates_currency_check CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT shipping_rates_order_range_check CHECK (
    (min_order_amount IS NULL OR min_order_amount >= 0)
    AND (max_order_amount IS NULL OR max_order_amount >= 0)
    AND (min_order_amount IS NULL OR max_order_amount IS NULL OR max_order_amount >= min_order_amount)
  ),
  CONSTRAINT shipping_rates_weight_range_check CHECK (
    (min_weight_grams IS NULL OR min_weight_grams >= 0)
    AND (max_weight_grams IS NULL OR max_weight_grams >= 0)
    AND (min_weight_grams IS NULL OR max_weight_grams IS NULL OR max_weight_grams >= min_weight_grams)
  ),
  CONSTRAINT shipping_rates_days_check CHECK (
    (estimated_days_min IS NULL OR estimated_days_min >= 0)
    AND (estimated_days_max IS NULL OR estimated_days_max >= 0)
    AND (estimated_days_min IS NULL OR estimated_days_max IS NULL OR estimated_days_max >= estimated_days_min)
  )
);

COMMENT ON TABLE shipping_rates IS 'Concrete shipping price rules for each zone and service level.';

CREATE TRIGGER shipping_rates_set_updated_at
BEFORE UPDATE ON shipping_rates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone_id ON shipping_rates(shipping_zone_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_active ON shipping_rates(is_active) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  value_type text NOT NULL DEFAULT 'json',
  setting_group text,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT settings_value_type_check CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'date'))
);

COMMENT ON TABLE settings IS 'Centralized system configuration and feature flags stored as typed JSON values.';

CREATE TRIGGER settings_set_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_settings_setting_group ON settings(setting_group);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON settings(is_public) WHERE deleted_at IS NULL;
