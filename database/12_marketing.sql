-- Marketing domain: coupons, promotions, favorites, recently viewed and newsletter subscriptions

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  coupon_type coupon_type NOT NULL DEFAULT 'percentage',
  discount_value numeric(18,2) NOT NULL,
  minimum_order_amount numeric(18,2),
  max_redemptions integer,
  per_customer_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT coupons_discount_value_check CHECK (discount_value >= 0),
  CONSTRAINT coupons_minimum_amount_check CHECK (minimum_order_amount IS NULL OR minimum_order_amount >= 0),
  CONSTRAINT coupons_redemption_check CHECK (
    (max_redemptions IS NULL OR max_redemptions >= 0)
    AND (per_customer_limit IS NULL OR per_customer_limit >= 0)
    AND (max_redemptions IS NULL OR usage_count <= max_redemptions)
  ),
  CONSTRAINT coupons_time_window_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

COMMENT ON TABLE coupons IS 'Standalone coupon rules that can be applied during checkout or customer service flows.';

CREATE TRIGGER coupons_set_updated_at
BEFORE UPDATE ON coupons
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  promotion_type coupon_type NOT NULL DEFAULT 'percentage',
  discount_value numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  priority integer NOT NULL DEFAULT 0,
  stackable boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT promotions_discount_value_check CHECK (discount_value >= 0),
  CONSTRAINT promotions_status_check CHECK (status IN ('draft', 'scheduled', 'active', 'expired', 'archived')),
  CONSTRAINT promotions_time_window_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

COMMENT ON TABLE promotions IS 'Time-bound merchandising promotions that can target products and categories.';

CREATE TRIGGER promotions_set_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS promotion_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT promotion_products_promotion_fk FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  CONSTRAINT promotion_products_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT promotion_products_unique UNIQUE (promotion_id, product_id)
);

COMMENT ON TABLE promotion_products IS 'Bridge table linking promotions to products.';

CREATE TABLE IF NOT EXISTS promotion_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT promotion_categories_promotion_fk FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  CONSTRAINT promotion_categories_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  CONSTRAINT promotion_categories_unique UNIQUE (promotion_id, category_id)
);

COMMENT ON TABLE promotion_categories IS 'Bridge table linking promotions to categories.';

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  profile_id uuid,
  product_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT favorites_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT favorites_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT favorites_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT favorites_variant_fk FOREIGN KEY (product_variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE CASCADE,
  CONSTRAINT favorites_owner_check CHECK ((customer_id IS NOT NULL)::int + (profile_id IS NOT NULL)::int = 1)
);

COMMENT ON TABLE favorites IS 'Saved products for authenticated customers or CRM-linked buyers.';

CREATE TRIGGER favorites_set_updated_at
BEFORE UPDATE ON favorites
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS ux_favorites_customer_variant
ON favorites(customer_id, product_variant_id)
WHERE customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_favorites_profile_variant
ON favorites(profile_id, product_variant_id)
WHERE profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  profile_id uuid,
  product_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT recently_viewed_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT recently_viewed_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT recently_viewed_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT recently_viewed_variant_fk FOREIGN KEY (product_variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE CASCADE,
  CONSTRAINT recently_viewed_owner_check CHECK ((customer_id IS NOT NULL)::int + (profile_id IS NOT NULL)::int = 1)
);

COMMENT ON TABLE recently_viewed IS 'Behavioral history used to power recommendations and retargeting.';

CREATE TRIGGER recently_viewed_set_updated_at
BEFORE UPDATE ON recently_viewed
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  customer_id uuid,
  profile_id uuid,
  subscription_status text NOT NULL DEFAULT 'subscribed',
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  subscribed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT newsletters_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT newsletters_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT newsletters_status_check CHECK (subscription_status IN ('subscribed', 'unsubscribed', 'pending', 'bounced'))
);

COMMENT ON TABLE newsletters IS 'Newsletter and lifecycle subscription registry.';

CREATE TRIGGER newsletters_set_updated_at
BEFORE UPDATE ON newsletters
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_starts_at ON coupons(starts_at);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_customer_id ON favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_profile_id ON favorites(profile_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_customer_id ON recently_viewed(customer_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_profile_id ON recently_viewed(profile_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_subscription_status ON newsletters(subscription_status) WHERE deleted_at IS NULL;
