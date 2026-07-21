-- ============================================================================
-- SOBRAO VAPE STORE — 09: Analítica
-- ============================================================================
-- These tables can grow into millions of rows fast. `page_views` is set up
-- partitioned by month as the reference pattern — replicate the same
-- approach for `product_views` / `user_events` once volume justifies it
-- (a few hundred thousand rows/month is a reasonable trigger point).
-- Partitioning keeps queries fast (Postgres only scans relevant month
-- partitions) and makes archiving trivial (DETACH + drop an old partition
-- instead of a slow DELETE).

create table public.product_views (
	id uuid primary key default gen_random_uuid(),
	product_id uuid references public.products (id) on delete set null,
	user_id uuid references public.profiles (id) on delete set null,
	session_id text,
	viewed_at timestamptz not null default now()
);

create index idx_product_views_product_id on public.product_views (product_id);
create index idx_product_views_viewed_at on public.product_views (viewed_at);

create table public.searches (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete set null,
	session_id text,
	query text not null,
	results_count integer not null default 0,
	created_at timestamptz not null default now()
);

create index idx_searches_created_at on public.searches (created_at);

create table public.user_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete set null,
	session_id text,
	event_type text not null,            -- 'add_to_cart', 'checkout_start', ...
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create index idx_user_events_created_at on public.user_events (created_at);
create index idx_user_events_type on public.user_events (event_type);

-- ---------------------------------------------------------------------------
-- page_views: partitioned by month (reference pattern for the rest).
-- ---------------------------------------------------------------------------
create table public.page_views (
	id uuid not null default gen_random_uuid(),
	user_id uuid references public.profiles (id) on delete set null,
	session_id text,
	path text not null,
	referrer text,
	created_at timestamptz not null default now(),
	primary key (id, created_at)
) partition by range (created_at);

-- Two starter partitions (current month + next). In production, create the
-- next month's partition ahead of time via a scheduled job (pg_cron or an
-- edge function on a cron trigger) — Postgres does NOT auto-create these.
create table public.page_views_2026_07 partition of public.page_views
	for values from ('2026-07-01') to ('2026-08-01');

create table public.page_views_2026_08 partition of public.page_views
	for values from ('2026-08-01') to ('2026-09-01');

create index idx_page_views_2026_07_path on public.page_views_2026_07 (path);
create index idx_page_views_2026_08_path on public.page_views_2026_08 (path);
