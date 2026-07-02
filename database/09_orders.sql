-- Cart and order domain: carts, cart items, orders, order items and status history

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_token text NOT NULL UNIQUE,
  customer_id uuid,
  profile_id uuid,
  currency_code char(3) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT carts_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT carts_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT carts_status_check CHECK (status IN ('active', 'converted', 'abandoned', 'expired')),
  CONSTRAINT carts_currency_check CHECK (currency_code ~ '^[A-Z]{3}$')
);

COMMENT ON TABLE carts IS 'Temporary shopping carts for guests and authenticated customers.';

CREATE TRIGGER carts_set_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_profile_id ON carts(profile_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  quantity numeric(18,4) NOT NULL,
  unit_price numeric(18,2) NOT NULL,
  compare_at_price numeric(18,2),
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  line_total numeric(18,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount) STORED,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT cart_items_cart_fk FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT cart_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT cart_items_variant_fk FOREIGN KEY (product_variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE RESTRICT,
  CONSTRAINT cart_items_unique UNIQUE (cart_id, product_variant_id),
  CONSTRAINT cart_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT cart_items_price_check CHECK (unit_price >= 0 AND (compare_at_price IS NULL OR compare_at_price >= 0)),
  CONSTRAINT cart_items_discount_check CHECK (discount_amount >= 0 AND discount_amount <= (quantity * unit_price))
);

COMMENT ON TABLE cart_items IS 'Line items kept in the cart with price snapshots at the time of addition.';

CREATE TRIGGER cart_items_set_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(product_variant_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  cart_id uuid UNIQUE,
  customer_id uuid,
  profile_id uuid,
  status order_status NOT NULL DEFAULT 'draft',
  sales_channel sales_channel NOT NULL DEFAULT 'web',
  currency_code char(3) NOT NULL,
  email citext,
  phone text,
  billing_address_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_address_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal_amount numeric(18,2) NOT NULL DEFAULT 0,
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  shipping_amount numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  grand_total_amount numeric(18,2) NOT NULL DEFAULT 0,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  placed_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT orders_cart_fk FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL,
  CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT orders_profile_fk FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT orders_currency_check CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT orders_amounts_nonnegative CHECK (
    subtotal_amount >= 0 AND discount_amount >= 0 AND shipping_amount >= 0 AND tax_amount >= 0 AND grand_total_amount >= 0
  ),
  CONSTRAINT orders_time_consistency_check CHECK (
    (paid_at IS NULL OR placed_at IS NULL OR paid_at >= placed_at)
    AND (fulfilled_at IS NULL OR placed_at IS NULL OR fulfilled_at >= placed_at)
    AND (cancelled_at IS NULL OR placed_at IS NULL OR cancelled_at >= placed_at)
  )
);

COMMENT ON TABLE orders IS 'Immutable commercial order header with customer, address, and financial snapshots.';
COMMENT ON COLUMN orders.shipping_address_snapshot IS 'Snapshot of the shipping address at checkout time.';

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_profile_id ON orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  product_name text NOT NULL,
  product_sku text NOT NULL,
  product_image_url text,
  quantity numeric(18,4) NOT NULL,
  unit_price numeric(18,2) NOT NULL,
  compare_at_price numeric(18,2),
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  line_total numeric(18,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount + tax_amount) STORED,
  product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT order_items_variant_fk FOREIGN KEY (product_variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE RESTRICT,
  CONSTRAINT order_items_unique UNIQUE (order_id, product_variant_id),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_price_check CHECK (unit_price >= 0 AND (compare_at_price IS NULL OR compare_at_price >= 0)),
  CONSTRAINT order_items_discount_check CHECK (discount_amount >= 0 AND discount_amount <= (quantity * unit_price) AND tax_amount >= 0)
);

COMMENT ON TABLE order_items IS 'Order line snapshots. Product name, SKU, price, and image are copied at checkout and never depend on the live catalog.';
COMMENT ON COLUMN order_items.product_snapshot IS 'Additional product snapshot fields for audit, exports, and future integrations.';

CREATE TRIGGER order_items_set_updated_at
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(product_variant_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  from_status order_status,
  to_status order_status NOT NULL,
  changed_by_profile_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT order_status_history_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT order_status_history_profile_fk FOREIGN KEY (changed_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE order_status_history IS 'Immutable timeline of order lifecycle changes for ERP and customer support.';

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_profile_id, reason, metadata)
    VALUES (NEW.id, NULL, NEW.status, NULL, 'initial_status', '{}'::jsonb);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_profile_id, reason, metadata)
    VALUES (NEW.id, OLD.status, NEW.status, NULL, 'status_change', '{}'::jsonb);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_order_status_change() IS 'Writes immutable status history rows whenever an order is created or its status changes.';

CREATE TRIGGER orders_log_status_history_on_insert
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

CREATE TRIGGER orders_log_status_history_on_update
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();
