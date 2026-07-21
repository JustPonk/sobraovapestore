-- ============================================================================
-- SOBRAO VAPE STORE — 06: Ventas
-- ============================================================================

create table public.carts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete cascade,  -- null = guest cart
	session_id text,                                                  -- for guest checkout tracking
	status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_carts_user_id on public.carts (user_id);

create trigger set_carts_updated_at
	before update on public.carts
	for each row execute function public.set_updated_at();

create table public.cart_items (
	id uuid primary key default gen_random_uuid(),
	cart_id uuid not null references public.carts (id) on delete cascade,
	variant_id uuid not null references public.product_variants (id) on delete restrict,
	quantity integer not null check (quantity > 0),
	unit_price numeric(10, 2) not null,   -- snapshot of price at time of adding
	created_at timestamptz not null default now(),
	unique (cart_id, variant_id)
);

create index idx_cart_items_cart_id on public.cart_items (cart_id);

-- Now that carts/orders exist, wire up the nullable FKs left open in
-- stock_reservations (04_inventario.sql).
alter table public.stock_reservations
	add constraint fk_stock_reservations_cart
		foreign key (cart_id) references public.carts (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Órdenes: totales desglosados (subtotal / descuento / IGV / envío / total)
-- para que el reporte contable cuadre sin tener que recalcular después.
-- ---------------------------------------------------------------------------
create table public.orders (
	id uuid primary key default gen_random_uuid(),
	order_number text not null unique,     -- e.g. 'SBR-000123', human-facing
	user_id uuid references public.profiles (id) on delete set null,
	address_id uuid references public.user_addresses (id) on delete set null,
	status text not null default 'pending' check (
		status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
	),
	subtotal numeric(12, 2) not null default 0,
	discount_total numeric(12, 2) not null default 0,
	igv_total numeric(12, 2) not null default 0,
	shipping_total numeric(12, 2) not null default 0,
	total numeric(12, 2) not null default 0,
	currency text not null default 'PEN',
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_orders_user_id on public.orders (user_id);
create index idx_orders_status on public.orders (status);

create trigger set_orders_updated_at
	before update on public.orders
	for each row execute function public.set_updated_at();

alter table public.stock_reservations
	add constraint fk_stock_reservations_order
		foreign key (order_id) references public.orders (id) on delete cascade;

-- Snapshots product_name/sku at time of sale — if the product gets renamed
-- or the variant deleted later, historical orders still read correctly.
create table public.order_items (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders (id) on delete cascade,
	variant_id uuid references public.product_variants (id) on delete set null,
	product_name_snapshot text not null,
	sku_snapshot text not null,
	quantity integer not null check (quantity > 0),
	unit_price numeric(10, 2) not null,
	igv_amount numeric(10, 2) not null default 0,
	subtotal numeric(12, 2) not null
);

create index idx_order_items_order_id on public.order_items (order_id);

create table public.payments (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders (id) on delete cascade,
	method text not null check (method in ('card', 'yape', 'plin', 'transfer', 'cash_on_delivery')),
	provider text,                        -- 'Culqi', 'Mercado Pago', 'Izipay'...
	provider_reference text,
	amount numeric(12, 2) not null check (amount >= 0),
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'refunded')),
	paid_at timestamptz,
	created_at timestamptz not null default now()
);

create index idx_payments_order_id on public.payments (order_id);

-- ---------------------------------------------------------------------------
-- Comprobantes electrónicos (SUNAT) — boleta o factura, separado de `orders`
-- porque su ciclo de vida (emisión, XML, CDR, anulación) es distinto.
-- ---------------------------------------------------------------------------
create table public.invoices (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders (id) on delete restrict,
	document_type text not null check (document_type in ('boleta', 'factura')),
	series text not null,                 -- e.g. 'B001', 'F001'
	correlative integer not null,
	customer_document_type text not null check (customer_document_type in ('DNI', 'RUC')),
	customer_document_number text not null,
	customer_name text not null,
	issue_date date not null default current_date,
	sunat_status text not null default 'pending' check (sunat_status in ('pending', 'accepted', 'rejected', 'voided')),
	sunat_hash text,
	xml_url text,
	cdr_url text,
	pdf_url text,
	created_at timestamptz not null default now(),
	unique (series, correlative)
);

create index idx_invoices_order_id on public.invoices (order_id);

-- ---------------------------------------------------------------------------
-- Envíos (couriers peruanos: Olva, Shalom, Chazki, etc.)
-- ---------------------------------------------------------------------------
create table public.shipping_methods (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	courier text,
	base_cost numeric(10, 2) not null default 0,
	estimated_days smallint,
	is_active boolean not null default true
);

create table public.shipments (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders (id) on delete cascade,
	shipping_method_id uuid references public.shipping_methods (id) on delete set null,
	tracking_number text,
	status text not null default 'pending' check (status in ('pending', 'shipped', 'in_transit', 'delivered', 'failed')),
	shipped_at timestamptz,
	delivered_at timestamptz,
	created_at timestamptz not null default now()
);

create index idx_shipments_order_id on public.shipments (order_id);
