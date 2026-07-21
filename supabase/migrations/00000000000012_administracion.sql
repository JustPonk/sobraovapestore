-- ============================================================================
-- SOBRAO VAPE STORE — 11: Administración
-- ============================================================================

create table public.employees (
	id uuid primary key default gen_random_uuid(),
	profile_id uuid not null unique references public.profiles (id) on delete cascade,
	position text not null,
	hired_at date not null default current_date,
	salary numeric(10, 2),
	is_active boolean not null default true
);

-- Generic audit trail: who changed what row, before/after as JSON. Populate
-- via triggers on sensitive tables (orders, inventory, payments) as needed —
-- left as a table here rather than wiring every trigger, so you can decide
-- which tables warrant the write overhead.
create table public.audit_logs (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete set null,
	action text not null,                 -- 'insert', 'update', 'delete'
	table_name text not null,
	record_id uuid,
	old_data jsonb,
	new_data jsonb,
	created_at timestamptz not null default now()
);

create index idx_audit_logs_table_record on public.audit_logs (table_name, record_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at);

create table public.settings (
	id smallserial primary key,
	key text not null unique,
	value jsonb not null,
	description text
);
