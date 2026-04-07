-- Si ya ejecutaste schema_multitenant.sql sin columna `period`, corre esto en el SQL Editor.
-- Proyectos nuevos: usa el schema_multitenant.sql actualizado (incluye period).

alter table public.documents
  add column if not exists period text;

update public.documents
set period = to_char((created_at at time zone 'utc')::date, 'YYYY-MM')
where period is null or trim(period) = '';

alter table public.documents
  alter column period set not null;

alter table public.documents
  drop constraint if exists documents_period_format_chk;

alter table public.documents
  add constraint documents_period_format_chk
  check (period ~ '^\d{4}-(0[1-9]|1[0-2])$');

create index if not exists documents_company_period_idx
  on public.documents (company_id, period desc);
