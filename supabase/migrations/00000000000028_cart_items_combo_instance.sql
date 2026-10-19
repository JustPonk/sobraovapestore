-- SOBRAO VAPE STORE — 28: aislar cada combo agregado al carrito
-- Cada vez que se agrega un combo se crea una instancia independiente
-- (combo_instance_id), de modo que agregar el mismo combo otra vez suma una
-- nueva entrada a la lista en lugar de fusionar cantidades. La cantidad del
-- combo es siempre 1 y no se expone control de aumentador/disminuidor.

alter table public.cart_items
	add column if not exists combo_instance_id uuid;

-- La unicidad pasa a incluir la instancia del combo. Para ítems standalone
-- (combo_id y combo_instance_id nulos) los NULL siguen siendo distintos, por lo
-- que se conserva el comportamiento previo.
alter table public.cart_items
	drop constraint if exists cart_items_cart_id_variant_id_combo_id_key;

alter table public.cart_items
	drop constraint if exists cart_items_cart_id_variant_id_combo_instance_key;

alter table public.cart_items
	add constraint cart_items_cart_id_variant_id_combo_instance_key
		unique (cart_id, variant_id, combo_id, combo_instance_id);

create index if not exists idx_cart_items_combo_instance_id
	on public.cart_items (combo_instance_id);
