-- Clave de deduplicación determinística por documento.
-- No aplica UNIQUE por defecto (evita falsos positivos); se usa para sugerencias y conciliación.

alter table public.documents
  add column if not exists dedup_key text;

-- Backfill: usa los campos disponibles; si falta alguno, igual genera una clave estable.
update public.documents d
set dedup_key =
  lower(
    coalesce(nullif(trim(d.tipo_doc), ''), '-') || '|' ||
    coalesce(nullif(trim(d.rut_emisor), ''), '-') || '|' ||
    coalesce(nullif(trim(d.folio), ''), '-') || '|' ||
    coalesce(d.total::text, '0') || '|' ||
    coalesce(to_char(d.fecha, 'YYYY-MM-DD'), '-')
  )
where d.dedup_key is null or trim(d.dedup_key) = '';

alter table public.documents
  alter column dedup_key set not null;

create index if not exists documents_company_period_dedup_idx
  on public.documents (company_id, period desc, dedup_key);

