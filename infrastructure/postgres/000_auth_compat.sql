/*
 * Совместимость с RLS после ухода от Supabase Auth.
 *
 * Backend перед запросом будет устанавливать:
 *
 *   SET LOCAL app.current_user_id = '<uuid>';
 *
 * После этого RLS сможет определить текущего пользователя.
 */


/*
 * Роли, которые раньше предоставлял Supabase.
 */

do $$
begin
  if not exists (
    select 1
    from pg_roles
    where rolname = 'anon'
  ) then
    create role anon nologin;
  end if;

  if not exists (
    select 1
    from pg_roles
    where rolname = 'authenticated'
  ) then
    create role authenticated nologin;
  end if;

if not exists (
    select 1
    from pg_roles
    where rolname = 'service_role'
  ) then
    create role service_role nologin bypassrls;
  end if;
end
$$;


/*
 * Получение UUID текущего пользователя.
 */

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
    current_setting(
      'app.current_user_id',
      true
    ),
    ''
  )::uuid;
$$;
