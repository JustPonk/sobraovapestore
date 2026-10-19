-- ============================================================================
-- SOBRAO VAPE STORE — 27: cart_items con rastreo de combos
-- Permite agrupar las variantes de un combo en el carrito y mostrarlas
-- como una sola unidad con su detalle de componentes.
-- ============================================================================

alter table public.cart_items
	add column if not exists combo_id uuid references public.combos (id) on delete set null,
	add column if not exists combo_name text;

-- La misma variante puede aparecer como ítem standalone (combo_id null)
-- y dentro de uno o más combos. Postgres trata NULL como distinto en
-- constraints únicos, así que múltiples filas con combo_id null son válidas.
alter table public.cart_items
	drop constraint if exists cart_items_cart_id_variant_id_key;

alter table public.cart_items
	add constraint cart_items_cart_id_variant_id_combo_id_key
		unique (cart_id, variant_id, combo_id);

create index if not exists idx_cart_items_combo_id on public.cart_items (combo_id);
