-- Utility functions and triggers

-- Update `updated_at` on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Generic trigger to set updated_at to now() in UTC';

-- Prevent accidental hard deletes: soft-delete helper (usage optional per-table)
CREATE OR REPLACE FUNCTION public.soft_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE format('UPDATE %I.%I SET deleted_at = timezone(''utc'', now()) WHERE id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
    USING OLD.id;
    RETURN NULL; -- prevent actual delete
  END IF;
  RETURN NULL;
END;
$$;

-- Note: the generic soft_delete uses dynamic SQL; prefer table-specific implementations
