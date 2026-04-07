-- Agregados en servidor: totales y por tipo DTE sin límite de filas en la app.
-- Respeta RLS (security invoker). Ejecutar en Supabase SQL Editor si ya tenías el proyecto.

drop function if exists public.document_period_by_tipo_validated(uuid, text, text, text, text, text);
drop function if exists public.document_period_summary(uuid, text, text, text, text, text);

create or replace function public.document_period_summary(
  p_company_id uuid,
  p_period text,
  p_tipo_doc text default null,
  p_source_type text default null,
  p_review_status text default null,
  p_search text default null
)
returns table (
  total_rows bigint,
  validated_count bigint,
  pending_count bigint,
  excluded_count bigint,
  sum_neto_validated bigint,
  sum_iva_validated bigint,
  sum_total_validated bigint
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    count(*)::bigint as total_rows,
    count(*) filter (where d.review_status = 'validated')::bigint as validated_count,
    count(*) filter (where d.review_status = 'pending')::bigint as pending_count,
    count(*) filter (where d.review_status = 'excluded')::bigint as excluded_count,
    coalesce(sum(d.monto_neto) filter (where d.review_status = 'validated'), 0)::bigint as sum_neto_validated,
    coalesce(sum(d.iva) filter (where d.review_status = 'validated'), 0)::bigint as sum_iva_validated,
    coalesce(sum(d.total) filter (where d.review_status = 'validated'), 0)::bigint as sum_total_validated
  from public.documents d
  where d.company_id = p_company_id
    and d.period = p_period
    and (p_tipo_doc is null or trim(p_tipo_doc) = '' or d.tipo_doc = p_tipo_doc)
    and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
    and (p_review_status is null or trim(p_review_status) = '' or d.review_status = p_review_status)
    and (
      p_search is null
      or trim(p_search) = ''
      or d.rut_emisor ilike '%' || trim(p_search) || '%'
      or d.folio ilike '%' || trim(p_search) || '%'
    );
$$;

create or replace function public.document_period_by_tipo_validated(
  p_company_id uuid,
  p_period text,
  p_tipo_doc text default null,
  p_source_type text default null,
  p_review_status text default null,
  p_search text default null
)
returns table (
  tipo_doc text,
  doc_count bigint,
  sum_neto bigint,
  sum_iva bigint,
  sum_total bigint
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    d.tipo_doc,
    count(*)::bigint as doc_count,
    coalesce(sum(d.monto_neto), 0)::bigint as sum_neto,
    coalesce(sum(d.iva), 0)::bigint as sum_iva,
    coalesce(sum(d.total), 0)::bigint as sum_total
  from public.documents d
  where d.company_id = p_company_id
    and d.period = p_period
    and d.review_status = 'validated'
    and (p_tipo_doc is null or trim(p_tipo_doc) = '' or d.tipo_doc = p_tipo_doc)
    and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
    and (p_review_status is null or trim(p_review_status) = '' or d.review_status = p_review_status)
    and (
      p_search is null
      or trim(p_search) = ''
      or d.rut_emisor ilike '%' || trim(p_search) || '%'
      or d.folio ilike '%' || trim(p_search) || '%'
    )
  group by d.tipo_doc
  order by d.tipo_doc;
$$;

revoke all on function public.document_period_summary(uuid, text, text, text, text, text) from public;
revoke all on function public.document_period_by_tipo_validated(uuid, text, text, text, text, text) from public;

grant execute on function public.document_period_summary(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.document_period_by_tipo_validated(uuid, text, text, text, text, text) to authenticated;
