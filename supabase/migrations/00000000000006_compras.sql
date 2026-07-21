-- ============================================================================
-- SOBRAO VAPE STORE — 05: Compras
-- ============================================================================

create table public.suppliers (
	id uuid primary key default gen_random_uuid(),
	business_name text not null,
	ruc text unique,                     -- RUC peruano del proveedor
	contact_name text,
	phone text,
	email text,
	address text,
	is_active boolean not null default true,
	created_at timestamptz not null default now()
);

create table public.supplier_products (
	id uuid primary key default gen_random_uuid(),
	supplier_id uuid not null references public.suppliers (id) on delete cascade,
	variant_id uuid not null references public.product_variants (id) on delete cascade,
	supplier_sku text,
	cost_price numeric(10, 2) not null check (cost_price >= 0),
	lead_time_days smallint,
	unique (supplier_id, variant_id)
);

create table public.purchase_orders (
	id uuid primary key default gen_random_uuid(),
	supplier_id uuid not null references public.suppliers (id) on delete restrict,
	warehouse_id uuid not null references public.warehouses (id) on delete restrict,
	status text not null default 'draft' check (status in ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
	order_date date not null default current_date,
	expected_date date,
	total_amount numeric(12, 2) not null default 0,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_purchase_orders_supplier_id on public.purchase_orders (supplier_id);

create trigger set_purchase_orders_updated_at
	before update on public.purchase_orders
	for each row execute function public.set_updated_at();

create table public.purchase_order_items (
	id uuid primary key default gen_random_uuid(),
	purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
	variant_id uuid not null references public.product_variants (id) on delete restrict,
	quantity integer not null check (quantity > 0),
	unit_cost numeric(10, 2) not null check (unit_cost >= 0),
	subtotal numeric(12, 2) generated always as (quantity * unit_cost) stored
);

create index idx_po_items_purchase_order_id on public.purchase_order_items (purchase_order_id);

create table public.purchase_receipts (
	id uuid primary key default gen_random_uuid(),
	purchase_order_id uuid not null references public.purchase_orders (id) on delete restrict,
	received_date date not null default current_date,
	received_by uuid references public.profiles (id) on delete set null,
	note text,
	created_at timestamptz not null default now()
);

-- Line-level detail of what was actually received in THIS receipt event —
-- needed because a purchase order can arrive in multiple partial shipments.
create table public.purchase_receipt_items (
	id uuid primary key default gen_random_uuid(),
	purchase_receipt_id uuid not null references public.purchase_receipts (id) on delete cascade,
	purchase_order_item_id uuid not null references public.purchase_order_items (id) on delete restrict,
	quantity_received integer not null check (quantity_received > 0)
);

create index idx_receipt_items_receipt_id on public.purchase_receipt_items (purchase_receipt_id);
