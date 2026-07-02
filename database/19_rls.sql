-- Row Level Security for Supabase roles: administrator, employee, customer and guest

CREATE OR REPLACE FUNCTION public.jwt_claim(claim_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> claim_name;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT p.id
  FROM profiles p
  WHERE p.auth_uid = auth.uid()
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT c.id
  FROM customers c
  WHERE c.profile_id = public.current_profile_id()
    AND c.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_visitor_token()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(public.jwt_claim('visitor_token'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_visitor_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT v.id
  FROM visitors v
  WHERE v.visitor_token = public.current_visitor_token()
    AND v.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_role_type()
RETURNS role_type
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN 'guest'::role_type
    WHEN EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN profiles p ON p.id = ur.profile_id
      WHERE p.auth_uid = auth.uid()
        AND p.deleted_at IS NULL
        AND r.type = 'administrator'
    ) THEN 'administrator'::role_type
    WHEN EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN profiles p ON p.id = ur.profile_id
      WHERE p.auth_uid = auth.uid()
        AND p.deleted_at IS NULL
        AND r.type = 'employee'
    ) THEN 'employee'::role_type
    WHEN EXISTS (
      SELECT 1
      FROM customers c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.auth_uid = auth.uid()
        AND p.deleted_at IS NULL
        AND c.deleted_at IS NULL
    ) THEN 'customer'::role_type
    ELSE 'guest'::role_type
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_backoffice()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_role_type() IN ('administrator', 'employee');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_admin_only()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_role_type() = 'administrator';
$$;

-- Anonymous visitor ownership
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS visitors_select_own ON public.visitors;
CREATE POLICY visitors_select_own ON public.visitors
FOR SELECT USING (visitor_token = public.current_visitor_token() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS visitors_insert_own ON public.visitors;
CREATE POLICY visitors_insert_own ON public.visitors
FOR INSERT WITH CHECK (visitor_token = public.current_visitor_token() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS visitors_update_own ON public.visitors;
CREATE POLICY visitors_update_own ON public.visitors
FOR UPDATE USING (visitor_token = public.current_visitor_token() OR public.can_manage_backoffice())
WITH CHECK (visitor_token = public.current_visitor_token() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS visitors_delete_backoffice ON public.visitors;
CREATE POLICY visitors_delete_backoffice ON public.visitors
FOR DELETE USING (public.can_manage_backoffice());

-- Public read tables: everyone can read, write is backoffice-only
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'categories', 'brands', 'products', 'product_variants', 'product_images',
    'product_attributes', 'product_attribute_values', 'product_prices', 'shipping_zones',
    'shipping_rates', 'payment_methods', 'coupons', 'promotions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_all', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (deleted_at IS NULL)', table_name || '_select_all', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_write', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.can_manage_backoffice())', table_name || '_backoffice_write', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice())', table_name || '_backoffice_update', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_delete', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (public.can_manage_backoffice())', table_name || '_backoffice_delete', table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['product_categories', 'shipping_zone_countries', 'promotion_products', 'promotion_categories'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_all', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', table_name || '_select_all', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_write', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.can_manage_backoffice())', table_name || '_backoffice_write', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_update', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice())', table_name || '_backoffice_update', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_delete', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (public.can_manage_backoffice())', table_name || '_backoffice_delete', table_name);
  END LOOP;
END $$;

-- Backoffice-only operational tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'roles', 'permissions', 'role_permissions', 'user_roles', 'warehouses', 'suppliers', 'stock',
    'inventory_movements', 'purchase_orders', 'purchase_order_items', 'customer_tags',
    'customer_tag_assignments', 'payments', 'refunds', 'audit_logs', 'activity_logs', 'kpi_daily'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_backoffice_all', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice())', table_name || '_backoffice_all', table_name);
  END LOOP;
END $$;

-- Settings are readable to the public only when flagged as public
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_public_read ON public.settings;
CREATE POLICY settings_public_read ON public.settings
FOR SELECT USING (is_public OR public.can_manage_backoffice());
DROP POLICY IF EXISTS settings_backoffice_write ON public.settings;
CREATE POLICY settings_backoffice_write ON public.settings
FOR INSERT WITH CHECK (public.can_manage_backoffice());
DROP POLICY IF EXISTS settings_backoffice_update ON public.settings;
CREATE POLICY settings_backoffice_update ON public.settings
FOR UPDATE USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice());
DROP POLICY IF EXISTS settings_backoffice_delete ON public.settings;
CREATE POLICY settings_backoffice_delete ON public.settings
FOR DELETE USING (public.can_manage_backoffice());

-- Profile ownership
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT USING (id = public.current_profile_id() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
FOR INSERT WITH CHECK (id = public.current_profile_id() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE USING (id = public.current_profile_id() OR public.can_manage_backoffice())
WITH CHECK (id = public.current_profile_id() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS profiles_delete_backoffice ON public.profiles;
CREATE POLICY profiles_delete_backoffice ON public.profiles
FOR DELETE USING (public.can_manage_backoffice());

-- Customer ownership and CRM access
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_select_own ON public.customers;
CREATE POLICY customers_select_own ON public.customers
FOR SELECT USING (id = public.current_customer_id() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS customers_update_own ON public.customers;
CREATE POLICY customers_update_own ON public.customers
FOR UPDATE USING (id = public.current_customer_id() OR public.can_manage_backoffice())
WITH CHECK (id = public.current_customer_id() OR public.can_manage_backoffice());
DROP POLICY IF EXISTS customers_insert_backoffice ON public.customers;
CREATE POLICY customers_insert_backoffice ON public.customers
FOR INSERT WITH CHECK (public.can_manage_backoffice());
DROP POLICY IF EXISTS customers_delete_backoffice ON public.customers;
CREATE POLICY customers_delete_backoffice ON public.customers
FOR DELETE USING (public.can_manage_backoffice());

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_addresses_owner_select ON public.customer_addresses;
CREATE POLICY customer_addresses_owner_select ON public.customer_addresses
FOR SELECT USING (
  EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_addresses.customer_id AND (c.id = public.current_customer_id() OR public.can_manage_backoffice()))
);
DROP POLICY IF EXISTS customer_addresses_owner_write ON public.customer_addresses;
CREATE POLICY customer_addresses_owner_write ON public.customer_addresses
FOR ALL USING (
  EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_addresses.customer_id AND (c.id = public.current_customer_id() OR public.can_manage_backoffice()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_addresses.customer_id AND (c.id = public.current_customer_id() OR public.can_manage_backoffice()))
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_notes_backoffice_all ON public.customer_notes;
CREATE POLICY customer_notes_backoffice_all ON public.customer_notes
FOR ALL USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice());

-- Cart and order ownership; cart_token supports guest carts via JWT claim
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS carts_owner_all ON public.carts;
CREATE POLICY carts_owner_all ON public.carts
FOR ALL USING (
  cart_token = public.jwt_claim('cart_token')
  OR profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR visitor_id = public.current_visitor_id()
  OR public.can_manage_backoffice()
) WITH CHECK (
  cart_token = public.jwt_claim('cart_token')
  OR profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR visitor_id = public.current_visitor_id()
  OR public.can_manage_backoffice()
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cart_items_owner_all ON public.cart_items;
CREATE POLICY cart_items_owner_all ON public.cart_items
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM carts c
    WHERE c.id = cart_items.cart_id
      AND (
        c.cart_token = public.jwt_claim('cart_token')
        OR c.profile_id = public.current_profile_id()
        OR c.customer_id = public.current_customer_id()
        OR c.visitor_id = public.current_visitor_id()
        OR public.can_manage_backoffice()
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM carts c
    WHERE c.id = cart_items.cart_id
      AND (
        c.cart_token = public.jwt_claim('cart_token')
        OR c.profile_id = public.current_profile_id()
        OR c.customer_id = public.current_customer_id()
        OR c.visitor_id = public.current_visitor_id()
        OR public.can_manage_backoffice()
      )
  )
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_owner_select ON public.orders;
CREATE POLICY orders_owner_select ON public.orders
FOR SELECT USING (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
);
DROP POLICY IF EXISTS orders_owner_write ON public.orders;
CREATE POLICY orders_owner_write ON public.orders
FOR INSERT WITH CHECK (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
);
DROP POLICY IF EXISTS orders_owner_update ON public.orders;
CREATE POLICY orders_owner_update ON public.orders
FOR UPDATE USING (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
) WITH CHECK (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
);
DROP POLICY IF EXISTS orders_owner_delete ON public.orders;
CREATE POLICY orders_owner_delete ON public.orders
FOR DELETE USING (public.can_manage_backoffice());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_items_owner_select ON public.order_items;
CREATE POLICY order_items_owner_select ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND (o.profile_id = public.current_profile_id() OR o.customer_id = public.current_customer_id() OR public.can_manage_backoffice())
  )
);
DROP POLICY IF EXISTS order_items_owner_write ON public.order_items;
CREATE POLICY order_items_owner_write ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND (o.profile_id = public.current_profile_id() OR o.customer_id = public.current_customer_id() OR public.can_manage_backoffice())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND (o.profile_id = public.current_profile_id() OR o.customer_id = public.current_customer_id() OR public.can_manage_backoffice())
  )
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_status_history_owner_select ON public.order_status_history;
CREATE POLICY order_status_history_owner_select ON public.order_status_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id
      AND (o.profile_id = public.current_profile_id() OR o.customer_id = public.current_customer_id() OR public.can_manage_backoffice())
  )
);
DROP POLICY IF EXISTS order_status_history_backoffice_write ON public.order_status_history;
CREATE POLICY order_status_history_backoffice_write ON public.order_status_history
FOR INSERT WITH CHECK (public.can_manage_backoffice());

-- Marketing ownership
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS favorites_owner_all ON public.favorites;
CREATE POLICY favorites_owner_all ON public.favorites
FOR ALL USING (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR visitor_id = public.current_visitor_id()
  OR public.can_manage_backoffice()
) WITH CHECK (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR visitor_id = public.current_visitor_id()
  OR public.can_manage_backoffice()
);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recently_viewed_owner_all ON public.recently_viewed;
CREATE POLICY recently_viewed_owner_all ON public.recently_viewed
FOR ALL USING (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR visitor_id = public.current_visitor_id()
  OR public.can_manage_backoffice()
) WITH CHECK (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR visitor_id = public.current_visitor_id()
  OR public.can_manage_backoffice()
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS newsletters_public_insert ON public.newsletters;
CREATE POLICY newsletters_public_insert ON public.newsletters
FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS newsletters_owner_select ON public.newsletters;
CREATE POLICY newsletters_owner_select ON public.newsletters
FOR SELECT USING (
  email = (SELECT email FROM profiles WHERE id = public.current_profile_id())
  OR public.can_manage_backoffice()
);
DROP POLICY IF EXISTS newsletters_owner_update ON public.newsletters;
CREATE POLICY newsletters_owner_update ON public.newsletters
FOR UPDATE USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice());

-- AI and telemetry
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chatbot_conversations_owner_all ON public.chatbot_conversations;
CREATE POLICY chatbot_conversations_owner_all ON public.chatbot_conversations
FOR ALL USING (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
) WITH CHECK (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chatbot_messages_owner_select ON public.chatbot_messages;
CREATE POLICY chatbot_messages_owner_select ON public.chatbot_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chatbot_conversations cc
    WHERE cc.id = chatbot_messages.conversation_id
      AND (cc.profile_id = public.current_profile_id() OR cc.customer_id = public.current_customer_id() OR public.can_manage_backoffice())
  )
);
DROP POLICY IF EXISTS chatbot_messages_backoffice_write ON public.chatbot_messages;
CREATE POLICY chatbot_messages_backoffice_write ON public.chatbot_messages
FOR ALL USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice());

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_recommendations_owner_all ON public.ai_recommendations;
CREATE POLICY ai_recommendations_owner_all ON public.ai_recommendations
FOR ALL USING (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
) WITH CHECK (
  profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR public.can_manage_backoffice()
);

ALTER TABLE public.dashboard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dashboard_events_public_insert ON public.dashboard_events;
CREATE POLICY dashboard_events_public_insert ON public.dashboard_events
FOR INSERT WITH CHECK (
  visitor_id = public.current_visitor_id()
  OR profile_id = public.current_profile_id()
  OR customer_id = public.current_customer_id()
  OR (visitor_id IS NULL AND anonymous_id IS NOT NULL)
  OR public.can_manage_backoffice()
);
DROP POLICY IF EXISTS dashboard_events_backoffice_select ON public.dashboard_events;
CREATE POLICY dashboard_events_backoffice_select ON public.dashboard_events
FOR SELECT USING (public.can_manage_backoffice());

-- Operational reports and compliance data are backoffice-only
ALTER TABLE public.kpi_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_daily FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpi_daily_backoffice_all ON public.kpi_daily;
CREATE POLICY kpi_daily_backoffice_all ON public.kpi_daily
FOR ALL USING (public.can_manage_backoffice()) WITH CHECK (public.can_manage_backoffice());
