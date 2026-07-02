-- Reporting views for catalog, stock, orders and customers

CREATE OR REPLACE VIEW vw_product_catalog AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.slug AS product_slug,
  b.name AS brand_name,
  p.is_active,
  p.is_published,
  p.is_featured,
  COALESCE(array_agg(DISTINCT c.name) FILTER (WHERE c.id IS NOT NULL), '{}'::text[]) AS category_names,
  COUNT(DISTINCT pv.id) AS variant_count,
  MIN(pp.amount) FILTER (WHERE pp.is_active AND pp.deleted_at IS NULL) AS starting_price,
  MAX(pi.image_url) FILTER (WHERE pi.is_primary) AS primary_image_url
FROM products p
LEFT JOIN brands b ON b.id = p.brand_id AND b.deleted_at IS NULL
LEFT JOIN product_categories pc ON pc.product_id = p.id
LEFT JOIN categories c ON c.id = pc.category_id AND c.deleted_at IS NULL
LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.deleted_at IS NULL
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, b.name;

CREATE OR REPLACE VIEW vw_inventory_stock AS
SELECT
  s.id AS stock_id,
  w.id AS warehouse_id,
  w.code AS warehouse_code,
  w.name AS warehouse_name,
  p.id AS product_id,
  p.name AS product_name,
  pv.id AS product_variant_id,
  pv.sku,
  s.quantity_on_hand,
  s.quantity_reserved,
  s.reorder_point,
  s.safety_stock,
  s.last_movement_at
FROM stock s
JOIN warehouses w ON w.id = s.warehouse_id AND w.deleted_at IS NULL
JOIN product_variants pv ON pv.id = s.product_variant_id AND pv.deleted_at IS NULL
JOIN products p ON p.id = pv.product_id AND p.deleted_at IS NULL
WHERE s.deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_order_summary AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.status,
  o.sales_channel,
  o.currency_code,
  o.customer_id,
  o.profile_id,
  o.email,
  o.subtotal_amount,
  o.discount_amount,
  o.shipping_amount,
  o.tax_amount,
  o.grand_total_amount,
  o.created_at,
  COUNT(oi.id) AS item_count,
  SUM(oi.quantity) AS total_quantity
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id;

CREATE OR REPLACE VIEW vw_customer_summary AS
SELECT
  c.id AS customer_id,
  c.customer_code,
  c.email,
  c.first_name,
  c.last_name,
  c.company_name,
  c.customer_status,
  COUNT(o.id) FILTER (WHERE o.deleted_at IS NULL) AS order_count,
  MAX(o.created_at) FILTER (WHERE o.deleted_at IS NULL) AS last_order_at,
  COALESCE(SUM(o.grand_total_amount) FILTER (WHERE o.deleted_at IS NULL), 0) AS lifetime_value
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id;

CREATE OR REPLACE VIEW vw_daily_kpis AS
SELECT
  metric_date,
  metric_key,
  granularity,
  dimension,
  metric_value,
  source
FROM kpi_daily
WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW vw_visitor_summary AS
SELECT
  v.id AS visitor_id,
  v.visitor_token,
  v.first_seen_at,
  v.last_seen_at,
  v.browser,
  v.device_type,
  v.operating_system,
  v.country_code,
  v.language,
  v.referrer,
  v.utm_source,
  v.utm_medium,
  v.utm_campaign,
  COUNT(DISTINCT c.id) AS cart_count,
  COUNT(DISTINCT f.id) AS favorite_count,
  COUNT(DISTINCT rv.id) AS recently_viewed_count,
  COUNT(DISTINCT de.id) AS event_count,
  COALESCE(BOOL_OR(c.profile_id IS NOT NULL OR f.profile_id IS NOT NULL OR rv.profile_id IS NOT NULL OR de.profile_id IS NOT NULL), false) AS has_profile_link,
  COALESCE(BOOL_OR(c.customer_id IS NOT NULL OR f.customer_id IS NOT NULL OR rv.customer_id IS NOT NULL OR de.customer_id IS NOT NULL), false) AS has_customer_link
FROM visitors v
LEFT JOIN carts c ON c.visitor_id = v.id AND c.deleted_at IS NULL
LEFT JOIN favorites f ON f.visitor_id = v.id AND f.deleted_at IS NULL
LEFT JOIN recently_viewed rv ON rv.visitor_id = v.id AND rv.deleted_at IS NULL
LEFT JOIN dashboard_events de ON de.visitor_id = v.id
WHERE v.deleted_at IS NULL
GROUP BY v.id;
