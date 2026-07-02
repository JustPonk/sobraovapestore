-- Initial seed data for roles, permissions, catalog defaults, payment methods, shipping and settings

INSERT INTO roles (name, slug, type, description, is_system)
VALUES
  ('Administrator', 'administrator', 'administrator', 'Full system access', true),
  ('Employee', 'employee', 'employee', 'Operational backoffice access', true),
  ('Customer', 'customer', 'customer', 'Authenticated customer access', true),
  ('Guest', 'guest', 'guest', 'Anonymous storefront access', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, action, resource, description)
VALUES
  ('profiles.manage', 'manage', 'profiles', 'Manage user profiles'),
  ('roles.manage', 'manage', 'roles', 'Manage roles'),
  ('permissions.manage', 'manage', 'permissions', 'Manage permissions'),
  ('catalog.manage', 'manage', 'catalog', 'Manage catalog tables'),
  ('catalog.read', 'read', 'catalog', 'Read catalog tables'),
  ('inventory.manage', 'manage', 'inventory', 'Manage inventory tables'),
  ('inventory.read', 'read', 'inventory', 'Read inventory tables'),
  ('customers.manage', 'manage', 'customers', 'Manage customer records'),
  ('customers.read', 'read', 'customers', 'Read customer records'),
  ('orders.manage', 'manage', 'orders', 'Manage order lifecycle'),
  ('orders.read', 'read', 'orders', 'Read orders'),
  ('payments.manage', 'manage', 'payments', 'Manage payments and refunds'),
  ('payments.read', 'read', 'payments', 'Read payments'),
  ('shipping.manage', 'manage', 'shipping', 'Manage shipping rules'),
  ('shipping.read', 'read', 'shipping', 'Read shipping rules'),
  ('marketing.manage', 'manage', 'marketing', 'Manage marketing data'),
  ('marketing.read', 'read', 'marketing', 'Read marketing data'),
  ('analytics.read', 'read', 'analytics', 'Read analytics data'),
  ('audit.read', 'read', 'audit', 'Read audit logs'),
  ('settings.manage', 'manage', 'settings', 'Manage settings'),
  ('ai.manage', 'manage', 'ai', 'Manage AI tables'),
  ('ai.read', 'read', 'ai', 'Read AI tables')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'profiles.manage','roles.manage','permissions.manage','catalog.manage','catalog.read','inventory.manage','inventory.read',
  'customers.manage','customers.read','orders.manage','orders.read','payments.manage','payments.read','shipping.manage',
  'shipping.read','marketing.manage','marketing.read','analytics.read','audit.read','settings.manage','ai.manage','ai.read'
)
WHERE r.slug = 'administrator'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'catalog.read','inventory.manage','inventory.read','customers.manage','customers.read','orders.manage','orders.read',
  'payments.manage','payments.read','shipping.manage','shipping.read','marketing.manage','marketing.read','analytics.read',
  'ai.read','settings.manage'
)
WHERE r.slug = 'employee'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('catalog.read','orders.read','customers.read','shipping.read','marketing.read','ai.read')
WHERE r.slug = 'customer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('catalog.read','shipping.read','marketing.read')
WHERE r.slug = 'guest'
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, slug, description, sort_order, is_active)
VALUES
  ('Devices', 'devices', 'Electronic devices and starter kits', 10, true),
  ('Liquids', 'liquids', 'E-liquids and nicotine salts', 20, true),
  ('Accessories', 'accessories', 'Chargers, tanks and general accessories', 30, true),
  ('Coils', 'coils', 'Replacement coils and resistive parts', 40, true),
  ('Pods', 'pods', 'Replacement pod systems and cartridges', 50, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO brands (name, slug, description, is_active)
VALUES
  ('Sobrao', 'sobrao', 'House brand for the Sobrao store', true),
  ('Generic', 'generic', 'Generic fallback catalog brand', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO payment_methods (code, name, provider, method_type, is_active, config)
VALUES
  ('cash', 'Cash', 'internal', 'cash', true, '{}'::jsonb),
  ('bank_transfer', 'Bank Transfer', 'internal', 'bank_transfer', true, '{}'::jsonb),
  ('stripe_card', 'Card via Stripe', 'stripe', 'card', true, '{"capture_mode":"automatic"}'::jsonb),
  ('manual_payment', 'Manual Payment', 'internal', 'offline', true, '{}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO settings (setting_key, setting_value, value_type, setting_group, description, is_public)
VALUES
  ('store_name', '"Sobrao"'::jsonb, 'string', 'store', 'Public store name', true),
  ('support_email', '"support@sobrao.com"'::jsonb, 'string', 'store', 'Public support email', true),
  ('currency_code', '"BRL"'::jsonb, 'string', 'store', 'Default checkout currency', true),
  ('timezone', '"America/Sao_Paulo"'::jsonb, 'string', 'store', 'Default application timezone', true),
  ('low_stock_threshold', '10'::jsonb, 'number', 'inventory', 'Alert threshold for low stock', false),
  ('order_prefix', '"SBR"'::jsonb, 'string', 'orders', 'Prefix used to generate order numbers', false),
  ('enable_guest_checkout', 'true'::jsonb, 'boolean', 'checkout', 'Allows anonymous checkout', true)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO shipping_zones (code, name, description, is_active)
VALUES ('br', 'Brazil', 'Domestic shipping zone for Brazil', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_zone_countries (shipping_zone_id, country_code)
SELECT z.id, 'BR'
FROM shipping_zones z
WHERE z.code = 'br'
ON CONFLICT DO NOTHING;

INSERT INTO shipping_rates (
  shipping_zone_id, code, name, carrier_name, service_level, rate_type, amount, currency_code,
  min_order_amount, max_order_amount, min_weight_grams, max_weight_grams, estimated_days_min, estimated_days_max, is_active, metadata
)
SELECT
  z.id,
  'standard_br',
  'Standard Brazil',
  'internal',
  'standard',
  'flat',
  29.90,
  'BRL',
  0,
  NULL,
  NULL,
  NULL,
  3,
  7,
  true,
  '{}'::jsonb
FROM shipping_zones z
WHERE z.code = 'br'
ON CONFLICT (code) DO NOTHING;
