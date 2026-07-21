-- ============================================================================
-- SOBRAO VAPE STORE — 08: Clientes
-- ============================================================================

create table public.wishlist (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	created_at timestamptz not null default now(),
	unique (user_id, product_id)
);

create index idx_wishlist_user_id on public.wishlist (user_id);
