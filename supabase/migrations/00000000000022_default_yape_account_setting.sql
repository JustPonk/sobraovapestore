insert into public.settings (key, value, description)
values (
  'yape_account',
  jsonb_build_object('phone', '', 'holder_name', '', 'qr_image_url', ''),
  'Cuenta Yape manual (teléfono, titular y URL del código QR) para checkout storefront'
)
on conflict (key) do nothing;
