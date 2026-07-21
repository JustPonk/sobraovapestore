-- ============================================================================
-- SOBRAO VAPE STORE — 13: Row Level Security
-- ============================================================================
-- Supabase exposes every table directly to the client via its API. Without
-- RLS, ANY table (orders, payments, addresses...) is either fully open or
-- fully blocked depending on your API key type. These policies are what
-- makes it safe to call these tables straight from the frontend.
--
-- Pattern used throughout:
--   - Public catalog data (products, categories, brands...) → readable by
--     everyone, writable only by staff.
--   - Personal data (addresses, orders, cart, wishlist...) → owner-only,
--     plus staff override where staff legitimately need visibility.
--   - Internal operational data (inventory, purchases, finance, audit) →
--     staff-only, no public access at all.

-- ---------------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff" on public.profiles
	for select using (id = auth.uid() or public.current_user_is_staff());

create policy "profiles_update_own" on public.profiles
	for update using (id = auth.uid());

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy "roles_select_staff" on public.roles for select using (public.current_user_is_staff());
create policy "permissions_select_staff" on public.permissions for select using (public.current_user_is_staff());
create policy "role_permissions_select_staff" on public.role_permissions for select using (public.current_user_is_staff());
create policy "user_roles_select_own_or_staff" on public.user_roles
	for select using (user_id = auth.uid() or public.current_user_is_staff());
create policy "user_roles_write_admin" on public.user_roles
	for all using (public.current_user_has_role('admin')) with check (public.current_user_has_role('admin'));

alter table public.user_addresses enable row level security;

create policy "user_addresses_owner_full_access" on public.user_addresses
	for all using (user_id = auth.uid() or public.current_user_is_staff())
	with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Catálogo — público de lectura, staff para escritura
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.attribute_types enable row level security;
alter table public.product_variant_attributes enable row level security;
alter table public.product_variant_images enable row level security;
alter table public.product_tags enable row level security;
alter table public.product_tag_map enable row level security;

create policy "categories_public_read" on public.categories for select using (true);
create policy "categories_staff_write" on public.categories for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "brands_public_read" on public.brands for select using (true);
create policy "brands_staff_write" on public.brands for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "products_public_read" on public.products for select using (is_active or public.current_user_is_staff());
create policy "products_staff_write" on public.products for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "variants_public_read" on public.product_variants for select using (is_active or public.current_user_is_staff());
create policy "variants_staff_write" on public.product_variants for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "attribute_types_public_read" on public.attribute_types for select using (true);
create policy "attribute_types_staff_write" on public.attribute_types for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "variant_attrs_public_read" on public.product_variant_attributes for select using (true);
create policy "variant_attrs_staff_write" on public.product_variant_attributes for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "variant_images_public_read" on public.product_variant_images for select using (true);
create policy "variant_images_staff_write" on public.product_variant_images for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "tags_public_read" on public.product_tags for select using (true);
create policy "tags_staff_write" on public.product_tags for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "tag_map_public_read" on public.product_tag_map for select using (true);
create policy "tag_map_staff_write" on public.product_tag_map for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

-- Reviews: anyone can read approved reviews; a user can insert/edit their own
-- (pending approval); staff can moderate (approve/reject/delete any).
alter table public.product_reviews enable row level security;

create policy "reviews_public_read_approved" on public.product_reviews
	for select using (is_approved or user_id = auth.uid() or public.current_user_is_staff());
create policy "reviews_owner_insert" on public.product_reviews
	for insert with check (user_id = auth.uid());
create policy "reviews_owner_update" on public.product_reviews
	for update using (user_id = auth.uid() or public.current_user_is_staff());
create policy "reviews_staff_delete" on public.product_reviews
	for delete using (user_id = auth.uid() or public.current_user_is_staff());

-- ---------------------------------------------------------------------------
-- Inventario / Compras / Finanzas / Administración — staff-only, no acceso
-- público en absoluto.
-- ---------------------------------------------------------------------------
alter table public.warehouses enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_items enable row level security;
alter table public.investors enable row level security;
alter table public.investments enable row level security;
alter table public.expenses enable row level security;
alter table public.employees enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

do $$
declare
	staff_only_tables text[] := array[
		'warehouses', 'inventory', 'inventory_movements', 'stock_reservations',
		'suppliers', 'supplier_products', 'purchase_orders', 'purchase_order_items',
		'purchase_receipts', 'purchase_receipt_items', 'investors', 'investments',
		'expenses', 'employees', 'audit_logs', 'settings'
	];
	t text;
begin
	foreach t in array staff_only_tables loop
		execute format(
			'create policy "%s_staff_only" on public.%I for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());',
			t, t
		);
	end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ventas — el dueño ve/gestiona lo suyo; staff ve todo.
-- ---------------------------------------------------------------------------
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipments enable row level security;

create policy "carts_owner_full_access" on public.carts
	for all using (user_id = auth.uid() or public.current_user_is_staff())
	with check (user_id = auth.uid() or user_id is null);

create policy "cart_items_owner_full_access" on public.cart_items
	for all using (
		exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.current_user_is_staff()))
	)
	with check (
		exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or c.user_id is null))
	);

create policy "orders_owner_read" on public.orders
	for select using (user_id = auth.uid() or public.current_user_is_staff());
create policy "orders_owner_insert" on public.orders
	for insert with check (user_id = auth.uid());
create policy "orders_staff_update" on public.orders
	for update using (public.current_user_is_staff());

create policy "order_items_owner_read" on public.order_items
	for select using (
		exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.current_user_is_staff()))
	);
create policy "order_items_staff_write" on public.order_items
	for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "payments_owner_read" on public.payments
	for select using (
		exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.current_user_is_staff()))
	);
create policy "payments_staff_write" on public.payments
	for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "invoices_owner_read" on public.invoices
	for select using (
		exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.current_user_is_staff()))
	);
create policy "invoices_staff_write" on public.invoices
	for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "shipping_methods_public_read" on public.shipping_methods for select using (is_active);
create policy "shipping_methods_staff_write" on public.shipping_methods for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "shipments_owner_read" on public.shipments
	for select using (
		exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.current_user_is_staff()))
	);
create policy "shipments_staff_write" on public.shipments
	for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

-- ---------------------------------------------------------------------------
-- Promociones / Cupones — catálogo público de lectura, staff escribe
-- ---------------------------------------------------------------------------
alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "promotions_public_read_active" on public.promotions for select using (is_active or public.current_user_is_staff());
create policy "promotions_staff_write" on public.promotions for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "promotion_products_public_read" on public.promotion_products for select using (true);
create policy "promotion_products_staff_write" on public.promotion_products for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

-- Coupons: don't expose the full row (uses_count, etc.) to just anyone by
-- default — only staff list them; validating a code at checkout should go
-- through a server-side function/RPC rather than a direct table select.
create policy "coupons_staff_only" on public.coupons for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "coupon_redemptions_owner_read" on public.coupon_redemptions
	for select using (user_id = auth.uid() or public.current_user_is_staff());
create policy "coupon_redemptions_staff_write" on public.coupon_redemptions
	for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

-- ---------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------
alter table public.wishlist enable row level security;

create policy "wishlist_owner_full_access" on public.wishlist
	for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Analítica — inserción abierta (para trackear anónimos/guests), lectura
-- solo para staff (son datos operativos, no de cara al público).
-- ---------------------------------------------------------------------------
alter table public.product_views enable row level security;
alter table public.searches enable row level security;
alter table public.user_events enable row level security;
alter table public.page_views enable row level security;

create policy "product_views_insert_anyone" on public.product_views for insert with check (true);
create policy "product_views_select_staff" on public.product_views for select using (public.current_user_is_staff());

create policy "searches_insert_anyone" on public.searches for insert with check (true);
create policy "searches_select_staff" on public.searches for select using (public.current_user_is_staff());

create policy "user_events_insert_anyone" on public.user_events for insert with check (true);
create policy "user_events_select_staff" on public.user_events for select using (public.current_user_is_staff());

create policy "page_views_insert_anyone" on public.page_views for insert with check (true);
create policy "page_views_select_staff" on public.page_views for select using (public.current_user_is_staff());

-- ---------------------------------------------------------------------------
-- Notificaciones
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

create policy "notifications_read_targeted_or_staff" on public.notifications
	for select using (
		target_user_id = auth.uid()
		or target_role_id in (select role_id from public.user_roles where user_id = auth.uid())
		or (target_user_id is null and target_role_id is null)  -- broadcast to everyone
		or public.current_user_is_staff()
	);
create policy "notifications_staff_write" on public.notifications
	for all using (public.current_user_is_staff()) with check (public.current_user_is_staff());

create policy "notification_reads_owner_full_access" on public.notification_reads
	for all using (user_id = auth.uid()) with check (user_id = auth.uid());
