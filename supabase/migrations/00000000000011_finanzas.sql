-- ============================================================================
-- SOBRAO VAPE STORE — 10: Finanzas
-- ============================================================================

create table public.investors (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	document_number text,
	email text,
	phone text,
	is_active boolean not null default true,
	created_at timestamptz not null default now()
);

create table public.investments (
	id uuid primary key default gen_random_uuid(),
	investor_id uuid not null references public.investors (id) on delete restrict,
	amount numeric(12, 2) not null check (amount > 0),
	currency text not null default 'PEN',
	invested_at date not null default current_date,
	notes text
);

create index idx_investments_investor_id on public.investments (investor_id);

create table public.expenses (
	id uuid primary key default gen_random_uuid(),
	category text not null,               -- 'alquiler', 'marketing', 'planilla'...
	description text,
	amount numeric(12, 2) not null check (amount > 0),
	currency text not null default 'PEN',
	expense_date date not null default current_date,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create index idx_expenses_expense_date on public.expenses (expense_date);
