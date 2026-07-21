-- ============================================================================
-- SOBRAO VAPE STORE — 07: Promociones
-- ============================================================================

create table public.promotions (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	description text,
	discount_type text not null check (discount_type in ('percentage', 'fixed')),
	discount_value numeric(10, 2) not null check (discount_value >= 0),
	starts_at timestamptz not null,
	ends_at timestamptz not null,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	check (ends_at > starts_at)
);

create index idx_promotions_active_window on public.promotions (is_active, starts_at, ends_at);

create table public.promotion_products (
	promotion_id uuid not null references public.promotions (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete cascade,
	primary key (promotion_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Cupones: códigos que el cliente ingresa manualmente, con límites de uso.
-- Separado de `promotions` (que son descuentos automáticos por producto).
-- ---------------------------------------------------------------------------
create table public.coupons (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	promotion_id uuid references public.promotions (id) on delete set null,
	discount_type text not null check (discount_type in ('percentage', 'fixed')),
	discount_value numeric(10, 2) not null check (discount_value >= 0),
	max_uses integer,                     -- null = unlimited
	uses_count integer not null default 0,
	max_uses_per_user smallint not null default 1,
	starts_at timestamptz not null default now(),
	ends_at timestamptz,
	is_active boolean not null default true
);

create table public.coupon_redemptions (
	id uuid primary key default gen_random_uuid(),
	coupon_id uuid not null references public.coupons (id) on delete cascade,
	user_id uuid references public.profiles (id) on delete set null,
	order_id uuid not null references public.orders (id) on delete cascade,
	redeemed_at timestamptz not null default now()
);

create index idx_coupon_redemptions_coupon_id on public.coupon_redemptions (coupon_id);
