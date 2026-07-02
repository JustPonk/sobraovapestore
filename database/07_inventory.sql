-- Inventory domain: warehouses, stock, immutable movements, suppliers and purchasing

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL UNIQUE,
  description text,
  email citext,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state_region text,
  postal_code text,
  country_code char(2),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT warehouses_country_code_check CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);

COMMENT ON TABLE warehouses IS 'Physical or virtual inventory locations used for stock allocation and fulfillment.';

CREATE TRIGGER warehouses_set_updated_at
BEFORE UPDATE ON warehouses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouses_default
ON warehouses(is_default)
WHERE is_default;

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL UNIQUE,
  email citext,
  phone text,
  tax_id text,
  website_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

COMMENT ON TABLE suppliers IS 'Vendor master data used by purchase orders and replenishment workflows.';

CREATE TRIGGER suppliers_set_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  quantity_on_hand numeric(18,4) NOT NULL DEFAULT 0,
  quantity_reserved numeric(18,4) NOT NULL DEFAULT 0,
  reorder_point numeric(18,4) NOT NULL DEFAULT 0,
  safety_stock numeric(18,4) NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT stock_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT stock_variant_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT stock_unique UNIQUE (warehouse_id, product_variant_id),
  CONSTRAINT stock_nonnegative_check CHECK (
    quantity_on_hand >= 0 AND quantity_reserved >= 0 AND reorder_point >= 0 AND safety_stock >= 0
  ),
  CONSTRAINT stock_reserved_leq_on_hand CHECK (quantity_reserved <= quantity_on_hand)
);

COMMENT ON TABLE stock IS 'Current stock balance by warehouse and product variant. Updated from immutable movement entries.';

CREATE TRIGGER stock_set_updated_at
BEFORE UPDATE ON stock
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity_delta numeric(18,4) NOT NULL,
  reference_type text,
  reference_id uuid,
  unit_cost numeric(18,2),
  note text,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by_profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_movements_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_variant_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_profile_fk FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT inventory_movements_quantity_check CHECK (quantity_delta <> 0),
  CONSTRAINT inventory_movements_unit_cost_check CHECK (unit_cost IS NULL OR unit_cost >= 0)
);

COMMENT ON TABLE inventory_movements IS 'Immutable inventory ledger. Every stock change is recorded here and never edited.';
COMMENT ON COLUMN inventory_movements.quantity_delta IS 'Signed quantity change. Positive for inbound, negative for outbound.';

CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse_id ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_id ON inventory_movements(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred_at ON inventory_movements(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

CREATE OR REPLACE FUNCTION public.prevent_inventory_movement_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements are immutable';
END;
$$;

COMMENT ON FUNCTION public.prevent_inventory_movement_change() IS 'Blocks updates and deletes on inventory history rows.';

CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  resulting_quantity numeric(18,4);
BEGIN
  INSERT INTO stock (warehouse_id, product_variant_id, quantity_on_hand, quantity_reserved, reorder_point, safety_stock, last_movement_at)
  VALUES (NEW.warehouse_id, NEW.product_variant_id, NEW.quantity_delta, 0, 0, 0, NEW.occurred_at)
  ON CONFLICT (warehouse_id, product_variant_id)
  DO UPDATE SET
    quantity_on_hand = stock.quantity_on_hand + EXCLUDED.quantity_on_hand,
    last_movement_at = EXCLUDED.last_movement_at,
    updated_at = timezone('utc', now())
  RETURNING quantity_on_hand INTO resulting_quantity;

  IF resulting_quantity < 0 THEN
    RAISE EXCEPTION 'stock cannot go below zero for warehouse % and variant %', NEW.warehouse_id, NEW.product_variant_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_inventory_movement() IS 'Applies inventory deltas to current stock after movement insert.';

CREATE TRIGGER inventory_movements_apply_stock
AFTER INSERT ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.apply_inventory_movement();

CREATE TRIGGER inventory_movements_prevent_update
BEFORE UPDATE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_inventory_movement_change();

CREATE TRIGGER inventory_movements_prevent_delete
BEFORE DELETE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_inventory_movement_change();

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  order_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  ordered_at timestamptz,
  expected_at timestamptz,
  received_at timestamptz,
  notes text,
  subtotal_amount numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  created_by_profile_id uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT purchase_orders_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT purchase_orders_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
  CONSTRAINT purchase_orders_profile_fk FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT purchase_orders_status_check CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  CONSTRAINT purchase_orders_amounts_nonnegative CHECK (subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

COMMENT ON TABLE purchase_orders IS 'Supplier procurement records used for restocking and receiving workflows.';

CREATE TRIGGER purchase_orders_set_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  quantity_ordered numeric(18,4) NOT NULL,
  quantity_received numeric(18,4) NOT NULL DEFAULT 0,
  unit_cost numeric(18,2) NOT NULL,
  line_total numeric(18,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT purchase_order_items_po_fk FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT purchase_order_items_variant_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  CONSTRAINT purchase_order_items_unique UNIQUE (purchase_order_id, product_variant_id),
  CONSTRAINT purchase_order_items_quantities_check CHECK (quantity_ordered > 0 AND quantity_received >= 0 AND quantity_received <= quantity_ordered),
  CONSTRAINT purchase_order_items_unit_cost_check CHECK (unit_cost >= 0)
);

COMMENT ON TABLE purchase_order_items IS 'Line items for procurement orders. Received quantities are tracked independently from history.';

CREATE TRIGGER purchase_order_items_set_updated_at
BEFORE UPDATE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_warehouse_id ON stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_variant_id ON stock(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse_id ON purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_variant_id ON purchase_order_items(product_variant_id);
