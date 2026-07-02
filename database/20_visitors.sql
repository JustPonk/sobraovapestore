-- Visitors domain: anonymous visitors tracked before registration

CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  first_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_activity_type text,
  ip_hash text,
  browser text,
  device_type text,
  operating_system text,
  country_code char(2),
  language text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deleted_at timestamptz,
  CONSTRAINT visitors_country_code_check CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT visitors_last_activity_type_check CHECK (
    last_activity_type IS NULL OR last_activity_type IN ('browse', 'favorite', 'cart', 'checkout', 'login', 'purchase')
  )
);

COMMENT ON TABLE visitors IS 'Anonymous visitor registry used before authentication. It stores the public visitor token plus session metadata.';
COMMENT ON COLUMN visitors.id IS 'Internal surrogate primary key for the anonymous visitor record.';
COMMENT ON COLUMN visitors.visitor_token IS 'Public UUID used by the app cookie to identify the visitor before registration.';
COMMENT ON COLUMN visitors.first_seen_at IS 'UTC timestamp for the first time the visitor was observed.';
COMMENT ON COLUMN visitors.last_seen_at IS 'UTC timestamp for the most recent visit or activity.';
COMMENT ON COLUMN visitors.last_activity_type IS 'Last visitor activity category captured from browsing, cart, checkout, login, favorite, or purchase events.';
COMMENT ON COLUMN visitors.ip_hash IS 'Optional hashed IP for privacy-preserving device/session correlation.';
COMMENT ON COLUMN visitors.browser IS 'Browser family or user agent summary.';
COMMENT ON COLUMN visitors.device_type IS 'Device category such as desktop, mobile, or tablet.';
COMMENT ON COLUMN visitors.operating_system IS 'Detected operating system.';
COMMENT ON COLUMN visitors.country_code IS 'ISO 3166-1 alpha-2 country code when available.';
COMMENT ON COLUMN visitors.language IS 'Detected UI or browser language.';
COMMENT ON COLUMN visitors.referrer IS 'HTTP referrer or landing source.';
COMMENT ON COLUMN visitors.utm_source IS 'Captured UTM source parameter.';
COMMENT ON COLUMN visitors.utm_medium IS 'Captured UTM medium parameter.';
COMMENT ON COLUMN visitors.utm_campaign IS 'Captured UTM campaign parameter.';
COMMENT ON COLUMN visitors.metadata IS 'Free-form JSON for additional anonymous session attributes.';

CREATE TRIGGER visitors_set_updated_at
BEFORE UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_visitors_first_seen_at ON visitors(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen_at ON visitors(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_country_code ON visitors(country_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_last_activity_type ON visitors(last_activity_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_browser ON visitors(browser) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_device_type ON visitors(device_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_operating_system ON visitors(operating_system) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.create_visitor(
  p_ip_hash text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_operating_system text DEFAULT NULL,
  p_country_code char(2) DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS visitors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_visitor visitors;
BEGIN
  INSERT INTO visitors (
    ip_hash, browser, device_type, operating_system, country_code, language,
    referrer, utm_source, utm_medium, utm_campaign, metadata
  )
  VALUES (
    p_ip_hash, p_browser, p_device_type, p_operating_system, p_country_code, p_language,
    p_referrer, p_utm_source, p_utm_medium, p_utm_campaign, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO created_visitor;

  RETURN created_visitor;
END;
$$;

COMMENT ON FUNCTION public.create_visitor(text, text, text, text, char(2), text, text, text, text, text, jsonb) IS 'Creates a new anonymous visitor row and returns the generated visitor_token for cookie storage.';

CREATE OR REPLACE FUNCTION public.sync_visitor_activity(
  p_visitor_id uuid,
  p_activity_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_visitor_id IS NULL OR p_activity_type IS NULL THEN
    RETURN;
  END IF;

  IF current_setting('app.visitor_migration', true) = 'on' THEN
    RETURN;
  END IF;

  UPDATE visitors
  SET last_seen_at = timezone('utc', now()),
      last_activity_type = p_activity_type,
      updated_at = timezone('utc', now())
  WHERE id = p_visitor_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.sync_visitor_activity(uuid, text) IS 'Updates the anonymous visitor heartbeat and last activity type without touching historical rows.';

CREATE OR REPLACE FUNCTION public.map_dashboard_event_activity(p_event_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_event_type, '')))
    WHEN 'browse' THEN 'browse'
    WHEN 'page_view' THEN 'browse'
    WHEN 'product_view' THEN 'browse'
    WHEN 'product_viewed' THEN 'browse'
    WHEN 'search' THEN 'browse'
    WHEN 'favorite' THEN 'favorite'
    WHEN 'favorite_added' THEN 'favorite'
    WHEN 'saved_favorite' THEN 'favorite'
    WHEN 'cart' THEN 'cart'
    WHEN 'add_to_cart' THEN 'cart'
    WHEN 'cart_item_added' THEN 'cart'
    WHEN 'cart_updated' THEN 'cart'
    WHEN 'checkout' THEN 'checkout'
    WHEN 'checkout_started' THEN 'checkout'
    WHEN 'checkout_completed' THEN 'checkout'
    WHEN 'login' THEN 'login'
    WHEN 'sign_in' THEN 'login'
    WHEN 'purchase' THEN 'purchase'
    WHEN 'order_created' THEN 'purchase'
    WHEN 'order_completed' THEN 'purchase'
    WHEN 'payment_captured' THEN 'purchase'
    ELSE 'browse'
  END;
$$;

COMMENT ON FUNCTION public.map_dashboard_event_activity(text) IS 'Maps dashboard event names to the visitor activity categories used by visitors.last_activity_type.';

CREATE OR REPLACE FUNCTION public.trg_sync_visitor_activity_from_carts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.visitor_migration', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM public.sync_visitor_activity(NEW.visitor_id, 'cart');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sync_visitor_activity_from_carts() IS 'Maintains visitor activity when a cart is created or reassigned.';

CREATE OR REPLACE FUNCTION public.trg_sync_visitor_activity_from_cart_items()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_visitor_id uuid;
BEGIN
  IF COALESCE(current_setting('app.visitor_migration', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT c.visitor_id INTO v_visitor_id
  FROM carts c
  WHERE c.id = NEW.cart_id
    AND c.deleted_at IS NULL
  LIMIT 1;

  PERFORM public.sync_visitor_activity(v_visitor_id, 'cart');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sync_visitor_activity_from_cart_items() IS 'Maintains visitor activity when cart items are added or changed.';

CREATE OR REPLACE FUNCTION public.trg_sync_visitor_activity_from_favorites()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.visitor_migration', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM public.sync_visitor_activity(NEW.visitor_id, 'favorite');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sync_visitor_activity_from_favorites() IS 'Maintains visitor activity when a favorite is created or updated.';

CREATE OR REPLACE FUNCTION public.trg_sync_visitor_activity_from_recently_viewed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.visitor_migration', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM public.sync_visitor_activity(NEW.visitor_id, 'browse');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sync_visitor_activity_from_recently_viewed() IS 'Maintains visitor activity when product views are recorded.';

CREATE OR REPLACE FUNCTION public.trg_sync_visitor_activity_from_dashboard_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.visitor_migration', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM public.sync_visitor_activity(NEW.visitor_id, public.map_dashboard_event_activity(NEW.event_type));
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_sync_visitor_activity_from_dashboard_events() IS 'Maintains visitor activity from appended dashboard events without updating historical rows.';

CREATE OR REPLACE FUNCTION public.migrate_visitor_data(
  p_visitor_token uuid,
  p_profile_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_cart record;
  v_favorite record;
  v_recent record;
  v_target_cart_id uuid;
  v_target_favorite_id uuid;
  v_target_recent_id uuid;
BEGIN
  PERFORM set_config('app.visitor_migration', 'on', true);

  SELECT id INTO v_visitor_id
  FROM visitors
  WHERE visitor_token = p_visitor_token
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_visitor_id IS NULL THEN
    RAISE EXCEPTION 'visitor not found for token %', p_visitor_token;
  END IF;

  UPDATE visitors
  SET last_seen_at = v_now,
      updated_at = v_now
  WHERE id = v_visitor_id;

  -- Merge favorites without duplicates. Keep visitor_id on migrated rows for audit.
  FOR v_favorite IN
    SELECT *
    FROM favorites
    WHERE visitor_id = v_visitor_id
      AND deleted_at IS NULL
    ORDER BY created_at, id
  LOOP
    SELECT f.id
    INTO v_target_favorite_id
    FROM favorites f
    WHERE f.deleted_at IS NULL
      AND f.product_variant_id = v_favorite.product_variant_id
      AND (
        (p_profile_id IS NOT NULL AND f.profile_id = p_profile_id)
        OR (p_customer_id IS NOT NULL AND f.customer_id = p_customer_id)
      )
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT 1;

    IF v_target_favorite_id IS NOT NULL THEN
      UPDATE favorites
      SET deleted_at = v_now,
          updated_at = v_now,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_into_favorite_id', v_target_favorite_id::text,
            'merged_from_visitor_id', v_visitor_id::text
          )
      WHERE id = v_favorite.id;
    ELSE
      UPDATE favorites
      SET profile_id = COALESCE(profile_id, p_profile_id),
          customer_id = COALESCE(customer_id, p_customer_id),
          updated_at = v_now
      WHERE id = v_favorite.id;
    END IF;
  END LOOP;

  -- Merge carts into a single active cart.
  SELECT c.id
  INTO v_target_cart_id
  FROM carts c
  WHERE c.deleted_at IS NULL
    AND c.status = 'active'
    AND (
      (p_profile_id IS NOT NULL AND c.profile_id = p_profile_id)
      OR (p_customer_id IS NOT NULL AND c.customer_id = p_customer_id)
    )
  ORDER BY c.updated_at DESC, c.created_at DESC
  LIMIT 1;

  FOR v_cart IN
    SELECT *
    FROM carts
    WHERE visitor_id = v_visitor_id
      AND deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
  LOOP
    IF v_target_cart_id IS NULL THEN
      UPDATE carts
      SET profile_id = COALESCE(profile_id, p_profile_id),
          customer_id = COALESCE(customer_id, p_customer_id),
          updated_at = v_now
      WHERE id = v_cart.id;

      v_target_cart_id := v_cart.id;
    ELSIF v_cart.id <> v_target_cart_id THEN
      INSERT INTO cart_items (
        cart_id, product_id, product_variant_id, quantity, unit_price, compare_at_price, discount_amount, metadata
      )
      SELECT
        v_target_cart_id,
        ci.product_id,
        ci.product_variant_id,
        ci.quantity,
        ci.unit_price,
        ci.compare_at_price,
        ci.discount_amount,
        ci.metadata
      FROM cart_items ci
      WHERE ci.cart_id = v_cart.id
        AND ci.deleted_at IS NULL
      ON CONFLICT (cart_id, product_variant_id) DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        discount_amount = cart_items.discount_amount + EXCLUDED.discount_amount,
        updated_at = v_now;

      UPDATE carts
      SET deleted_at = v_now,
          updated_at = v_now,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_into_cart_id', v_target_cart_id::text,
            'merged_from_visitor_id', v_visitor_id::text
          )
      WHERE id = v_cart.id;
    END IF;
  END LOOP;

  -- Merge recently viewed rows without changing historical views already attached to the profile/customer.
  FOR v_recent IN
    SELECT *
    FROM recently_viewed
    WHERE visitor_id = v_visitor_id
      AND deleted_at IS NULL
    ORDER BY viewed_at DESC, id DESC
  LOOP
    SELECT rv.id
    INTO v_target_recent_id
    FROM recently_viewed rv
    WHERE rv.deleted_at IS NULL
      AND rv.product_variant_id = v_recent.product_variant_id
      AND (
        (p_profile_id IS NOT NULL AND rv.profile_id = p_profile_id)
        OR (p_customer_id IS NOT NULL AND rv.customer_id = p_customer_id)
      )
    ORDER BY rv.viewed_at DESC, rv.created_at DESC, rv.id DESC
    LIMIT 1;

    IF v_target_recent_id IS NOT NULL THEN
      UPDATE recently_viewed
      SET viewed_at = GREATEST(viewed_at, v_recent.viewed_at),
          updated_at = v_now,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_from_visitor_id', v_visitor_id::text
          )
      WHERE id = v_target_recent_id;

      UPDATE recently_viewed
      SET deleted_at = v_now,
          updated_at = v_now,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_into_recently_viewed_id', v_target_recent_id::text,
            'merged_from_visitor_id', v_visitor_id::text
          )
      WHERE id = v_recent.id;
    ELSE
      UPDATE recently_viewed
      SET profile_id = COALESCE(profile_id, p_profile_id),
          customer_id = COALESCE(customer_id, p_customer_id),
          updated_at = v_now
      WHERE id = v_recent.id;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.migrate_visitor_data(uuid, uuid, uuid) IS 'Migrates anonymous visitor-linked rows to a profile and/or customer while keeping visitor_id for audit.';

ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS visitor_id uuid;

ALTER TABLE public.carts
  DROP CONSTRAINT IF EXISTS carts_visitor_fk;

ALTER TABLE public.carts
  ADD CONSTRAINT carts_visitor_fk
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;

COMMENT ON COLUMN carts.visitor_id IS 'Optional foreign key to the anonymous visitor that created the cart.';

CREATE INDEX IF NOT EXISTS idx_carts_visitor_id ON carts(visitor_id);

ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS visitor_id uuid;

ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_visitor_fk;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_visitor_fk
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;

COMMENT ON COLUMN favorites.visitor_id IS 'Optional foreign key to the anonymous visitor who saved the favorite.';

ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_owner_check;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_owner_check
  CHECK ((customer_id IS NOT NULL)::int + (profile_id IS NOT NULL)::int + (visitor_id IS NOT NULL)::int >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS ux_favorites_visitor_variant
ON favorites(visitor_id, product_variant_id)
WHERE visitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_favorites_visitor_id ON favorites(visitor_id);

ALTER TABLE public.recently_viewed
  ADD COLUMN IF NOT EXISTS visitor_id uuid;

ALTER TABLE public.recently_viewed
  DROP CONSTRAINT IF EXISTS recently_viewed_visitor_fk;

ALTER TABLE public.recently_viewed
  ADD CONSTRAINT recently_viewed_visitor_fk
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;

COMMENT ON COLUMN recently_viewed.visitor_id IS 'Optional foreign key to the anonymous visitor who viewed the product.';

ALTER TABLE public.recently_viewed
  DROP CONSTRAINT IF EXISTS recently_viewed_owner_check;

ALTER TABLE public.recently_viewed
  ADD CONSTRAINT recently_viewed_owner_check
  CHECK ((customer_id IS NOT NULL)::int + (profile_id IS NOT NULL)::int + (visitor_id IS NOT NULL)::int >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS ux_recently_viewed_visitor_variant
ON recently_viewed(visitor_id, product_variant_id)
WHERE visitor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_recently_viewed_customer_variant
ON recently_viewed(customer_id, product_variant_id)
WHERE customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_recently_viewed_profile_variant
ON recently_viewed(profile_id, product_variant_id)
WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recently_viewed_visitor_id ON recently_viewed(visitor_id);

ALTER TABLE public.dashboard_events
  ADD COLUMN IF NOT EXISTS visitor_id uuid;

ALTER TABLE public.dashboard_events
  DROP CONSTRAINT IF EXISTS dashboard_events_visitor_fk;

ALTER TABLE public.dashboard_events
  ADD CONSTRAINT dashboard_events_visitor_fk
  FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE SET NULL;

COMMENT ON COLUMN dashboard_events.visitor_id IS 'Optional foreign key to the anonymous visitor that generated the event.';

ALTER TABLE public.dashboard_events
  DROP CONSTRAINT IF EXISTS dashboard_events_identity_check;

ALTER TABLE public.dashboard_events
  ADD CONSTRAINT dashboard_events_identity_check
  CHECK (profile_id IS NOT NULL OR customer_id IS NOT NULL OR visitor_id IS NOT NULL OR anonymous_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_dashboard_events_visitor_id ON dashboard_events(visitor_id);

CREATE TRIGGER carts_sync_visitor_activity
AFTER INSERT OR UPDATE OF visitor_id ON carts
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_visitor_activity_from_carts();

CREATE TRIGGER cart_items_sync_visitor_activity
AFTER INSERT OR UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_visitor_activity_from_cart_items();

CREATE TRIGGER favorites_sync_visitor_activity
AFTER INSERT OR UPDATE OF visitor_id ON favorites
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_visitor_activity_from_favorites();

CREATE TRIGGER recently_viewed_sync_visitor_activity
AFTER INSERT OR UPDATE OF visitor_id ON recently_viewed
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_visitor_activity_from_recently_viewed();

CREATE TRIGGER dashboard_events_sync_visitor_activity
AFTER INSERT ON dashboard_events
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_visitor_activity_from_dashboard_events();
