-- Le funzioni trigger e le viste non devono essere chiamabili/leggibili da anon via API.
revoke all on function public.g89_audit_row() from public, anon, authenticated;
revoke all on function public.g89_check_payment_not_exceeding() from public, anon, authenticated;
revoke all on function public.g89_check_shares_sum() from public, anon, authenticated;
revoke all on function public.g89_touch_updated_at() from public, anon, authenticated;
revoke all on function public.g89_shares_are_valid(date) from public, anon;
revoke all on public.g89_v_document_balance, public.g89_v_partner_ledger from anon;
