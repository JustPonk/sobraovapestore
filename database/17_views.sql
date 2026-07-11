-- Reporting views for catalog, stock, orders and customers

CREATE OR REPLACE VIEW vw_product_catalog AS
WITH category_agg AS (
  SELECT
    pc.product_id,
    array_agg(DISTINCT c.name) AS category_names
  FROM product_categories pc
  JOIN categories c ON c.id = pc.category_id AND c.deleted_at IS NULL
  GROUP BY pc.product_id
),
variant_counts AS (
  SELECT
    pv.product_id,
    COUNT(*) AS variant_count
  FROM product_variants pv
  WHERE pv.deleted_at IS NULL
  GROUP BY pv.product_id
),
starting_prices AS (
  SELECT
    pp.product_id,
    MIN(pp.amount) FILTER (WHERE pp.is_active AND pp.deleted_at IS NULL) AS starting_price
  FROM product_prices pp
  WHERE pp.deleted_at IS NULL
  GROUP BY pp.product_id
),
primary_images AS (
  SELECT
    pi.product_id,
    MAX(pi.image_url) FILTER (WHERE pi.is_primary) AS primary_image_url
  FROM product_images pi
  WHERE pi.deleted_at IS NULL
  GROUP BY pi.product_id
)
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.slug AS product_slug,
  b.name AS brand_name,
  p.is_active,
  p.is_published,
  p.is_featured,
  COALESCE(ca.category_names, '{}'::text[]) AS category_names,
  COALESCE(vc.variant_count, 0) AS variant_count,
  sp.starting_price,
  pi.primary_image_url
FROM products p
LEFT JOIN brands b ON b.id = p.brand_id AND b.deleted_at IS NULL
LEFT JOIN category_agg ca ON ca.product_id = p.id
LEFT JOIN variant_counts vc ON vc.product_id = p.id
LEFT JOIN starting_prices sp ON sp.product_id = p.id
LEFT JOIN primary_images pi ON pi.product_id = p.id
WHERE p.deleted_at IS NULL;

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
WITH cart_counts AS (
  SELECT
    c.visitor_id,
    COUNT(*) AS cart_count
  FROM carts c
  WHERE c.visitor_id IS NOT NULL
    AND c.deleted_at IS NULL
  GROUP BY c.visitor_id
),
favorite_counts AS (
  SELECT
    f.visitor_id,
    COUNT(*) AS favorite_count
  FROM favorites f
  WHERE f.visitor_id IS NOT NULL
    AND f.deleted_at IS NULL
  GROUP BY f.visitor_id
),
recently_viewed_counts AS (
  SELECT
    rv.visitor_id,
    COUNT(*) AS recently_viewed_count
  FROM recently_viewed rv
  WHERE rv.visitor_id IS NOT NULL
    AND rv.deleted_at IS NULL
  GROUP BY rv.visitor_id
),
event_counts AS (
  SELECT
    de.visitor_id,
    COUNT(*) AS event_count
  FROM dashboard_events de
  WHERE de.visitor_id IS NOT NULL
  GROUP BY de.visitor_id
),
ownership_flags AS (
  SELECT
    x.visitor_id,
    BOOL_OR(x.has_profile_link) AS has_profile_link,
    BOOL_OR(x.has_customer_link) AS has_customer_link
  FROM (
    SELECT visitor_id, profile_id IS NOT NULL AS has_profile_link, customer_id IS NOT NULL AS has_customer_link FROM carts WHERE visitor_id IS NOT NULL AND deleted_at IS NULL
    UNION ALL
    SELECT visitor_id, profile_id IS NOT NULL, customer_id IS NOT NULL FROM favorites WHERE visitor_id IS NOT NULL AND deleted_at IS NULL
    UNION ALL
    SELECT visitor_id, profile_id IS NOT NULL, customer_id IS NOT NULL FROM recently_viewed WHERE visitor_id IS NOT NULL AND deleted_at IS NULL
    UNION ALL
    SELECT visitor_id, profile_id IS NOT NULL, customer_id IS NOT NULL FROM dashboard_events WHERE visitor_id IS NOT NULL
  ) x
  GROUP BY x.visitor_id
)
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
  COALESCE(cc.cart_count, 0) AS cart_count,
  COALESCE(fc.favorite_count, 0) AS favorite_count,
  COALESCE(rc.recently_viewed_count, 0) AS recently_viewed_count,
  COALESCE(ec.event_count, 0) AS event_count,
  COALESCE(ofl.has_profile_link, false) AS has_profile_link,
  COALESCE(ofl.has_customer_link, false) AS has_customer_link
FROM visitors v
LEFT JOIN cart_counts cc ON cc.visitor_id = v.id
LEFT JOIN favorite_counts fc ON fc.visitor_id = v.id
LEFT JOIN recently_viewed_counts rc ON rc.visitor_id = v.id
LEFT JOIN event_counts ec ON ec.visitor_id = v.id
LEFT JOIN ownership_flags ofl ON ofl.visitor_id = v.id
WHERE v.deleted_at IS NULL;
