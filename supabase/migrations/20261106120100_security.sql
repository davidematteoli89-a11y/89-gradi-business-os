-- Sicurezza: funzioni di autorizzazione, RLS, audit, storage privato.

-- ─────────────────────────────────────────────────────────────
-- Funzioni di autorizzazione
-- ─────────────────────────────────────────────────────────────
create or replace function public.g89_current_role_in_app()
returns public.g89_app_role
language sql stable security definer set search_path = public as $$
  select role from public.g89_app_users where user_id = auth.uid()
$$;

create or replace function public.g89_is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.g89_app_users where user_id = auth.uid())
$$;

create or replace function public.g89_can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.g89_current_role_in_app() in ('admin', 'editor'), false)
$$;

create or replace function public.g89_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.g89_current_role_in_app() = 'admin', false)
$$;

revoke all on function public.g89_current_role_in_app() from public, anon;
revoke all on function public.g89_is_member() from public, anon;
revoke all on function public.g89_can_edit() from public, anon;
revoke all on function public.g89_is_admin() from public, anon;
grant execute on function public.g89_current_role_in_app(), public.g89_is_member(), public.g89_can_edit(), public.g89_is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS: lettura ai membri, scrittura a admin/editor
-- ─────────────────────────────────────────────────────────────
do $$
declare
  t text;
  member_tables text[] := array[
    'g89_partners', 'g89_categories', 'g89_contacts', 'g89_resources', 'g89_price_list_items',
    'g89_events', 'g89_event_quotes', 'g89_event_quote_lines', 'g89_event_budget_lines', 'g89_event_staff', 'g89_event_resources',
    'g89_checklist_templates', 'g89_checklist_template_items', 'g89_event_tasks',
    'g89_recurring_costs', 'g89_fin_documents', 'g89_fin_payments', 'g89_partner_movements',
    'g89_campaigns', 'g89_marketing_tasks', 'g89_attachments'
  ];
begin
  foreach t in array member_tables loop
    execute format('revoke all on public.%I from anon', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy "%s_select_members" on public.%I for select to authenticated using (public.g89_is_member())', t, t);
    execute format('create policy "%s_insert_editors" on public.%I for insert to authenticated with check (public.g89_can_edit())', t, t);
    execute format('create policy "%s_update_editors" on public.%I for update to authenticated using (public.g89_can_edit()) with check (public.g89_can_edit())', t, t);
    execute format('create policy "%s_delete_editors" on public.%I for delete to authenticated using (public.g89_can_edit())', t, t);
  end loop;
end $$;

-- Configurazione: modificabile solo da admin
alter table public.g89_settings enable row level security;
alter table public.g89_partner_shares enable row level security;
alter table public.g89_app_users enable row level security;
alter table public.g89_audit_log enable row level security;
revoke all on public.g89_settings, public.g89_partner_shares, public.g89_app_users, public.g89_audit_log from anon;

create policy settings_select on public.g89_settings for select to authenticated using (public.g89_is_member());
create policy settings_update on public.g89_settings for update to authenticated using (public.g89_is_admin()) with check (public.g89_is_admin());

create policy partner_shares_select on public.g89_partner_shares for select to authenticated using (public.g89_is_member());
create policy partner_shares_write on public.g89_partner_shares for all to authenticated using (public.g89_is_admin()) with check (public.g89_is_admin());

create policy app_users_select on public.g89_app_users for select to authenticated using (public.g89_is_member());
create policy app_users_write on public.g89_app_users for all to authenticated using (public.g89_is_admin()) with check (public.g89_is_admin());

-- Audit: solo lettura per i membri; scrittura solo dal trigger
create policy audit_select on public.g89_audit_log for select to authenticated using (public.g89_is_member());
revoke insert, update, delete, truncate on public.g89_audit_log from authenticated, anon;


-- ─────────────────────────────────────────────────────────────
-- Quote soci: devono sommare al 100% per ogni data di validità
-- ─────────────────────────────────────────────────────────────
create or replace function public.g89_shares_are_valid(p_valid_from date)
returns boolean language sql stable set search_path = public as $$
  select coalesce(sum(share_bp), 0) = 10000 from public.g89_partner_shares where valid_from = p_valid_from
$$;

create or replace function public.g89_check_shares_sum()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.g89_shares_are_valid(coalesce(new.valid_from, old.valid_from)) then
    raise exception 'Le quote dei soci alla data % devono sommare al 100%%', coalesce(new.valid_from, old.valid_from)
      using errcode = 'check_violation';
  end if;
  return null;
end $$;
-- deferrable: si inseriscono le quote di entrambi i soci nella stessa transazione
create constraint trigger partner_shares_sum after insert or update or delete on public.g89_partner_shares
  deferrable initially deferred for each row execute function public.g89_check_shares_sum();

-- ─────────────────────────────────────────────────────────────
-- updated_at
-- ─────────────────────────────────────────────────────────────
create or replace function public.g89_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger events_touch before update on public.g89_events for each row execute function public.g89_touch_updated_at();
create trigger fin_documents_touch before update on public.g89_fin_documents for each row execute function public.g89_touch_updated_at();
create trigger marketing_tasks_touch before update on public.g89_marketing_tasks for each row execute function public.g89_touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Audit log
-- ─────────────────────────────────────────────────────────────
create or replace function public.g89_audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.g89_audit_log (table_name, record_id, action, actor, old, new)
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
    'g89_events', 'g89_event_quotes', 'g89_event_quote_lines', 'g89_fin_documents', 'g89_fin_payments',
    'g89_partner_movements', 'g89_partner_shares', 'g89_settings', 'g89_app_users', 'g89_marketing_tasks', 'g89_attachments'
  ];
begin
  foreach t in array audited loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.g89_audit_row()', t || '_audit', t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────
-- Storage privato per ricevute e documenti
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('g89-documenti', 'g89-documenti', false, 15728640,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy g89_documenti_select on storage.objects for select to authenticated
  using (bucket_id = 'g89-documenti' and public.g89_is_member());
create policy g89_documenti_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'g89-documenti' and public.g89_can_edit());
create policy g89_documenti_update on storage.objects for update to authenticated
  using (bucket_id = 'g89-documenti' and public.g89_can_edit());
create policy g89_documenti_delete on storage.objects for delete to authenticated
  using (bucket_id = 'g89-documenti' and public.g89_can_edit());
