-- Supplemental search and JSONB indexes for large-scale usage

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_slug_trgm ON products USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categories_slug_trgm ON categories USING gin (slug gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_brands_name_trgm ON brands USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_brands_slug_trgm ON brands USING gin (slug gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_trgm ON customers USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_settings_value_gin ON settings USING gin (setting_value);
CREATE INDEX IF NOT EXISTS idx_products_metadata_gin ON products USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_customers_metadata_gin ON customers USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_orders_metadata_gin ON orders USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_order_items_product_snapshot_gin ON order_items USING gin (product_snapshot);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_context_gin ON chatbot_conversations USING gin (context);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_metadata_gin ON chatbot_messages USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_context_gin ON ai_recommendations USING gin (context);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_properties_gin ON dashboard_events USING gin (properties);
CREATE INDEX IF NOT EXISTS idx_coupons_metadata_gin ON coupons USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_promotions_metadata_gin ON promotions USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_metadata_gin ON shipping_rates USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_payment_methods_config_gin ON payment_methods USING gin (config);
