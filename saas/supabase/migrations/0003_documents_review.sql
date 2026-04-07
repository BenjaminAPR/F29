-- Revisión humana: qué documentos cuentan en totales (F29 / cierre).
-- validated = incluido en totales; pending = pendiente (p. ej. IA); excluded = fuera, con nota opcional.

alter table public.documents
  add column if not exists review_status text not null default 'validated',
  add column if not exists review_note text;

update public.documents
set review_status = 'validated'
where review_status is null;

alter table public.documents drop constraint if exists documents_review_status_chk;
alter table public.documents
  add constraint documents_review_status_chk
  check (review_status in ('pending', 'validated', 'excluded'));
