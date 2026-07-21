-- ============================================================================
-- SOBRAO VAPE STORE — 03: Catálogo
-- ============================================================================

create table public.categories (
	id uuid primary key default gen_random_uuid(),
	parent_id uuid references public.categories (id) on delete set null,
	name text not null,
	slug text not null unique,
	description text,
	image_url text,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_categories_parent_id on public.categories (parent_id);

create trigger set_categories_updated_at
	before update on public.categories
	for each row execute function public.set_updated_at();

create table public.brands (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	slug text not null unique,
	logo_url text,
	is_active boolean not null default true,
	created_at timestamptz not null default now()
);

create table public.products (
	id uuid primary key default gen_random_uuid(),
	category_id uuid references public.categories (id) on delete set null,
	brand_id uuid references public.brands (id) on delete set null,
	name text not null,
	slug text not null unique,
	description text,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_products_category_id on public.products (category_id);
create index idx_products_brand_id on public.products (brand_id);
-- Fuzzy/ILIKE search on product name (used by the `searches` analytics flow
-- and by the storefront search bar).
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);

create trigger set_products_updated_at
	before update on public.products
	for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Variantes: SKU real, precio, stock a nivel de variante (no de producto)
-- ---------------------------------------------------------------------------
create table public.product_variants (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products (id) on delete cascade,
	sku text not null unique,
	price numeric(10, 2) not null check (price >= 0),
	compare_at_price numeric(10, 2) check (compare_at_price >= 0),
	-- Whether `price` already includes Peru's 18% IGV, or is a base price
	-- that IGV gets added on top of at checkout. Pick one convention and
	-- keep it consistent store-wide.
	price_includes_igv boolean not null default true,
	low_stock_threshold integer not null default 5,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_product_variants_product_id on public.product_variants (product_id);

create trigger set_product_variants_updated_at
	before update on public.product_variants
	for each row execute function public.set_updated_at();

-- Flexible key/value attributes (Sabor, Nicotina, Capacidad, Color...)
-- instead of fixed columns, since vape products vary a lot per category.
create table public.attribute_types (
	id smallserial primary key,
	name text not null unique          -- 'Sabor', 'Nicotina (mg)', 'Capacidad (ml)'
);

create table public.product_variant_attributes (
	id uuid primary key default gen_random_uuid(),
	variant_id uuid not null references public.product_variants (id) on delete cascade,
	attribute_type_id smallint not null references public.attribute_types (id) on delete restrict,
	value text not null,
	unique (variant_id, attribute_type_id)
);

create index idx_variant_attributes_variant_id on public.product_variant_attributes (variant_id);

create table public.product_variant_images (
	id uuid primary key default gen_random_uuid(),
	variant_id uuid not null references public.product_variants (id) on delete cascade,
	-- Path/URL into a Supabase Storage bucket (e.g. 'product-images'), not a
	-- binary blob — keep large files out of Postgres itself.
	image_url text not null,
	alt_text text,
	position smallint not null default 0,
	created_at timestamptz not null default now()
);

create index idx_variant_images_variant_id on public.product_variant_images (variant_id);

create table public.product_tags (
	id smallserial primary key,
	name text not null unique
);

create table public.product_tag_map (
	product_id uuid not null references public.products (id) on delete cascade,
	tag_id smallint not null references public.product_tags (id) on delete cascade,
	primary key (product_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Reseñas (para que la sección "Clientela" del sitio muestre datos reales)
-- ---------------------------------------------------------------------------
create table public.product_reviews (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	rating smallint not null check (rating between 1 and 5),
	comment text,
	is_approved boolean not null default false,
	created_at timestamptz not null default now(),
	unique (product_id, user_id)
);

create index idx_product_reviews_product_id on public.product_reviews (product_id);
