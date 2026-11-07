-- Gestione soci dall'app: collegare un account esistente a un socio (solo admin).
-- auth.users non è leggibile dal client: la ricerca per email avviene qui, con permessi verificati.
create or replace function public.g89_link_user(p_email text, p_partner_id uuid, p_role public.g89_app_role, p_display_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if not public.g89_is_admin() then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Nessun account con questa email. Crealo prima da Supabase (Authentication → Add user).' using errcode = 'P0002';
  end if;
  insert into public.g89_app_users (user_id, role, partner_id, display_name)
  values (v_user, p_role, p_partner_id, p_display_name)
  on conflict (user_id) do update set role = excluded.role, partner_id = excluded.partner_id, display_name = excluded.display_name;
  return v_user;
end $$;

revoke all on function public.g89_link_user(text, uuid, public.g89_app_role, text) from public, anon;
grant execute on function public.g89_link_user(text, uuid, public.g89_app_role, text) to authenticated;

-- Elenco accessi con email, solo per gli admin.
create or replace function public.g89_list_access()
returns table (user_id uuid, email text, role public.g89_app_role, partner_id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select a.user_id, u.email::text, a.role, a.partner_id, a.display_name
  from public.g89_app_users a join auth.users u on u.id = a.user_id
  where public.g89_is_admin()
  order by a.created_at
$$;

revoke all on function public.g89_list_access() from public, anon;
grant execute on function public.g89_list_access() to authenticated;
