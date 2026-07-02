-- Catalog domain: categories, brands, products, variants, attributes, images and prices

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_parent_fk FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT categories_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

COMMENT ON TABLE categories IS 'Hierarchical product taxonomy used by catalog, search, and merchandising.';
COMMENT ON COLUMN categories.parent_id IS 'Self-referencing parent category to support nested category trees.';

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  website_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz
);

COMMENT ON TABLE brands IS 'Manufacturers or commercial brands associated with products.';

CREATE TRIGGER brands_set_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  short_description text,
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  track_inventory boolean NOT NULL DEFAULT true,
  requires_shipping boolean NOT NULL DEFAULT true,
  tax_included boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_brand_fk FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
);

COMMENT ON TABLE products IS 'Product master record. Variant-level sellable data is stored separately in product_variants.';
COMMENT ON COLUMN products.track_inventory IS 'If false, inventory can be ignored for this product family.';

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT product_categories_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_categories_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT product_categories_unique UNIQUE (product_id, category_id)
);

COMMENT ON TABLE product_categories IS 'Bridge table for many-to-many product/category assignment.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_categories_primary
ON product_categories(product_id)
WHERE is_primary;

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku text NOT NULL,
  barcode text,
  name text,
  option_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  weight_grams integer,
  length_mm integer,
  width_mm integer,
  height_mm integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT product_variants_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_variants_product_unique UNIQUE (id, product_id),
  CONSTRAINT product_variants_sku_unique UNIQUE (sku),
  CONSTRAINT product_variants_barcode_unique UNIQUE (barcode),
  CONSTRAINT product_variants_dimensions_nonnegative CHECK (
    (weight_grams IS NULL OR weight_grams >= 0)
    AND (length_mm IS NULL OR length_mm >= 0)
    AND (width_mm IS NULL OR width_mm >= 0)
    AND (height_mm IS NULL OR height_mm >= 0)
  )
);

COMMENT ON TABLE product_variants IS 'Sellable SKU-level records, used for inventory, pricing, orders, and shipping.';
COMMENT ON COLUMN product_variants.option_values IS 'Variant option payload such as size/color values stored as JSON for flexibility.';

CREATE TRIGGER product_variants_set_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  image_url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT product_images_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_images_variant_fk FOREIGN KEY (variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE CASCADE
);

COMMENT ON TABLE product_images IS 'Media assets for a product or a specific variant.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_primary_product
ON product_images(product_id)
WHERE variant_id IS NULL AND is_primary;

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_primary_variant
ON product_images(variant_id)
WHERE variant_id IS NOT NULL AND is_primary;

CREATE TRIGGER product_images_set_updated_at
BEFORE UPDATE ON product_images
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  data_type text NOT NULL,
  is_variant_axis boolean NOT NULL DEFAULT false,
  is_filterable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT product_attributes_name_unique UNIQUE (name),
  CONSTRAINT product_attributes_slug_unique UNIQUE (slug),
  CONSTRAINT product_attributes_data_type_check CHECK (data_type IN ('text', 'number', 'boolean', 'date', 'json'))
);

COMMENT ON TABLE product_attributes IS 'Attribute definitions used to model product specification and variant axes.';

CREATE TRIGGER product_attributes_set_updated_at
BEFORE UPDATE ON product_attributes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS product_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  attribute_id uuid NOT NULL,
  value_text text,
  value_number numeric(18,6),
  value_boolean boolean,
  value_date date,
  value_json jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT product_attribute_values_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_attribute_values_variant_fk FOREIGN KEY (variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE CASCADE,
  CONSTRAINT product_attribute_values_attribute_fk FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE RESTRICT,
  CONSTRAINT product_attribute_values_single_typed_value CHECK (
    ((value_text IS NOT NULL)::int + (value_number IS NOT NULL)::int + (value_boolean IS NOT NULL)::int + (value_date IS NOT NULL)::int + (value_json IS NOT NULL)::int) = 1
  )
);

COMMENT ON TABLE product_attribute_values IS 'Normalized attribute values associated with a product or variant.';

CREATE TRIGGER product_attribute_values_set_updated_at
BEFORE UPDATE ON product_attribute_values
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_id uuid,
  price_type price_type NOT NULL DEFAULT 'sale',
  currency_code char(3) NOT NULL,
  amount numeric(18,2) NOT NULL,
  compare_at_amount numeric(18,2),
  cost_amount numeric(18,2),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT product_prices_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT product_prices_variant_fk FOREIGN KEY (variant_id, product_id) REFERENCES product_variants(id, product_id) ON DELETE CASCADE,
  CONSTRAINT product_prices_amount_nonnegative CHECK (amount >= 0),
  CONSTRAINT product_prices_compare_at_nonnegative CHECK (compare_at_amount IS NULL OR compare_at_amount >= 0),
  CONSTRAINT product_prices_cost_nonnegative CHECK (cost_amount IS NULL OR cost_amount >= 0),
  CONSTRAINT product_prices_currency_check CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT product_prices_time_window_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

COMMENT ON TABLE product_prices IS 'Temporal price records for products and variants. Supports future price history and promotions.';
COMMENT ON COLUMN product_prices.amount IS 'Selling price in the given currency.';

CREATE TRIGGER product_prices_set_updated_at
BEFORE UPDATE ON product_prices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Core catalog indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active_published ON products(is_active, is_published) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON product_variants(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON product_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_is_variant_axis ON product_attributes(is_variant_axis) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_product_id ON product_attribute_values(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_variant_id ON product_attribute_values(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attribute_id ON product_attribute_values(attribute_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_attribute_values_product_level
ON product_attribute_values(product_id, attribute_id)
WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_attribute_values_variant_level
ON product_attribute_values(product_id, variant_id, attribute_id)
WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_variant_id ON product_prices(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_active_window ON product_prices(is_active, starts_at, ends_at) WHERE deleted_at IS NULL;
