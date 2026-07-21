-- ============================================================================
-- SOBRAO VAPE STORE — 12: Notificaciones
-- ============================================================================

create table public.notifications (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	body text not null,
	type text not null default 'info' check (type in ('info', 'promo', 'order_update', 'system')),
	target_role_id smallint references public.roles (id) on delete cascade,
	target_user_id uuid references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now()
);

create table public.notification_reads (
	id uuid primary key default gen_random_uuid(),
	notification_id uuid not null references public.notifications (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	read_at timestamptz not null default now(),
	unique (notification_id, user_id)
);

create index idx_notification_reads_user_id on public.notification_reads (user_id);
