-- RPC: F29 oficial por línea (casilla) + drill-down a documentos.
-- Respeta RLS (security invoker).

drop function if exists public.f29_official_period_lines(uuid, text, text, text, text);
drop function if exists public.f29_official_line_documents(uuid, text, text, text, text, int, int);
drop function if exists public.f29_official_line_document_count(uuid, text, text, text, text);

create or replace function public.f29_official_period_lines(
  p_company_id uuid,
  p_period text,
  p_version_id text,
  p_source_type text default null,
  p_search text default null
)
returns table (
  version_id text,
  line_code text,
  title text,
  practitioner_note text,
  sort_order int,
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
  with docs as (
    select d.*
    from public.documents d
    where d.company_id = p_company_id
      and d.period = p_period
      and d.review_status = 'validated'
      and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
      and (
        p_search is null
        or trim(p_search) = ''
        or d.rut_emisor ilike '%' || trim(p_search) || '%'
        or d.folio ilike '%' || trim(p_search) || '%'
      )
  ),
  mapped as (
    select
      m.version_id,
      m.line_code,
      m.sign,
      m.include_neto,
      m.include_iva,
      m.include_total,
      d.monto_neto,
      d.iva,
      d.total
    from docs d
    join public.f29_line_map m
      on m.version_id = p_version_id
     and m.tipo_doc = d.tipo_doc
  )
  select
    l.version_id,
    l.line_code,
    l.title,
    l.practitioner_note,
    l.sort_order,
    count(*)::bigint as doc_count,
    coalesce(sum((case when mapped.include_neto then mapped.monto_neto else 0 end) * mapped.sign), 0)::bigint as sum_neto,
    coalesce(sum((case when mapped.include_iva then mapped.iva else 0 end) * mapped.sign), 0)::bigint as sum_iva,
    coalesce(sum((case when mapped.include_total then mapped.total else 0 end) * mapped.sign), 0)::bigint as sum_total
  from public.f29_official_lines l
  left join mapped
    on mapped.version_id = l.version_id
   and mapped.line_code = l.line_code
  where l.version_id = p_version_id
  group by l.version_id, l.line_code, l.title, l.practitioner_note, l.sort_order
  order by l.sort_order, l.line_code;
$$;

create or replace function public.f29_official_line_documents(
  p_company_id uuid,
  p_period text,
  p_version_id text,
  p_line_code text,
  p_source_type text default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  tipo_doc text,
  rut_emisor text,
  folio text,
  monto_neto bigint,
  iva bigint,
  total bigint,
  fecha date,
  source_type text,
  review_status text,
  review_note text,
  created_at timestamptz
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    d.id,
    d.tipo_doc,
    d.rut_emisor,
    d.folio,
    d.monto_neto,
    d.iva,
    d.total,
    d.fecha,
    d.source_type,
    d.review_status,
    d.review_note,
    d.created_at
  from public.documents d
  join public.f29_line_map m
    on m.version_id = p_version_id
   and m.line_code = p_line_code
   and m.tipo_doc = d.tipo_doc
  where d.company_id = p_company_id
    and d.period = p_period
    and d.review_status = 'validated'
    and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
    and (
      p_search is null
      or trim(p_search) = ''
      or d.rut_emisor ilike '%' || trim(p_search) || '%'
      or d.folio ilike '%' || trim(p_search) || '%'
    )
  order by d.created_at desc
  limit greatest(1, least(p_limit, 200))
  offset greatest(p_offset, 0);
$$;

create or replace function public.f29_official_line_document_count(
  p_company_id uuid,
  p_period text,
  p_version_id text,
  p_line_code text,
  p_source_type text default null,
  p_search text default null
)
returns bigint
language sql
security invoker
set search_path = public
stable
as $$
  select count(*)::bigint
  from public.documents d
  join public.f29_line_map m
    on m.version_id = p_version_id
   and m.line_code = p_line_code
   and m.tipo_doc = d.tipo_doc
  where d.company_id = p_company_id
    and d.period = p_period
    and d.review_status = 'validated'
    and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
    and (
      p_search is null
      or trim(p_search) = ''
      or d.rut_emisor ilike '%' || trim(p_search) || '%'
      or d.folio ilike '%' || trim(p_search) || '%'
    );
$$;

revoke all on function public.f29_official_period_lines(uuid, text, text, text, text) from public;
revoke all on function public.f29_official_line_documents(uuid, text, text, text, text, text, int, int) from public;
revoke all on function public.f29_official_line_document_count(uuid, text, text, text, text, text) from public;

grant execute on function public.f29_official_period_lines(uuid, text, text, text, text) to authenticated;
grant execute on function public.f29_official_line_documents(uuid, text, text, text, text, text, int, int) to authenticated;
grant execute on function public.f29_official_line_document_count(uuid, text, text, text, text, text) to authenticated;

