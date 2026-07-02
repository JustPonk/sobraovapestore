-- Analytics domain: dashboard events and daily KPI summaries

CREATE TABLE IF NOT EXISTS dashboard_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  customer_id uuid,
  anonymous_id text,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  order_id uuid,
  product_id uuid,
  product_variant_id uuid,
  cart_id uuid,
  page_path text,
  referrer_url text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT dashboard_events_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_events_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_events_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_events_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_events_variant_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_events_cart_fk FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL,
  CONSTRAINT dashboard_events_identity_check CHECK (
    profile_id IS NOT NULL OR customer_id IS NOT NULL OR anonymous_id IS NOT NULL
  ),
  CONSTRAINT dashboard_events_event_type_check CHECK (length(trim(event_type)) > 0)
);

COMMENT ON TABLE dashboard_events IS 'Append-only behavioral event stream for product, checkout, and account analytics.';

CREATE INDEX IF NOT EXISTS idx_dashboard_events_event_type ON dashboard_events(event_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_profile_id ON dashboard_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_customer_id ON dashboard_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_anonymous_id ON dashboard_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_occurred_at ON dashboard_events(occurred_at DESC);

CREATE TABLE IF NOT EXISTS kpi_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  metric_key text NOT NULL,
  granularity kpi_granularity NOT NULL DEFAULT 'daily',
  dimension jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimension_hash text GENERATED ALWAYS AS (md5(dimension::text)) STORED,
  metric_value numeric(18,6) NOT NULL DEFAULT 0,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT kpi_daily_unique UNIQUE (metric_date, metric_key, granularity, dimension_hash)
);

COMMENT ON TABLE kpi_daily IS 'Daily KPI fact table used by dashboards and future BI integrations.';
COMMENT ON COLUMN kpi_daily.dimension IS 'Flexible segmentation payload such as channel, warehouse, or product category.';

CREATE TRIGGER kpi_daily_set_updated_at
BEFORE UPDATE ON kpi_daily
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kpi_daily_metric_date ON kpi_daily(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_metric_key ON kpi_daily(metric_key);
CREATE INDEX IF NOT EXISTS idx_kpi_daily_granularity ON kpi_daily(granularity);
