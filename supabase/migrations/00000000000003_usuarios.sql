-- ============================================================================
-- SOBRAO VAPE STORE — 02: Usuarios
-- ============================================================================
-- Supabase already provides `auth.users` for login/passwords/tokens/sessions.
-- We DO NOT duplicate that. `profiles` is a 1:1 extension of auth.users that
-- holds the app-specific fields, keyed by the same UUID.

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text not null,
	phone text,
	-- Peru-specific identity document, needed later for invoices (boleta vs
	-- factura) without having to re-ask the customer at checkout.
	document_type text check (document_type in ('DNI', 'RUC', 'CE', 'PASSPORT')),
	document_number text,
	avatar_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App-level profile data, 1:1 with auth.users. Auth itself (email/password/session) stays in auth.users.';

create trigger set_profiles_updated_at
	before update on public.profiles
	for each row execute function public.set_updated_at();

-- Auto-create an empty profile row the moment someone signs up, so the rest
-- of the app can always assume profiles.id exists for any authenticated user.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, full_name)
	values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- RBAC: roles / permissions
-- ---------------------------------------------------------------------------
create table public.roles (
	id smallserial primary key,
	name text not null unique,
	description text
);

create table public.permissions (
	id smallserial primary key,
	code text not null unique,          -- e.g. 'orders.refund', 'inventory.adjust'
	description text
);

create table public.role_permissions (
	role_id smallint not null references public.roles (id) on delete cascade,
	permission_id smallint not null references public.permissions (id) on delete cascade,
	primary key (role_id, permission_id)
);

create table public.user_roles (
	user_id uuid not null references public.profiles (id) on delete cascade,
	role_id smallint not null references public.roles (id) on delete cascade,
	assigned_at timestamptz not null default now(),
	primary key (user_id, role_id)
);

insert into public.roles (name, description) values
	('admin', 'Acceso total a la plataforma'),
	('employee', 'Staff operativo: inventario, compras, ventas'),
	('customer', 'Cliente final de la tienda');

-- ---------------------------------------------------------------------------
-- Direcciones (formato peruano: departamento / provincia / distrito)
-- ---------------------------------------------------------------------------
create table public.user_addresses (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	label text,                          -- 'Casa', 'Trabajo', etc.
	recipient_name text not null,
	recipient_phone text not null,
	address_line text not null,
	reference text,                      -- 'a media cuadra del parque...'
	district text not null,
	province text not null,
	department text not null,
	is_default boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index idx_user_addresses_user_id on public.user_addresses (user_id);

create trigger set_user_addresses_updated_at
	before update on public.user_addresses
	for each row execute function public.set_updated_at();

-- Only one default address per user.
create unique index uniq_user_addresses_default
	on public.user_addresses (user_id)
	where is_default;
