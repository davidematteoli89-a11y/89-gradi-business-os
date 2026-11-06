-- Sicurezza: funzioni di autorizzazione, RLS, audit, storage privato.

-- ─────────────────────────────────────────────────────────────
-- Funzioni di autorizzazione
-- ─────────────────────────────────────────────────────────────
create or replace function public.current_role_in_app()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.app_users where user_id = auth.uid()
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_users where user_id = auth.uid())
$$;

create or replace function public.can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_in_app() in ('admin', 'editor'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_in_app() = 'admin', false)
$$;

revoke all on function public.current_role_in_app() from public, anon;
revoke all on function public.is_member() from public, anon;
revoke all on function public.can_edit() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.current_role_in_app(), public.is_member(), public.can_edit(), public.is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS: lettura ai membri, scrittura a admin/editor
-- ─────────────────────────────────────────────────────────────
do $$
declare
  t text;
  member_tables text[] := array[
    'partners', 'categories', 'contacts', 'resources', 'price_list_items',
    'events', 'event_quotes', 'event_quote_lines', 'event_budget_lines', 'event_staff', 'event_resources',
    'checklist_templates', 'checklist_template_items', 'event_tasks',
    'recurring_costs', 'fin_documents', 'fin_payments', 'partner_movements',
    'campaigns', 'marketing_tasks', 'attachments'
  ];
begin
  foreach t in array member_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy "%s_select_members" on public.%I for select to authenticated using (public.is_member())', t, t);
    execute format('create policy "%s_insert_editors" on public.%I for insert to authenticated with check (public.can_edit())', t, t);
    execute format('create policy "%s_update_editors" on public.%I for update to authenticated using (public.can_edit()) with check (public.can_edit())', t, t);
    execute format('create policy "%s_delete_editors" on public.%I for delete to authenticated using (public.can_edit())', t, t);
  end loop;
end $$;

-- Configurazione: modificabile solo da admin
alter table public.settings enable row level security;
alter table public.partner_shares enable row level security;
alter table public.app_users enable row level security;
alter table public.audit_log enable row level security;

create policy settings_select on public.settings for select to authenticated using (public.is_member());
create policy settings_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partner_shares_select on public.partner_shares for select to authenticated using (public.is_member());
create policy partner_shares_write on public.partner_shares for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy app_users_select on public.app_users for select to authenticated using (public.is_member());
create policy app_users_write on public.app_users for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Audit: solo lettura per i membri; scrittura solo dal trigger
create policy audit_select on public.audit_log for select to authenticated using (public.is_member());
revoke insert, update, delete, truncate on public.audit_log from authenticated, anon;

revoke all on all tables in schema public from anon;

-- ─────────────────────────────────────────────────────────────
-- Quote soci: devono sommare al 100% per ogni data di validità
-- ─────────────────────────────────────────────────────────────
create or replace function public.shares_are_valid(p_valid_from date)
returns boolean language sql stable as $$
  select coalesce(sum(share_bp), 0) = 10000 from public.partner_shares where valid_from = p_valid_from
$$;

create or replace function public.check_shares_sum()
returns trigger language plpgsql as $$
begin
  if not public.shares_are_valid(coalesce(new.valid_from, old.valid_from)) then
    raise exception 'Le quote dei soci alla data % devono sommare al 100%%', coalesce(new.valid_from, old.valid_from)
      using errcode = 'check_violation';
  end if;
  return null;
end $$;
-- deferrable: si inseriscono le quote di entrambi i soci nella stessa transazione
create constraint trigger partner_shares_sum after insert or update or delete on public.partner_shares
  deferrable initially deferred for each row execute function public.check_shares_sum();

-- ─────────────────────────────────────────────────────────────
-- updated_at
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger fin_documents_touch before update on public.fin_documents for each row execute function public.touch_updated_at();
create trigger marketing_tasks_touch before update on public.marketing_tasks for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────────────────────
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, record_id, action, actor, old, new)
  values (
    tg_table_name,
    coalesce(
      (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
      (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'user_id',
      ''
    ),
    lower(tg_op),
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

do $$
declare
  t text;
  audited text[] := array[
    'events', 'event_quotes', 'event_quote_lines', 'fin_documents', 'fin_payments',
    'partner_movements', 'partner_shares', 'settings', 'app_users', 'marketing_tasks', 'attachments'
  ];
begin
  foreach t in array audited loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Storage privato per ricevute e documenti
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documenti', 'documenti', false, 15728640,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy documenti_select on storage.objects for select to authenticated
  using (bucket_id = 'documenti' and public.is_member());
create policy documenti_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documenti' and public.can_edit());
create policy documenti_update on storage.objects for update to authenticated
  using (bucket_id = 'documenti' and public.can_edit());
create policy documenti_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documenti' and public.can_edit());
