-- RPC: conciliación RCV vs documents (por período).
-- Requiere rcv_rows cargadas (ver 0006).
-- Respeta RLS (security invoker).

drop function if exists public.rcv_period_reconciliation(uuid, text);

create or replace function public.rcv_period_reconciliation(
  p_company_id uuid,
  p_period text
)
returns table (
  period text,
  rcv_rows_count bigint,
  docs_csv_count bigint,
  docs_validated_count bigint,
  rcv_sum_neto bigint,
  rcv_sum_iva bigint,
  rcv_sum_total bigint,
  docs_csv_sum_neto bigint,
  docs_csv_sum_iva bigint,
  docs_csv_sum_total bigint,
  missing_in_docs bigint,
  extra_in_docs bigint
)
language sql
security invoker
set search_path = public
stable
as $$
  with rcv as (
    select *
    from public.rcv_rows r
    where r.company_id = p_company_id
      and r.period = p_period
  ),
  docs_csv as (
    select *
    from public.documents d
    where d.company_id = p_company_id
      and d.period = p_period
      and d.source_type = 'CSV'
      and d.review_status <> 'excluded'
  ),
  docs_validated as (
    select *
    from public.documents d
    where d.company_id = p_company_id
      and d.period = p_period
      and d.review_status = 'validated'
  ),
  rcv_keys as (
    select distinct dedup_key from rcv
  ),
  doc_keys as (
    select distinct dedup_key from docs_csv
  ),
  missing as (
    select count(*)::bigint as n
    from rcv_keys rk
    left join doc_keys dk on dk.dedup_key = rk.dedup_key
    where dk.dedup_key is null
  ),
  extra as (
    select count(*)::bigint as n
    from doc_keys dk
    left join rcv_keys rk on rk.dedup_key = dk.dedup_key
    where rk.dedup_key is null
  )
  select
    p_period as period,
    (select count(*)::bigint from rcv) as rcv_rows_count,
    (select count(*)::bigint from docs_csv) as docs_csv_count,
    (select count(*)::bigint from docs_validated) as docs_validated_count,
    coalesce((select sum(monto_neto)::bigint from rcv), 0) as rcv_sum_neto,
    coalesce((select sum(iva)::bigint from rcv), 0) as rcv_sum_iva,
    coalesce((select sum(total)::bigint from rcv), 0) as rcv_sum_total,
    coalesce((select sum(monto_neto)::bigint from docs_csv), 0) as docs_csv_sum_neto,
    coalesce((select sum(iva)::bigint from docs_csv), 0) as docs_csv_sum_iva,
    coalesce((select sum(total)::bigint from docs_csv), 0) as docs_csv_sum_total,
    (select n from missing) as missing_in_docs,
    (select n from extra) as extra_in_docs;
$$;

revoke all on function public.rcv_period_reconciliation(uuid, text) from public;
grant execute on function public.rcv_period_reconciliation(uuid, text) to authenticated;

