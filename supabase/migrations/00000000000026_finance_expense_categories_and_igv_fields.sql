-- Finanzas (Gastos e InversiÃ³n + CrÃ©dito Fiscal IGV) — migration 26
create table if not exists public.expense_categories (
    id           smallserial primary key,
    name         text        not null unique
);

insert into public.expense_categories (name)
values ('Oficina'), ('Reuniones'), ('VehÃ­culos y propiedades'), ('Otros')
on conflict (name) do nothing;

do $$ begin
    alter table public.expenses add column category_id smallint references public.expense_categories (id);
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.expenses add column document_type text check (document_type in ('factura','boleta','recibo','ninguno'));
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.expenses add column document_number text;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.expenses add column supplier_ruc text;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.expenses add column igv_amount numeric(10,2) not null default 0;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.expenses add column is_igv_creditable boolean not null default false;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.expenses add column receipt_image_url text;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.purchase_orders add column document_type text check (document_type in ('factura','boleta','recibo','ninguno'));
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.purchase_orders add column document_number text;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.purchase_orders add column igv_amount numeric(12,2) not null default 0;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.purchase_orders add column is_igv_creditable boolean not null default true;
exception when duplicate_column then null;
end $$;

do $$ begin
    alter table public.purchase_orders add column invoice_image_url text;
exception when duplicate_column then null;
end $$;

create or replace function public.current_user_has_role(role_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = auth.uid() and lower(r.name) = lower(role_name)
    );
$$;

alter table public.expense_categories enable row level security;
drop policy if exists "expense_categories.admin_all" on public.expense_categories;
create policy "expense_categories.admin_all" on public.expense_categories
for all
using (public.current_user_has_role('admin'))
with check (public.current_user_has_role('admin'));

drop policy if exists "expenses.admin_only_finance_columns" on public.expenses;
create policy "expenses.admin_only_finance_columns" on public.expenses
for all
using (
    public.current_user_has_role('admin')
    or (
        category_id is null
        and document_type is null
        and document_number is null
        and supplier_ruc is null
        and igv_amount = 0
        and is_igv_creditable = false
        and receipt_image_url is null
    )
)
with check (
    public.current_user_has_role('admin')
    or (
        category_id is null
        and document_type is null
        and document_number is null
        and supplier_ruc is null
        and igv_amount = 0
        and is_igv_creditable = false
        and receipt_image_url is null
    )
);

alter table if exists public.purchase_orders enable row level security;

drop policy if exists "purchase_orders.admin_only_finance_columns" on public.purchase_orders;
create policy "purchase_orders.admin_only_finance_columns" on public.purchase_orders
for all
using (
    public.current_user_has_role('admin')
    or (
        document_type is null
        and document_number is null
        and igv_amount = 0
        and is_igv_creditable = true
        and invoice_image_url is null
    )
)
with check (
    public.current_user_has_role('admin')
    or (
        document_type is null
        and document_number is null
        and igv_amount = 0
        and is_igv_creditable = true
        and invoice_image_url is null
    )
);
