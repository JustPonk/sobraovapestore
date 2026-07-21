-- Retry wrapper for helper functions after MCP skipped the original file.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

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

create or replace function public.current_user_is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
	select public.current_user_has_role('admin') or public.current_user_has_role('employee');
$$;
