alter table public.payments add column if not exists proof_url text;

create unique index if not exists uniq_payments_provider_reference
  on public.payments (provider_reference)
  where provider_reference is not null;
