-- Actualiza la cuenta Yape default con los datos reales del titular Sobrao Vape Store.
-- qr_image_url se cargará via upload desde el panel /ajustes o en una migración posterior con la URL pública del storage.
INSERT INTO settings (key, value)
VALUES (
  'yape_account',
  jsonb_build_object(
    'phone',          '960714471',
    'holder_name',    'Sobrao Vape Store',
    'qr_image_url',   ''
  )
)
ON CONFLICT (key) DO UPDATE SET
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(settings.value, '{}'::jsonb),
        '{phone}',        to_jsonb('960714471'::text),
        true
      ),
      '{holder_name}',  to_jsonb('Sobrao Vape Store'::text),
      true
    ),
    '{qr_image_url}',
    CASE WHEN COALESCE(settings.value->>'qr_image_url', '') = ''
         THEN to_jsonb(''::text)
         ELSE to_jsonb(settings.value->>'qr_image_url')
    END,
    true
  );
