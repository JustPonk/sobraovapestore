-- ============================================================================
-- SOBRAO VAPE STORE — 01: Helper functions & triggers
-- ============================================================================

-- Generic "touch updated_at" trigger function, reused by every table that
-- has an updated_at column instead of repeating the same trigger body.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

-- Returns true if the currently authenticated user (auth.uid()) holds the
-- given role name. Used everywhere in RLS policies instead of repeating the
-- same EXISTS(...) subquery in every policy definition.
-- SECURITY DEFINER so it can read user_roles/roles even under a restrictive
-- RLS policy on those tables themselves. Implemented in plpgsql so the
-- function can be created before roles/user_roles exist in later migrations.
create or replace function public.current_user_has_role(role_name text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
	has_role boolean;
begin
	select exists (
		select 1
		from public.user_roles ur
		join public.roles r on r.id = ur.role_id
		where ur.user_id = auth.uid()
		  and r.name = role_name
	)
	into has_role;

	return coalesce(has_role, false);
exception
	when undefined_table then
		return false;
end;
$$;

-- Convenience wrapper: true if the user is 'admin' or 'employee'. Staff-only
-- tables (inventory, purchases, finance, admin) gate on this single check.
create or replace function public.current_user_is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
	select public.current_user_has_role('admin') or public.current_user_has_role('employee');
$$;
