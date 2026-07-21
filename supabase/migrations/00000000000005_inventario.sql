-- ============================================================================
-- SOBRAO VAPE STORE — 04: Inventario
-- ============================================================================

create table public.warehouses (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	address text,
	is_active boolean not null default true,
	created_at timestamptz not null default now()
);

-- `quantity` = stock físico total. `reserved_quantity` = apartado por carritos
-- u órdenes pendientes de pago. Disponible para venta = quantity - reserved.
create table public.inventory (
	id uuid primary key default gen_random_uuid(),
	variant_id uuid not null references public.product_variants (id) on delete cascade,
	warehouse_id uuid not null references public.warehouses (id) on delete cascade,
	quantity integer not null default 0 check (quantity >= 0),
	reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
	updated_at timestamptz not null default now(),
	unique (variant_id, warehouse_id)
);

create index idx_inventory_variant_id on public.inventory (variant_id);
create index idx_inventory_warehouse_id on public.inventory (warehouse_id);

create trigger set_inventory_updated_at
	before update on public.inventory
	for each row execute function public.set_updated_at();

-- Full ledger of every stock change, so `inventory.quantity` is always
-- reconstructable/auditable from history.
create table public.inventory_movements (
	id uuid primary key default gen_random_uuid(),
	inventory_id uuid not null references public.inventory (id) on delete cascade,
	movement_type text not null check (movement_type in ('purchase_in', 'sale_out', 'adjustment', 'return_in', 'transfer_in', 'transfer_out')),
	quantity integer not null,           -- positive or negative delta
	reference_type text,                 -- 'purchase_receipt', 'order', 'manual'
	reference_id uuid,
	note text,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create index idx_inventory_movements_inventory_id on public.inventory_movements (inventory_id);
create index idx_inventory_movements_reference on public.inventory_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- Reservas temporales de stock (carrito activo / orden pendiente de pago).
-- Sin esto, dos compradores simultáneos pueden agotar el mismo stock antes
-- de que el pago se confirme.
-- ---------------------------------------------------------------------------
create table public.stock_reservations (
	id uuid primary key default gen_random_uuid(),
	inventory_id uuid not null references public.inventory (id) on delete cascade,
	cart_id uuid,                        -- nullable FK, added once carts exists (see 06_ventas)
	order_id uuid,                       -- nullable FK, added once orders exists (see 06_ventas)
	quantity integer not null check (quantity > 0),
	status text not null default 'active' check (status in ('active', 'released', 'consumed')),
	expires_at timestamptz not null default (now() + interval '30 minutes'),
	created_at timestamptz not null default now()
);

create index idx_stock_reservations_inventory_id on public.stock_reservations (inventory_id);
create index idx_stock_reservations_status_expires on public.stock_reservations (status, expires_at);
